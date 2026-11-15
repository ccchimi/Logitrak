import { Cotizacion } from './botLogistica';
import { llamarApi } from './api';

export interface CotizacionGuardada {
    id: number;
    codigo: string;
    precio: number;
    estado: string;
}

export interface EntradaCotizacion {
    origen: string;
    destino: string;
    pesoKg: number;
    bultos?: number;
    descripcionCarga?: string;
    largoCm?: number;
    anchoCm?: number;
    altoCm?: number;
    valorDeclarado?: number;
}

export type ResultadoGuardado =
    | { exito: true; guardada: CotizacionGuardada; cotizacion: Cotizacion; precioAjustado: boolean }
    | { exito: false; error: string };

export async function guardarCotizacion(
    cotizacion: Cotizacion,
    entrada: EntradaCotizacion
): Promise<ResultadoGuardado> {
    const r = await llamarApi<{
        exito: true;
        cotizacion: CotizacionGuardada;
        calculo: Cotizacion;
        precioAjustado: boolean;
    }>('/api/cotizaciones', {
        metodo: 'POST',
        cuerpo: { codigo: cotizacion.id, precio: cotizacion.precio, ...entrada },
        conAuth: true,
    });

    if (!r.exito) return { exito: false, error: r.error };
    return { exito: true, guardada: r.cotizacion, cotizacion: r.calculo, precioAjustado: r.precioAjustado };
}
