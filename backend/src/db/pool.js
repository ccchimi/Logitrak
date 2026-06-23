import 'dotenv/config';
import pg from 'pg';

export function configuracionSsl() {
    // Supabase (y cualquier Postgres gestionado en la nube) exige TLS, así que lo
    // dejamos activo por defecto. PGSSL=false lo apaga (p. ej. un Postgres sin TLS).
    if (process.env.PGSSL === 'false') return false;
    // rejectUnauthorized=false evita el error "self-signed certificate in chain"
    // del pooler de Supabase. Poné PGSSL_STRICT=true para validar el CA.
    return { rejectUnauthorized: process.env.PGSSL_STRICT === 'true' };
}

// La conexión sale del connection string de Supabase (DATABASE_URL). Si no está
// definido, `pg` cae a las variables PG* del entorno.
export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: configuracionSsl(),
});

export async function consultar(texto, params) {
    return pool.query(texto, params);
}
