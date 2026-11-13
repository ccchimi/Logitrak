// Trabajos en segundo plano con pg-boss, sobre la misma base PostgreSQL (schema
// `pgboss`, que pg-boss crea y actualiza solo). Corren dentro del proceso de la
// API: en Render Free hay una sola instancia y no hace falta otro servicio.
//
// Patrón: un barrido programado por minuto busca lo que hay que procesar y
// encola un trabajo por envío. Cada trabajo tiene sus propios reintentos con
// espera creciente, así que un reembolso que la pasarela rechaza por un rato no
// frena al resto. La política `exclusive` evita duplicados: no puede haber dos
// trabajos pendientes o activos para el mismo envío, ni dos barridos a la vez.
import { PgBoss } from 'pg-boss';
import { log, logger, registrarError } from '../observabilidad/logger.js';
import { enviosConOfertaVencida, expirarOferta } from '../servicios/envios/expiracion.js';
import { enviosConSlaParaRevisar, revisarSla } from '../servicios/envios/sla.js';
import { alRegistrarEvento, despachar, purgarProcesados } from '../outbox/index.js';
import { eliminarImpago, enviosImpagosVencidos } from '../servicios/envios/impagos.js';

export const COLAS = {
    barrerOfertas: 'barrer-ofertas-vencidas',
    expirarOferta: 'expirar-oferta',
    barrerSla: 'barrer-sla',
    revisarSla: 'revisar-sla',
    despacharOutbox: 'despachar-outbox',
    barrerImpagos: 'barrer-impagos',
    eliminarImpago: 'eliminar-impago',
};

// El despachador del outbox: procesa los eventos pendientes y, como mucho una
// vez por hora, borra los ya procesados viejos.
let ultimaPurga = 0;
export async function despacharOutbox() {
    const resumen = await despachar();
    if (Date.now() - ultimaPurga > 3_600_000) {
        ultimaPurga = Date.now();
        const borrados = await purgarProcesados();
        if (borrados) log().info({ borrados }, 'Outbox: eventos procesados viejos borrados');
    }
    return resumen;
}

// Para /api/salud: 'no_iniciado' (por ejemplo en las pruebas), 'ok', 'error' o
// 'deshabilitado'.
let estado = 'no_iniciado';
export const estadoTrabajos = () => ({ estado });

const REINTENTOS = { retryLimit: 6, retryDelay: 30, retryBackoff: true, retryDelayMax: 900 };

// Cada trabajo por envío: si devuelve 'reintentar' (o lanza), pg-boss lo vuelve
// a intentar con la espera de REINTENTOS.
export async function procesarExpiracion(envioId) {
    const r = await expirarOferta(envioId);
    if (r === 'reintentar') throw new Error(`Reembolso del envío ${envioId} pospuesto por la pasarela`);
    return r;
}

// Si un trabajo agota los reintentos, queda como fallido en pg-boss y además
// lo avisamos (log + Sentry): hace falta que alguien lo mire.
export function conRegistro(cola, limite, fn) {
    return async (trabajos) => {
        const trabajo = trabajos[0];
        try {
            return await fn(trabajo);
        } catch (e) {
            const agotado = (trabajo?.retryCount ?? 0) >= limite;
            if (agotado) registrarError(e, 'Trabajo en segundo plano agotó sus reintentos', { cola, datos: trabajo?.data });
            else log().warn({ err: e, cola, intento: (trabajo?.retryCount ?? 0) + 1 }, 'Trabajo en segundo plano falló: se reintenta');
            throw e;
        }
    };
}

export async function encolarPendientes(boss, { buscar, cola, prefijo }) {
    const ids = await buscar();
    for (const id of ids) {
        await boss.send(cola, { envioId: id }, { singletonKey: `${prefijo}-${id}` });
    }
    if (ids.length) log().info({ cola, cantidad: ids.length }, 'Barrido: trabajos encolados');
    return ids.length;
}

export async function iniciarTrabajos({ pool, env = process.env } = {}) {
    if (env.TRABAJOS_DESHABILITADOS === 'true') {
        logger.warn('Trabajos en segundo plano deshabilitados (TRABAJOS_DESHABILITADOS=true).');
        estado = 'deshabilitado';
        return null;
    }

    // Usa el pool de la API: no abre conexiones aparte contra Supabase.
    const boss = new PgBoss({
        db: { executeSql: (texto, valores) => pool.query(texto, valores) },
        schema: 'pgboss',
    });
    boss.on('error', (e) => registrarError(e, 'Error interno de pg-boss'));
    // Al detenerse, los eventos nuevos esperan al próximo arranque (el barrido los toma).
    boss.once('stopped', () => {
        alRegistrarEvento(null);
        estado = 'detenido';
    });
    try {
        await iniciarColas(boss);
    } catch (e) {
        estado = 'error';
        throw e;
    }
    estado = 'ok';
    logger.info({ colas: Object.values(COLAS) }, 'Trabajos en segundo plano iniciados');
    return boss;
}

async function iniciarColas(boss) {
    await boss.start();

    await boss.createQueue(COLAS.barrerOfertas, { policy: 'exclusive', retryLimit: 2 });
    await boss.createQueue(COLAS.barrerSla, { policy: 'exclusive', retryLimit: 2 });
    await boss.createQueue(COLAS.expirarOferta, { policy: 'exclusive', ...REINTENTOS });
    await boss.createQueue(COLAS.revisarSla, { policy: 'exclusive', ...REINTENTOS });
    await boss.createQueue(COLAS.barrerImpagos, { policy: 'exclusive', retryLimit: 2 });
    await boss.createQueue(COLAS.eliminarImpago, { policy: 'exclusive', ...REINTENTOS });
    // Los reintentos de cada evento los maneja el propio outbox.
    await boss.createQueue(COLAS.despacharOutbox, { policy: 'exclusive', retryLimit: 2 });

    await boss.schedule(COLAS.barrerOfertas, '* * * * *');
    await boss.schedule(COLAS.barrerSla, '* * * * *');
    await boss.schedule(COLAS.despacharOutbox, '* * * * *');
    await boss.schedule(COLAS.barrerImpagos, '* * * * *');

    const sondeo = { pollingIntervalSeconds: 5 };
    await boss.work(COLAS.barrerOfertas, sondeo, conRegistro(COLAS.barrerOfertas, 2, () =>
        encolarPendientes(boss, { buscar: enviosConOfertaVencida, cola: COLAS.expirarOferta, prefijo: 'oferta' })
    ));
    await boss.work(COLAS.barrerSla, sondeo, conRegistro(COLAS.barrerSla, 2, () =>
        encolarPendientes(boss, { buscar: enviosConSlaParaRevisar, cola: COLAS.revisarSla, prefijo: 'sla' })
    ));
    await boss.work(COLAS.expirarOferta, sondeo, conRegistro(COLAS.expirarOferta, REINTENTOS.retryLimit, (t) => procesarExpiracion(t.data.envioId)));
    await boss.work(COLAS.revisarSla, sondeo, conRegistro(COLAS.revisarSla, REINTENTOS.retryLimit, (t) => revisarSla(t.data.envioId)));
    await boss.work(COLAS.barrerImpagos, sondeo, conRegistro(COLAS.barrerImpagos, 2, () =>
        encolarPendientes(boss, { buscar: enviosImpagosVencidos, cola: COLAS.eliminarImpago, prefijo: 'impago' })
    ));
    await boss.work(COLAS.eliminarImpago, sondeo, conRegistro(COLAS.eliminarImpago, REINTENTOS.retryLimit, (t) => eliminarImpago(t.data.envioId)));
    await boss.work(COLAS.despacharOutbox, { pollingIntervalSeconds: 2 }, conRegistro(COLAS.despacharOutbox, 2, () => despacharOutbox()));

    // Cada evento registrado pide un despacho a los 2 segundos (lo justo para que
    // su transacción se confirme). Si ya hay uno pendiente, la política
    // exclusive no encola otro; y si alguno se escapa, lo toma el del minuto.
    alRegistrarEvento(() => {
        boss.send(COLAS.despacharOutbox, null, { startAfter: 2 }).catch((e) => log().warn({ err: e }, 'No se pudo pedir el despacho del outbox'));
    });

    // Render Free duerme el servicio: al despertar no esperamos al próximo
    // minuto para ponernos al día.
    await boss.send(COLAS.barrerOfertas);
    await boss.send(COLAS.barrerSla);
    await boss.send(COLAS.despacharOutbox);
    await boss.send(COLAS.barrerImpagos);
}
