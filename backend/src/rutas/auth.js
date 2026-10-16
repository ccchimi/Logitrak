import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { consultar } from '../db/pool.js';
import { autenticar, firmarToken } from '../middleware/auth.js';

export const rutasAuth = Router();

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { exito: false, error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});

function publicar(fila, chofer) {
    return {
        id: fila.id,
        usuario: fila.usuario,
        rol: fila.rol,
        nombreCompleto: fila.nombre_completo,
        chofer: chofer ? { codigo: chofer.codigo } : null,
    };
}

async function auditar(usuario, exito, motivo, req) {
    try {
        await consultar(
            `INSERT INTO auditoria_accesos (usuario, exito, motivo, ip, user_agent)
             VALUES ($1, $2, $3, $4, $5)`,
            [usuario.slice(0, 20), exito, motivo, req.ip, (req.headers['user-agent'] || '').slice(0, 300)]
        );
    } catch (e) {
        console.error('No se pudo auditar el acceso:', e.message);
    }
}

rutasAuth.post('/login', limiteLogin, async (req, res) => {
    const usuario = (req.body?.usuario || '').trim().toLowerCase();
    const contrasena = (req.body?.contrasena || '').trim();

    if (!usuario || !contrasena) {
        return res.status(400).json({ exito: false, error: 'Por favor, completá todos los campos.' });
    }

    const { rows } = await consultar('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
    const fila = rows[0];
    const coincide = fila && (await bcrypt.compare(contrasena, fila.contrasena_hash));

    if (!coincide) {
        await auditar(usuario, false, 'credenciales inválidas', req);
        return res.status(401).json({ exito: false, error: 'Usuario o contraseña incorrectos.' });
    }

    let chofer = null;
    if (fila.rol === 'chofer') {
        const r = await consultar('SELECT codigo FROM choferes WHERE usuario_id = $1', [fila.id]);
        chofer = r.rows[0] ?? null;
    }

    await auditar(usuario, true, null, req);
    return res.json({ exito: true, token: firmarToken(fila), usuario: publicar(fila, chofer) });
});

rutasAuth.post('/registro', async (req, res) => {
    const nombre = (req.body?.nombreCompleto || '').trim();
    const usuario = (req.body?.usuario || '').trim().toLowerCase();
    const contrasena = req.body?.contrasena || '';
    const confirmacion = req.body?.confirmacion || '';

    if (nombre.length < 3) {
        return res.status(400).json({ exito: false, error: 'Ingresá tu nombre completo.' });
    }
    if (!/^[a-z0-9._-]{3,20}$/.test(usuario)) {
        return res.status(400).json({
            exito: false,
            error: 'El usuario debe tener entre 3 y 20 caracteres (letras, números, punto, guión).',
        });
    }
    if (contrasena.length < 8) {
        return res.status(400).json({ exito: false, error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (contrasena !== confirmacion) {
        return res.status(400).json({ exito: false, error: 'Las contraseñas no coinciden.' });
    }

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

rutasAuth.get('/existe/:usuario', limiteLogin, async (req, res) => {
    const usuario = (req.params.usuario || '').trim().toLowerCase();
    const { rows } = await consultar('SELECT 1 FROM usuarios WHERE usuario = $1', [usuario]);
    return res.json({ exito: true, existe: rows.length > 0 });
});

rutasAuth.post('/recuperar', limiteLogin, async (req, res) => {
    const usuario = (req.body?.usuario || '').trim().toLowerCase();
    const nueva = req.body?.nueva || '';
    const confirmacion = req.body?.confirmacion || '';

    const { rows } = await consultar('SELECT id, rol FROM usuarios WHERE usuario = $1', [usuario]);
    const fila = rows[0];

    if (!fila) {
        return res.status(404).json({ exito: false, error: 'No encontramos una cuenta con ese usuario.' });
    }
    if (fila.rol === 'admin') {
        return res.status(403).json({ exito: false, error: 'Las cuentas de administrador no se pueden restablecer desde acá.' });
    }
    if (nueva.length < 8) {
        return res.status(400).json({ exito: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }
    if (nueva !== confirmacion) {
        return res.status(400).json({ exito: false, error: 'Las contraseñas no coinciden.' });
    }

    const hash = await bcrypt.hash(nueva, 10);
    await consultar('UPDATE usuarios SET contrasena_hash = $1 WHERE id = $2', [hash, fila.id]);

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