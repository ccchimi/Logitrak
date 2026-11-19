import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('devoluciones registradas a mano (integración)', { skip: SALTEAR }, () => {
    let e;
    let admin;
    let soporte;
    let despachar;

    before(async () => {
        e = await levantarApi();
        admin = await e.conRol('dm.admin', 'admin');
        soporte = await e.conRol('dm.sop', 'soporte');
        ({ despachar } = await import('../outbox/index.js'));
    });
    after(() => e?.cerrar());

    // Un envío pago que se canceló y cuya devolución no pudo hacer la pasarela.
    async function pendiente(sufijo, { conCupon = false } = {}) {
        const s = await e.cuenta(`dm.${sufijo}`);
        const envio = await e.crearEnvio(s);
        const id = (await e.pool.query('SELECT id FROM envios WHERE codigo = $1', [envio.codigo])).rows[0].id;
        let cupon = null;
        if (conCupon) {
            cupon = (await e.pool.query(
                `INSERT INTO cupones (cliente_id, descuento_pct, motivo, estado, usado_en, usado_envio_id)
                 VALUES ($1, 10, 'Prueba', 'usado', now(), $2) RETURNING *`,
                [s.perfil.id, id]
            )).rows[0];
            await e.pool.query('UPDATE pagos SET cupon_id = $2 WHERE envio_id = $1', [id, cupon.id]);
        }
        await e.pool.query(`UPDATE envios SET estado = 'cancelado' WHERE id = $1`, [id]);
        await e.pool.query(
            `UPDATE pagos SET modo_proc = 'real', metodo = 'modo',
                    detalle = COALESCE(detalle, '{}'::jsonb) || '{"reembolsoPendiente": "la devolución de modo se hace desde su panel", "reembolsoEnRevision": true}'
             WHERE envio_id = $1`,
            [id]
        );
        const pago = (await e.pool.query('SELECT * FROM pagos WHERE envio_id = $1', [id])).rows[0];
        return { s, envio, id, pago, cupon };
    }

    const registrar = (token, codigo, cuerpo = {}) =>
        e.http('post', `/api/pagos/${codigo}/devolucion-manual`, { token }).send(cuerpo);

    test('el admin ve las devoluciones pendientes y registra una hecha a mano', async () => {
        const p = await pendiente('uno', { conCupon: true });

        const lista = await e.http('get', '/api/pagos/devoluciones-pendientes', { token: admin.token });
        assert.equal(lista.status, 200);
        const fila = lista.body.pagos.find((x) => x.codigo === p.pago.codigo);
        assert.ok(fila, 'aparece en la lista');
        assert.equal(fila.envioCodigo, p.envio.codigo);
        assert.equal(fila.metodo, 'modo');
        assert.equal(fila.real, true);
        assert.match(fila.motivo, /panel/);

        const r = await registrar(admin.token, p.pago.codigo, { referencia: '  MODO-OP-123  ' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.pago.estado, 'reembolsado');

        const pago = (await e.pool.query('SELECT * FROM pagos WHERE id = $1', [p.pago.id])).rows[0];
        assert.equal(pago.estado, 'reembolsado');
        assert.ok(pago.reembolsado_en);
        assert.equal(pago.detalle.reembolsoPendiente, undefined);
        assert.equal(pago.detalle.reembolsoEnRevision, undefined);
        assert.equal(pago.detalle.reembolsoManual.usuario, admin.usuario);
        assert.equal(pago.detalle.reembolsoManual.referencia, 'MODO-OP-123');
        assert.match(pago.detalle.reembolsoManual.motivoOriginal, /panel/);

        const envio = (await e.pool.query('SELECT estado_pago FROM envios WHERE id = $1', [p.id])).rows[0];
        assert.equal(envio.estado_pago, 'reembolsado');
        const cupon = (await e.pool.query('SELECT estado FROM cupones WHERE id = $1', [p.cupon.id])).rows[0];
        assert.equal(cupon.estado, 'activo', 'el cupón del pago devuelto vuelve a estar disponible');

        const otra = await e.http('get', '/api/pagos/devoluciones-pendientes', { token: admin.token });
        assert.ok(!otra.body.pagos.some((x) => x.codigo === p.pago.codigo), 'sale de la lista');
        assert.equal((await registrar(admin.token, p.pago.codigo)).status, 409, 'no se registra dos veces');

        const [ev] = (await e.pool.query(`SELECT id FROM outbox_events WHERE event_type = 'pago.devuelto' AND aggregate_id = $1`, [p.pago.codigo])).rows;
        await despachar({ ids: [ev.id] });
        const n = (await e.pool.query(`SELECT cuerpo FROM notificaciones WHERE usuario_id = $1 AND tipo = 'pago.devuelto'`, [p.s.perfil.id])).rows[0];
        assert.match(n.cuerpo, new RegExp(`Te devolvimos el pago de .* del envío ${p.envio.codigo}`));
    });

    test('solo el admin; soporte y clientes no', async () => {
        const p = await pendiente('permisos');
        assert.equal((await e.http('get', '/api/pagos/devoluciones-pendientes', { token: soporte.token })).status, 403);
        assert.equal((await registrar(soporte.token, p.pago.codigo)).status, 403);
        assert.equal((await registrar(p.s.token, p.pago.codigo)).status, 403);
    });

    test('un pago sin devolución pendiente no se toca', async () => {
        const s = await e.cuenta('dm.normal');
        const envio = await e.crearEnvio(s);
        const pago = (await e.pool.query('SELECT p.codigo FROM pagos p JOIN envios x ON x.id = p.envio_id WHERE x.codigo = $1', [envio.codigo])).rows[0];
        assert.equal((await registrar(admin.token, pago.codigo)).status, 409);
        assert.equal((await registrar(admin.token, 'PAY-0000-000000')).status, 409);
        assert.equal((await registrar(admin.token, pago.codigo, { referencia: 'x'.repeat(121) })).status, 400);
    });
});
