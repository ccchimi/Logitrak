import { AsignacionViaje } from './botLogistica';
import { llamarApi } from './api';

export type EstadoAsignacion = 'ofrecida' | 'aceptada' | 'rechazada' | 'expirada' | 'completada';

export interface AsignacionGuardada {
    id: number;
    codigo: string;
    estado: EstadoAsignacion;
}

export async function registrarAsignacion(viaje: AsignacionViaje): Promise<AsignacionGuardada | null> {
    const cuerpo = {
        codigo: viaje.id,
        origen: viaje.origen,
        destino: viaje.destino,
        distanciaKm: viaje.distanciaKm,
        descripcionCarga: viaje.carga.descripcion,
        categoriaEtiqueta: viaje.carga.categoriaEtiqueta,
        pesoKg: viaje.carga.pesoKg,
        bultos: viaje.carga.bultos,
        vehiculoRequerido: viaje.vehiculoRequerido,
        tarifa: viaje.tarifa,
        pagoChofer: viaje.pagoChofer,
        prioridad: viaje.prioridad,
        etaRetiroMin: viaje.etaRetiroMin,
        tiempoViajeMin: viaje.tiempoViajeMin,
        recomendacion: viaje.recomendacion,
        requisitos: viaje.requisitos,
        expiraEnSeg: viaje.expiraEnSeg,
    };
    const r = await llamarApi<{ exito: true; asignacion: AsignacionGuardada }>('/api/asignaciones', {
        metodo: 'POST',
        cuerpo,
        conAuth: true,
    });
    return r.exito ? r.asignacion : null;
}

async function transicion(codigo: string, accion: 'aceptar' | 'rechazar' | 'completar') {
    const r = await llamarApi<{ exito: true; asignacion: AsignacionGuardada }>(
        `/api/asignaciones/${encodeURIComponent(codigo)}/${accion}`,
        { metodo: 'POST', conAuth: true }
    );
    return r.exito ? r.asignacion : null;
}

export const aceptarAsignacion = (codigo: string) => transicion(codigo, 'aceptar');
export const rechazarAsignacion = (codigo: string) => transicion(codigo, 'rechazar');
export const completarAsignacion = (codigo: string) => transicion(codigo, 'completar');
