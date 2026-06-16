import { Cotizacion } from './botLogistica';
import { llamarApi } from './api';

export interface CotizacionGuardada {
    id: number;
    codigo: string;
    precio: number;
    estado: string;
}

// Datos del envío que no viajan dentro de la Cotizacion del motor (bultos,
// dimensiones y valor declarado los tiene la pantalla, no el cálculo).
export interface EntradaEnvio {
    bultos?: number;
    largoCm?: number;
    anchoCm?: number;
    altoCm?: number;
    valorDeclarado?: number;
}

// Persiste una cotización emitida por Boxy. Es best-effort: si falla, la UI
// sigue funcionando (la cotización ya se mostró), solo no queda registrada.
export async function guardarCotizacion(
    cotizacion: Cotizacion,
    entrada: EntradaEnvio = {}
): Promise<CotizacionGuardada | null> {
    const cuerpo = {
        codigo: cotizacion.id,
        origen: cotizacion.origen.textoNormalizado || cotizacion.origen.textoOriginal,
        destino: cotizacion.destino.textoNormalizado || cotizacion.destino.textoOriginal,
        descripcionCarga: cotizacion.carga.descripcion || null,
        categoriaCarga: cotizacion.carga.categoria,
        pesoKg: cotizacion.pesoRealKg,
        pesoFacturableKg: cotizacion.pesoFacturableKg,
        bultos: entrada.bultos ?? null,
        largoCm: entrada.largoCm ?? null,
        anchoCm: entrada.anchoCm ?? null,
        altoCm: entrada.altoCm ?? null,
        valorDeclarado: entrada.valorDeclarado ?? null,
        vehiculoId: cotizacion.vehiculo.id,
        vehiculoNombre: cotizacion.vehiculo.nombre,
        distanciaKm: cotizacion.distanciaKm,
        distanciaEstimada: cotizacion.distanciaEstimada,
        precio: cotizacion.precio,
        moneda: cotizacion.moneda,
        confianza: cotizacion.confianza,
        puntajeConfianza: cotizacion.puntajeConfianza,
        validezMin: cotizacion.validezMin,
        detalle: cotizacion,
    };

    const r = await llamarApi<{ exito: true; cotizacion: CotizacionGuardada }>('/api/cotizaciones', {
        metodo: 'POST',
        cuerpo,
        conAuth: true,
    });
    return r.exito ? r.cotizacion : null;
}
