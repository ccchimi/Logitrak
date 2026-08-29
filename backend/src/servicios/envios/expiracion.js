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
    if (!pago) return { estado: 'sin_pago' };

    // Los pagos sandbox (QR simulado y tarjeta simulada) nunca cobraron nada:
    // alcanza con dejarlos marcados. Los reales van contra la pasarela.
    const esReal = pago.modo_proc === 'real' && pago.metodo === 'mercadopago' && pago.pago_ext_id;
    const r = esReal
        ? await reembolsarPagoMp(pago.pago_ext_id)
        : { ok: true, reintentable: false, motivo: 'pago sandbox, no hubo cobro real' };

    if (r.ok) {
        await cliente.query(
            `UPDATE pagos SET estado = 'reembolsado', reembolsado_en = now(), actualizado_en = now(),
                    detalle = COALESCE(detalle, '{}'::jsonb) || jsonb_build_object('reembolso', $2::text)
             WHERE id = $1`,
            [pago.id, r.motivo]
        );
        return { estado: 'reembolsado' };
    }

    if (r.reintentable) return { estado: 'reintentar', motivo: r.motivo };

    // Falla permanente: la pasarela no va a aceptar el reembolso por más que
    // insistamos. Dejamos el pago como aprobado —no mentimos sobre la plata— y
    // anotamos el motivo para que quede a la vista de un admin.
    await cliente.query(
        `UPDATE pagos SET actualizado_en = now(),
                detalle = COALESCE(detalle, '{}'::jsonb) || jsonb_build_object('reembolsoPendiente', $2::text)
         WHERE id = $1`,
        [pago.id, r.motivo]
    );
    return { estado: 'reembolso_pendiente', motivo: r.motivo };
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
