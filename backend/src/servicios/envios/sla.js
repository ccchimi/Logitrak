// Compensación por SLA incumplido, decidida por el servidor.
//
// La regla es la que promete la cotización: "chofer en el punto de retiro en
// menos de N min desde el pago o bonificamos el 10 % del flete". N sale de cada
// cotización (ETA de retiro + 5 min en tramos urbanos, + 10 en interurbanos),
// calculado con el mismo código que muestra la app (plazoRetiroMin).
//   · el plazo empieza a correr cuando se aprueba el pago (sla_vence_en);
//   · cuenta como retiro el momento en que el chofer lo registra (retirado_en,
//     el envío pasa a en_viaje). Si entrega sin haberlo registrado, cuenta la
//     entrega;
//   · un job revisa los envíos pagos y acredita UN cupón por envío si el retiro
//     llegó tarde, o si el plazo venció y todavía no hubo retiro;
//   · sla_revisado_en marca que ya se evaluó, para no repetirlo.
// Los envíos cancelados (por ejemplo, porque ningún chofer los tomó) no se
// compensan con cupón: se les devuelve el pago.
import { consultar, pool } from '../../db/pool.js';
import { log } from '../../observabilidad/logger.js';
import { registrarEvento } from '../../outbox/index.js';
import { BONIFICACION_SLA_PCT, plazoRetiroMin } from '../cotizador/cotizador.generado.js';

const entero = (valor, porDefecto) => (Number(valor) > 0 ? Math.round(Number(valor)) : porDefecto);

// Solo para cotizaciones sin tiempos estimados (anteriores al cotizador del servidor).
export const MINUTOS_SLA = entero(process.env.MINUTOS_SLA, 20);
// El porcentaje es el que promete la cotización: no se configura aparte, para
// que lo prometido y lo acreditado no puedan diferir.
export const DESCUENTO_SLA_PCT = BONIFICACION_SLA_PCT;
export const MOTIVO_SLA = 'Compensación: el chofer no llegó al retiro en el plazo prometido.';

// Minutos de SLA de un envío según su cotización (fila de la tabla cotizaciones).
export function plazoDeLaCotizacion(cotizacion) {
    const eta = Number(cotizacion?.detalle?.tiempos?.etaRetiroMin);
    const km = Number(cotizacion?.distancia_km ?? cotizacion?.detalle?.distanciaKm);
    if (!(eta > 0) || !Number.isFinite(km)) return MINUTOS_SLA;
    return plazoRetiroMin(km, eta);
}

const PENDIENTE_DE_REVISION = `
    sla_revisado_en IS NULL
    AND sla_vence_en IS NOT NULL
    AND estado_pago = 'pagado'
    AND archivado_en IS NULL`;

const INCUMPLIDO = `
    estado <> 'cancelado' AND (
        COALESCE(retirado_en, entregado_en) > sla_vence_en
        OR (retirado_en IS NULL AND entregado_en IS NULL AND sla_vence_en <= now())
    )`;

export async function enviosConSlaParaRevisar(limite = 200) {
    const { rows } = await consultar(
        `SELECT id FROM envios
         WHERE ${PENDIENTE_DE_REVISION}
           AND ((${INCUMPLIDO}) OR retirado_en IS NOT NULL OR estado IN ('entregado', 'cancelado'))
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
            // Retirado a tiempo, entregado o cancelado: se cierra la revisión sin
            // cupón. Si todavía no lo retiraron y el plazo sigue corriendo, no hay
            // nada que decidir.
            const cerrado = envio.retirado_en !== null || envio.estado === 'entregado' || envio.estado === 'cancelado';
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
                [envio.id, `El chofer no llegó al retiro en ${envio.sla_min} min. Se acreditó un cupón de compensación del ${DESCUENTO_SLA_PCT} % al cliente.`]
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
