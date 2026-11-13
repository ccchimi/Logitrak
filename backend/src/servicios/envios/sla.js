// Compensación por SLA incumplido, decidida por el servidor (Hito 2.1).
//
// Antes la app emitía el cupón cuando su contador de pantalla llegaba a cero, y
// POST /api/cupones aceptaba el porcentaje que mandara el cliente. Ahora:
//   · el SLA empieza a correr cuando se aprueba el pago (sla_vence_en);
//   · un job revisa los envíos pagos cuyo SLA venció sin entrega, o que se
//     entregaron tarde, y acredita UN cupón por envío;
//   · sla_revisado_en marca que ya se evaluó, para no repetirlo.
// Los envíos cancelados (por ejemplo, porque ningún chofer los tomó) no se
// compensan con cupón: se les devuelve el pago.
import { consultar, pool } from '../../db/pool.js';
import { log } from '../../observabilidad/logger.js';
import { registrarEvento } from '../../outbox/index.js';

const entero = (valor, porDefecto) => (Number(valor) > 0 ? Math.round(Number(valor)) : porDefecto);

export const MINUTOS_SLA = entero(process.env.MINUTOS_SLA, 20);
export const DESCUENTO_SLA_PCT = Math.min(100, entero(process.env.DESCUENTO_SLA_PCT, 15));
export const MOTIVO_SLA = 'Compensación: el envío excedió su SLA de arribo.';

const PENDIENTE_DE_REVISION = `
    sla_revisado_en IS NULL
    AND sla_vence_en IS NOT NULL
    AND estado_pago = 'pagado'
    AND archivado_en IS NULL`;

const INCUMPLIDO = `
    (estado IN ('pendiente', 'asignado', 'en_viaje') AND sla_vence_en <= now())
    OR (estado = 'entregado' AND entregado_en > sla_vence_en)`;

export async function enviosConSlaParaRevisar(limite = 200) {
    const { rows } = await consultar(
        `SELECT id FROM envios
         WHERE ${PENDIENTE_DE_REVISION}
           AND ((${INCUMPLIDO}) OR estado IN ('entregado', 'cancelado'))
         ORDER BY sla_vence_en
         LIMIT $1`,
        [limite]
    );
    return rows.map((r) => r.id);
}

// Resultado: 'compensado' | 'cumplido' | 'no_aplica'. Idempotente: el lock
// sobre el envío y la marca sla_revisado_en garantizan un solo cupón.
export async function revisarSla(envioId) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `SELECT *, (${INCUMPLIDO}) AS incumplido FROM envios WHERE id = $1 AND ${PENDIENTE_DE_REVISION} FOR UPDATE`,
            [envioId]
        );
        const envio = rows[0];
        if (!envio) {
            await cliente.query('ROLLBACK');
            return 'no_aplica';
        }

        if (!envio.incumplido) {
            // Entregado a tiempo o cancelado: se cierra la revisión sin cupón. Si
            // sigue en curso y dentro del plazo, todavía no hay nada que decidir.
            const cerrado = envio.estado === 'entregado' || envio.estado === 'cancelado';
            if (cerrado) await cliente.query('UPDATE envios SET sla_revisado_en = now() WHERE id = $1', [envio.id]);
            await cliente.query('COMMIT');
            return cerrado ? 'cumplido' : 'no_aplica';
        }

        const yaTiene = await cliente.query('SELECT 1 FROM cupones WHERE envio_id = $1 LIMIT 1', [envio.id]);
        if (!yaTiene.rowCount) {
            const cupon = await cliente.query(
                `INSERT INTO cupones (cliente_id, envio_id, descuento_pct, motivo) VALUES ($1, $2, $3, $4) RETURNING codigo`,
                [envio.cliente_id, envio.id, DESCUENTO_SLA_PCT, MOTIVO_SLA]
            );
            await registrarEvento(cliente, {
                tipoAgregado: 'envio',
                idAgregado: envio.codigo,
                tipo: 'cupon.acreditado',
                datos: { clienteId: envio.cliente_id, envioCodigo: envio.codigo, descuentoPct: DESCUENTO_SLA_PCT, cuponCodigo: cupon.rows[0].codigo },
            });
            await cliente.query(
                `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle) VALUES ($1, 'sla_excedido', 'SLA excedido', $2)`,
                [envio.id, `Se acreditó un cupón de compensación del ${DESCUENTO_SLA_PCT} % al cliente.`]
            );
        }
        await cliente.query('UPDATE envios SET sla_revisado_en = now() WHERE id = $1', [envio.id]);
        await cliente.query('COMMIT');
        if (!yaTiene.rowCount) log().info({ envio: envio.codigo, descuentoPct: DESCUENTO_SLA_PCT }, 'SLA incumplido: cupón acreditado');
        return 'compensado';
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw e;
    } finally {
        cliente.release();
    }
}
