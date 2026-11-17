import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('/api/envios (integración)', { skip: SALTEAR }, () => {
    let e;
    let admin;

    before(async () => {
        e = await levantarApi();
        admin = await e.conRol('env.admin', 'admin');
    });
    after(() => e?.cerrar());

    describe('POST /', () => {
        test('crea el envío desde una cotización propia, con código, plazo de pago y estado inicial', async () => {
            const s = await e.cuenta('env.crea');
            const envio = await e.crearEnvio(s, { pagar: false });
            assert.match(envio.codigo, /^TRK-\d{4}-\d{6}$/);
            assert.equal(envio.estado, 'pendiente');
            assert.equal(envio.estadoPago, 'pendiente');
            assert.ok(envio.pagoVenceEn);
            const cot = (await e.pool.query('SELECT estado FROM cotizaciones WHERE codigo = $1', [envio.cotizacion])).rows[0];
            assert.equal(cot.estado, 'confirmada');
            const ev = await e.pool.query(`SELECT tipo FROM envio_eventos WHERE envio_id = $1`, [envio.id]);
            assert.deepEqual(ev.rows.map((r) => r.tipo), ['creado']);
        });

        test('reintentar con la misma cotización devuelve el mismo envío, sin duplicar; la de otro cliente no sirve', async () => {
            const s = await e.cuenta('env.dos');
            const envio = await e.crearEnvio(s, { pagar: false });
            const otra = await e.http('post', '/api/envios', { token: s.token }).send({ cotizacionCodigo: envio.cotizacion });
            assert.equal(otra.status, 200);
            assert.equal(otra.body.reutilizado, true);
            assert.equal(otra.body.envio.codigo, envio.codigo);
            const cuantos = await e.pool.query('SELECT count(*)::int AS n FROM envios WHERE cotizacion_id = (SELECT id FROM cotizaciones WHERE codigo = $1)', [envio.cotizacion]);
            assert.equal(cuantos.rows[0].n, 1);

            const ajeno = await e.cuenta('env.ajeno');
            const r = await e.http('post', '/api/envios', { token: ajeno.token }).send({ cotizacionCodigo: envio.cotizacion });
            assert.equal(r.status, 409);
        });

        test('sin cotización o con una inexistente no se crea', async () => {
            const s = await e.cuenta('env.sin');
            assert.equal((await e.http('post', '/api/envios', { token: s.token }).send({})).status, 400);
            assert.equal((await e.http('post', '/api/envios', { token: s.token }).send({ cotizacionCodigo: 'COT-NO-EXISTE' })).status, 409);
            assert.equal((await e.http('post', '/api/envios').send({ cotizacionCodigo: 'COT-X' })).status, 401);
        });
    });

    describe('GET / y GET /metricas', () => {
        test('cada cliente ve solo los suyos, y puede filtrar por estado', async () => {
            const a = await e.cuenta('env.lista.a');
            const b = await e.cuenta('env.lista.b');
            const ea = await e.crearEnvio(a, { pagar: false });
            const eb = await e.crearEnvio(b, { pagar: false });

            const lista = await e.http('get', '/api/envios', { token: a.token });
            assert.equal(lista.status, 200);
            const codigos = lista.body.envios.map((x) => x.codigo);
            assert.ok(codigos.includes(ea.codigo));
            assert.equal(codigos.includes(eb.codigo), false);
            assert.equal(lista.body.envios.some((x) => 'pin' in x || 'pinEntrega' in x), false, 'el listado no expone el PIN');

            const entregados = await e.http('get', '/api/envios?estado=entregado', { token: a.token });
            assert.equal(entregados.body.envios.length, 0);

            const m = await e.http('get', '/api/envios/metricas', { token: a.token });
            assert.equal(m.status, 200);
            assert.equal(typeof m.body.metricas.total, 'number');
            assert.ok(m.body.metricas.total >= 1);
        });

        test('el admin ve los de todos', async () => {
            const s = await e.cuenta('env.lista.c');
            const env = await e.crearEnvio(s, { pagar: false });
            const lista = await e.http('get', '/api/envios', { token: admin.token });
            assert.ok(lista.body.envios.some((x) => x.codigo === env.codigo));
        });
    });

    describe('GET /:codigo', () => {
        test('el dueño ve el detalle con eventos y pagos; otro cliente no; uno inexistente es 404', async () => {
            const s = await e.cuenta('env.det');
            const env = await e.crearEnvio(s);
            const r = await e.http('get', `/api/envios/${env.codigo}`, { token: s.token });
            assert.equal(r.status, 200);
            assert.equal(r.body.envio.estadoPago, 'pagado');
            assert.ok(r.body.eventos.length >= 1);
            assert.equal(r.body.pagos[0].estado, 'aprobado');

            const otro = await e.cuenta('env.det.otro');
            assert.equal((await e.http('get', `/api/envios/${env.codigo}`, { token: otro.token })).status, 403);
            assert.equal((await e.http('get', '/api/envios/TRK-0000-000000', { token: s.token })).status, 404);
        });
    });

    describe('POST /:codigo/reembolsar (admin)', () => {
        test('devuelve el pago de un envío pago y deja el evento; sin pago es 409', async () => {
            const s = await e.cuenta('env.reem');
            const pago = await e.crearEnvio(s);
            const r = await e.http('post', `/api/envios/${pago.codigo}/reembolsar`, { token: admin.token }).send({});
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.equal(r.body.estado, 'reembolsado');
            const fila = (await e.pool.query('SELECT estado_pago FROM envios WHERE codigo = $1', [pago.codigo])).rows[0];
            assert.equal(fila.estado_pago, 'reembolsado');

            const sinPago = await e.crearEnvio(s, { pagar: false });
            assert.equal((await e.http('post', `/api/envios/${sinPago.codigo}/reembolsar`, { token: admin.token }).send({})).status, 409);
            assert.equal((await e.http('post', `/api/envios/${pago.codigo}/reembolsar`, { token: s.token }).send({})).status, 403);
            assert.equal((await e.http('post', '/api/envios/TRK-0000-000000/reembolsar', { token: admin.token }).send({})).status, 404);
        });
    });

    describe('POST /:codigo/archivar y /desarchivar (admin)', () => {
        test('archivar lo saca de la vista del cliente; desarchivar lo devuelve', async () => {
            const s = await e.cuenta('env.arch');
            const env = await e.crearEnvio(s, { pagar: false });

            const arch = await e.http('post', `/api/envios/${env.codigo}/archivar`, { token: admin.token }).send({ motivo: 'Prueba', reembolsar: false });
            assert.equal(arch.status, 200, JSON.stringify(arch.body));
            assert.equal((await e.http('post', `/api/envios/${env.codigo}/archivar`, { token: admin.token }).send({})).status, 409, 'ya estaba archivado');
            const lista = await e.http('get', '/api/envios', { token: s.token });
            assert.equal(lista.body.envios.some((x) => x.codigo === env.codigo), false);

            assert.equal((await e.http('post', `/api/envios/${env.codigo}/desarchivar`, { token: admin.token }).send({})).status, 200);
            const despues = await e.http('get', '/api/envios', { token: s.token });
            assert.ok(despues.body.envios.some((x) => x.codigo === env.codigo));

            assert.equal((await e.http('post', `/api/envios/${env.codigo}/archivar`, { token: s.token }).send({})).status, 403);
        });

        test('archivar un envío pago lo reembolsa', async () => {
            const s = await e.cuenta('env.archp');
            const env = await e.crearEnvio(s);
            const r = await e.http('post', `/api/envios/${env.codigo}/archivar`, { token: admin.token }).send({ motivo: 'Cancelado por el cliente' });
            assert.equal(r.status, 200, JSON.stringify(r.body));
            const fila = (await e.pool.query('SELECT estado_pago, archivado_en FROM envios WHERE codigo = $1', [env.codigo])).rows[0];
            assert.ok(fila.archivado_en);
            assert.equal(fila.estado_pago, 'reembolsado');
        });
    });

    describe('POST /:codigo/cancelar (cliente)', () => {
        const cancelar = (s, codigo) => e.http('post', `/api/envios/${codigo}/cancelar`, { token: s.token }).send({});
        const fila = async (codigo) => (await e.pool.query('SELECT * FROM envios WHERE codigo = $1', [codigo])).rows[0];
        const TARJETA = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };

        test('sin pagar: se cancela, se anulan los intentos de pago y ya no se puede pagar', async () => {
            const s = await e.cuenta('env.canc.imp');
            const env = await e.crearEnvio(s, { pagar: false });
            const intento = await e.http('post', '/api/pagos/checkout', { token: s.token }).send({ envioCodigo: env.codigo, metodo: 'mercadopago' });
            assert.equal(intento.status, 201);

            const r = await cancelar(s, env.codigo);
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.equal(r.body.reembolso, 'sin_pago');
            assert.equal(r.body.mensaje, 'Cancelaste el envío.');

            const f = await fila(env.codigo);
            assert.equal(f.estado, 'cancelado');
            assert.equal(f.estado_pago, 'pendiente');
            const pago = (await e.pool.query('SELECT estado FROM pagos WHERE codigo = $1', [intento.body.pago.codigo])).rows[0];
            assert.equal(pago.estado, 'cancelado', 'el QR que quedó abierto ya no sirve');
            const ev = await e.pool.query(`SELECT titulo FROM envio_eventos WHERE envio_id = $1 AND tipo = 'cancelado'`, [env.id]);
            assert.equal(ev.rows[0].titulo, 'Cancelado por el cliente');
            const aviso = await e.pool.query(`SELECT payload FROM outbox_events WHERE event_type = 'envio.cancelado_por_cliente' AND aggregate_id = $1`, [env.codigo]);
            assert.equal(aviso.rows[0].payload.estabaPago, false);

            const tarjeta = await e.http('post', '/api/pagos/tarjeta', { token: s.token }).send({ envioCodigo: env.codigo, ...TARJETA });
            assert.equal(tarjeta.status, 409);
            assert.equal(tarjeta.body.codigo, 'envio_cancelado');
            assert.equal((await e.http('post', '/api/pagos/checkout', { token: s.token }).send({ envioCodigo: env.codigo, metodo: 'modo' })).body.codigo, 'envio_cancelado');
            const confirmar = await e.http('post', `/api/pagos/${intento.body.pago.codigo}/confirmar`, { token: s.token });
            assert.equal(confirmar.status, 409, 'tampoco se confirma el intento sandbox anulado');
            assert.equal((await fila(env.codigo)).estado_pago, 'pendiente');

            assert.equal((await cancelar(s, env.codigo)).status, 409, 'ya estaba cancelado');
        });

        test('pagado y sin chofer: se cancela y se devuelve el importe', async () => {
            const s = await e.cuenta('env.canc.pag');
            const env = await e.crearEnvio(s);
            const r = await cancelar(s, env.codigo);
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.equal(r.body.reembolso, 'reembolsado');
            assert.match(r.body.mensaje, /devolvimos el importe/);

            const f = await fila(env.codigo);
            assert.equal(f.estado, 'cancelado');
            assert.equal(f.estado_pago, 'reembolsado');
            const pago = (await e.pool.query('SELECT estado FROM pagos WHERE envio_id = $1', [env.id])).rows[0];
            assert.equal(pago.estado, 'reembolsado');
            const aviso = await e.pool.query(`SELECT payload FROM outbox_events WHERE event_type = 'envio.cancelado_por_cliente' AND aggregate_id = $1`, [env.codigo]);
            assert.deepEqual(
                { estabaPago: aviso.rows[0].payload.estabaPago, reembolsado: aviso.rows[0].payload.reembolsado },
                { estabaPago: true, reembolsado: true },
            );
        });

        test('con chofer asignado o en viaje no se cancela desde la app; otro cliente tampoco puede', async () => {
            const s = await e.cuenta('env.canc.asig');
            const env = await e.crearEnvio(s);
            const otro = await e.cuenta('env.canc.otro');
            assert.equal((await cancelar(otro, env.codigo)).status, 403);
            assert.equal((await cancelar(admin, env.codigo)).status, 403, 'tampoco el admin: tiene reembolsar y archivar');
            assert.equal((await cancelar(s, 'TRK-0000-000000')).status, 404);

            await e.pool.query(`UPDATE envios SET estado = 'asignado' WHERE id = $1`, [env.id]);
            const asignado = await cancelar(s, env.codigo);
            assert.equal(asignado.status, 409);
            assert.match(asignado.body.error, /Soporte/);
            await e.pool.query(`UPDATE envios SET estado = 'en_viaje' WHERE id = $1`, [env.id]);
            assert.match((await cancelar(s, env.codigo)).body.error, /en viaje/);
            assert.equal((await fila(env.codigo)).estado_pago, 'pagado', 'no se tocó el pago');
        });
    });
});
