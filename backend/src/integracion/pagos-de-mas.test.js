import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };

describe('devolución automática de pagos de más (integración)', { skip: SALTEAR }, () => {
    let e;
    let servicio;
    let despachar;

    // Se importan después de levantar la API porque cargan el pool de la base.
    before(async () => {
        e = await levantarApi();
        servicio = await import('../servicios/pagos/devolucionDuplicados.js');
        ({ despachar } = await import('../outbox/index.js'));
    });
    after(() => e?.cerrar());

    const pago = async (codigo) => (await e.pool.query('SELECT * FROM pagos WHERE codigo = $1', [codigo])).rows[0];
    const eventos = async (codigo, tipo) =>
        (await e.pool.query('SELECT id FROM outbox_events WHERE aggregate_id = $1 AND event_type = $2', [codigo, tipo])).rows;

    // Un checkout de QR queda pendiente, el cliente paga con tarjeta y después
    // se confirma el QR: el segundo cobro se aprueba como duplicado.
    async function cobroDoble(s) {
        const envio = await e.crearEnvio(s, { pagar: false });
        const qr = await e.http('post', '/api/pagos/checkout', { token: s.token }).send({ envioCodigo: envio.codigo, metodo: 'mercadopago' });
        assert.equal(qr.status, 201, JSON.stringify(qr.body));
        const tarjeta = await e.http('post', '/api/pagos/tarjeta', { token: s.token }).send({ envioCodigo: envio.codigo, ...TARJETA });
        assert.equal(tarjeta.status, 201, JSON.stringify(tarjeta.body));
        const confirmado = await e.http('post', `/api/pagos/${qr.body.pago.codigo}/confirmar`, { token: s.token });
        assert.equal(confirmado.status, 200, JSON.stringify(confirmado.body));
        return { envio, valido: tarjeta.body.pago.codigo, duplicado: qr.body.pago.codigo };
    }

    test('devuelve el segundo cobro, conserva el primero y le avisa al cliente', async () => {
        const s = await e.cuenta('pdm.doble');
        const { envio, valido, duplicado } = await cobroDoble(s);

        const antes = await pago(duplicado);
        assert.equal(antes.estado, 'aprobado');
        assert.equal(antes.detalle.duplicadoDe, valido);
        assert.ok((await servicio.pagosParaDevolver()).includes(antes.id));

        assert.equal(await servicio.devolverPagoDeMas(antes.id), 'devuelto');
        const despues = await pago(duplicado);
        assert.equal(despues.estado, 'reembolsado');
        assert.ok(despues.reembolsado_en);
        assert.equal(despues.detalle.reembolsoPendiente, undefined);
        assert.equal(despues.detalle.duplicadoDe, valido, 'queda registrado de qué pago era duplicado');
        assert.equal((await pago(valido)).estado, 'aprobado', 'el pago que vale no se toca');
        const fila = (await e.pool.query('SELECT estado_pago FROM envios WHERE codigo = $1', [envio.codigo])).rows[0];
        assert.equal(fila.estado_pago, 'pagado');

        assert.equal(await servicio.devolverPagoDeMas(antes.id), 'no_aplica', 'no lo devuelve dos veces');
        assert.ok(!(await servicio.pagosParaDevolver()).includes(antes.id));

        const [evento] = await eventos(duplicado, 'pago.devuelto');
        await despachar({ ids: [evento.id] });
        const n = (await e.pool.query(`SELECT * FROM notificaciones WHERE usuario_id = $1 AND tipo = 'pago.devuelto'`, [s.perfil.id])).rows[0];
        assert.equal(n.titulo, 'Te devolvimos un pago');
        assert.match(n.cuerpo, new RegExp(`${envio.codigo} se cobró dos veces`));
    });

    test('un cobro que llegó con el envío cancelado también se devuelve', async () => {
        const s = await e.cuenta('pdm.cancel');
        const envio = await e.crearEnvio(s, { pagar: false });
        const qr = await e.http('post', '/api/pagos/checkout', { token: s.token }).send({ envioCodigo: envio.codigo, metodo: 'mercadopago' });
        await e.pool.query(`UPDATE envios SET estado = 'cancelado' WHERE codigo = $1`, [envio.codigo]);
        // La pasarela confirma igual (como lo haría el webhook).
        await e.pool.query(
            `UPDATE pagos SET estado = 'aprobado', pagado_en = now(),
                    detalle = jsonb_build_object('reembolsoPendiente', 'el envío ya estaba cancelado')
             WHERE codigo = $1`,
            [qr.body.pago.codigo]
        );
        const id = (await pago(qr.body.pago.codigo)).id;

        assert.equal(await servicio.devolverPagoDeMas(id), 'devuelto');
        assert.equal((await pago(qr.body.pago.codigo)).estado, 'reembolsado');
    });

    test('si la pasarela no permite devolverlo, queda en revisión y se avisa a los administradores', async () => {
        const admin = await e.conRol('pdm.admin', 'admin');
        const s = await e.cuenta('pdm.modo');
        const { duplicado } = await cobroDoble(s);
        await e.pool.query(`UPDATE pagos SET modo_proc = 'real', metodo = 'modo' WHERE codigo = $1`, [duplicado]);
        const id = (await pago(duplicado)).id;

        assert.equal(await servicio.devolverPagoDeMas(id), 'en_revision');
        const p = await pago(duplicado);
        assert.equal(p.estado, 'aprobado', 'no lo marca como devuelto si no se devolvió');
        assert.equal(p.detalle.reembolsoEnRevision, true);
        assert.match(p.detalle.reembolsoPendiente, /panel/);
        assert.ok(!(await servicio.pagosParaDevolver()).includes(id), 'no lo reintenta en cada barrido');

        const [evento] = await eventos(duplicado, 'pago.devolucion_fallida');
        await despachar({ ids: [evento.id] });
        const n = (await e.pool.query(`SELECT * FROM notificaciones WHERE usuario_id = $1 AND tipo = 'pago.devolucion_fallida'`, [admin.perfil.id])).rows[0];
        assert.equal(n.titulo, 'Devolución para hacer a mano');
        assert.match(n.cuerpo, new RegExp(duplicado));
    });

    test('un pago normal nunca entra en el barrido', async () => {
        const s = await e.cuenta('pdm.normal');
        const envio = await e.crearEnvio(s);
        const p = (await e.pool.query('SELECT p.id FROM pagos p JOIN envios v ON v.id = p.envio_id WHERE v.codigo = $1', [envio.codigo])).rows[0];

        assert.ok(!(await servicio.pagosParaDevolver()).includes(p.id));
        assert.equal(await servicio.devolverPagoDeMas(p.id), 'no_aplica');
    });
});
