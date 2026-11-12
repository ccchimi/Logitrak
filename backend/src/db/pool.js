import 'dotenv/config';
import pg from 'pg';
import { logger } from '../observabilidad/logger.js';

export function configuracionSsl() {
    if (process.env.PGSSL === 'false') return false;
    return { rejectUnauthorized: process.env.PGSSL_STRICT === 'true' };
}

export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: configuracionSsl(),
});

// Si se corta una conexión inactiva (reinicio del pooler de Supabase, corte de
// red), pg emite 'error' en el pool. Sin este manejador ese evento tira abajo
// todo el proceso; con él, el pool descarta la conexión y abre otra al próximo
// pedido.
pool.on('error', (err) => {
    logger.warn({ err }, 'Se cortó una conexión inactiva con PostgreSQL; el pool la reemplaza');
});

export async function consultar(texto, params) {
    return pool.query(texto, params);
}
