import { after, afterEach, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarPasarelaFalsa } from '../../integracion/pasarelaFalsa.js';
import {
    buscarPagoMpPorReferencia,
    consultarPagoMp,
    crearPreferenciaMp,
    mpHabilitado,
    reembolsarPagoMp,
} from './mercadoPago.js';
import { consultarIntencionModo, crearIntencionModo, modoHabilitado } from './modo.js';

const MP = /^https:\/\/api\.mercadopago\.com/;
const pago = { codigo: 'PAY-2026-000123', monto: '3015.00', moneda: 'ARS' };
const envio = { codigo: 'TRK-2026-000045', origen: 'Cabildo 2000', destino: 'Rivadavia 5000', pago_vence_en: '2026-11-19T15:05:00.000Z' };

let falsa;
const entornoOriginal = { ...process.env };

before(() => {
    falsa = instalarPasarelaFalsa();
});
afterEach(() => {
    falsa.limpiar();
    process.env = { ...entornoOriginal };
});
after(() => falsa.desinstalar());

describe('Mercado Pago (pasarela simulada)', () => {
    const conToken = () => {
        process.env.MP_ACCESS_TOKEN = 'TEST-token-de-prueba';
    };

    test('sin token no está habilitado y no llama a la pasarela', async () => {
        delete process.env.MP_ACCESS_TOKEN;
        assert.equal(mpHabilitado(), false);
        assert.equal(await crearPreferenciaMp({ pago, envio, baseUrl: 'https://api.logitrak' }), null);
        assert.equal(await consultarPagoMp('1'), null);
        assert.deepEqual(await reembolsarPagoMp('1'), { ok: false, reintentable: false, motivo: 'Mercado Pago no está configurado' });
        assert.equal(falsa.pedidos.length, 0);
    });

    test('la preferencia lleva el monto, la referencia, el webhook y el vencimiento del pedido', async () => {
        conToken();
        falsa.en('POST', /\/checkout\/preferences/, () => ({
            estado: 201,
            cuerpo: { id: 'pref-1', init_point: 'https://mp.com/checkout/pref-1', sandbox_init_point: 'https://sandbox.mp.com/pref-1' },
        }));

        const r = await crearPreferenciaMp({ pago, envio, baseUrl: 'https://api.logitrak' });
        assert.deepEqual(r, { preferenceId: 'pref-1', initPoint: 'https://mp.com/checkout/pref-1', sandboxInitPoint: 'https://sandbox.mp.com/pref-1' });

        const [pedido] = falsa.pedidos;
        assert.match(pedido.url, MP);
        assert.equal(pedido.cuerpo.external_reference, pago.codigo);
        assert.equal(pedido.cuerpo.items[0].unit_price, 3015);
        assert.equal(pedido.cuerpo.items[0].currency_id, 'ARS');
        assert.equal(pedido.cuerpo.notification_url, 'https://api.logitrak/api/pagos/webhook/mercadopago');
        assert.equal(pedido.cuerpo.expiration_date_to, envio.pago_vence_en);
        assert.equal(pedido.encabezados.Authorization, 'Bearer TEST-token-de-prueba');
        assert.ok(pedido.encabezados['X-Idempotency-Key'], 'el SDK manda una clave de idempotencia');
    });

    test('consulta un pago y, si la pasarela falla, devuelve null sin romper', async () => {
        conToken();
        falsa.en('GET', /\/v1\/payments\/111$/, () => ({ cuerpo: { id: 111, status: 'approved', external_reference: 'PAY-1' } }));
        const r = await consultarPagoMp('111');
        assert.deepEqual([r.id, r.estado, r.externalReference], ['111', 'approved', 'PAY-1']);

        falsa.en('GET', /\/v1\/payments\/222$/, () => ({ estado: 404, cuerpo: { message: 'not found', status: 404 } }));
        assert.equal(await consultarPagoMp('222'), null);
    });

    test('busca por referencia y prefiere el pago aprobado', async () => {
        conToken();
        falsa.en('GET', /\/v1\/payments\/search/, (p) => {
            assert.match(p.url, /external_reference=PAY-2/);
            return {
                cuerpo: {
                    results: [
                        { id: 1, status: 'rejected', external_reference: 'PAY-2' },
                        { id: 2, status: 'approved', external_reference: 'PAY-2' },
                    ],
                },
            };
        });
        const r = await buscarPagoMpPorReferencia('PAY-2');
        assert.deepEqual([r.id, r.estado], ['2', 'approved']);

        falsa.limpiar();
        falsa.en('GET', /\/v1\/payments\/search/, () => ({ cuerpo: { results: [] } }));
        assert.equal(await buscarPagoMpPorReferencia('PAY-3'), null);

        falsa.limpiar();
        falsa.en('GET', /\/v1\/payments\/search/, () => ({ estado: 401, cuerpo: { message: 'unauthorized', status: 401 } }));
        assert.equal(await buscarPagoMpPorReferencia('PAY-4'), null, 'sin modo estricto, un error es "no encontrado"');
        await assert.rejects(buscarPagoMpPorReferencia('PAY-4', { estricto: true }), 'en modo estricto, el error sube');
    });

    test('reembolso: aprobado, ya reembolsado, rechazo permanente y falla transitoria', async () => {
        conToken();
        falsa.en('POST', /\/v1\/payments\/10\/refunds/, () => ({ estado: 201, cuerpo: { id: 99, status: 'approved' } }));
        assert.deepEqual(await reembolsarPagoMp('10'), { ok: true, reintentable: false, motivo: 'reembolsado en Mercado Pago' });

        falsa.en('POST', /\/v1\/payments\/11\/refunds/, () => ({ estado: 400, cuerpo: { message: 'Payment already refunded', status: 400 } }));
        falsa.en('GET', /\/v1\/payments\/11$/, () => ({ cuerpo: { id: 11, status: 'refunded', external_reference: 'X' } }));
        assert.deepEqual(await reembolsarPagoMp('11'), { ok: true, reintentable: false, motivo: 'ya figuraba reembolsado' });

        falsa.en('POST', /\/v1\/payments\/12\/refunds/, () => ({ estado: 401, cuerpo: { message: 'Unauthorized use of live credentials', status: 401 } }));
        falsa.en('GET', /\/v1\/payments\/12$/, () => ({ cuerpo: { id: 12, status: 'approved' } }));
        const permanente = await reembolsarPagoMp('12');
        assert.equal(permanente.ok, false);
        assert.equal(permanente.reintentable, false, 'un 401 no se reintenta');
        assert.match(permanente.motivo, /HTTP 401/);

        falsa.en('POST', /\/v1\/payments\/13\/refunds/, () => ({ estado: 503, cuerpo: { message: 'unavailable', status: 503 } }));
        falsa.en('GET', /\/v1\/payments\/13$/, () => ({ cuerpo: { id: 13, status: 'approved' } }));
        const transitoria = await reembolsarPagoMp('13');
        assert.equal(transitoria.ok, false);
        assert.equal(transitoria.reintentable, true, 'un 503 se reintenta más tarde');
        assert.equal(falsa.pedidos.filter((p) => /payments\/13\/refunds/.test(p.url)).length, 2, 'el SDK reintenta una vez los 5xx');

        assert.deepEqual(await reembolsarPagoMp(null), { ok: false, reintentable: false, motivo: 'el pago no tiene id externo' });
        process.env.MP_REEMBOLSOS_SIMULADOS = 'true';
        assert.equal((await reembolsarPagoMp('14')).ok, true, 'las cuentas de prueba se pueden simular');
    });
});

describe('MODO (pasarela simulada)', () => {
    const conModo = () => {
        Object.assign(process.env, {
            MODO_API_URL: 'https://modo.prueba',
            MODO_CLIENT_ID: 'cliente',
            MODO_CLIENT_SECRET: 'secreto',
            MODO_STORE_ID: 'tienda-1',
        });
    };

    test('sin credenciales arma un enlace sandbox y no consulta nada', async () => {
        assert.equal(modoHabilitado(), false);
        const r = await crearIntencionModo({ pago, envio, baseUrl: 'https://api.logitrak' });
        assert.deepEqual(r, { real: false, deeplink: 'modo://pagar?ref=PAY-2026-000123&monto=3015', intencionId: null });
        assert.equal(await consultarIntencionModo('x'), null);
        assert.equal(falsa.pedidos.length, 0);
    });

    test('pide el token una vez, crea la intención y traduce los estados', async () => {
        conModo();
        let tokens = 0;
        falsa.en('POST', /\/auth\/token$/, (p) => {
            tokens++;
            assert.deepEqual(p.cuerpo, { client_id: 'cliente', client_secret: 'secreto' });
            return { cuerpo: { access_token: 'tok-modo', expires_in: 600 } };
        });
        falsa.en('POST', /\/payment-intention$/, (p) => {
            assert.equal(p.encabezados.Authorization, 'Bearer tok-modo');
            assert.equal(p.cuerpo.amount, 3015);
            assert.equal(p.cuerpo.external_reference, pago.codigo);
            assert.equal(p.cuerpo.store_id, 'tienda-1');
            assert.equal(p.cuerpo.callback_url, 'https://api.logitrak/api/pagos/webhook/modo');
            return { estado: 201, cuerpo: { id: 'int-1', qr: 'qr-de-pago' } };
        });
        const r = await crearIntencionModo({ pago, envio, baseUrl: 'https://api.logitrak' });
        assert.deepEqual(r, { real: true, deeplink: 'qr-de-pago', intencionId: 'int-1' });

        for (const [crudo, esperado] of [['PAID', 'approved'], ['rejected', 'rejected'], ['in_progress', 'pending']]) {
            falsa.en('GET', /\/payment-intention\/int-1$/, () => ({ cuerpo: { status: crudo, external_reference: pago.codigo } }));
            const m = await consultarIntencionModo('int-1');
            assert.equal(m.estado, esperado, crudo);
            assert.equal(m.externalReference, pago.codigo);
        }
        assert.equal(tokens, 1, 'el token se reutiliza mientras no vence');
    });

    test('si MODO rechaza o no responde, lo informa sin inventar un pago', async () => {
        conModo();
        falsa.en('POST', /\/auth\/token$/, () => ({ cuerpo: { access_token: 'tok-modo', expires_in: 600 } }));
        falsa.en('POST', /\/payment-intention$/, () => ({ estado: 422, cuerpo: { error: 'monto inválido' } }));
        await assert.rejects(crearIntencionModo({ pago, envio, baseUrl: 'https://api.logitrak' }), /rechazó la intención \(422\)/);

        falsa.en('GET', /\/payment-intention\/int-2$/, () => ({ estado: 500, cuerpo: {} }));
        assert.equal(await consultarIntencionModo('int-2'), null);
        await assert.rejects(consultarIntencionModo('int-2', { estricto: true }), /MODO respondió 500/);

        falsa.en('GET', /\/payment-intention\/int-3$/, () => new TypeError('fetch failed'));
        assert.equal(await consultarIntencionModo('int-3'), null, 'una caída de red no rompe la consulta');
    });
});
