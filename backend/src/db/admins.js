import bcrypt from 'bcryptjs';
import { log } from '../observabilidad/logger.js';

export const LARGO_MINIMO_CONTRASENA_ADMIN = 12;
const USUARIO_VALIDO = /^[a-z0-9._-]{3,20}$/;

export function leerAdminInicial(env = process.env) {
    const usuario = (env.ADMIN_INICIAL_USUARIO ?? '').trim().toLowerCase();
    const contrasena = env.ADMIN_INICIAL_CONTRASENA ?? '';
    if (!usuario && !contrasena) return { configurado: false };
    if (!USUARIO_VALIDO.test(usuario)) {
        return { configurado: true, error: 'ADMIN_INICIAL_USUARIO debe tener entre 3 y 20 caracteres (letras, números, punto, guión).' };
    }
    if (contrasena.length < LARGO_MINIMO_CONTRASENA_ADMIN) {
        return { configurado: true, error: `ADMIN_INICIAL_CONTRASENA debe tener al menos ${LARGO_MINIMO_CONTRASENA_ADMIN} caracteres.` };
    }
    if (contrasena.toLowerCase().includes(usuario)) {
        return { configurado: true, error: 'ADMIN_INICIAL_CONTRASENA no puede contener el nombre de usuario.' };
    }
    return { configurado: true, usuario, contrasena };
}

export async function sembrarAdminInicial(db, env = process.env) {
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM usuarios WHERE rol = 'admin' AND eliminado_en IS NULL`);
    if (rows[0].n > 0) return 'ya_hay_admins';

    const config = leerAdminInicial(env);
    if (!config.configurado) {
        log().warn('No hay ningún administrador: definí ADMIN_INICIAL_USUARIO y ADMIN_INICIAL_CONTRASENA para crear el primero.');
        return 'sin_configurar';
    }
    if (config.error) {
        log().error({ motivo: config.error }, 'No se creó el administrador inicial');
        return 'invalido';
    }

    const hash = await bcrypt.hash(config.contrasena, 10);
    const r = await db.query(
        `INSERT INTO usuarios (usuario, contrasena_hash, rol, nombre_completo)
         VALUES ($1, $2, 'admin', $1)
         ON CONFLICT (usuario) DO NOTHING`,
        [config.usuario, hash]
    );
    if (!r.rowCount) {
        log().error({ usuario: config.usuario }, 'No se creó el administrador inicial: ese usuario ya existe con otro rol');
        return 'usuario_ocupado';
    }
    log().info({ usuario: config.usuario }, 'Administrador inicial creado');
    return 'creado';
}

export async function adminsConContrasenaIgualAlUsuario(db) {
    const { rows } = await db.query(
        `SELECT usuario, contrasena_hash FROM usuarios WHERE rol = 'admin' AND eliminado_en IS NULL`
    );
    const debiles = [];
    for (const fila of rows) {
        if (await bcrypt.compare(fila.usuario, fila.contrasena_hash)) debiles.push(fila.usuario);
    }
    return debiles;
}
