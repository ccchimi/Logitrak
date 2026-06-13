import 'dotenv/config';
import pg from 'pg';

export const pool = new pg.Pool();

export async function consultar(texto, params) {
    return pool.query(texto, params);
}
