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

    test('la migración base no se revierte en staging ni en producción', async () => {
        // Se llama al down directamente: revertir de verdad tocaría la base que
        // comparten las otras pruebas.
        const base = await import('../../migrations/1794520000000_esquema-inicial.js');
        const sqls = [];
        const pgm = { sql: (t) => sqls.push(t) };
        const antes = { RENDER: process.env.RENDER, ENTORNO: process.env.ENTORNO };
        try {
            for (const env of [{ RENDER: 'true' }, { ENTORNO: 'staging' }]) {
                delete process.env.RENDER;
                delete process.env.ENTORNO;
                Object.assign(process.env, env);
                assert.throws(() => base.down(pgm), /no se revierte en producción/);
            }
            delete process.env.RENDER;
            process.env.ENTORNO = 'desarrollo';
            base.down(pgm);
            assert.match(sqls.join(''), /DROP TABLE/);
        } finally {
            for (const [k, v] of Object.entries(antes)) {
                if (v === undefined) delete process.env[k];
                else process.env[k] = v;
            }
        }
    });
});
