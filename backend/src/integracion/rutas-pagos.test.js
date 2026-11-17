import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };
const RECHAZADA = { ...TARJETA, numero: '4000000000000002' };

describe('/api/pagos (integración)', { skip: SALTEAR }, () => {
    let e;
    let admin;

    before(async () => {
        e = await levantarApi();
        admin = await e.conRol('pag.admin', 'admin');
    });
    after(() => e?.cerrar());

    const checkout = (s, envioCodigo, metodo, clave) => {
        const t = e.http('post', '/api/pagos/checkout', { token: s.token });
        if (clave) t.set('Idempotency-Key', clave);
        return t.send({ envioCodigo, metodo });
    };

    describe('POST /tarjeta', () => {
        test('aprobada: paga el envío, emite comprobante y guarda solo los últimos 4 dígitos', async () => {
            const s = await e.cuenta('pag.tar');
            const env = await e.crearEnvio(s, { pagar: false });
            const r = await e.http('post', '/api/pagos/tarjeta', { token: s.token }).send({ envioCodigo: env.codigo, ...TARJETA });
            assert.equal(r.status, 201, JSON.stringify(r.body));
            assert.equal(r.body.aprobado, true);
            assert.match(r.body.pago.comprobante, /^COMP-\d{4}-\d{6}$/);
            const fila = (await e.pool.query('SELECT tarjeta_ultimos, detalle::text AS d FROM pagos WHERE codigo = $1', [r.body.pago.codigo])).rows[0];
            assert.equal(fila.tarjeta_ultimos, '3704');
            assert.doesNotMatch(fila.d ?? '', /4509953566233704/, 'el número completo nunca se guarda');
            assert.equal((await e.http('post', '/api/pagos/tarjeta', { token: s.token }).send({ envioCodigo: env.codigo, ...TARJETA })).status, 409, 'ya está pago');
        });

        test('rechazada: 402 y el envío sigue impago; sin envío: 400', async () => {
            const s = await e.cuenta('pag.rech');
            const env = await e.crearEnvio(s, { pagar: false });
            const r = await e.http('post', '/api/pagos/tarjeta', { token: s.token }).send({ envioCodigo: env.codigo, ...RECHAZADA });
            assert.equal(r.status, 402);
            assert.equal(r.body.aprobado, false);
            assert.equal((await e.pool.query('SELECT estado_pago FROM envios WHERE codigo = $1', [env.codigo])).rows[0].estado_pago, 'pendiente');
            const corto = await e.http('post', '/api/pagos/tarjeta', { token: s.token }).send({ envioCodigo: env.codigo, ...TARJETA, numero: '12' });
            assert.equal(corto.status, 402);
            assert.ok(corto.body.motivo);
            assert.equal((await e.http('post', '/api/pagos/tarjeta', { token: s.token }).send({ ...TARJETA })).status, 400);
        });

        test('no se puede pagar el envío de otro cliente', async () => {
            const a = await e.cuenta('pag.dueno');
            const b = await e.cuenta('pag.otro');
            const env = await e.crearEnvio(a, { pagar: false });
            assert.equal((await e.http('post', '/api/pagos/tarjeta', { token: b.token }).send({ envioCodigo: env.codigo, ...TARJETA })).status, 403);
        });
    });

    describe('POST /checkout y /:codigo/confirmar (sandbox)', () => {
        test('Mercado Pago sandbox: QR, reintento idempotente y confirmación', async () => {
            const s = await e.cuenta('pag.mp');
            const env = await e.crearEnvio(s, { pagar: false });
            const clave = randomUUID();

            const r = await checkout(s, env.codigo, 'mercadopago', clave);
            assert.equal(r.status, 201, JSON.stringify(r.body));
            assert.equal(r.body.pago.estado, 'pendiente');
            assert.ok(r.body.checkout.qr || r.body.checkout.deeplink, 'trae cómo pagar');

            const repetido = await checkout(s, env.codigo, 'mercadopago', clave);
            assert.equal(repetido.status, 200);
            assert.equal(repetido.body.pago.codigo, r.body.pago.codigo, 'la misma clave devuelve el mismo intento');
            const sinClave = await checkout(s, env.codigo, 'mercadopago');
            assert.equal(sinClave.body.pago.codigo, r.body.pago.codigo, 'un intento pendiente vigente se reutiliza');
            assert.equal((await checkout(s, env.codigo, 'modo', clave)).status, 422, 'la clave no se reusa para otra operación');
            assert.equal((await checkout(s, env.codigo, 'mercadopago', 'no-es-uuid')).status, 400);

            const ok = await e.http('post', `/api/pagos/${r.body.pago.codigo}/confirmar`, { token: s.token });
            assert.equal(ok.status, 200);
            assert.equal(ok.body.pago.estado, 'aprobado');
            assert.equal((await e.http('post', `/api/pagos/${r.body.pago.codigo}/confirmar`, { token: s.token })).body.yaPagado, true);
            assert.equal((await checkout(s, env.codigo, 'modo')).status, 409, 'ya está pago');
        });

        test('otro cliente no confirma un pago ajeno', async () => {
            const a = await e.cuenta('pag.conf.a');
            const b = await e.cuenta('pag.conf.b');
            const env = await e.crearEnvio(a, { pagar: false });
            const r = await checkout(a, env.codigo, 'modo');
            assert.equal(r.status, 201);
            assert.equal((await e.http('post', `/api/pagos/${r.body.pago.codigo}/confirmar`, { token: b.token })).status, 403);
            assert.equal((await e.http('post', '/api/pagos/PAY-0000-000000/confirmar', { token: a.token })).status, 404);
        });
    });

    describe('GET / y GET /:codigo', () => {
        test('cada cliente ve sus pagos; el admin, todos; se puede filtrar por envío', async () => {
            const a = await e.cuenta('pag.lista.a');
            const b = await e.cuenta('pag.lista.b');
            const ea = await e.crearEnvio(a);
            await e.crearEnvio(b);

            const propios = await e.http('get', '/api/pagos', { token: a.token });
            assert.equal(propios.status, 200);
            assert.ok(propios.body.pagos.length >= 1);
            const filtrado = await e.http('get', `/api/pagos?envioCodigo=${ea.codigo}`, { token: a.token });
            assert.equal(filtrado.body.pagos.length, 1);

            const codigo = filtrado.body.pagos[0].codigo;
            assert.equal((await e.http('get', `/api/pagos/${codigo}`, { token: a.token })).status, 200);
            assert.equal((await e.http('get', `/api/pagos/${codigo}`, { token: b.token })).status, 403);
            assert.equal((await e.http('get', `/api/pagos/${codigo}`, { token: admin.token })).status, 200);
            assert.equal((await e.http('get', '/api/pagos')).status, 401);
        });
    });

    describe('webhooks', () => {
        const firmar = (dataId, secreto, requestId = randomUUID(), ts = Math.floor(Date.now() / 1000)) => {
            const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
            const v1 = createHmac('sha256', secreto).update(manifest).digest('hex');
            return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId };
        };

        test('Mercado Pago: sin secreto configurado no procesa (503); firma inválida, 401; firma válida, 200', async () => {
            const antes = process.env.MP_WEBHOOK_SECRET;
            try {
                delete process.env.MP_WEBHOOK_SECRET;
                assert.equal((await e.http('post', '/api/pagos/webhook/mercadopago?data.id=123&type=payment').send({ type: 'payment' })).status, 503);

                process.env.MP_WEBHOOK_SECRET = 'secreto-de-prueba-webhook';
                const mal = await e.http('post', '/api/pagos/webhook/mercadopago?data.id=123&type=payment')
                    .set(firmar('123', 'otro-secreto'))
                    .send({ type: 'payment' });
                assert.equal(mal.status, 401);

                const bien = await e.http('post', '/api/pagos/webhook/mercadopago?data.id=123&type=payment')
                    .set(firmar('123', process.env.MP_WEBHOOK_SECRET))
                    .send({ type: 'payment' });
                assert.equal(bien.status, 200, 'firmado: se acepta (sin pasarela configurada no hay pago que buscar)');
            } finally {
                if (antes === undefined) delete process.env.MP_WEBHOOK_SECRET;
                else process.env.MP_WEBHOOK_SECRET = antes;
            }
        });

        test('MODO: siempre responde 200, también sin datos', async () => {
            assert.equal((await e.http('post', '/api/pagos/webhook/modo').send({})).status, 200);
            assert.equal((await e.http('post', '/api/pagos/webhook/modo').send({ id: 'no-existe' })).status, 200);
        });

        test('la página de retorno de la pasarela responde HTML', async () => {
            const r = await e.http('get', '/api/pagos/retorno');
            assert.equal(r.status, 200);
            assert.match(r.headers['content-type'], /text\/html/);
        });
    });

    describe('cupones al pagar', () => {
        const nuevoCupon = async (s, pct = 10) =>
            (await e.pool.query(
                `INSERT INTO cupones (cliente_id, descuento_pct, motivo) VALUES ($1, $2, 'Cupón de prueba') RETURNING *`,
                [s.perfil.id, pct]
            )).rows[0];
        const cupon = async (id) => (await e.pool.query('SELECT * FROM cupones WHERE id = $1', [id])).rows[0];
        const precioDe = async (codigo) => Number((await e.pool.query('SELECT precio FROM envios WHERE codigo = $1', [codigo])).rows[0].precio);
        const tarjeta = (s, envioCodigo, extra = {}) =>
            e.http('post', '/api/pagos/tarjeta', { token: s.token }).send({ envioCodigo, ...TARJETA, ...extra });

        test('con tarjeta: cobra con el descuento, guarda el descuento y consume el cupón', async () => {
            const s = await e.cuenta('pag.cup.tar');
            const env = await e.crearEnvio(s, { pagar: false });
            const c = await nuevoCupon(s, 10);
            const precio = await precioDe(env.codigo);

            const r = await tarjeta(s, env.codigo, { cuponCodigo: c.codigo.toLowerCase() });
            assert.equal(r.status, 201, JSON.stringify(r.body));
            assert.equal(r.body.pago.monto, Math.round(precio * 90) / 100);
            assert.equal(r.body.pago.descuento, Math.round(precio * 10) / 100);

            const usado = await cupon(c.id);
            assert.equal(usado.estado, 'usado');
            assert.equal(usado.usado_envio_id, env.id);
            const lista = await e.http('get', '/api/cupones', { token: s.token });
            const publicado = lista.body.cupones.find((x) => x.codigo === c.codigo);
            assert.equal(publicado.estado, 'usado');
            assert.equal(publicado.usadoEnvioCodigo, env.codigo);

            const otro = await e.crearEnvio(s, { pagar: false });
            const repetido = await tarjeta(s, otro.codigo, { cuponCodigo: c.codigo });
            assert.equal(repetido.status, 409);
            assert.equal(repetido.body.codigo, 'cupon_no_disponible');
        });

        test('un cupón ajeno o inexistente no se aplica; un pago rechazado no lo consume', async () => {
            const a = await e.cuenta('pag.cup.a');
            const b = await e.cuenta('pag.cup.b');
            const env = await e.crearEnvio(b, { pagar: false });
            const deA = await nuevoCupon(a);
            assert.equal((await tarjeta(b, env.codigo, { cuponCodigo: deA.codigo })).body.codigo, 'cupon_inexistente');
            assert.equal((await tarjeta(b, env.codigo, { cuponCodigo: 'SLA-INCUMP-999999' })).status, 404);

            const propio = await nuevoCupon(b);
            const rechazada = await tarjeta(b, env.codigo, { numero: '4000000000000002', cuponCodigo: propio.codigo });
            assert.equal(rechazada.status, 402);
            assert.equal((await cupon(propio.id)).estado, 'activo');
        });

        test('con checkout: queda reservado mientras el pago está en curso y se consume al aprobarse', async () => {
            const s = await e.cuenta('pag.cup.mp');
            const env = await e.crearEnvio(s, { pagar: false });
            const otro = await e.crearEnvio(s, { pagar: false });
            const c = await nuevoCupon(s, 20);
            const precio = await precioDe(env.codigo);
            const checkout = (envioCodigo, cuponCodigo) =>
                e.http('post', '/api/pagos/checkout', { token: s.token }).send({ envioCodigo, metodo: 'mercadopago', cuponCodigo });

            const r = await checkout(env.codigo, c.codigo);
            assert.equal(r.status, 201, JSON.stringify(r.body));
            assert.equal(r.body.pago.monto, Math.round(precio * 80) / 100);
            assert.equal((await cupon(c.id)).estado, 'activo', 'todavía no se pagó');

            const reservado = await checkout(otro.codigo, c.codigo);
            assert.equal(reservado.status, 409);
            assert.equal(reservado.body.codigo, 'cupon_reservado');

            assert.equal((await checkout(env.codigo, c.codigo)).body.pago.codigo, r.body.pago.codigo, 'mismo cupón: se reutiliza el intento');
            const sinCupon = await checkout(env.codigo);
            assert.notEqual(sinCupon.body.pago.codigo, r.body.pago.codigo, 'sin cupón es otro monto: otro intento');
            assert.equal(sinCupon.body.pago.monto, precio);

            const ok = await e.http('post', `/api/pagos/${r.body.pago.codigo}/confirmar`, { token: s.token });
            assert.equal(ok.status, 200);
            assert.equal((await cupon(c.id)).estado, 'usado');
            assert.equal((await e.pool.query('SELECT estado_pago FROM envios WHERE id = $1', [env.id])).rows[0].estado_pago, 'pagado');
        });

        test('si el envío se cancela y se devuelve el pago, el cupón vuelve a estar disponible', async () => {
            const s = await e.cuenta('pag.cup.canc');
            const env = await e.crearEnvio(s, { pagar: false });
            const c = await nuevoCupon(s, 10);
            assert.equal((await tarjeta(s, env.codigo, { cuponCodigo: c.codigo })).status, 201);
            assert.equal((await cupon(c.id)).estado, 'usado');

            const cancelado = await e.http('post', `/api/envios/${env.codigo}/cancelar`, { token: s.token }).send({});
            assert.equal(cancelado.status, 200, JSON.stringify(cancelado.body));
            const devuelto = await cupon(c.id);
            assert.equal(devuelto.estado, 'activo');
            assert.equal(devuelto.usado_envio_id, null);
        });
    });
});
