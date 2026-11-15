import { cotizarSync } from './cotizador.generado.js';

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

export function cotizarEnServidor(datos, instante = new Date()) {
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
    });

    if (respuesta.exito) respuesta.cotizacion.emitidaEn = instante.toISOString();
    return respuesta;
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
