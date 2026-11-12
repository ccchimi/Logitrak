import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { configurarSeguridad, origenesPermitidos, origenPermitido } from './seguridad.js';
import { crearLimiteGeneral, crearLimiteLogin } from './limites.js';

// App mínima con los mismos middlewares que index.js, sin base de datos.
function crearApp(env = {}) {
    const app = express();
    configurarSeguridad(app, env);
    app.use('/api', crearLimiteGeneral());
    const login = crearLimiteLogin();
    app.post('/api/auth/login', login, (_req, res) => res.json({ exito: true }));
    app.get('/api/eco', (req, res) => res.json({ ip: req.ip }));
    app.post('/api/pagos/webhook/mercadopago', (_req, res) => res.sendStatus(200));
    return app;
}

let servidor;
let base;

before(async () => {
    servidor = crearApp({ CORS_ORIGENES: 'https://staging.logitrak.com.ar/' }).listen(0);
    await new Promise((r) => servidor.once('listening', r));
    base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor.close());

const desde = (ip, extra = {}) => ({ headers: { 'X-Forwarded-For': ip, ...extra } });

describe('origenPermitido', () => {
    const permitidos = origenesPermitidos({ CORS_ORIGENES: ' https://staging.logitrak.com.ar/ , https://logitrak.com.ar' });

    test('acepta la Web App publicada y los orígenes configurados', () => {
        assert.equal(origenPermitido('https://ccchimi.github.io', permitidos), true);
        assert.equal(origenPermitido('https://staging.logitrak.com.ar', permitidos), true);
        assert.equal(origenPermitido('https://logitrak.com.ar', permitidos), true);
    });

    test('acepta pedidos sin Origin (app móvil, webhooks)', () => {
        assert.equal(origenPermitido(undefined, permitidos), true);
    });

    test('acepta desarrollo local y red privada, salvo que se desactive', () => {
        for (const o of ['http://localhost:8081', 'http://127.0.0.1:19006', 'http://192.168.1.70:8081', 'http://10.0.0.5:8081', 'http://172.20.1.4:8081']) {
            assert.equal(origenPermitido(o, permitidos), true, o);
            assert.equal(origenPermitido(o, permitidos, { redLocal: false }), false, o);
        }
    });

    test('rechaza cualquier otro sitio', () => {
        for (const o of [
            'https://evil.com',
            'https://ccchimi.github.io.evil.com',
            'https://evil.github.io',
            'http://ccchimi.github.io',
            'https://localhost.evil.com',
            'http://192.168.1.70.evil.com',
            'http://172.32.0.1:8081',
            'null',
        ]) {
            assert.equal(origenPermitido(o, permitidos), false, o);
        }
    });
});

describe('cabeceras de seguridad', () => {
    test('helmet agrega las cabeceras y oculta Express', async () => {
        const r = await fetch(`${base}/api/eco`);

        assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
        assert.match(r.headers.get('strict-transport-security'), /max-age=\d+/);
        assert.equal(r.headers.get('cross-origin-resource-policy'), 'cross-origin');
        assert.equal(r.headers.get('x-powered-by'), null);
    });
});

describe('CORS', () => {
    test('responde con Access-Control-Allow-Origin a la Web App', async () => {
        const r = await fetch(`${base}/api/eco`, { headers: { Origin: 'https://ccchimi.github.io' } });
        assert.equal(r.headers.get('access-control-allow-origin'), 'https://ccchimi.github.io');
    });

    test('no habilita a un sitio ajeno', async () => {
        const r = await fetch(`${base}/api/eco`, { headers: { Origin: 'https://evil.com' } });
        assert.equal(r.headers.get('access-control-allow-origin'), null);
    });

    test('el preflight permite Authorization e Idempotency-Key', async () => {
        const r = await fetch(`${base}/api/auth/login`, {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://ccchimi.github.io',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type,authorization,idempotency-key,x-logitrak-sesion',
            },
        });

        assert.equal(r.status, 204);
        assert.equal(r.headers.get('access-control-allow-origin'), 'https://ccchimi.github.io');
        assert.match(r.headers.get('access-control-allow-headers'), /Idempotency-Key/);
        assert.match(r.headers.get('access-control-allow-headers'), /X-Logitrak-Sesion/);
    });
});

describe('IP real detrás del proxy', () => {
    test('toma la IP del cliente de X-Forwarded-For', async () => {
        const r = await fetch(`${base}/api/eco`, desde('203.0.113.7'));
        assert.equal((await r.json()).ip, '203.0.113.7');
    });
});

describe('límites de pedidos', () => {
    test('el login frena al undécimo intento con un 429 en JSON', async () => {
        const ip = '198.51.100.1';
        for (let i = 0; i < 10; i++) {
            assert.equal((await fetch(`${base}/api/auth/login`, { method: 'POST', ...desde(ip) })).status, 200);
        }
        const r = await fetch(`${base}/api/auth/login`, { method: 'POST', ...desde(ip) });

        assert.equal(r.status, 429);
        assert.deepEqual(await r.json(), { exito: false, error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
        assert.ok(r.headers.get('ratelimit'));
    });

    test('cada cliente tiene su propio contador (antes, todos compartían la IP del proxy)', async () => {
        const r = await fetch(`${base}/api/auth/login`, { method: 'POST', ...desde('198.51.100.2') });
        assert.equal(r.status, 200);
    });

    test('el límite general no cuenta los webhooks de las pasarelas', async () => {
        const ip = '198.51.100.3';
        for (let i = 0; i < 950; i++) {
            const r = await fetch(`${base}/api/pagos/webhook/mercadopago`, { method: 'POST', ...desde(ip) });
            assert.equal(r.status, 200, `webhook ${i}`);
        }
        assert.equal((await fetch(`${base}/api/eco`, desde(ip))).status, 200);
    });

    test('el límite general frena después de 900 pedidos', async () => {
        const ip = '198.51.100.4';
        const estados = [];
        for (let i = 0; i < 901; i += 50) {
            const tanda = Math.min(50, 901 - i);
            const r = await Promise.all(Array.from({ length: tanda }, () => fetch(`${base}/api/eco`, desde(ip))));
            estados.push(...r.map((x) => x.status));
        }

        assert.equal(estados.filter((s) => s === 200).length, 900);
        assert.equal(estados.filter((s) => s === 429).length, 1);
    });
});
