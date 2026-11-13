import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cargarEntorno, esDesplegado, nombreEntorno, revisarConfiguracion } from './entorno.js';

describe('nombreEntorno', () => {
    test('ENTORNO manda; si no está, Render es producción y lo demás desarrollo', () => {
        assert.equal(nombreEntorno({ ENTORNO: 'staging', RENDER: 'true' }), 'staging');
        assert.equal(nombreEntorno({ ENTORNO: ' Produccion ' }), 'produccion');
        assert.equal(nombreEntorno({ RENDER: 'true' }), 'produccion');
        assert.equal(nombreEntorno({ NODE_ENV: 'production' }), 'produccion');
        assert.equal(nombreEntorno({}), 'desarrollo');
        assert.equal(nombreEntorno({ ENTORNO: 'cualquiera' }), 'desarrollo');
    });

    test('staging y producción cuentan como despliegue', () => {
        assert.equal(esDesplegado({ ENTORNO: 'staging' }), true);
        assert.equal(esDesplegado({ RENDER: 'true' }), true);
        assert.equal(esDesplegado({}), false);
    });
});

describe('cargarEntorno', () => {
    test('el entorno real gana, después .env.<entorno> y por último .env', () => {
        const raiz = mkdtempSync(join(tmpdir(), 'logitrak-env-')) + '/';
        writeFileSync(join(raiz, '.env.staging'), 'A=staging\nB=staging\n');
        writeFileSync(join(raiz, '.env'), 'A=comun\nB=comun\nC=comun\n');
        const env = { ENTORNO: 'staging', A: 'real', LOGITRAK_PRUEBA_CARGA_ENV: '1' };

        const r = cargarEntorno({ env, raiz });

        assert.equal(r.entorno, 'staging');
        assert.deepEqual(r.archivos, ['.env.staging', '.env']);
        assert.deepEqual([env.A, env.B, env.C], ['real', 'staging', 'comun']);
    });

    test('bajo node --test no lee ningún .env', () => {
        const raiz = mkdtempSync(join(tmpdir(), 'logitrak-env-')) + '/';
        writeFileSync(join(raiz, '.env'), 'DATABASE_URL=postgres://produccion\n');
        const env = { NODE_TEST_CONTEXT: 'child' };
        assert.deepEqual(cargarEntorno({ env, raiz }).archivos, []);
        assert.equal(env.DATABASE_URL, undefined);
    });

    test('sin archivos no falla', () => {
        const raiz = mkdtempSync(join(tmpdir(), 'logitrak-env-')) + '/';
        assert.deepEqual(cargarEntorno({ env: {}, raiz }).archivos, []);
    });
});

describe('revisarConfiguracion', () => {
    const base = { DATABASE_URL: 'postgres://x', JWT_SECRET: 'x'.repeat(40) };

    test('sin base o sin JWT_SECRET no se puede arrancar', () => {
        const r = revisarConfiguracion({});
        assert.equal(r.errores.length, 2);
    });

    test('en desarrollo no exige los servicios opcionales', () => {
        assert.deepEqual(revisarConfiguracion(base), { entorno: 'desarrollo', errores: [], avisos: [] });
    });

    test('en un despliegue avisa lo que falta, sin impedir el arranque', () => {
        const r = revisarConfiguracion({ ...base, RENDER: 'true', JWT_SECRET: 'corto', PGSSL: 'false' });
        assert.equal(r.errores.length, 0);
        const texto = r.avisos.join('\n');
        assert.match(texto, /JWT_SECRET tiene menos de 32/);
        assert.match(texto, /PGSSL=false/);
        assert.match(texto, /Supabase Storage sin configurar/);
        assert.match(texto, /GOOGLE_DIRECTIONS_KEY/);
        assert.match(texto, /SENTRY_DSN/);
    });

    test('Mercado Pago: webhook sin secreto y credenciales de prueba en producción', () => {
        const r = revisarConfiguracion({ ...base, ENTORNO: 'produccion', MP_ACCESS_TOKEN: 'TEST-123' });
        const texto = r.avisos.join('\n');
        assert.match(texto, /MP_WEBHOOK_SECRET/);
        assert.match(texto, /credenciales de prueba en producción/);
    });
});
