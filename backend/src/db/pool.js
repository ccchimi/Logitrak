import 'dotenv/config';
import pg from 'pg';

// Azure Database for PostgreSQL (Flexible Server) exige conexión cifrada (TLS).
// Activamos SSL cuando PGSSLMODE pide require/verify-* o cuando PGSSL=true.
// En local, sin esas variables, SSL queda apagado y todo funciona como antes.
export function configuracionSsl() {
    const modo = (process.env.PGSSLMODE || '').toLowerCase();
    const activar =
        process.env.PGSSL === 'true' || ['require', 'verify-ca', 'verify-full'].includes(modo);
    if (!activar) return false;

    // El certificado de Azure encadena a una CA pública (DigiCert/Microsoft) que
    // Node ya valida de fábrica. Si tu entorno no la tuviera, PGSSL_INSECURE=true
    // saltea la verificación (menos seguro, pero destraba en desarrollo).
    return { rejectUnauthorized: process.env.PGSSL_INSECURE !== 'true' };
}

export const pool = new pg.Pool({ ssl: configuracionSsl() });

export async function consultar(texto, params) {
    return pool.query(texto, params);
}
