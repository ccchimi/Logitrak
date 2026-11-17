import '../config/entorno.js';
import pg from 'pg';
import { logger } from '../observabilidad/logger.js';

export function configuracionSsl() {
    if (process.env.PGSSL === 'false') return false;
    return { rejectUnauthorized: process.env.PGSSL_STRICT === 'true' };
}

const POR_DEFECTO = { consultaMs: 15000, transaccionInactivaMs: 30000, conexionMs: 10000 };

function milisegundos(valor, porDefecto) {
    if (valor === undefined || valor === '') return porDefecto;
    const n = Number(valor);
    return Number.isInteger(n) && n > 0 ? n : porDefecto;
}

export function limitesDeTiempo(env = process.env) {
    return {
        consultaMs: milisegundos(env.DB_LIMITE_CONSULTA_MS, POR_DEFECTO.consultaMs),
        transaccionInactivaMs: milisegundos(env.DB_LIMITE_TRANSACCION_INACTIVA_MS, POR_DEFECTO.transaccionInactivaMs),
        conexionMs: milisegundos(env.DB_LIMITE_CONEXION_MS, POR_DEFECTO.conexionMs),
    };
}

export const limites = limitesDeTiempo();

export function sentenciaDeLimites({ consultaMs, transaccionInactivaMs } = limites) {
    return `SET statement_timeout = ${consultaMs}; SET idle_in_transaction_session_timeout = ${transaccionInactivaMs}`;
}

export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: configuracionSsl(),
    connectionTimeoutMillis: limites.conexionMs,
    onConnect: (cliente) => cliente.query(sentenciaDeLimites()),
});

pool.on('error', (err) => {
    logger.warn({ err }, 'Se cortó una conexión inactiva con PostgreSQL; el pool la reemplaza');
});

export async function consultar(texto, params) {
    return pool.query(texto, params);
}
