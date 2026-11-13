import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import express from 'express';
import { autenticar, firmarToken } from '../middleware/auth.js';
import { crearLogger, log } from './logger.js';
import { registroPedidos } from './registroPedidos.js';
import { limpiarEvento } from './instrument.js';

function capturar() {
    const lineas = [];
    const destino = new Writable({
        write(trozo, _enc, listo) {
            for (const l of trozo.toString().split('\n').filter(Boolean)) lineas.push(JSON.parse(l));
            listo();
        },
    });
    return { lineas, logger: crearLogger({ nivel: 'info', destino, bonito: false }) };
}

describe('logger', () => {
    test('oculta contraseñas, tokens y el header de autorización', () => {
        const { lineas, logger } = capturar();
        logger.info({
            body: { usuario: 'ana', contrasena: 'secreta', refreshToken: 'rt', numero: '4509953566233704' },
            req: { headers: { authorization: 'Bearer abc', 'user-agent': 'x' } },
        }, 'prueba');

        const [l] = lineas;
        assert.equal(l.body.usuario, 'ana');
        assert.equal(l.body.contrasena, '[oculto]');
        assert.equal(l.body.refreshToken, '[oculto]');
        assert.equal(l.body.numero, '[oculto]');
        assert.equal(l.req.headers.authorization, '[oculto]');
        assert.equal(l.level, 'info');
        assert.equal(l.servicio, 'logitrak-api');
    });
});

describe('registro de pedidos', () => {
    let servidor;
    let base;
    let lineas;

    before(async () => {
        process.env.JWT_SECRET ??= 'secreto-de-prueba-logs';
        const captura = capturar();
        lineas = captura.lineas;
        const app = express();
        app.use(registroPedidos({ logger: captura.logger }));
        app.get('/api/salud', (_req, res) => res.json({ ok: true }));
        app.get('/', (_req, res) => res.json({ ok: true }));
        app.get('/api/privado', autenticar, (_req, res) => {
            // Un servicio que no recibe `req` igual loguea con el contexto del pedido.
            log().info('dentro del servicio');
            res.json({ ok: true });
        });
        app.get('/api/falla', (_req, res) => res.status(500).json({}));
        servidor = app.listen(0);
        await new Promise((r) => servidor.once('listening', r));
        base = `http://127.0.0.1:${servidor.address().port}`;
    });

    after(() => servidor?.close());

    const esperarLineas = async (n) => {
        for (let i = 0; i < 50 && lineas.length < n; i++) await new Promise((r) => setTimeout(r, 10));
    };

    test('una línea por pedido con requestId, userId, método, ruta, status y tiempo', async () => {
        lineas.length = 0;
        const token = firmarToken({ id: 42, usuario: 'ana', rol: 'cliente', nombre_completo: 'Ana' });
        const r = await fetch(`${base}/api/privado?x=1`, { headers: { Authorization: `Bearer ${token}` } });
        await esperarLineas(2);

        const id = r.headers.get('x-request-id');
        assert.match(id, /^[0-9a-f-]{36}$/);
        const [servicio, pedido] = lineas;
        assert.equal(servicio.msg, 'dentro del servicio');
        assert.equal(servicio.requestId, id);
        assert.equal(servicio.userId, 42);
        assert.equal(pedido.requestId, id);
        assert.equal(pedido.userId, 42);
        assert.equal(pedido.method, 'GET');
        assert.equal(pedido.path, '/api/privado');
        assert.equal(pedido.status, 200);
        assert.equal(typeof pedido.responseTime, 'number');
        assert.equal(pedido.level, 'info');
    });

    test('respeta un X-Request-Id entrante válido y descarta uno sospechoso', async () => {
        const propio = await fetch(`${base}/api/salud`, { headers: { 'X-Request-Id': 'trace-abc12345' } });
        assert.equal(propio.headers.get('x-request-id'), 'trace-abc12345');
        const raro = await fetch(`${base}/api/salud`, { headers: { 'X-Request-Id': 'x"><script>' } });
        assert.notEqual(raro.headers.get('x-request-id'), 'x"><script>');
    });

    test('los sondeos de salud correctos no se loguean; un 500 sí, como error', async () => {
        lineas.length = 0;
        await fetch(`${base}/api/salud`);
        await fetch(`${base}/`, { method: 'HEAD' });
        await fetch(`${base}/api/falla`);
        await esperarLineas(1);

        assert.equal(lineas.length, 1);
        assert.equal(lineas[0].path, '/api/falla');
        assert.equal(lineas[0].level, 'error');
        assert.equal(lineas[0].userId, null);
    });
});

describe('limpiarEvento (Sentry)', () => {
    test('no manda cuerpo, cookies ni el header de autorización', () => {
        const e = limpiarEvento({
            request: { data: { contrasena: 'x' }, cookies: { a: 1 }, headers: { Authorization: 'Bearer t', 'User-Agent': 'app' } },
            user: { id: '7', email: 'ana@mail.com', ip_address: '1.2.3.4' },
        });
        assert.equal(e.request.data, undefined);
        assert.equal(e.request.cookies, undefined);
        assert.equal(e.request.headers.Authorization, '[oculto]');
        assert.equal(e.request.headers['User-Agent'], 'app');
        assert.deepEqual(e.user, { id: '7' });
    });
});
