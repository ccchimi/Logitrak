// Pedidos impagos (vencen a los 5 minutos y se borran) contra PostgreSQL real.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';
import { hayPagoEnCurso, pedidoVencido } from '../servicios/envios/vencimientoPago.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };

const pasarelas = (respuesta) => ({
    mpHabilitado: () => true,
    modoHabilitado: () => true,
    buscarPagoMpPorReferencia: async () => {
        if (respuesta instanceof Error) throw respuesta;
        return respuesta;
    },
    consultarIntencionModo: async () => null,
});

// Los módulos que usan la base (impagos.js) se importan dentro de before(),
// después de levantarApi(): si se importan arriba, la conexión se crea antes de
// apuntarla a la base de prueba. vencimientoPago.js no toca la base.
describe('pedidoVencido y hayPagoEnCurso', () => {
    test('vence solo si no está pago y pasó el límite', () => {
        const antes = new Date(Date.now() - 1000).toISOString();
        const despues = new Date(Date.now() + 60000).toISOString();
        assert.equal(pedidoVencido({ estado_pago: 'pendiente', pago_vence_en: antes }), true);
        assert.equal(pedidoVencido({ estado_pago: 'rechazado', pago_vence_en: antes }), true);
        assert.equal(pedidoVencido({ estado_pago: 'pagado', pago_vence_en: antes }), false);
        assert.equal(pedidoVencido({ estado_pago: 'pendiente', pago_vence_en: despues }), false);
        assert.equal(pedidoVencido({ estado_pago: 'pendiente', pago_vence_en: null }), false);
    });

    test('consulta la pasarela solo por intentos reales y distingue "no hay" de "no se sabe"', async () => {
        const real = [{ codigo: 'PAY-1', metodo: 'mercadopago', modo_proc: 'real' }];
        assert.equal(await hayPagoEnCurso(real, pasarelas(null)), false);
        assert.equal(await hayPagoEnCurso(real, pasarelas({ estado: 'rejected' })), false);
        assert.equal(await hayPagoEnCurso(real, pasarelas({ estado: 'approved' })), true);
        assert.equal(await hayPagoEnCurso(real, pasarelas({ estado: 'in_process' })), true);
        await assert.rejects(hayPagoEnCurso(real, pasarelas(new Error('timeout'))), /timeout/);
        const sandbox = [{ codigo: 'PAY-2', metodo: 'mercadopago', modo_proc: 'sandbox' }];
        assert.equal(await hayPagoEnCurso(sandbox, pasarelas(new Error('no debería consultarse'))), false);
    });
});

describe('pedidos impagos (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let api;
    let cuenta;
    let pool;
    let impagos;

    before(async () => {
        entorno = await levantarApi();
        ({ api, cuenta, pool } = entorno);
        impagos = await import('../servicios/envios/impagos.js');
    });

    after(() => entorno?.cerrar());

    let n = 0;
    async function envioSinPagar(s) {
        const codigo = `COT-IMP-${++n}-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: s.token,
            cuerpo: { codigo, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 3, bultos: 1 },
        });
        const r = await api('/api/envios', { metodo: 'POST', token: s.token, cuerpo: { cotizacionCodigo: codigo } });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        return { ...r.body.envio, cotizacion: codigo };
    }
    const vencer = (codigo, segundos = 120) =>
        pool.query(`UPDATE envios SET pago_vence_en = now() - make_interval(secs => $2::int) WHERE codigo = $1`, [codigo, segundos]);
    const idDe = async (codigo) => (await pool.query('SELECT id FROM envios WHERE codigo = $1', [codigo])).rows[0]?.id;

    test('el pedido nace con 5 minutos para pagar, y la app lo ve', async () => {
        const s = await cuenta('imp.plazo');
        const e = await envioSinPagar(s);
        const minutos = (new Date(e.pagoVenceEn) - new Date(e.creadoEn)) / 60000;
        assert.ok(Math.abs(minutos - impagos.MINUTOS_PARA_PAGAR) < 0.05, `vence a ${minutos} min`);
    });

    test('vencido no acepta pagos: tarjeta, checkout ni confirmación sandbox', async () => {
        const s = await cuenta('imp.cobro');
        const e = await envioSinPagar(s);
        const ck = await api('/api/pagos/checkout', { metodo: 'POST', token: s.token, cuerpo: { envioCodigo: e.codigo, metodo: 'modo' } });
        assert.equal(ck.status, 201, JSON.stringify(ck.body));
        await vencer(e.codigo, 1);

        const tarjeta = await api('/api/pagos/tarjeta', { metodo: 'POST', token: s.token, cuerpo: { envioCodigo: e.codigo, ...TARJETA_OK } });
        assert.equal(tarjeta.status, 409);
        assert.equal(tarjeta.body.codigo, 'pedido_vencido');
        assert.equal((await api('/api/pagos/checkout', { metodo: 'POST', token: s.token, cuerpo: { envioCodigo: e.codigo, metodo: 'mercadopago' } })).status, 409);
        assert.equal((await api(`/api/pagos/${ck.body.pago.codigo}/confirmar`, { metodo: 'POST', token: s.token })).status, 409);
    });

    test('vencido se borra de la base con sus intentos de pago, y avisa al cliente', async () => {
        const s = await cuenta('imp.borrar');
        const e = await envioSinPagar(s);
        await api('/api/pagos/tarjeta', {
            metodo: 'POST',
            token: s.token,
            cuerpo: { envioCodigo: e.codigo, ...TARJETA_OK, numero: '4000000000000002' }, // tarjeta rechazada del procesador simulado
        });
        const id = await idDe(e.codigo);
        assert.ok((await pool.query('SELECT 1 FROM pagos WHERE envio_id = $1', [id])).rowCount >= 1);

        await vencer(e.codigo, 30);
        assert.equal((await impagos.enviosImpagosVencidos()).includes(id), false, 'dentro del margen de gracia todavía no');
        await vencer(e.codigo);
        assert.ok((await impagos.enviosImpagosVencidos()).includes(id));

        assert.equal(await impagos.eliminarImpago(id), 'eliminado');
        assert.equal(await idDe(e.codigo), undefined);
        assert.equal((await pool.query('SELECT 1 FROM pagos WHERE envio_id = $1', [id])).rowCount, 0);
        assert.equal((await pool.query('SELECT 1 FROM envio_eventos WHERE envio_id = $1', [id])).rowCount, 0);
        assert.equal((await pool.query('SELECT estado FROM cotizaciones WHERE codigo = $1', [e.cotizacion])).rows[0].estado, 'vencida');
        const ev = await pool.query(`SELECT payload FROM outbox_events WHERE aggregate_id = $1 AND event_type = 'envio.eliminado_sin_pago'`, [e.codigo]);
        assert.equal(ev.rows[0].payload.clienteId, s.perfil.id);
        assert.equal((await api(`/api/envios/${e.codigo}`, { token: s.token })).status, 404);
        assert.equal(await impagos.eliminarImpago(id), 'no_aplica');
    });

    test('un pedido pago nunca se borra', async () => {
        const s = await cuenta('imp.pago');
        const e = await envioSinPagar(s);
        assert.equal((await api('/api/pagos/tarjeta', { metodo: 'POST', token: s.token, cuerpo: { envioCodigo: e.codigo, ...TARJETA_OK } })).status, 201);
        await vencer(e.codigo);
        const id = await idDe(e.codigo);
        assert.equal((await impagos.enviosImpagosVencidos()).includes(id), false);
        assert.equal(await impagos.eliminarImpago(id), 'no_aplica');
        assert.ok(await idDe(e.codigo));
    });

    test('con un pago en curso en la pasarela no se borra; si la pasarela no responde, se reintenta', async () => {
        const s = await cuenta('imp.pasarela');
        const e = await envioSinPagar(s);
        const id = await idDe(e.codigo);
        await pool.query(
            `INSERT INTO pagos (envio_id, cliente_id, metodo, monto, estado, modo_proc) VALUES ($1, $2, 'mercadopago', 1000, 'pendiente', 'real')`,
            [id, s.perfil.id]
        );
        await vencer(e.codigo);

        assert.equal(await impagos.eliminarImpago(id, { pasarelas: pasarelas({ estado: 'approved' }) }), 'pago_en_curso');
        await assert.rejects(impagos.eliminarImpago(id, { pasarelas: pasarelas(new Error('Mercado Pago no responde')) }));
        assert.ok(await idDe(e.codigo), 'sigue en la base');

        assert.equal(await impagos.eliminarImpago(id, { pasarelas: pasarelas(null) }), 'eliminado');
        assert.equal(await idDe(e.codigo), undefined);
    });
});
