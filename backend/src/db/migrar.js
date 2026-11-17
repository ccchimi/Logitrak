import '../config/entorno.js';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import { pool, sentenciaDeLimites } from './pool.js';
import { logger } from '../observabilidad/logger.js';

export const DIR_MIGRACIONES = fileURLToPath(new URL('../../migrations', import.meta.url));
export const TABLA_MIGRACIONES = 'pgmigrations';

const silencioso = { debug() {}, info() {}, warn: (m) => logger.warn(m), error: (m) => logger.error(m) };

export async function migrar({ direction = 'up', count, verbose = false } = {}) {
    const cliente = await pool.connect();
    try {
        await cliente.query('SET statement_timeout = 0; SET idle_in_transaction_session_timeout = 0');
        const aplicadas = await runner({
            dbClient: cliente,
            dir: DIR_MIGRACIONES,
            migrationsTable: TABLA_MIGRACIONES,
            direction,
            count,
            checkOrder: true,
            singleTransaction: true,
            advisoryLockMode: 'wait',
            logger: verbose ? console : silencioso,
        });
        return aplicadas.map((m) => m.name);
    } finally {
        const restaurado = await cliente.query(sentenciaDeLimites()).then(() => true, () => false);
        cliente.release(!restaurado);
    }
}
