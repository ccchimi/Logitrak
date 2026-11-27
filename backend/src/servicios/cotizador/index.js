import { cotizarSync, distanciaPorCallePlausible } from './cotizador.generado.js';
import { obtenerDistanciaPorCalle } from '../recorridos.js';
import { log } from '../../observabilidad/logger.js';

const ZONA_OPERATIVA = 'America/Argentina/Buenos_Aires';

export function horaOperativa(instante = new Date()) {
    const partes = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone: ZONA_OPERATIVA,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hourCycle: 'h23',
        })
            .formatToParts(instante)
            .map((p) => [p.type, p.value])
    );
    return new Date(
        Number(partes.year),
        Number(partes.month) - 1,
        Number(partes.day),
        Number(partes.hour),
        Number(partes.minute),
        Number(partes.second)
    );
}

function numero(v) {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
}

function texto(v, max) {
    return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// `distanciaPorCalleKm` no sale de `datos` (lo que mandó el cliente): solo la
// pasa cotizarConDistanciaPorCalle después de consultarla a Google.
export function cotizarEnServidor(datos, instante = new Date(), { distanciaPorCalleKm } = {}) {
    const largo = numero(datos.largoCm);
    const ancho = numero(datos.anchoCm);
    const alto = numero(datos.altoCm);
    const valorDeclarado = numero(datos.valorDeclarado);

    const respuesta = cotizarSync({
        origen: texto(datos.origen, 200),
        destino: texto(datos.destino, 200),
        pesoKg: numero(datos.pesoKg) ?? NaN,
        bultos: numero(datos.bultos) ?? 1,
        descripcionCarga: texto(datos.descripcionCarga, 300) || undefined,
        dimensiones: {
            largo: largo > 0 ? largo : undefined,
            ancho: ancho > 0 ? ancho : undefined,
            alto: alto > 0 ? alto : undefined,
        },
        valorDeclarado: valorDeclarado > 0 ? valorDeclarado : undefined,
        fecha: horaOperativa(instante),
        distanciaPorCalleKm,
    });

    if (respuesta.exito) respuesta.cotizacion.emitidaEn = instante.toISOString();
    return respuesta;
}

/**
 * Cotiza con la distancia por calle de Google Directions cuando se puede.
 * 1. Cotiza con la estimación entre localidades: si los datos no sirven, el
 *    rechazo sale sin gastar una consulta a Google.
 * 2. Pide la distancia por calle entre las direcciones normalizadas.
 * 3. Si es coherente con la estimación (`distanciaPorCallePlausible`), vuelve a
 *    cotizar con esos km; si no, o si Google no respondió, queda la estimada.
 */
export async function cotizarConDistanciaPorCalle(datos, instante = new Date(), { consultarDistancia = obtenerDistanciaPorCalle } = {}) {
    const estimada = cotizarEnServidor(datos, instante);
    if (!estimada.exito) return estimada;

    const c = estimada.cotizacion;
    const origen = c.origen.textoNormalizado || c.origen.textoOriginal;
    const destino = c.destino.textoNormalizado || c.destino.textoOriginal;
    let porCalle = null;
    try {
        porCalle = await consultarDistancia(origen, destino);
    } catch (e) {
        log().warn({ err: e }, 'Falló la consulta de distancia por calle: se usa la estimada');
    }
    if (!porCalle) return estimada;

    if (!distanciaPorCallePlausible(c.distanciaKm, porCalle.km)) {
        log().warn(
            { estimadaKm: c.distanciaKm, porCalleKm: porCalle.km },
            'La distancia de Google no es coherente con la estimada: se cobra con la estimada'
        );
        return estimada;
    }

    const conCalle = cotizarEnServidor(datos, instante, { distanciaPorCalleKm: porCalle.km });
    // Con la distancia real puede no haber vehículo para la carga (por ejemplo,
    // una moto que no hace tramos interurbanos): en ese caso vale la estimada.
    return conCalle.exito ? conCalle : estimada;
}

export function verificarCotizacionParaEnvio(fila, clienteId, instante = new Date()) {
    if (!fila || fila.cliente_id !== clienteId) {
        return { valida: false, motivo: 'No encontramos esa cotización. Volvé a cotizar el envío.' };
    }
    if (fila.estado !== 'emitida' && fila.estado !== 'confirmada') {
        return { valida: false, motivo: 'La cotización ya no está disponible. Volvé a cotizar el envío.' };
    }
    const venceEn = new Date(fila.emitida_en).getTime() + (fila.validez_min ?? 15) * 60000;
    if (instante.getTime() > venceEn) {
        return { valida: false, motivo: 'La cotización venció. Volvé a cotizar para tener el precio vigente.' };
    }
    return { valida: true };
}
