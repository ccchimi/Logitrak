import 'dotenv/config';
import pg from 'pg';

export function configuracionSsl() {
    if (process.env.PGSSL === 'false') return false;
    return { rejectUnauthorized: process.env.PGSSL_STRICT === 'true' };
}

export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: configuracionSsl(),
});

export async function consultar(texto, params) {
    return pool.query(texto, params);
}
