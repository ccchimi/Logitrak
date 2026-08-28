import { consultar, pool } from '../../db/pool.js';
import { reembolsarPagoMp } from '../pagos/mercadoPago.js';

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

async function reembolsarPagoDelEnvio(cliente, envioId) {
    const { rows } = await cliente.query(
        `SELECT * FROM pagos
         WHERE envio_id = $1 AND estado = 'aprobado'
         ORDER BY pagado_en DESC NULLS LAST, id DESC
         LIMIT 1
         FOR UPDATE`,
        [envioId]
    );
    const pago = rows[0];
    if (!pago) return { reembolsado: false, motivo: 'sin pago aprobado' };

    // Los pagos sandbox (QR simulado y tarjeta simulada) nunca cobraron nada:
    // alcanza con dejarlos marcados. Los reales van contra la pasarela.
    let ok = true;
    if (pago.modo_proc === 'real' && pago.metodo === 'mercadopago' && pago.pago_ext_id) {
        ok = await reembolsarPagoMp(pago.pago_ext_id);
    }

    if (!ok) return { reembolsado: false, motivo: 'la pasarela rechazó el reembolso' };

    await cliente.query(
        `UPDATE pagos SET estado = 'reembolsado', reembolsado_en = now(), actualizado_en = now()
         WHERE id = $1`,
        [pago.id]
    );
    return { reembolsado: true, pago };
}

async function expirarUno(envioId) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        // Recheck dentro de la transacción y con lock: entre que lo listamos y
        // llegamos acá, un chofer pudo haberlo tomado.
        const { rows } = await cliente.query(
            `SELECT * FROM envios
             WHERE id = $1
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

        const resultado = await reembolsarPagoDelEnvio(cliente, envio.id);

        // Si la pasarela rechazó el reembolso no cancelamos: preferimos dejar el
        // envío vivo y reintentar en el próximo barrido antes que dejar al
        // cliente sin envío y sin plata.
        if (!resultado.reembolsado && resultado.motivo !== 'sin pago aprobado') {
            await cliente.query('ROLLBACK');
            console.error(`No se expiró el envío ${envio.codigo}: ${resultado.motivo}`);
            return false;
        }

        await cliente.query(
            `UPDATE envios
             SET estado = 'cancelado',
                 estado_pago = CASE WHEN $2 THEN 'reembolsado' ELSE estado_pago END,
                 actualizado_en = now()
             WHERE id = $1`,
            [envio.id, resultado.reembolsado]
        );

        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle)
             VALUES ($1, 'cancelado', $2, $3)`,
            [
                envio.id,
                'Envío cancelado por falta de choferes',
                resultado.reembolsado
                    ? `Ningún chofer tomó el envío en ${MINUTOS_ESPERA_CHOFER} minutos. Se devolvió el importe al medio de pago original.`
                    : `Ningún chofer tomó el envío en ${MINUTOS_ESPERA_CHOFER} minutos.`,
            ]
        );

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
        console.log(`Expiración de ofertas: ${expirados} envío(s) cancelado(s) y reembolsado(s).`);
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
