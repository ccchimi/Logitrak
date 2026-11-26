// Aprobar un pago: lo usan el pago con tarjeta, la confirmación sandbox, la
// consulta del estado y los webhooks de las pasarelas.
//
// Si el envío ya tenía otro pago aprobado, este queda marcado como duplicado; si
// el envío estaba cancelado, queda pendiente de reembolso. En los dos casos el
// envío no cambia y el trabajo de pagos de más lo devuelve (devolucionDuplicados.js).
import { pool } from '../../db/pool.js';
import { MINUTOS_ESPERA_CHOFER } from '../envios/expiracion.js';
import { consumirCupon } from './cupones.js';
import { registrarError } from '../../observabilidad/logger.js';
import { registrarEvento } from '../../outbox/index.js';

function detalleDeLaAprobacion(detalle, { otro, cancelado }) {
    if (otro) return { ...(detalle ?? {}), duplicadoDe: otro.codigo, reembolsoPendiente: `pago duplicado de ${otro.codigo}` };
    if (cancelado) return { ...(detalle ?? {}), reembolsoPendiente: 'el envío ya estaba cancelado' };
    return detalle;
}

export async function aprobarPago(cliente, pagoId, extra = {}) {
    const previo = (await cliente.query('SELECT envio_id FROM pagos WHERE id = $1', [pagoId])).rows[0];
    if (!previo) return null;

    const estadoEnvio = (await cliente.query('SELECT estado FROM envios WHERE id = $1 FOR UPDATE', [previo.envio_id])).rows[0]?.estado;
    const actual = (await cliente.query('SELECT * FROM pagos WHERE id = $1 FOR UPDATE', [pagoId])).rows[0];
    if (actual.estado === 'aprobado' || actual.estado === 'reembolsado') return actual;

    const otro = (await cliente.query(
        `SELECT codigo FROM pagos WHERE envio_id = $1 AND estado = 'aprobado' AND id <> $2 LIMIT 1`,
        [actual.envio_id, pagoId]
    )).rows[0];

    const cancelado = !otro && estadoEnvio === 'cancelado';
    const detalleFinal = detalleDeLaAprobacion(extra.detalle ?? actual.detalle ?? null, { otro, cancelado });

    const { rows } = await cliente.query(
        `UPDATE pagos SET
             estado = 'aprobado',
             pago_ext_id = COALESCE($2, pago_ext_id),
             comprobante = COALESCE(comprobante,
                 'COMP-' || to_char(now(), 'YYYY') || '-' ||
                 lpad(nextval('comprobantes_seq')::text, 6, '0')),
             detalle = COALESCE($3::jsonb, detalle),
             pagado_en = COALESCE(pagado_en, now()),
             actualizado_en = now()
         WHERE id = $1 RETURNING *`,
        [pagoId, extra.pagoExtId ?? null, detalleFinal ? JSON.stringify(detalleFinal) : null]
    );
    const pago = rows[0];
    const envioCodigo = (await cliente.query('SELECT codigo FROM envios WHERE id = $1', [pago.envio_id])).rows[0].codigo;
    const datosEvento = {
        clienteId: pago.cliente_id,
        pagoCodigo: pago.codigo,
        envioCodigo,
        monto: Number(pago.monto),
        moneda: pago.moneda,
        metodo: pago.metodo,
    };

    if (otro) {
        registrarError(new Error('Pago aprobado duplicado'), `Pago ${pago.codigo} aprobado como DUPLICADO de ${otro.codigo}: hay que reembolsarlo.`, { pago: pago.codigo, duplicadoDe: otro.codigo });
        await registrarEvento(cliente, { tipoAgregado: 'pago', idAgregado: pago.codigo, tipo: 'pago.duplicado', datos: { ...datosEvento, duplicadoDe: otro.codigo } });
        return pago;
    }

    if (cancelado) {
        registrarError(new Error('Pago aprobado sobre un envío cancelado'), `Pago ${pago.codigo} aprobado sobre ${envioCodigo}, que estaba cancelado: hay que reembolsarlo.`, { pago: pago.codigo, envio: envioCodigo });
        await registrarEvento(cliente, { tipoAgregado: 'pago', idAgregado: pago.codigo, tipo: 'pago.sobre_envio_cancelado', datos: datosEvento });
        return pago;
    }

    await cliente.query(
        `UPDATE envios
         SET oferta_vence_en = COALESCE(oferta_vence_en, now() + make_interval(mins => $2::int)),
             sla_vence_en = CASE
                 WHEN estado_pago <> 'pagado' AND sla_min IS NOT NULL THEN now() + make_interval(mins => sla_min)
                 ELSE sla_vence_en END,
             estado_pago = 'pagado',
             actualizado_en = now()
         WHERE id = $1`,
        [pago.envio_id, MINUTOS_ESPERA_CHOFER]
    );
    await consumirCupon(cliente, pago);
    await registrarEvento(cliente, {
        tipoAgregado: 'pago',
        idAgregado: pago.codigo,
        tipo: 'pago.aprobado',
        datos: { ...datosEvento, comprobante: pago.comprobante },
    });
    return pago;
}

// aprobarPago en su propia transacción. Si algo falla, deshace y lanza el error.
export async function aprobarEnTransaccion(pagoId, extra = {}) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const pago = await aprobarPago(cliente, pagoId, extra);
        await cliente.query('COMMIT');
        return pago;
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw e;
    } finally {
        cliente.release();
    }
}
