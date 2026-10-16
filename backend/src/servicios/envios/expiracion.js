import { consultar, pool } from '../../db/pool.js';
import { reembolsarPagoDelEnvio } from '../pagos/reembolsos.js';

// Ventana que tiene la red para que algún chofer tome el envío. Se cuenta desde
// que el pago queda aprobado, no desde que se crea el envío.
export const MINUTOS_ESPERA_CHOFER =
    Number(process.env.MINUTOS_ESPERA_CHOFER) > 0
        ? Number(process.env.MINUTOS_ESPERA_CHOFER)
        : 5;

// Expiración perezosa: no hay cron ni worker. El barrido se dispara desde las
// lecturas (panel del cliente, ofertas del chofer), que es cuando el estado
// importa. El throttle evita repetirlo en cada request de una misma ráfaga.
const MS_ENTRE_BARRIDOS = 5000;
let ultimoBarrido = 0;
let barridoEnCurso = null;

async function expirarUno(envioId) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        // Recheck dentro de la transacción y con lock: entre que lo listamos y
        // llegamos acá, un chofer pudo haberlo tomado.
        const { rows } = await cliente.query(
            `SELECT * FROM envios
             WHERE id = $1
               AND archivado_en IS NULL
               AND chofer_id IS NULL
               AND estado = 'pendiente'
               AND estado_pago = 'pagado'
               AND oferta_vence_en IS NOT NULL
               AND oferta_vence_en <= now()
             FOR UPDATE`,
            [envioId]
        );
        const envio = rows[0];
        if (!envio) {
            await cliente.query('ROLLBACK');
            return false;
        }

        const r = await reembolsarPagoDelEnvio(cliente, envio.id);

        // Solo abortamos si el reembolso puede salir bien más tarde. Si la
        // pasarela lo rechaza de forma definitiva, cancelamos igual: dejar el
        // envío vivo para siempre es peor, porque ningún chofer lo va a tomar.
        if (r.estado === 'reintentar') {
            await cliente.query('ROLLBACK');
            console.error(`Reembolso del envío ${envio.codigo} pospuesto: ${r.motivo}`);
            return false;
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

        if (r.estado === 'reembolso_pendiente') {
            console.error(`Envío ${envio.codigo} cancelado SIN reembolsar: ${r.motivo}`);
        }

        await cliente.query('COMMIT');
        return true;
    } catch (e) {
        await cliente.query('ROLLBACK');
        console.error('No se pudo expirar el envío:', e.message);
        return false;
    } finally {
        cliente.release();
    }
}

async function barrer() {
    const { rows } = await consultar(
        `SELECT id FROM envios
         WHERE chofer_id IS NULL
           AND archivado_en IS NULL
           AND estado = 'pendiente'
           AND estado_pago = 'pagado'
           AND oferta_vence_en IS NOT NULL
           AND oferta_vence_en <= now()
         LIMIT 50`
    );

    let expirados = 0;
    for (const fila of rows) {
        if (await expirarUno(fila.id)) expirados += 1;
    }
    if (expirados > 0) {
        console.log(`Expiración de ofertas: ${expirados} envío(s) cancelado(s).`);
    }
    return expirados;
}

// Se puede llamar sin await desde una ruta de lectura: nunca lanza y comparte
// una sola corrida entre requests concurrentes.
export async function expirarOfertasVencidas({ forzar = false } = {}) {
    if (barridoEnCurso) return barridoEnCurso;

    const ahora = Date.now();
    if (!forzar && ahora - ultimoBarrido < MS_ENTRE_BARRIDOS) return 0;
    ultimoBarrido = ahora;

    barridoEnCurso = barrer()
        .catch((e) => {
            console.error('Falló el barrido de ofertas vencidas:', e.message);
            return 0;
        })
        .finally(() => {
            barridoEnCurso = null;
        });

    return barridoEnCurso;
}
