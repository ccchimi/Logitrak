import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

// Verificación en dos pasos con TOTP (RFC 6238): el código de 6 dígitos que
// muestran Google Authenticator, Authy, 1Password y similares. Se implementa con
// node:crypto, sin dependencias. El secreto se guarda cifrado (AES-256-GCM) y los
// códigos de respaldo, como hash SHA-256.

export const PERIODO_SEG = 30;
export const DIGITOS = 6;
export const VENTANA = 1; // acepta el código anterior y el siguiente (reloj desfasado)
export const CANTIDAD_RESPALDO = 10;
export const MINUTOS_DESAFIO = 5;
export const MINUTOS_ACTIVACION = 15;
const EMISOR = 'Logitrak';
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(buffer) {
    let bits = '';
    for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
    let salida = '';
    for (let i = 0; i < bits.length; i += 5) salida += BASE32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
    return salida;
}

export function desdeBase32(texto) {
    const limpio = texto.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
    let bits = '';
    for (const c of limpio) {
        const v = BASE32.indexOf(c);
        if (v < 0) throw new Error('Base32 inválido');
        bits += v.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
    return Buffer.from(bytes);
}

export const generarSecreto = () => randomBytes(20);

export function pasoDe(ahora = Date.now()) {
    return Math.floor(ahora / 1000 / PERIODO_SEG);
}

export function codigoTotp(secreto, paso, digitos = DIGITOS) {
    const contador = Buffer.alloc(8);
    contador.writeBigUInt64BE(BigInt(paso));
    const hmac = createHmac('sha1', secreto).update(contador).digest();
    const desde = hmac[hmac.length - 1] & 0x0f;
    const numero = (hmac.readUInt32BE(desde) & 0x7fffffff) % 10 ** digitos;
    return String(numero).padStart(digitos, '0');
}

/**
 * Devuelve el paso que coincide con el código, o null. No acepta un paso igual
 * o anterior al último usado: el mismo código no sirve dos veces.
 */
export function verificarTotp(secreto, codigo, { ahora = Date.now(), ultimoPaso = null } = {}) {
    if (typeof codigo !== 'string' || !/^\d{6}$/.test(codigo)) return null;
    const actual = pasoDe(ahora);
    for (let d = -VENTANA; d <= VENTANA; d++) {
        const paso = actual + d;
        if (ultimoPaso !== null && paso <= Number(ultimoPaso)) continue;
        const esperado = codigoTotp(secreto, paso);
        if (timingSafeEqual(Buffer.from(esperado), Buffer.from(codigo))) return paso;
    }
    return null;
}

export function uriOtpauth(usuario, secreto) {
    const etiqueta = encodeURIComponent(`${EMISOR}:${usuario}`);
    return `otpauth://totp/${etiqueta}?secret=${base32(secreto)}&issuer=${EMISOR}&algorithm=SHA1&digits=${DIGITOS}&period=${PERIODO_SEG}`;
}

// --- Cifrado del secreto --------------------------------------------------

function claveDeCifrado(env = process.env) {
    const base = env.DOBLE_FACTOR_CLAVE || env.JWT_SECRET;
    if (!base) throw new Error('Falta JWT_SECRET (o DOBLE_FACTOR_CLAVE) para cifrar el segundo factor.');
    return Buffer.from(hkdfSync('sha256', base, 'logitrak', 'doble-factor-totp', 32));
}

export function cifrarSecreto(secreto, env) {
    const iv = randomBytes(12);
    const cifrador = createCipheriv('aes-256-gcm', claveDeCifrado(env), iv);
    const datos = Buffer.concat([cifrador.update(secreto), cifrador.final()]);
    return ['v1', iv.toString('base64'), cifrador.getAuthTag().toString('base64'), datos.toString('base64')].join('.');
}

export function descifrarSecreto(texto, env) {
    const [version, iv, etiqueta, datos] = String(texto).split('.');
    if (version !== 'v1') throw new Error('Formato de secreto desconocido');
    const descifrador = createDecipheriv('aes-256-gcm', claveDeCifrado(env), Buffer.from(iv, 'base64'));
    descifrador.setAuthTag(Buffer.from(etiqueta, 'base64'));
    return Buffer.concat([descifrador.update(Buffer.from(datos, 'base64')), descifrador.final()]);
}

// --- Códigos de respaldo --------------------------------------------------

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789'; // sin 0/o, 1/l/i

export function generarCodigosRespaldo(cantidad = CANTIDAD_RESPALDO) {
    return Array.from({ length: cantidad }, () => {
        const c = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
        return `${c.slice(0, 4)}-${c.slice(4)}`;
    });
}

export function normalizarRespaldo(codigo) {
    return String(codigo).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function hashRespaldo(codigo) {
    return createHash('sha256').update(normalizarRespaldo(codigo)).digest('hex');
}

export const pareceRespaldo = (codigo) => /^[a-z0-9]{8}$/.test(normalizarRespaldo(codigo)) && !/^\d+$/.test(normalizarRespaldo(codigo));

// --- Desafío del login ----------------------------------------------------
// Después de la contraseña, el login devuelve un token de "falta el código". Se
// firma con una clave derivada distinta de la de las sesiones, así no sirve
// como token de acceso.

function claveDesafio(env = process.env) {
    return `${env.JWT_SECRET}:segundo-factor`;
}

export function firmarDesafio(usuarioId, env) {
    return jwt.sign({ sub: String(usuarioId), proposito: 'segundo_factor' }, claveDesafio(env), { expiresIn: `${MINUTOS_DESAFIO}m` });
}

export function leerDesafio(token, env) {
    try {
        const datos = jwt.verify(token, claveDesafio(env));
        if (datos.proposito !== 'segundo_factor') return null;
        const id = Number(datos.sub);
        return Number.isInteger(id) ? id : null;
    } catch {
        return null;
    }
}

// --- Verificación contra la base ------------------------------------------

/**
 * Comprueba un código (TOTP o de respaldo) para la cuenta, dentro de la
 * transacción de `db`, y lo consume: el paso del TOTP queda registrado y el
 * código de respaldo, marcado como usado. Devuelve 'totp', 'respaldo' o null.
 */
export async function consumirCodigo(db, usuarioId, codigo, ahora = Date.now()) {
    const { rows } = await db.query('SELECT totp_secreto, totp_ultimo_paso FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
    const u = rows[0];
    if (!u?.totp_secreto) return null;
    const limpio = String(codigo ?? '').replace(/\s/g, '');

    if (/^\d{6}$/.test(limpio)) {
        const paso = verificarTotp(descifrarSecreto(u.totp_secreto), limpio, { ahora, ultimoPaso: u.totp_ultimo_paso });
        if (paso === null) return null;
        await db.query('UPDATE usuarios SET totp_ultimo_paso = $2 WHERE id = $1', [usuarioId, paso]);
        return 'totp';
    }
    if (pareceRespaldo(limpio)) {
        const r = await db.query(
            `UPDATE codigos_respaldo SET usado_en = now()
             WHERE id = (SELECT id FROM codigos_respaldo WHERE usuario_id = $1 AND hash = $2 AND usado_en IS NULL LIMIT 1)
             RETURNING id`,
            [usuarioId, hashRespaldo(limpio)]
        );
        return r.rowCount ? 'respaldo' : null;
    }
    return null;
}

export async function reemplazarCodigosRespaldo(db, usuarioId) {
    const codigos = generarCodigosRespaldo();
    await db.query('DELETE FROM codigos_respaldo WHERE usuario_id = $1', [usuarioId]);
    await db.query(
        'INSERT INTO codigos_respaldo (usuario_id, hash) SELECT $1, unnest($2::char(64)[])',
        [usuarioId, codigos.map(hashRespaldo)]
    );
    return codigos;
}

export async function estadoDobleFactor(db, usuarioId) {
    const { rows } = await db.query(
        `SELECT u.totp_activado_en,
                (SELECT count(*)::int FROM codigos_respaldo c WHERE c.usuario_id = u.id AND c.usado_en IS NULL) AS restantes
         FROM usuarios u WHERE u.id = $1`,
        [usuarioId]
    );
    const u = rows[0];
    return {
        activado: Boolean(u?.totp_activado_en),
        activadoEn: u?.totp_activado_en ? new Date(u.totp_activado_en).toISOString() : null,
        codigosRestantes: u?.totp_activado_en ? u.restantes : 0,
    };
}

export async function desactivarDobleFactor(db, usuarioId) {
    await db.query(
        `UPDATE usuarios SET totp_secreto = NULL, totp_pendiente = NULL, totp_pendiente_en = NULL,
                totp_activado_en = NULL, totp_ultimo_paso = NULL
         WHERE id = $1`,
        [usuarioId]
    );
    await db.query('DELETE FROM codigos_respaldo WHERE usuario_id = $1', [usuarioId]);
}
