// Trabajos en segundo plano (Hito 2.1) contra PostgreSQL real: expiración de
// ofertas, compensación por SLA y el circuito completo con pg-boss.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };

describe('trabajos en segundo plano (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let api;
    let cuenta;
    let pool;
    let exp;
    let sla;
    let trabajos;

    before(async () => {
        entorno = await levantarApi();
        ({ api, cuenta, pool } = entorno);
        exp = await import('../servicios/envios/expiracion.js');
        sla = await import('../servicios/envios/sla.js');
        trabajos = await import('../trabajos/index.js');
    });

    after(() => entorno?.cerrar());

    let n = 0;
    async function envioPagado(s) {
        const codigo = `COT-TRAB-${++n}-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: s.token,
            cuerpo: { codigo, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 3, bultos: 1 },
        });
        // slaMin = 1: el servidor lo ignora y usa su propio plazo.
        const envio = (await api('/api/envios', { metodo: 'POST', token: s.token, cuerpo: { cotizacionCodigo: codigo, slaMin: 1 } })).body.envio;
        const pago = await api('/api/pagos/tarjeta', { metodo: 'POST', token: s.token, cuerpo: { envioCodigo: envio.codigo, ...TARJETA_OK } });
        assert.equal(pago.status, 201, JSON.stringify(pago.body));
        return (await pool.query('SELECT * FROM envios WHERE codigo = $1', [envio.codigo])).rows[0];
    }

    const fila = async (id) => (await pool.query('SELECT * FROM envios WHERE id = $1', [id])).rows[0];
    const cupones = async (id) => (await pool.query('SELECT * FROM cupones WHERE envio_id = $1', [id])).rows;

    test('el SLA lo fija el servidor y corre desde que se aprueba el pago', async () => {
        const s = await cuenta('trab.plazo');
        const e = await envioPagado(s);
        assert.equal(e.sla_min, sla.MINUTOS_SLA);
        const minutos = (new Date(e.sla_vence_en) - new Date(e.actualizado_en)) / 60000;
        assert.ok(Math.abs(minutos - sla.MINUTOS_SLA) < 0.1, `sla_vence_en a ${minutos} min del pago`);
    });

    test('una oferta vencida se cancela y se reembolsa; repetir no hace nada', async () => {
        const s = await cuenta('trab.oferta');
        const e = await envioPagado(s);
        assert.equal((await exp.enviosConOfertaVencida()).includes(e.id), false);

        await pool.query(`UPDATE envios SET oferta_vence_en = now() - interval '1 minute' WHERE id = $1`, [e.id]);
        assert.ok((await exp.enviosConOfertaVencida()).includes(e.id));

        assert.equal(await trabajos.procesarExpiracion(e.id), 'expirado');
        const despues = await fila(e.id);
        assert.equal(despues.estado, 'cancelado');
        assert.equal(despues.estado_pago, 'reembolsado');
        assert.equal(await trabajos.procesarExpiracion(e.id), 'no_aplica');
    });

    test('SLA vencido sin entrega: un cupón del servidor y un evento, una sola vez', async () => {
        const s = await cuenta('trab.sla');
        const e = await envioPagado(s);
        assert.equal((await sla.enviosConSlaParaRevisar()).includes(e.id), false);
        assert.equal(await sla.revisarSla(e.id), 'no_aplica');

        await pool.query(`UPDATE envios SET sla_vence_en = now() - interval '1 minute' WHERE id = $1`, [e.id]);
        assert.ok((await sla.enviosConSlaParaRevisar()).includes(e.id));
        assert.equal(await sla.revisarSla(e.id), 'compensado');
        assert.equal(await sla.revisarSla(e.id), 'no_aplica');

        const c = await cupones(e.id);
        assert.equal(c.length, 1);
        assert.equal(c[0].descuento_pct, sla.DESCUENTO_SLA_PCT);
        assert.equal(c[0].cliente_id, s.perfil.id);
        const ev = await pool.query(`SELECT * FROM envio_eventos WHERE envio_id = $1 AND tipo = 'sla_excedido'`, [e.id]);
        assert.equal(ev.rowCount, 1);
        assert.ok((await fila(e.id)).sla_revisado_en);
    });

    test('entregado a tiempo: se cierra la revisión sin cupón; entregado tarde: cupón', async () => {
        const s = await cuenta('trab.entrega');
        const aTiempo = await envioPagado(s);
        await pool.query(`UPDATE envios SET estado = 'entregado', entregado_en = now() WHERE id = $1`, [aTiempo.id]);
        assert.equal(await sla.revisarSla(aTiempo.id), 'cumplido');
        assert.equal((await cupones(aTiempo.id)).length, 0);

        const tarde = await envioPagado(s);
        await pool.query(
            `UPDATE envios SET estado = 'entregado', sla_vence_en = now() - interval '10 minutes', entregado_en = now() WHERE id = $1`,
            [tarde.id]
        );
        assert.equal(await sla.revisarSla(tarde.id), 'compensado');
        assert.equal((await cupones(tarde.id)).length, 1);
    });

    test('un cliente ya no puede emitirse cupones; la app vieja pide revisión del SLA', async () => {
        const s = await cuenta('trab.cupon');
        const e = await envioPagado(s);
        const pedir = (cuerpo) => api('/api/cupones', { metodo: 'POST', token: s.token, cuerpo });

        assert.equal((await pedir({ descuentoPct: 100, motivo: 'Me lo regalo' })).status, 403);
        assert.equal((await pedir({ descuentoPct: 100, motivo: 'Me lo regalo', envioCodigo: e.codigo })).status, 409);

        await pool.query(`UPDATE envios SET sla_vence_en = now() - interval '1 minute' WHERE id = $1`, [e.id]);
        const r = await pedir({ descuentoPct: 100, motivo: 'Me lo regalo', envioCodigo: e.codigo });
        assert.equal(r.status, 200);
        assert.equal(r.body.cupon.descuentoPct, sla.DESCUENTO_SLA_PCT);

        const otro = await cuenta('trab.ajeno');
        assert.equal((await api('/api/cupones', { metodo: 'POST', token: otro.token, cuerpo: { envioCodigo: e.codigo } })).status, 404);
    });

    test('un admin sí puede emitir un cupón a mano', async () => {
        const admin = await cuenta('trab.admin');
        await pool.query(`UPDATE usuarios SET rol = 'admin' WHERE usuario = $1`, [admin.usuario]);
        const login = await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: admin.usuario, contrasena: entorno.clave } });
        const cliente = await cuenta('trab.premiado');

        const r = await api('/api/cupones', {
            metodo: 'POST',
            token: login.body.token,
            cuerpo: { clienteId: cliente.perfil.id, descuentoPct: 30, motivo: 'Gesto comercial' },
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.equal(r.body.cupon.descuentoPct, 30);
    });

    test('pg-boss: al arrancar barre y procesa una oferta vencida sin intervención', async () => {
        const s = await cuenta('trab.boss');
        const e = await envioPagado(s);
        await pool.query(`UPDATE envios SET oferta_vence_en = now() - interval '1 minute' WHERE id = $1`, [e.id]);

        const boss = await trabajos.iniciarTrabajos({ pool });
        try {
            let estado = null;
            for (let i = 0; i < 60 && estado !== 'cancelado'; i++) {
                await new Promise((r) => setTimeout(r, 500));
                estado = (await fila(e.id)).estado;
            }
            assert.equal(estado, 'cancelado');
        } finally {
            await boss.stop({ graceful: true, timeout: 5000 });
        }
    });
});
