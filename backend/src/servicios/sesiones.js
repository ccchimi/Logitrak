import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { firmarToken } from '../middleware/auth.js';

// Sesiones con dos tokens:
//  - access token (JWT) de vida corta, que viaja en cada pedido;
//  - refresh token opaco de vida larga, que solo sirve para pedir otro access
//    token. En la base se guarda su SHA-256, nunca el valor.
//
// Compatibilidad: las versiones de la app que no conocen el refresh token no
// mandan el encabezado X-Logitrak-Sesion, y siguen recibiendo el token largo de
// antes (JWT_EXPIRA). Ese camino se puede quitar cuando nadie use esas versiones.

export const ENCABEZADO_CLIENTE = 'x-logitrak-sesion';
const VALOR_CLIENTE = 'refresh';

// Si el mismo refresh token se presenta otra vez apenas rotado, casi siempre
// son dos pestañas renovando a la vez, no un robo: se avisa sin revocar nada.
const GRACIA_ROTACION_SEG = 30;

export const duracionAccess = (env = process.env) => env.ACCESS_TOKEN_EXPIRA || '15m';
export const diasRefresh = (env = process.env) => {
    const dias = Number(env.REFRESH_TOKEN_DIAS);
    return Number.isFinite(dias) && dias > 0 ? dias : 30;
};

export const clienteUsaRefresh = (req) => req.get(ENCABEZADO_CLIENTE) === VALOR_CLIENTE;

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export const generarRefreshToken = () => randomBytes(48).toString('base64url');

// Token de acceso para el cliente que hace el pedido: corto si sabe renovar,
// el de siempre si es una versión vieja de la app.
export function emitirAccessToken(usuario, req) {
    return clienteUsaRefresh(req) ? firmarToken(usuario, { expiresIn: duracionAccess() }) : firmarToken(usuario);
}

async function insertarToken(db, { usuarioId, familia, req }) {
    const token = generarRefreshToken();
    await db.query(
        `INSERT INTO sesiones (usuario_id, familia, token_hash, expira_en, ip, user_agent)
         VALUES ($1, $2, $3, now() + make_interval(days => $4::int), $5, $6)`,
        [usuarioId, familia, hashToken(token), diasRefresh(), req.ip ?? null, (req.get('user-agent') || '').slice(0, 300)]
    );
    return token;
}

export async function crearSesion(db, usuarioId, req) {
    // Limpieza acotada a la cuenta: sesiones vencidas o revocadas hace más de un día.
    await db.query(
        `DELETE FROM sesiones
         WHERE usuario_id = $1 AND (expira_en < now() OR revocado_en < now() - interval '1 day')`,
        [usuarioId]
    );
    return insertarToken(db, { usuarioId, familia: randomUUID(), req });
}

async function revocarFamilia(db, familia, motivo) {
    await db.query(
        `UPDATE sesiones SET revocado_en = now(), motivo_revocacion = $2
         WHERE familia = $1 AND revocado_en IS NULL`,
        [familia, motivo]
    );
}

// Cambia un refresh token por uno nuevo (rotación). Recibe un cliente con una
// transacción abierta. Devuelve { usuarioId, refreshToken } o { error }.
export async function rotarSesion(db, refreshToken, req) {
    const { rows } = await db.query('SELECT * FROM sesiones WHERE token_hash = $1 FOR UPDATE', [hashToken(refreshToken)]);
    const sesion = rows[0];
    if (!sesion) return { error: 'invalido' };

    if (sesion.revocado_en) {
        const segundos = (Date.now() - new Date(sesion.revocado_en).getTime()) / 1000;
        if (sesion.motivo_revocacion === 'rotado' && segundos <= GRACIA_ROTACION_SEG) {
            return { error: 'rotado' };
        }
        // Un token ya usado vuelve a aparecer: alguien lo copió. Se corta toda
        // la cadena, incluido el token vigente que tenga el dueño legítimo.
        if (sesion.motivo_revocacion === 'rotado') await revocarFamilia(db, sesion.familia, 'reutilizado');
        return { error: 'revocado' };
    }

    if (new Date(sesion.expira_en).getTime() <= Date.now()) return { error: 'vencido' };

    await db.query(`UPDATE sesiones SET revocado_en = now(), motivo_revocacion = 'rotado' WHERE id = $1`, [sesion.id]);
    const nuevo = await insertarToken(db, { usuarioId: sesion.usuario_id, familia: sesion.familia, req });
    return { usuarioId: sesion.usuario_id, refreshToken: nuevo };
}

// Cierre de sesión: revoca la cadena del token presentado. Es idempotente y no
// revela si el token existía.
export async function cerrarSesion(db, refreshToken) {
    const { rows } = await db.query('SELECT familia FROM sesiones WHERE token_hash = $1', [hashToken(refreshToken)]);
    if (rows[0]) await revocarFamilia(db, rows[0].familia, 'logout');
}

export async function revocarSesionesDeUsuario(db, usuarioId, motivo) {
    await db.query(
        `UPDATE sesiones SET revocado_en = now(), motivo_revocacion = $2
         WHERE usuario_id = $1 AND revocado_en IS NULL`,
        [usuarioId, motivo]
    );
}
