// Pedidos que nadie paga: a los MINUTOS_PARA_PAGAR (5 por defecto) dejan de
// aceptar pagos y un trabajo los borra de la base.
//
// Borrar es definitivo, así que antes se confirma con la pasarela que no haya
// un pago en curso: si alguien escaneó el QR de Mercado Pago justo al límite,
// el webhook puede llegar un rato después. Si la pasarela dice que hay un pago
// aprobado o en proceso, el pedido no se borra (lo aprueba el webhook o la
// consulta); si la pasarela no responde, el trabajo lo reintenta más tarde.
import { consultar, pool } from '../../db/pool.js';
import { log } from '../../observabilidad/logger.js';
import { registrarEvento } from '../../outbox/index.js';
import { hayPagoEnCurso, MINUTOS_PARA_PAGAR } from './vencimientoPago.js';

export { MINUTOS_PARA_PAGAR, pedidoVencido, RESPUESTA_VENCIDO } from './vencimientoPago.js';

// Margen después del vencimiento para que llegue un webhook en vuelo.
const SEGUNDOS_DE_GRACIA = 60;

const IMPAGO = `estado = 'pendiente' AND estado_pago IN ('pendiente', 'rechazado')`;

export async function enviosImpagosVencidos(limite = 200) {
    const { rows } = await consultar(
        `SELECT id FROM envios
         WHERE ${IMPAGO}
           AND pago_vence_en IS NOT NULL
           AND pago_vence_en <= now() - make_interval(secs => $2::int)
         ORDER BY pago_vence_en
         LIMIT $1`,
        [limite, SEGUNDOS_DE_GRACIA]
    );
    return rows.map((r) => r.id);
}

// Resultado: 'eliminado' | 'pago_en_curso' | 'no_aplica'. Si la pasarela no
// responde, lanza para que el trabajo reintente.
export async function eliminarImpago(envioId, { pasarelas } = {}) {
    // La pasarela se consulta antes de abrir la transacción: nunca se llama a un
    // tercero con filas bloqueadas.
    const { rows: intentos } = await consultar(
        `SELECT codigo, metodo, modo_proc, referencia_ext FROM pagos WHERE envio_id = $1 AND estado = 'pendiente'`,
        [envioId]
    );
    if (await hayPagoEnCurso(intentos, pasarelas)) {
        log().warn({ envioId }, 'Pedido impago vencido con un pago en curso en la pasarela: no se borra');
        return 'pago_en_curso';
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        // Recheck con lock: entre la consulta y acá pudo haberse pagado.
        const { rows } = await cliente.query(
            `SELECT * FROM envios
             WHERE id = $1 AND ${IMPAGO} AND pago_vence_en <= now() - make_interval(secs => $2::int)
             FOR UPDATE`,
            [envioId, SEGUNDOS_DE_GRACIA]
        );
        const envio = rows[0];
        if (!envio) {
            await cliente.query('ROLLBACK');
            return 'no_aplica';
        }
        const nuevos = await cliente.query(
            `SELECT 1 FROM pagos WHERE envio_id = $1 AND estado IN ('pendiente', 'aprobado') AND codigo <> ALL($2::text[])`,
            [envio.id, intentos.map((p) => p.codigo)]
        );
        if (nuevos.rowCount) {
            // Apareció un intento que no se verificó con la pasarela: queda para el próximo barrido.
            await cliente.query('ROLLBACK');
            return 'no_aplica';
        }

        // Borra el envío; en cascada se van sus eventos y sus intentos de pago.
        await cliente.query('DELETE FROM envios WHERE id = $1', [envio.id]);
        if (envio.cotizacion_id) {
            await cliente.query(`UPDATE cotizaciones SET estado = 'vencida' WHERE id = $1 AND estado = 'confirmada'`, [envio.cotizacion_id]);
        }
        await registrarEvento(cliente, {
            tipoAgregado: 'envio',
            idAgregado: envio.codigo,
            tipo: 'envio.eliminado_sin_pago',
            datos: { clienteId: envio.cliente_id, envioCodigo: envio.codigo, minutos: MINUTOS_PARA_PAGAR },
        });
        await cliente.query('COMMIT');
        log().info({ envio: envio.codigo }, 'Pedido impago vencido: eliminado');
        return 'eliminado';
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw e;
    } finally {
        cliente.release();
    }
}
