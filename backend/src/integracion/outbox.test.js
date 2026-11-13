// Patrón outbox (Hito 2.2) contra PostgreSQL real.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };

describe('outbox y notificaciones (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let api;
    let cuenta;
    let pool;
    let outbox;

    before(async () => {
        entorno = await levantarApi();
        ({ api, cuenta, pool } = entorno);
        outbox = await import('../outbox/index.js');
    });

    after(() => entorno?.cerrar());

    let n = 0;
    async function envioPagado(s) {
        const codigo = `COT-OUT-${++n}-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: s.token,
            cuerpo: { codigo, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 3, bultos: 1 },
        });
        const envio = (await api('/api/envios', { metodo: 'POST', token: s.token, cuerpo: { cotizacionCodigo: codigo } })).body.envio;
        const pago = await api('/api/pagos/tarjeta', { metodo: 'POST', token: s.token, cuerpo: { envioCodigo: envio.codigo, ...TARJETA_OK } });
        assert.equal(pago.status, 201, JSON.stringify(pago.body));
        return { envio, pago: pago.body.pago };
    }

    const eventos = async (agregado, tipo) =>
        (await pool.query('SELECT * FROM outbox_events WHERE aggregate_id = $1 AND event_type = $2', [agregado, tipo])).rows;
    const notificaciones = async (usuarioId) =>
        (await pool.query('SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY id', [usuarioId])).rows;

    test('aprobar un pago deja el evento en el outbox, sin datos personales', async () => {
        const s = await cuenta('out.pago');
        const { envio, pago } = await envioPagado(s);

        const [ev] = await eventos(pago.codigo, 'pago.aprobado');
        assert.ok(ev, 'el evento existe');
        assert.equal(ev.aggregate_type, 'pago');
        assert.equal(ev.payload.envioCodigo, envio.codigo);
        assert.equal(ev.payload.clienteId, s.perfil.id);
        assert.ok(ev.payload.comprobante);
        assert.doesNotMatch(JSON.stringify(ev.payload), /Cuenta de Prueba|Cabildo|4509/);
    });

    test('el evento vive y muere con su transacción', async () => {
        const cliente = await pool.connect();
        try {
            await cliente.query('BEGIN');
            await outbox.registrarEvento(cliente, { tipoAgregado: 'prueba', idAgregado: 'REVERTIDO-1', tipo: 'prueba.revertida' });
            await cliente.query('ROLLBACK');
        } finally {
            cliente.release();
        }
        assert.equal((await eventos('REVERTIDO-1', 'prueba.revertida')).length, 0);
    });

    test('el despachador notifica al cliente una sola vez aunque se repita', async () => {
        const s = await cuenta('out.notif');
        const { pago } = await envioPagado(s);
        const [ev] = await eventos(pago.codigo, 'pago.aprobado');

        await outbox.despachar({ ids: [ev.id] });
        await outbox.despachar({ ids: [ev.id] });
        await pool.query('UPDATE outbox_events SET processed = FALSE WHERE id = $1', [ev.id]);
        await outbox.despachar({ ids: [ev.id] });

        const [procesado] = await eventos(pago.codigo, 'pago.aprobado');
        assert.equal(procesado.processed, true);
        const ns = await notificaciones(s.perfil.id);
        assert.equal(ns.length, 1);
        assert.equal(ns[0].titulo, 'Pago aprobado');
        assert.match(ns[0].cuerpo, new RegExp(pago.comprobante));
    });

    test('un manejador que falla se reintenta con espera y, al agotar los intentos, queda fallido', async () => {
        const cliente = await pool.connect();
        let id;
        try {
            await cliente.query('BEGIN');
            id = await outbox.registrarEvento(cliente, { tipoAgregado: 'prueba', idAgregado: `FALLA-${Date.now()}`, tipo: 'prueba.falla' });
            await cliente.query('COMMIT');
        } finally {
            cliente.release();
        }
        const manejadores = { 'prueba.falla': async () => { throw new Error('servicio externo caído'); } };

        const r1 = await outbox.despachar({ ids: [id], manejadores });
        assert.equal(r1.reintentar, 1);
        let fila = (await pool.query('SELECT * FROM outbox_events WHERE id = $1', [id])).rows[0];
        assert.equal(fila.attempts, 1);
        assert.equal(fila.failed_at, null);
        assert.match(fila.last_error, /servicio externo caído/);
        assert.ok(new Date(fila.next_attempt_at) > new Date(), 'el próximo intento queda para más adelante');
        assert.equal((await outbox.despachar({ ids: [id], manejadores })).reintentar, 0, 'antes de la espera no se reintenta');

        await pool.query('UPDATE outbox_events SET attempts = $2, next_attempt_at = now() WHERE id = $1', [id, outbox.MAX_INTENTOS - 1]);
        assert.equal((await outbox.despachar({ ids: [id], manejadores })).fallido, 1);
        fila = (await pool.query('SELECT * FROM outbox_events WHERE id = $1', [id])).rows[0];
        assert.ok(fila.failed_at);
        assert.equal(fila.processed, false);
    });

    test('la expiración de una oferta y un SLA incumplido también avisan', async () => {
        const s = await cuenta('out.envio');
        const a = await envioPagado(s);
        const b = await envioPagado(s);
        const { expirarOferta } = await import('../servicios/envios/expiracion.js');
        const { revisarSla } = await import('../servicios/envios/sla.js');

        await pool.query(`UPDATE envios SET oferta_vence_en = now() - interval '1 minute' WHERE codigo = $1`, [a.envio.codigo]);
        await expirarOferta((await pool.query('SELECT id FROM envios WHERE codigo = $1', [a.envio.codigo])).rows[0].id);
        await pool.query(`UPDATE envios SET sla_vence_en = now() - interval '1 minute' WHERE codigo = $1`, [b.envio.codigo]);
        await revisarSla((await pool.query('SELECT id FROM envios WHERE codigo = $1', [b.envio.codigo])).rows[0].id);

        const [cancelado] = await eventos(a.envio.codigo, 'envio.cancelado_sin_chofer');
        const [cupon] = await eventos(b.envio.codigo, 'cupon.acreditado');
        assert.equal(cancelado.payload.reembolsado, true);
        assert.ok(cupon.payload.cuponCodigo);

        await outbox.despachar({ ids: [cancelado.id, cupon.id] });
        const titulos = (await notificaciones(s.perfil.id)).map((x) => x.titulo);
        assert.ok(titulos.includes('Envío cancelado'));
        assert.ok(titulos.includes('Te acreditamos un cupón'));
    });

    test('API: cada usuario ve y marca solo sus notificaciones', async () => {
        const s = await cuenta('out.api');
        const { pago } = await envioPagado(s);
        const [ev] = await eventos(pago.codigo, 'pago.aprobado');
        await outbox.despachar({ ids: [ev.id] });

        const lista = await api('/api/notificaciones', { token: s.token });
        assert.equal(lista.status, 200);
        assert.equal(lista.body.noLeidas, 1);
        const id = lista.body.notificaciones[0].id;

        const otro = await cuenta('out.otro');
        assert.equal((await api('/api/notificaciones/leidas', { metodo: 'POST', token: otro.token, cuerpo: { ids: [id] } })).body.marcadas, 0);
        assert.equal((await api('/api/notificaciones', { token: otro.token })).body.notificaciones.length, 0);

        assert.equal((await api('/api/notificaciones/leidas', { metodo: 'POST', token: s.token, cuerpo: { ids: [id] } })).body.marcadas, 1);
        assert.equal((await api('/api/notificaciones?soloNoLeidas=true', { token: s.token })).body.notificaciones.length, 0);
        assert.equal((await api('/api/notificaciones?limite=500', { token: s.token })).status, 400);
    });

    test('eliminar la cuenta borra sus notificaciones', async () => {
        const s = await cuenta('out.baja');
        const { envio, pago } = await envioPagado(s);
        const [ev] = await eventos(pago.codigo, 'pago.aprobado');
        await outbox.despachar({ ids: [ev.id] });
        await pool.query(`UPDATE envios SET estado = 'entregado' WHERE codigo = $1`, [envio.codigo]);

        const r = await api('/api/perfil/eliminar-cuenta', { metodo: 'POST', token: s.token, cuerpo: { contrasena: entorno.clave } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await notificaciones(s.perfil.id)).length, 0);
    });
});
