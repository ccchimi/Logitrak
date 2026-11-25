import { PgBoss } from 'pg-boss';
import { log, logger, registrarError } from '../observabilidad/logger.js';
import { enviosConOfertaVencida, expirarOferta } from '../servicios/envios/expiracion.js';
import { enviosConSlaParaRevisar, revisarSla } from '../servicios/envios/sla.js';
import { alRegistrarEvento, despachar, purgarProcesados } from '../outbox/index.js';
import { eliminarImpago, enviosImpagosVencidos } from '../servicios/envios/impagos.js';
import { avisarCuponesPorVencer, vencerCupones } from '../servicios/pagos/cupones.js';
import { devolverPagoDeMas, pagosParaDevolver } from '../servicios/pagos/devolucionDuplicados.js';
import { reintentarBorrados } from '../servicios/archivosPorBorrar.js';
import { aplicarRetencion } from '../servicios/retencion.js';

export const COLAS = {
    barrerOfertas: 'barrer-ofertas-vencidas',
    expirarOferta: 'expirar-oferta',
    barrerSla: 'barrer-sla',
    revisarSla: 'revisar-sla',
    despacharOutbox: 'despachar-outbox',
    barrerImpagos: 'barrer-impagos',
    eliminarImpago: 'eliminar-impago',
    vencerCupones: 'vencer-cupones',
    avisarCupones: 'avisar-cupones-por-vencer',
    barrerPagosDeMas: 'barrer-pagos-de-mas',
    devolverPagoDeMas: 'devolver-pago-de-mas',
    borrarArchivos: 'borrar-archivos',
    aplicarRetencion: 'aplicar-retencion',
};

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

let estado = 'no_iniciado';
let poolDeTrabajos = null;
export const estadoTrabajos = () => ({ estado });

const REINTENTOS = { retryLimit: 6, retryDelay: 30, retryBackoff: true, retryDelayMax: 900 };

export async function procesarExpiracion(envioId) {
    const r = await expirarOferta(envioId);
    if (r === 'reintentar') throw new Error(`Reembolso del envío ${envioId} pospuesto por la pasarela`);
    return r;
}

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

export async function procesarDevolucion(pagoId) {
    const r = await devolverPagoDeMas(pagoId);
    if (r === 'reintentar') throw new Error(`Devolución del pago ${pagoId} pospuesta por la pasarela`);
    return r;
}

export async function encolarPendientes(boss, { buscar, cola, prefijo, campo = 'envioId' }) {
    const ids = await buscar();
    for (const id of ids) {
        await boss.send(cola, { [campo]: id }, { singletonKey: `${prefijo}-${id}` });
    }
    if (ids.length) log().info({ cola, cantidad: ids.length }, 'Barrido: trabajos encolados');
    return ids.length;
}

export async function iniciarTrabajos({ pool, env = process.env } = {}) {
    poolDeTrabajos = pool;
    if (env.TRABAJOS_DESHABILITADOS === 'true') {
        logger.warn('Trabajos en segundo plano deshabilitados (TRABAJOS_DESHABILITADOS=true).');
        estado = 'deshabilitado';
        return null;
    }

    const boss = new PgBoss({
        db: { executeSql: (texto, valores) => pool.query(texto, valores) },
        schema: 'pgboss',
    });
    boss.on('error', (e) => registrarError(e, 'Error interno de pg-boss'));
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
    await boss.createQueue(COLAS.despacharOutbox, { policy: 'exclusive', retryLimit: 2 });
    await boss.createQueue(COLAS.vencerCupones, { policy: 'exclusive', retryLimit: 2 });
    await boss.createQueue(COLAS.avisarCupones, { policy: 'exclusive', retryLimit: 2 });
    await boss.createQueue(COLAS.barrerPagosDeMas, { policy: 'exclusive', retryLimit: 2 });
    await boss.createQueue(COLAS.devolverPagoDeMas, { policy: 'exclusive', ...REINTENTOS });
    await boss.createQueue(COLAS.borrarArchivos, { policy: 'exclusive', retryLimit: 2 });
    await boss.createQueue(COLAS.aplicarRetencion, { policy: 'exclusive', retryLimit: 2 });

    await boss.schedule(COLAS.barrerOfertas, '* * * * *');
    await boss.schedule(COLAS.barrerSla, '* * * * *');
    await boss.schedule(COLAS.despacharOutbox, '* * * * *');
    await boss.schedule(COLAS.barrerImpagos, '* * * * *');
    await boss.schedule(COLAS.vencerCupones, '7 * * * *');
    await boss.schedule(COLAS.avisarCupones, '37 * * * *');
    await boss.schedule(COLAS.barrerPagosDeMas, '* * * * *');
    await boss.schedule(COLAS.borrarArchivos, '23 * * * *');
    // Plazos de conservación de fotos e IP: una vez por día, de madrugada (UTC).
    await boss.schedule(COLAS.aplicarRetencion, '15 7 * * *');

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
    await boss.work(COLAS.vencerCupones, sondeo, conRegistro(COLAS.vencerCupones, 2, () => vencerCupones(poolDeTrabajos)));
    await boss.work(COLAS.avisarCupones, sondeo, conRegistro(COLAS.avisarCupones, 2, () => avisarCuponesPorVencer(poolDeTrabajos)));
    await boss.work(COLAS.barrerPagosDeMas, sondeo, conRegistro(COLAS.barrerPagosDeMas, 2, () =>
        encolarPendientes(boss, { buscar: pagosParaDevolver, cola: COLAS.devolverPagoDeMas, prefijo: 'pago-de-mas', campo: 'pagoId' })
    ));
    await boss.work(COLAS.borrarArchivos, sondeo, conRegistro(COLAS.borrarArchivos, 2, () => reintentarBorrados(poolDeTrabajos)));
    await boss.work(COLAS.aplicarRetencion, sondeo, conRegistro(COLAS.aplicarRetencion, 2, () => aplicarRetencion(poolDeTrabajos)));
    await boss.work(COLAS.devolverPagoDeMas, sondeo, conRegistro(COLAS.devolverPagoDeMas, REINTENTOS.retryLimit, (t) => procesarDevolucion(t.data.pagoId)));
    await boss.work(COLAS.despacharOutbox, { pollingIntervalSeconds: 2 }, conRegistro(COLAS.despacharOutbox, 2, () => despacharOutbox()));

    alRegistrarEvento(() => {
        boss.send(COLAS.despacharOutbox, null, { startAfter: 2 }).catch((e) => log().warn({ err: e }, 'No se pudo pedir el despacho del outbox'));
    });

    await boss.send(COLAS.barrerOfertas);
    await boss.send(COLAS.barrerSla);
    await boss.send(COLAS.despacharOutbox);
    await boss.send(COLAS.barrerImpagos);
    await boss.send(COLAS.vencerCupones);
    await boss.send(COLAS.avisarCupones);
    await boss.send(COLAS.barrerPagosDeMas);
    await boss.send(COLAS.borrarArchivos);
}
