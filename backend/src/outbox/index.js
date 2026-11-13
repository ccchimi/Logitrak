// Patrón outbox (Hito 2.2).
//
// registrarEvento() se llama con el cliente de la transacción que produce el
// hecho (aprobar un pago, cancelar un envío...): el evento se confirma o se
// revierte junto con ese cambio. Nunca se manda nada a un tercero desde adentro
// de la transacción.
//
// despachar() lo corre un trabajo de pg-boss: toma los eventos pendientes y
// ejecuta sus manejadores. Cada evento se procesa en su propia transacción con
// FOR UPDATE SKIP LOCKED, así dos despachadores nunca toman el mismo. Si un
// manejador falla, el evento se reintenta con espera creciente; después de
// MAX_INTENTOS queda marcado como fallido y se avisa (log + Sentry).
//
// Los payloads llevan ids y códigos, nunca datos personales: así el outbox no
// es otra copia de datos que borrar cuando alguien elimina su cuenta.
import { pool } from '../db/pool.js';
import { log, registrarError } from '../observabilidad/logger.js';
import { MANEJADORES } from './manejadores.js';

export const MAX_INTENTOS = 8;
// Espera entre intentos: 30 s, 1 min, 2 min, 4 min... (se duplica cada vez).
const ESPERA_BASE_SEG = 30;
export const DIAS_RETENCION = 30;

// El módulo de trabajos se registra acá para que, al confirmarse un evento, el
// despachador corra enseguida en vez de esperar al barrido del minuto.
let avisarDespachador = null;
export function alRegistrarEvento(fn) {
    avisarDespachador = fn;
}

export async function registrarEvento(cliente, { tipoAgregado, idAgregado, tipo, datos = {} }) {
    const { rows } = await cliente.query(
        `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tipoAgregado, String(idAgregado), tipo, JSON.stringify(datos)]
    );
    avisarDespachador?.();
    return rows[0].id;
}

async function procesarUno(id, manejadores) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `SELECT * FROM outbox_events
             WHERE id = $1 AND NOT processed AND failed_at IS NULL AND next_attempt_at <= now()
             FOR UPDATE SKIP LOCKED`,
            [id]
        );
        const evento = rows[0];
        if (!evento) {
            await cliente.query('ROLLBACK');
            return 'omitido';
        }

        const manejador = manejadores[evento.event_type];
        if (!manejador) throw new Error(`No hay manejador para el evento ${evento.event_type}`);

        // Los efectos en la base (por ejemplo, la notificación) van en la misma
        // transacción que la marca de procesado: o quedan los dos, o ninguno.
        await manejador(cliente, evento);
        await cliente.query('UPDATE outbox_events SET processed = TRUE, processed_at = now(), last_error = NULL WHERE id = $1', [id]);
        await cliente.query('COMMIT');
        return 'procesado';
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        return registrarFalla(id, e);
    } finally {
        cliente.release();
    }
}

async function registrarFalla(id, error) {
    const { rows } = await pool.query(
        `UPDATE outbox_events
         SET attempts = attempts + 1,
             last_error = left($2, 500),
             next_attempt_at = now() + make_interval(secs => $3::int * power(2, LEAST(attempts, 10))::int),
             failed_at = CASE WHEN attempts + 1 >= $4 THEN now() ELSE NULL END
         WHERE id = $1
         RETURNING event_type, aggregate_id, attempts, failed_at`,
        [id, error.message, ESPERA_BASE_SEG, MAX_INTENTOS]
    );
    const fila = rows[0];
    if (fila?.failed_at) {
        registrarError(error, 'Evento del outbox fallido: agotó los reintentos', { eventoId: id, tipo: fila.event_type, agregado: fila.aggregate_id });
        return 'fallido';
    }
    log().warn({ err: error, eventoId: id, tipo: fila?.event_type, intento: fila?.attempts }, 'Evento del outbox falló: se reintenta');
    return 'reintentar';
}

// Procesa los pendientes de a uno, hasta `limite`. Devuelve el conteo por resultado.
// `ids` restringe el despacho a esos eventos (lo usan las pruebas).
export async function despachar({ limite = 100, manejadores = MANEJADORES, ids = null } = {}) {
    const { rows } = await pool.query(
        `SELECT id FROM outbox_events
         WHERE NOT processed AND failed_at IS NULL AND next_attempt_at <= now()
           AND ($2::bigint[] IS NULL OR id = ANY($2::bigint[]))
         ORDER BY id
         LIMIT $1`,
        [limite, ids]
    );
    const resumen = { procesado: 0, reintentar: 0, fallido: 0, omitido: 0 };
    for (const { id } of rows) resumen[await procesarUno(id, manejadores)] += 1;
    if (resumen.procesado || resumen.reintentar || resumen.fallido) log().info(resumen, 'Outbox despachado');
    return resumen;
}

// Los eventos ya procesados no se guardan para siempre.
export async function purgarProcesados(dias = DIAS_RETENCION) {
    const { rowCount } = await pool.query(
        `DELETE FROM outbox_events WHERE processed AND processed_at < now() - make_interval(days => $1::int)`,
        [dias]
    );
    return rowCount;
}
