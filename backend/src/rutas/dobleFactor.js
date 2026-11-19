import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';
import { limiteLogin } from '../middleware/limites.js';
import { esPersonal } from '../middleware/permisos.js';
import { validarRequest } from '../middleware/validar.js';
import { log, registrarError } from '../observabilidad/logger.js';
import { registrarEvento } from '../outbox/index.js';
import { generarQrDataUrl } from '../servicios/pagos/qr.js';
import {
    cifrarSecreto,
    consumirCodigo,
    descifrarSecreto,
    desactivarDobleFactor,
    estadoDobleFactor,
    generarSecreto,
    MINUTOS_ACTIVACION,
    reemplazarCodigosRespaldo,
    uriOtpauth,
    verificarTotp,
    base32,
} from '../servicios/dobleFactor.js';

// Verificación en dos pasos desde Mi Perfil. Montado en /api/perfil/doble-factor.
// Por ahora es para el equipo (admin y soporte): son las cuentas que pueden
// devolver dinero, cambiar roles y ver documentos.
export const rutasDobleFactor = Router();

const contrasena = z
    .string({ error: 'Ingresá tu contraseña.' })
    .min(1, 'Ingresá tu contraseña.')
    .max(128, 'La contraseña no puede superar los 128 caracteres.');
const codigo = z
    .string({ error: 'Ingresá el código.' })
    .trim()
    .min(6, 'Ingresá el código de 6 dígitos o un código de respaldo.')
    .max(20, 'El código es demasiado largo.');

const soloEquipo = (req, res, next) =>
    esPersonal(req.usuario.rol)
        ? next()
        : res.status(403).json({ exito: false, error: 'La verificación en dos pasos está disponible para las cuentas del equipo.' });

async function contrasenaCorrecta(db, usuarioId, valor) {
    const { rows } = await db.query('SELECT contrasena_hash FROM usuarios WHERE id = $1 AND eliminado_en IS NULL', [usuarioId]);
    return Boolean(rows[0]) && (await bcrypt.compare(valor, rows[0].contrasena_hash));
}

// Lo que ve la app en Mi Perfil: si la tiene disponible (solo el equipo) y cómo está.
const estadoPara = async (req) => ({ disponible: esPersonal(req.usuario.rol), ...(await estadoDobleFactor(pool, req.usuario.id)) });

rutasDobleFactor.get('/', autenticar, async (req, res) => res.json({ exito: true, dobleFactor: await estadoPara(req) }));

// Paso 1: con la contraseña, genera un secreto nuevo (todavía no activo) y
// devuelve el QR para escanear con la app autenticadora.
rutasDobleFactor.post('/iniciar', limiteLogin, autenticar, soloEquipo, validarRequest({ body: z.object({ contrasena }) }), async (req, res) => {
    if (!(await contrasenaCorrecta(pool, req.usuario.id, req.body.contrasena))) {
        return res.status(401).json({ exito: false, codigo: 'contrasena_incorrecta', error: 'La contraseña no es correcta.' });
    }
    if ((await estadoDobleFactor(pool, req.usuario.id)).activado) {
        return res.status(409).json({ exito: false, error: 'Ya tenés activada la verificación en dos pasos.' });
    }
    const secreto = generarSecreto();
    await pool.query('UPDATE usuarios SET totp_pendiente = $2, totp_pendiente_en = now() WHERE id = $1', [req.usuario.id, cifrarSecreto(secreto)]);
    const uri = uriOtpauth(req.usuario.usuario, secreto);
    return res.json({ exito: true, secreto: base32(secreto), uri, qr: await generarQrDataUrl(uri) });
});

// Paso 2: con el primer código de la app, la activa y entrega los códigos de
// respaldo (se muestran una sola vez).
rutasDobleFactor.post('/activar', limiteLogin, autenticar, soloEquipo, validarRequest({ body: z.object({ codigo }) }), async (req, res) => {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `SELECT totp_pendiente, totp_pendiente_en, totp_activado_en FROM usuarios WHERE id = $1 FOR UPDATE`,
            [req.usuario.id]
        );
        const u = rows[0];
        const vigente = u?.totp_pendiente && Date.now() - new Date(u.totp_pendiente_en).getTime() < MINUTOS_ACTIVACION * 60_000;
        if (u?.totp_activado_en || !vigente) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({
                exito: false,
                error: u?.totp_activado_en ? 'Ya tenés activada la verificación en dos pasos.' : 'Empezá de nuevo: el QR venció o no se generó.',
            });
        }
        const paso = verificarTotp(descifrarSecreto(u.totp_pendiente), req.body.codigo);
        if (paso === null) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({ exito: false, codigo: 'codigo_incorrecto', error: 'El código no coincide. Revisá la hora del teléfono y probá con el próximo.' });
        }
        await cliente.query(
            `UPDATE usuarios SET totp_secreto = totp_pendiente, totp_pendiente = NULL, totp_pendiente_en = NULL,
                    totp_activado_en = now(), totp_ultimo_paso = $2
             WHERE id = $1`,
            [req.usuario.id, paso]
        );
        const codigos = await reemplazarCodigosRespaldo(cliente, req.usuario.id);
        await registrarEvento(cliente, {
            tipoAgregado: 'usuario',
            idAgregado: String(req.usuario.id),
            tipo: 'usuario.doble_factor',
            datos: { usuarioId: req.usuario.id, accion: 'activado' },
        });
        await cliente.query('COMMIT');
        log().info('Verificación en dos pasos activada');
        return res.json({ exito: true, codigosRespaldo: codigos, dobleFactor: await estadoPara(req) });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo activar la verificación en dos pasos');
        return res.status(500).json({ exito: false, error: 'No se pudo activar. Probá de nuevo.' });
    } finally {
        cliente.release();
    }
});

// Desactivar o generar códigos de respaldo nuevos pide la contraseña y un código.
async function conContrasenaYCodigo(req, res, accion) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        if (!(await contrasenaCorrecta(cliente, req.usuario.id, req.body.contrasena))) {
            await cliente.query('ROLLBACK');
            return res.status(401).json({ exito: false, codigo: 'contrasena_incorrecta', error: 'La contraseña no es correcta.' });
        }
        if (!(await estadoDobleFactor(cliente, req.usuario.id)).activado) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ exito: false, error: 'No tenés activada la verificación en dos pasos.' });
        }
        if (!(await consumirCodigo(cliente, req.usuario.id, req.body.codigo))) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({ exito: false, codigo: 'codigo_incorrecto', error: 'El código no es correcto o ya se usó.' });
        }
        const resultado = await accion(cliente);
        await cliente.query('COMMIT');
        return res.json({ exito: true, ...resultado, dobleFactor: await estadoPara(req) });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo cambiar la verificación en dos pasos');
        return res.status(500).json({ exito: false, error: 'No se pudo completar. Probá de nuevo.' });
    } finally {
        cliente.release();
    }
}

const contrasenaYCodigo = z.object({ contrasena, codigo });

rutasDobleFactor.post('/desactivar', limiteLogin, autenticar, validarRequest({ body: contrasenaYCodigo }), (req, res) =>
    conContrasenaYCodigo(req, res, async (cliente) => {
        await desactivarDobleFactor(cliente, req.usuario.id);
        await registrarEvento(cliente, {
            tipoAgregado: 'usuario',
            idAgregado: String(req.usuario.id),
            tipo: 'usuario.doble_factor',
            datos: { usuarioId: req.usuario.id, accion: 'desactivado' },
        });
        log().info('Verificación en dos pasos desactivada por su titular');
        return {};
    })
);

rutasDobleFactor.post('/codigos', limiteLogin, autenticar, validarRequest({ body: contrasenaYCodigo }), (req, res) =>
    conContrasenaYCodigo(req, res, async (cliente) => ({ codigosRespaldo: await reemplazarCodigosRespaldo(cliente, req.usuario.id) }))
);

