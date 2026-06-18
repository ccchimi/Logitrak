import 'dotenv/config';
import pg from 'pg';

export function configuracionSsl() {
    const modo = (process.env.PGSSLMODE || '').toLowerCase();
    const activar =
        process.env.PGSSL === 'true' || ['require', 'verify-ca', 'verify-full'].includes(modo);
    if (!activar) return false;
    return { rejectUnauthorized: process.env.PGSSL_INSECURE !== 'true' };
}

export const pool = new pg.Pool({ ssl: configuracionSsl() });

export async function consultar(texto, params) {
    return pool.query(texto, params);
}
