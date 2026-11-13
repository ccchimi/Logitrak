import { consultar, pool } from '../../db/pool.js';
import { reembolsarPagoDelEnvio } from '../pagos/reembolsos.js';
import { log } from '../../observabilidad/logger.js';
import { registrarEvento } from '../../outbox/index.js';

// Ventana que tiene la red para que algún chofer tome el envío. Se cuenta desde
// que el pago queda aprobado, no desde que se crea el envío.
export const MINUTOS_ESPERA_CHOFER =
    Number(process.env.MINUTOS_ESPERA_CHOFER) > 0
        ? Number(process.env.MINUTOS_ESPERA_CHOFER)
        : 5;

// Desde el Hito 2.1 la expiración la hace un job (src/trabajos): un barrido por
// minuto encola un trabajo por envío vencido, con reintentos. Listar y tomar
// ofertas ya excluyen las vencidas por su cuenta, así que entre que la oferta
// vence y el job la cancela ningún chofer puede tomarla.

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

// Cancela el envío y devuelve el pago. Resultado:
//   'expirado'   → cancelado (con reembolso, o con la devolución pendiente de revisión)
//   'no_aplica'  → ya no corresponde (un chofer lo tomó, ya estaba cancelado...)
//   'reintentar' → la pasarela no pudo reembolsar ahora: el job lo reintenta
// Un error inesperado se propaga para que el job también lo reintente.
export async function expirarOferta(envioId) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        // Recheck dentro de la transacción y con lock: entre que lo listamos y
        // llegamos acá, un chofer pudo haberlo tomado.
        const { rows } = await cliente.query(`SELECT * FROM envios WHERE id = $1 AND ${CONDICION_VENCIDA} FOR UPDATE`, [envioId]);
        const envio = rows[0];
        if (!envio) {
            await cliente.query('ROLLBACK');
            return 'no_aplica';
        }

        const r = await reembolsarPagoDelEnvio(cliente, envio.id);

        // Solo abortamos si el reembolso puede salir bien más tarde. Si la
        // pasarela lo rechaza de forma definitiva, cancelamos igual: dejar el
        // envío vivo para siempre es peor, porque ningún chofer lo va a tomar.
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
