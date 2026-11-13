import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crearChequeoSalud, TTL_TERCEROS_MS } from './salud.js';

const dir = mkdtempSync(join(tmpdir(), 'logitrak-mig-'));
writeFileSync(join(dir, '1_base.js'), '');
writeFileSync(join(dir, '2_nueva.js'), '');

function armar({ aplicadas = ['1_base', '2_nueva'], dbCaida = false, mpStatus = 200, storage = { estado: 'ok' }, env = {} } = {}) {
    let ahora = 1_000_000;
    const llamadas = { mp: 0, storage: 0 };
    const chequear = crearChequeoSalud({
        consultar: async (sql) => {
            if (dbCaida) throw new Error('ECONNREFUSED');
            return sql.includes('pgmigrations') ? { rows: aplicadas.map((name) => ({ name })) } : { rows: [{}] };
        },
        dirMigraciones: dir,
        verificarAlmacenamiento: async () => {
            llamadas.storage++;
            return storage;
        },
        fetchImpl: async (url, opciones) => {
            llamadas.mp++;
            assert.equal(url, 'https://api.mercadopago.com/users/me');
            assert.equal(opciones.headers.Authorization, 'Bearer APP_USR-1');
            return { ok: mpStatus === 200, status: mpStatus };
        },
        env: { MP_ACCESS_TOKEN: 'APP_USR-1', DATABASE_URL: 'x', JWT_SECRET: 'x'.repeat(40), ...env },
        reloj: () => ahora,
    });
    return { chequear, llamadas, avanzar: (ms) => (ahora += ms) };
}

describe('chequeo de salud', () => {
    test('todo bien: ok, con latencia, sin migraciones pendientes', async () => {
        const { chequear } = armar({ env: { GOOGLE_DIRECTIONS_KEY: 'k', RENDER_GIT_COMMIT: 'abcdef1234' } });
        const s = await chequear();

        assert.equal(s.estado, 'ok');
        assert.equal(s.exito, true);
        assert.equal(s.baseDeDatos, 'conectada');
        assert.equal(s.version, 'abcdef1');
        assert.equal(s.componentes.baseDeDatos.estado, 'ok');
        assert.equal(s.componentes.baseDeDatos.migracionesPendientes, 0);
        assert.equal(typeof s.componentes.baseDeDatos.latenciaMs, 'number');
        assert.equal(s.componentes.mercadoPago.estado, 'ok');
        assert.equal(s.componentes.almacenamiento.estado, 'ok');
        assert.equal(s.componentes.googleDirections.estado, 'configurado');
        assert.equal(s.componentes.modo.estado, 'no_configurado');
    });

    test('base caída: estado error (la ruta responde 503)', async () => {
        const s = await armar({ dbCaida: true }).chequear();
        assert.equal(s.estado, 'error');
        assert.equal(s.exito, false);
        assert.equal(s.baseDeDatos, 'sin conexión');
    });

    test('un tercero con error o una migración pendiente degradan, pero no tiran la API', async () => {
        assert.equal((await armar({ mpStatus: 401 }).chequear()).estado, 'degradado');
        assert.equal((await armar({ storage: { estado: 'error', motivo: 'bucket público' } }).chequear()).estado, 'degradado');
        const pendiente = await armar({ aplicadas: ['1_base'] }).chequear();
        assert.equal(pendiente.estado, 'degradado');
        assert.equal(pendiente.componentes.baseDeDatos.migracionesPendientes, 1);
    });

    test('no configurado no es un error', async () => {
        const s = await armar({ storage: { estado: 'no_configurado' }, env: { MP_ACCESS_TOKEN: '' } }).chequear();
        assert.equal(s.estado, 'ok');
        assert.equal(s.componentes.mercadoPago.estado, 'no_configurado');
    });

    test('los terceros se consultan como mucho una vez por minuto, aunque fallen', async () => {
        const { chequear, llamadas, avanzar } = armar({ mpStatus: 500 });
        await chequear();
        await chequear();
        avanzar(TTL_TERCEROS_MS - 1);
        await chequear();
        assert.deepEqual(llamadas, { mp: 1, storage: 1 });

        avanzar(2);
        await chequear();
        assert.deepEqual(llamadas, { mp: 2, storage: 2 });
    });

    test('la respuesta no expone el motivo de los errores', async () => {
        const s = await armar({ storage: { estado: 'error', motivo: 'service_role inválida' } }).chequear();
        assert.doesNotMatch(JSON.stringify(s), /service_role/);
    });
});
