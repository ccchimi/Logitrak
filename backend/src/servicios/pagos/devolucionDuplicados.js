import { consultar, pool } from '../../db/pool.js';
import { log, registrarError } from '../../observabilidad/logger.js';
import { registrarEvento } from '../../outbox/index.js';
import { reembolsarPago } from './reembolsos.js';

// Pagos que se aprobaron de más (ver aprobarPago en servicios/pagos/aprobacion.js): un
// segundo cobro sobre un envío que ya estaba pago, o un cobro que llegó
// cuando el envío ya se había cancelado. Se devuelven solos; si la pasarela
// no lo permite, quedan "en revisión" y se avisa a los administradores.
const SOBRE_CANCELADO = 'el envío ya estaba cancelado';
const PARA_DEVOLVER = `
    p.estado = 'aprobado'
    AND p.detalle ? 'reembolsoPendiente'
    AND NOT p.detalle ? 'reembolsoEnRevision'
    AND (p.detalle ? 'duplicadoDe' OR p.detalle->>'reembolsoPendiente' = '${SOBRE_CANCELADO}')`;

export async function pagosParaDevolver(limite = 100) {
    const { rows } = await consultar(
        `SELECT p.id FROM pagos p WHERE ${PARA_DEVOLVER} ORDER BY p.pagado_en NULLS LAST, p.id LIMIT $1`,
        [limite]
    );
    return rows.map((r) => r.id);
}

export async function devolverPagoDeMas(pagoId) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `SELECT p.*, e.codigo AS envio_codigo FROM pagos p JOIN envios e ON e.id = p.envio_id
             WHERE p.id = $1 AND ${PARA_DEVOLVER} FOR UPDATE OF p`,
            [pagoId]
        );
        const pago = rows[0];
        if (!pago) {
            await cliente.query('ROLLBACK');
            return 'no_aplica';
        }

        const r = await reembolsarPago(cliente, pago, { devolverCupon: false });
        if (r.estado === 'reintentar') {
            await cliente.query('ROLLBACK');
            log().warn({ pago: pago.codigo, motivo: r.motivo }, 'Devolución de un pago de más pospuesta: se reintenta');
            return 'reintentar';
        }

        const datos = {
            clienteId: pago.cliente_id,
            pagoCodigo: pago.codigo,
            envioCodigo: pago.envio_codigo,
            monto: Number(pago.monto),
            moneda: pago.moneda,
            duplicadoDe: pago.detalle?.duplicadoDe ?? null,
        };

        if (r.estado === 'reembolsado') {
            await cliente.query(`UPDATE pagos SET detalle = detalle - 'reembolsoPendiente' WHERE id = $1`, [pago.id]);
            await registrarEvento(cliente, { tipoAgregado: 'pago', idAgregado: pago.codigo, tipo: 'pago.devuelto', datos });
            await cliente.query('COMMIT');
            log().info({ pago: pago.codigo, envio: pago.envio_codigo }, 'Pago de más devuelto automáticamente');
            return 'devuelto';
        }

        await cliente.query(
            `UPDATE pagos SET detalle = detalle || jsonb_build_object('reembolsoEnRevision', true) WHERE id = $1`,
            [pago.id]
        );
        await registrarEvento(cliente, {
            tipoAgregado: 'pago',
            idAgregado: pago.codigo,
            tipo: 'pago.devolucion_fallida',
            datos: { ...datos, motivo: r.motivo },
        });
        await cliente.query('COMMIT');
        registrarError(new Error('Devolución automática fallida'), `No se pudo devolver el pago ${pago.codigo}: ${r.motivo}`, { pago: pago.codigo });
        return 'en_revision';
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw e;
    } finally {
        cliente.release();
    }
}
