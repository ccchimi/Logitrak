import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { consultar, pool } from '../db/pool.js';
import { autenticar, firmarToken } from '../middleware/auth.js';
import { limiteLogin, limiteRegistro, limiteRenovacion } from '../middleware/limites.js';
import {
    cerrarSesion,
    clienteUsaRefresh,
    crearSesion,
    duracionAccess,
    emitirAccessToken,
    revocarSesionesDeUsuario,
    rotarSesion,
} from '../servicios/sesiones.js';
import { validarRequest } from '../middleware/validar.js';
import * as esquemas from '../esquemas/auth.js';
import { registrarError } from '../observabilidad/logger.js';
import { esPersonal, permisosDe } from '../middleware/permisos.js';
import { consumirCodigo, firmarDesafio, leerDesafio } from '../servicios/dobleFactor.js';

export const rutasAuth = Router();

function publicar(fila, chofer) {
    return {
        id: fila.id,
        usuario: fila.usuario,
        rol: fila.rol,
        permisos: permisosDe(fila.rol),
        nombreCompleto: fila.nombre_completo,
        chofer: chofer ? { codigo: chofer.codigo } : null,
        dobleFactor: Boolean(fila.totp_activado_en),
    };
}

async function choferDeFila(fila) {
    if (fila.rol !== 'chofer') return null;
    return (await consultar('SELECT codigo FROM choferes WHERE usuario_id = $1', [fila.id])).rows[0] ?? null;
}

async function abrirSesion(req, res, fila) {
    const chofer = await choferDeFila(fila);
    const respuesta = { exito: true, token: emitirAccessToken(fila, req), usuario: publicar(fila, chofer) };
    if (clienteUsaRefresh(req)) respuesta.refreshToken = await crearSesion(pool, fila.id, req);
    return res.json(respuesta);
}

async function auditar(usuario, exito, motivo, req) {
    try {
        await consultar(
            `INSERT INTO auditoria_accesos (usuario, exito, motivo, ip, user_agent)
             VALUES ($1, $2, $3, $4, $5)`,
            [usuario.slice(0, 20), exito, motivo, req.ip, (req.headers['user-agent'] || '').slice(0, 300)]
        );
    } catch (e) {
        registrarError(e, 'No se pudo auditar el acceso');
    }
}

rutasAuth.post('/login', limiteLogin, validarRequest({ body: esquemas.login }), async (req, res) => {
    const { usuario, contrasena } = req.body;

    const { rows } = await consultar('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
    const fila = rows[0];
    const coincide = fila && (await bcrypt.compare(contrasena, fila.contrasena_hash));

    if (!coincide) {
        await auditar(usuario, false, 'credenciales inválidas', req);
        return res.status(401).json({ exito: false, error: 'Usuario o contraseña incorrectos.' });
    }

    // Solo comprobar la contraseña (Mi Perfil antes de un cambio): no abre sesión.
    if (req.get('X-Logitrak-Sesion') === 'verificar') {
        await auditar(usuario, true, 'verificación de contraseña', req);
        return res.json({ exito: true, usuario: publicar(fila, await choferDeFila(fila)) });
    }

    // Con la verificación en dos pasos, la contraseña sola no alcanza: se
    // devuelve un desafío de 5 minutos para mandar con el código.
    if (fila.totp_activado_en) {
        await auditar(usuario, true, 'falta el segundo factor', req);
        return res.json({
            exito: true,
            requiereSegundoFactor: true,
            desafio: firmarDesafio(fila.id),
            usuario: { usuario: fila.usuario, nombreCompleto: fila.nombre_completo },
        });
    }

    await auditar(usuario, true, null, req);
    return abrirSesion(req, res, fila);
});

rutasAuth.post('/login/segundo-factor', limiteLogin, validarRequest({ body: esquemas.segundoFactor }), async (req, res) => {
    const usuarioId = leerDesafio(req.body.desafio);
    if (!usuarioId) {
        return res.status(401).json({ exito: false, codigo: 'desafio_vencido', error: 'Pasaron más de 5 minutos. Volvé a ingresar tu contraseña.' });
    }
    const cliente = await pool.connect();
    let fila;
    let tipo;
    try {
        await cliente.query('BEGIN');
        fila = (await cliente.query('SELECT * FROM usuarios WHERE id = $1 AND eliminado_en IS NULL', [usuarioId])).rows[0] ?? null;
        tipo = fila?.totp_activado_en ? await consumirCodigo(cliente, usuarioId, req.body.codigo) : null;
        await cliente.query('COMMIT');
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo verificar el segundo factor');
        return res.status(500).json({ exito: false, error: 'No se pudo verificar el código. Probá de nuevo.' });
    } finally {
        cliente.release();
    }
    if (!fila) return res.status(401).json({ exito: false, codigo: 'desafio_vencido', error: 'Volvé a ingresar tu contraseña.' });
    if (!tipo) {
        await auditar(fila.usuario, false, 'segundo factor incorrecto', req);
        return res.status(401).json({ exito: false, codigo: 'codigo_incorrecto', error: 'El código no es correcto o ya se usó.' });
    }
    await auditar(fila.usuario, true, tipo === 'respaldo' ? 'segundo factor (código de respaldo)' : 'segundo factor', req);
    return abrirSesion(req, res, fila);
});

const SESION_VENCIDA = { exito: false, codigo: 'sesion_vencida', error: 'Tu sesión venció. Volvé a ingresar.' };

rutasAuth.post('/refresh', limiteRenovacion, validarRequest({ body: esquemas.renovar }), async (req, res) => {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const r = await rotarSesion(cliente, req.body.refreshToken, req);

        let fila = null;
        if (!r.error) {
            fila = (await cliente.query('SELECT * FROM usuarios WHERE id = $1', [r.usuarioId])).rows[0] ?? null;
        }
        await cliente.query('COMMIT');

        if (r.error === 'rotado') {
            return res.status(409).json({
                exito: false,
                codigo: 'refresh_rotado',
                error: 'La sesión se renovó hace un instante en otra pestaña. Reintentá.',
            });
        }
        if (r.error || !fila) return res.status(401).json(SESION_VENCIDA);

        let chofer = null;
        if (fila.rol === 'chofer') {
            chofer = (await consultar('SELECT codigo FROM choferes WHERE usuario_id = $1', [fila.id])).rows[0] ?? null;
        }
        return res.json({
            exito: true,
            token: firmarToken(fila, { expiresIn: duracionAccess() }),
            refreshToken: r.refreshToken,
            usuario: publicar(fila, chofer),
        });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo renovar la sesión');
        return res.status(500).json({ exito: false, error: 'No se pudo renovar la sesión.' });
    } finally {
        cliente.release();
    }
});

rutasAuth.post('/logout', validarRequest({ body: esquemas.salir }), async (req, res) => {
    await cerrarSesion(pool, req.body.refreshToken);
    return res.json({ exito: true });
});

rutasAuth.post('/registro', limiteRegistro, validarRequest({ body: esquemas.registro }), async (req, res) => {
    const { nombreCompleto: nombre, usuario, contrasena } = req.body;

    const hash = await bcrypt.hash(contrasena, 10);
    const insercion = await consultar(
        `INSERT INTO usuarios (usuario, contrasena_hash, rol, nombre_completo)
         VALUES ($1, $2, 'cliente', $3)
         ON CONFLICT (usuario) DO NOTHING
         RETURNING id`,
        [usuario, hash, nombre]
    );

    if (insercion.rowCount === 0) {
        return res.status(409).json({ exito: false, error: `El usuario "${usuario}" ya está registrado.` });
    }

    return res.status(201).json({ exito: true, mensaje: `Cuenta creada. Ya podés ingresar como "${usuario}".` });
});

rutasAuth.get('/existe/:usuario', limiteLogin, validarRequest({ params: esquemas.existe }), async (req, res) => {
    const { usuario } = req.params;
    const { rows } = await consultar('SELECT 1 FROM usuarios WHERE usuario = $1', [usuario]);
    return res.json({ exito: true, existe: rows.length > 0 });
});

rutasAuth.post('/recuperar', limiteLogin, validarRequest({ body: esquemas.recuperar }), async (req, res) => {
    const { usuario, nueva } = req.body;

    const { rows } = await consultar('SELECT id, rol, totp_activado_en FROM usuarios WHERE usuario = $1', [usuario]);
    const fila = rows[0];

    if (!fila) {
        return res.status(404).json({ exito: false, error: 'No encontramos una cuenta con ese usuario.' });
    }
    if (esPersonal(fila.rol) || fila.totp_activado_en) {
        return res.status(403).json({ exito: false, error: 'Las cuentas del equipo no se pueden restablecer desde acá.' });
    }
    const hash = await bcrypt.hash(nueva, 10);
    await consultar('UPDATE usuarios SET contrasena_hash = $1 WHERE id = $2', [hash, fila.id]);

    await revocarSesionesDeUsuario(pool, fila.id, 'cambio_clave');

    return res.json({ exito: true, mensaje: 'Contraseña actualizada. Ya podés iniciar sesión.' });
});

rutasAuth.get('/perfil', autenticar, async (req, res) => {
    const { rows } = await consultar('SELECT * FROM usuarios WHERE id = $1', [req.usuario.id]);
    const fila = rows[0];
    if (!fila) {
        return res.status(404).json({ exito: false, error: 'La cuenta ya no existe.' });
    }

    let chofer = null;
    if (fila.rol === 'chofer') {
        const r = await consultar('SELECT codigo FROM choferes WHERE usuario_id = $1', [fila.id]);
        chofer = r.rows[0] ?? null;
    }

    return res.json({ exito: true, usuario: publicar(fila, chofer) });
});