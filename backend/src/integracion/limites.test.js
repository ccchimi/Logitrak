import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('límites de tiempo de PostgreSQL (integración)', { skip: SALTEAR }, () => {
    let e;
    let migrar;

    before(async () => {
        e = await levantarApi();
        ({ migrar } = await import('../db/migrar.js'));
    });

    after(async () => {
        await e?.cerrar();
    });

    async function limitesDeUnaConexion() {
        const cliente = await e.pool.connect();
        try {
            const consulta = await cliente.query('SHOW statement_timeout');
            const inactiva = await cliente.query('SHOW idle_in_transaction_session_timeout');
            return [consulta.rows[0].statement_timeout, inactiva.rows[0].idle_in_transaction_session_timeout];
        } finally {
            cliente.release();
        }
    }

    test('cada conexión del pool tiene límite por consulta y por transacción inactiva', async () => {
        assert.deepEqual(await limitesDeUnaConexion(), ['15s', '30s']);
    });

    test('una consulta que supera el límite se corta con el código 57014', async () => {
        const cliente = await e.pool.connect();
        try {
            await cliente.query('BEGIN');
            await cliente.query('SET LOCAL statement_timeout = 50');
            await assert.rejects(cliente.query('SELECT pg_sleep(1)'), { code: '57014' });
            await cliente.query('ROLLBACK');
        } finally {
            cliente.release();
        }
    });

    test('después de migrar, la conexión vuelve al pool con los límites', async () => {
        await migrar();
        const conexiones = await Promise.all([limitesDeUnaConexion(), limitesDeUnaConexion()]);
        for (const limites of conexiones) assert.deepEqual(limites, ['15s', '30s']);
    });
});
