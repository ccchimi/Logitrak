// Migraciones versionadas contra PostgreSQL real.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { levantarApi, SALTEAR } from './entorno.js';

describe('migraciones (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let migrar;
    let DIR_MIGRACIONES;

    before(async () => {
        entorno = await levantarApi();
        ({ migrar, DIR_MIGRACIONES } = await import('../db/migrar.js'));
    });

    after(() => entorno?.cerrar());

    test('todas las migraciones del repo quedan registradas, en orden', async () => {
        const archivos = readdirSync(DIR_MIGRACIONES).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')).sort();
        const { rows } = await entorno.pool.query('SELECT name FROM pgmigrations ORDER BY run_on, id');

        assert.ok(archivos.length > 0);
        assert.deepEqual(rows.map((r) => r.name), archivos);
    });

    test('volver a migrar no aplica nada', async () => {
        assert.deepEqual(await migrar(), []);
    });

    test('/api/salud informa la base conectada y sin migraciones pendientes', async () => {
        const r = await entorno.api('/api/salud');
        assert.equal(r.status, 200);
        assert.equal(r.body.baseDeDatos, 'conectada');
        assert.equal(r.body.componentes.baseDeDatos.estado, 'ok');
        assert.equal(r.body.componentes.baseDeDatos.migracionesPendientes, 0);
        assert.equal((await entorno.api('/api/salud/vivo')).body.estado, 'vivo');
    });

    test('la migración base no se revierte en producción', async () => {
        const antes = process.env.RENDER;
        process.env.RENDER = 'true';
        try {
            await assert.rejects(migrar({ direction: 'down', count: 1 }), /no se revierte en producción/);
        } finally {
            if (antes === undefined) delete process.env.RENDER;
            else process.env.RENDER = antes;
        }
        const { rowCount } = await entorno.pool.query('SELECT 1 FROM usuarios LIMIT 1');
        assert.ok(rowCount >= 0, 'las tablas siguen ahí');
    });
});
