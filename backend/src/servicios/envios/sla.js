import { consultar, pool } from '../../db/pool.js';
import { log } from '../../observabilidad/logger.js';
import { registrarEvento } from '../../outbox/index.js';
import { BONIFICACION_SLA_PCT, plazoRetiroMin } from '../cotizador/cotizador.generado.js';

const entero = (valor, porDefecto) => (Number(valor) > 0 ? Math.round(Number(valor)) : porDefecto);

export const MINUTOS_SLA = entero(process.env.MINUTOS_SLA, 20);
export const DESCUENTO_SLA_PCT = BONIFICACION_SLA_PCT;
export const MOTIVO_SLA = 'Compensación: el chofer no llegó al retiro en el plazo prometido.';

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
