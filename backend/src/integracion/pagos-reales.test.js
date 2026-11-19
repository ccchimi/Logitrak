import { after, afterEach, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';
import { instalarPasarelaFalsa } from './pasarelaFalsa.js';
import { armarManifest, firmar } from '../servicios/pagos/firmaMercadoPago.js';

const SECRETO = 'secreto-del-webhook-de-prueba';

// El circuito con las pasarelas "reales" (credenciales configuradas), con
// Mercado Pago y MODO simulados: checkout, webhook firmado y confirmación por
// consulta. Nada sale a internet.
describe('pagos con las pasarelas configuradas (integración)', { skip: SALTEAR }, () => {
    let e;
    let falsa;

    before(async () => {
        e = await levantarApi();
        falsa = instalarPasarelaFalsa();
        Object.assign(process.env, {
            MP_ACCESS_TOKEN: 'TEST-token-de-prueba',
            MP_WEBHOOK_SECRET: SECRETO,
            MODO_API_URL: 'https://modo.prueba',
            MODO_CLIENT_ID: 'cliente',
            MODO_CLIENT_SECRET: 'secreto',
        });
    });
    afterEach(() => falsa.limpiar());
    after(async () => {
        for (const v of ['MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET', 'MODO_API_URL', 'MODO_CLIENT_ID', 'MODO_CLIENT_SECRET']) delete process.env[v];
        falsa?.desinstalar();
        await e?.cerrar();
    });

    const pago = async (codigo) => (await e.pool.query('SELECT * FROM pagos WHERE codigo = $1', [codigo])).rows[0];
    const envio = async (codigo) => (await e.pool.query('SELECT * FROM envios WHERE codigo = $1', [codigo])).rows[0];
    const checkout = (s, envioCodigo, metodo) => e.http('post', '/api/pagos/checkout', { token: s.token }).send({ envioCodigo, metodo });

    function webhookMp(dataId, { secreto = SECRETO, tipo = 'payment' } = {}) {
        const ts = String(Math.floor(Date.now() / 1000));
        const xRequestId = `req-${dataId}`;
        const v1 = firmar(armarManifest({ dataId, xRequestId, ts }), secreto);
        return e
            .http('post', `/api/pagos/webhook/mercadopago?data.id=${dataId}&type=${tipo}`)
            .set('x-signature', `ts=${ts},v1=${v1}`)
            .set('x-request-id', xRequestId)
            .send({ type: tipo, data: { id: dataId } });
    }

    test('el checkout de Mercado Pago crea la preferencia real y guarda su referencia', async () => {
        const s = await e.cuenta('pr.mp');
        const env = await e.crearEnvio(s, { pagar: false });
        falsa.en('POST', /\/checkout\/preferences/, (p) => ({
            estado: 201,
            cuerpo: { id: `pref-${p.cuerpo.external_reference}`, init_point: `https://mp.com/checkout/${p.cuerpo.external_reference}` },
        }));

        const r = await checkout(s, env.codigo, 'mercadopago');
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const p = await pago(r.body.pago.codigo);
        assert.equal(p.modo_proc, 'real');
        assert.equal(p.referencia_ext, `pref-${p.codigo}`);
        assert.equal(r.body.checkout.url, `https://mp.com/checkout/${p.codigo}`);
        assert.equal(r.body.checkout.sandbox, false);
        assert.match(r.body.checkout.qr, /^data:image\/png;base64,/, 'el QR apunta al checkout de la pasarela');
        assert.match(falsa.pedidos[0].cuerpo.notification_url, /\/api\/pagos\/webhook\/mercadopago$/);
    });

    test('si la pasarela no responde, el checkout falla con 502 y no deja un pago a medias', async () => {
        const s = await e.cuenta('pr.caida');
        const env = await e.crearEnvio(s, { pagar: false });
        falsa.en('POST', /\/checkout\/preferences/, () => ({ estado: 400, cuerpo: { message: 'invalid', status: 400 } }));

        const r = await checkout(s, env.codigo, 'mercadopago');
        assert.equal(r.status, 502);
        const filas = await e.pool.query('SELECT 1 FROM pagos p JOIN envios x ON x.id = p.envio_id WHERE x.codigo = $1', [env.codigo]);
        assert.equal(filas.rowCount, 0);
    });

    test('el webhook firmado aprueba el pago y deja el envío pago; uno rechazado lo marca rechazado', async () => {
        const s = await e.cuenta('pr.hook');
        const env = await e.crearEnvio(s, { pagar: false });
        falsa.en('POST', /\/checkout\/preferences/, () => ({ estado: 201, cuerpo: { id: 'pref-x', init_point: 'https://mp.com/x' } }));
        const codigo = (await checkout(s, env.codigo, 'mercadopago')).body.pago.codigo;

        falsa.en('GET', /\/v1\/payments\/555$/, () => ({ cuerpo: { id: 555, status: 'approved', external_reference: codigo } }));
        assert.equal((await webhookMp('555')).status, 200);
        const p = await pago(codigo);
        assert.equal(p.estado, 'aprobado');
        assert.equal(p.pago_ext_id, '555');
        assert.ok(p.comprobante);
        assert.equal((await envio(env.codigo)).estado_pago, 'pagado');

        assert.equal((await webhookMp('555')).status, 200, 'repetir el aviso no hace nada');
        assert.equal((await pago(codigo)).estado, 'aprobado');

        const otro = await e.crearEnvio(s, { pagar: false });
        const codigo2 = (await checkout(s, otro.codigo, 'mercadopago')).body.pago.codigo;
        falsa.en('GET', /\/v1\/payments\/556$/, () => ({ cuerpo: { id: 556, status: 'rejected', external_reference: codigo2 } }));
        await webhookMp('556');
        assert.equal((await pago(codigo2)).estado, 'rechazado');
    });

    test('el webhook rechaza firmas inválidas e ignora avisos que no son de pagos o no son nuestros', async () => {
        assert.equal((await webhookMp('600', { secreto: 'otro-secreto' })).status, 401);
        assert.equal((await webhookMp('601', { tipo: 'merchant_order' })).status, 200);
        falsa.en('GET', /\/v1\/payments\/602$/, () => ({ cuerpo: { id: 602, status: 'approved', external_reference: 'PAY-QUE-NO-EXISTE' } }));
        assert.equal((await webhookMp('602')).status, 200);
        assert.equal(falsa.pedidos.filter((p) => /payments\/601/.test(p.url)).length, 0, 'un aviso que no es de pagos no consulta la pasarela');
    });

    test('si el webhook no llega, consultar el pago lo confirma buscando por referencia', async () => {
        const s = await e.cuenta('pr.consulta');
        const env = await e.crearEnvio(s, { pagar: false });
        falsa.en('POST', /\/checkout\/preferences/, () => ({ estado: 201, cuerpo: { id: 'pref-y', init_point: 'https://mp.com/y' } }));
        const codigo = (await checkout(s, env.codigo, 'mercadopago')).body.pago.codigo;

        falsa.en('GET', /\/v1\/payments\/search/, () => ({ cuerpo: { results: [{ id: 777, status: 'pending', external_reference: codigo }] } }));
        const pendiente = await e.http('get', `/api/pagos/${codigo}`, { token: s.token });
        assert.equal(pendiente.body.pago.estado, 'pendiente');
        assert.equal((await pago(codigo)).pago_ext_id, '777', 'guarda el id de la pasarela aunque siga pendiente');

        falsa.en('GET', /\/v1\/payments\/777$/, () => ({ cuerpo: { id: 777, status: 'approved', external_reference: codigo } }));
        const aprobado = await e.http('get', `/api/pagos/${codigo}`, { token: s.token });
        assert.equal(aprobado.body.pago.estado, 'aprobado');
        assert.equal((await envio(env.codigo)).estado_pago, 'pagado');
    });

    test('MODO: crea la intención real y el webhook la confirma consultando a MODO', async () => {
        const s = await e.cuenta('pr.modo');
        const env = await e.crearEnvio(s, { pagar: false });
        falsa.en('POST', /\/auth\/token$/, () => ({ cuerpo: { access_token: 'tok', expires_in: 600 } }));
        falsa.en('POST', /\/payment-intention$/, (p) => ({ estado: 201, cuerpo: { id: `int-${p.cuerpo.external_reference}`, deeplink: 'modo://pagar/x' } }));

        const r = await checkout(s, env.codigo, 'modo');
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const codigo = r.body.pago.codigo;
        assert.equal((await pago(codigo)).referencia_ext, `int-${codigo}`);

        falsa.en('GET', new RegExp(`/payment-intention/int-${codigo}$`), () => ({ cuerpo: { status: 'approved', external_reference: codigo } }));
        const hook = await e.http('post', '/api/pagos/webhook/modo').send({ id: `int-${codigo}` });
        assert.equal(hook.status, 200);
        assert.equal((await pago(codigo)).estado, 'aprobado');
        assert.equal((await envio(env.codigo)).estado_pago, 'pagado');

        assert.equal((await e.http('post', '/api/pagos/webhook/modo').send({})).status, 200, 'un aviso vacío no rompe');
    });
});
