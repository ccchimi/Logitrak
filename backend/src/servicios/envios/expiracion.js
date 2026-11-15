import { consultar, pool } from '../../db/pool.js';
import { reembolsarPagoDelEnvio } from '../pagos/reembolsos.js';
import { log } from '../../observabilidad/logger.js';
import { registrarEvento } from '../../outbox/index.js';

export const MINUTOS_ESPERA_CHOFER =
    Number(process.env.MINUTOS_ESPERA_CHOFER) > 0
        ? Number(process.env.MINUTOS_ESPERA_CHOFER)
        : 5;

const CONDICION_VENCIDA = `
    chofer_id IS NULL
    AND archivado_en IS NULL
    AND estado = 'pendiente'
    AND estado_pago = 'pagado'
    AND oferta_vence_en IS NOT NULL
    AND oferta_vence_en <= now()`;

export async function enviosConOfertaVencida(limite = 200) {
    const { rows } = await consultar(
        `SELECT id FROM envios WHERE ${CONDICION_VENCIDA} ORDER BY oferta_vence_en LIMIT $1`,
        [limite]
    );
    return rows.map((r) => r.id);
}

export async function expirarOferta(envioId) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const { rows } = await cliente.query(`SELECT * FROM envios WHERE id = $1 AND ${CONDICION_VENCIDA} FOR UPDATE`, [envioId]);
        const envio = rows[0];
        if (!envio) {
            await cliente.query('ROLLBACK');
            return 'no_aplica';
        }

        const r = await reembolsarPagoDelEnvio(cliente, envio.id);

        if (r.estado === 'reintentar') {
            await cliente.query('ROLLBACK');
            log().warn({ envio: envio.codigo, motivo: r.motivo }, 'Reembolso del envío pospuesto: se reintenta');
            return 'reintentar';
        }

        const reembolsado = r.estado === 'reembolsado';

        await cliente.query(
            `UPDATE envios
             SET estado = 'cancelado',
                 estado_pago = CASE WHEN $2 THEN 'reembolsado' ELSE estado_pago END,
                 actualizado_en = now()
             WHERE id = $1`,
            [envio.id, reembolsado]
        );

        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle)
             VALUES ($1, 'cancelado', $2, $3)`,
            [
                envio.id,
                'Envío cancelado por falta de choferes',
                reembolsado
                    ? `Ningún chofer tomó el envío en ${MINUTOS_ESPERA_CHOFER} minutos. Se devolvió el importe al medio de pago original.`
                    : `Ningún chofer tomó el envío en ${MINUTOS_ESPERA_CHOFER} minutos. La devolución quedó pendiente de revisión.`,
            ]
        );

        await registrarEvento(cliente, {
            tipoAgregado: 'envio',
            idAgregado: envio.codigo,
            tipo: 'envio.cancelado_sin_chofer',
            datos: { clienteId: envio.cliente_id, envioCodigo: envio.codigo, reembolsado },
        });

        if (r.estado === 'reembolso_pendiente') {
            log().error({ envio: envio.codigo, motivo: r.motivo }, 'Envío cancelado SIN reembolsar');
        }

        await cliente.query('COMMIT');
        log().info({ envio: envio.codigo, reembolsado }, 'Oferta vencida: envío cancelado');
        return 'expirado';
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw e;
    } finally {
        cliente.release();
    }
}
