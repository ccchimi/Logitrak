import { llamarApi } from './api';

export type EstadoAsignacion = 'ofrecida' | 'aceptada' | 'rechazada' | 'expirada' | 'completada';
export type PrioridadOferta = 'alta' | 'media' | 'baja';

export interface OfertaEnvio {
    envioCodigo: string;
    origen: string;
    destino: string;
    distanciaKm: number | null;
    descripcionCarga: string | null;
    categoriaCarga: string | null;
    pesoKg: number | null;
    bultos: number | null;
    vehiculoRequerido: string | null;
    tarifa: number | null;
    pagoChofer: number | null;
    prioridad: PrioridadOferta;
    slaMin: number | null;
    slaVenceEn: string | null;
    creadoEn: string | null;
}

export interface AsignacionRegistro {
    id: number;
    codigo: string;
    envioCodigo: string | null;
    origen: string;
    destino: string;
    distanciaKm: number | null;
    descripcionCarga: string | null;
    categoriaEtiqueta: string | null;
    pesoKg: number | null;
    bultos: number | null;
    vehiculoRequerido: string | null;
    tarifa: number | null;
    pagoChofer: number | null;
    prioridad: string | null;
    estado: EstadoAsignacion;
    generadaEn: string | null;
    respondidaEn: string | null;
}

export interface OfertasDisponibles {
    ofertas: OfertaEnvio[];
    vehiculo: { id: string; nombre: string } | null;
    aviso: string | null;
}

export async function listarOfertas(): Promise<OfertasDisponibles> {
    const r = await llamarApi<{
        exito: true;
        ofertas: OfertaEnvio[];
        vehiculo?: { id: string; nombre: string };
        aviso?: string;
    }>('/api/asignaciones/disponibles', { metodo: 'GET', conAuth: true });

    if (!r.exito) return { ofertas: [], vehiculo: null, aviso: (r as any).error ?? null };
    return { ofertas: r.ofertas ?? [], vehiculo: r.vehiculo ?? null, aviso: r.aviso ?? null };
}

export type ResultadoTomar =
    | { exito: true; asignacion: AsignacionRegistro; envioCodigo: string }
    | { exito: false; error: string };

export async function tomarEnvio(envioCodigo: string): Promise<ResultadoTomar> {
    const r = await llamarApi<{
        exito: true;
        asignacion: AsignacionRegistro;
        envioCodigo: string;
    }>(`/api/asignaciones/${encodeURIComponent(envioCodigo)}/tomar`, {
        metodo: 'POST',
        conAuth: true,
    });

    if (!r.exito) return { exito: false, error: (r as any).error ?? 'No se pudo tomar el envío.' };
    return { exito: true, asignacion: r.asignacion, envioCodigo: r.envioCodigo };
}

export async function obtenerAsignacionActiva(): Promise<AsignacionRegistro | null> {
    const r = await llamarApi<{ exito: true; asignacion: AsignacionRegistro | null }>(
        '/api/asignaciones/activa',
        { metodo: 'GET', conAuth: true }
    );
    return r.exito ? r.asignacion : null;
}

export async function completarAsignacion(codigo: string): Promise<AsignacionRegistro | null> {
    const r = await llamarApi<{ exito: true; asignacion: AsignacionRegistro }>(
        `/api/asignaciones/${encodeURIComponent(codigo)}/completar`,
        { metodo: 'POST', conAuth: true }
    );
    return r.exito ? r.asignacion : null;
}

export async function listarAsignaciones(): Promise<AsignacionRegistro[]> {
    const r = await llamarApi<{ exito: true; asignaciones: AsignacionRegistro[] }>(
        '/api/asignaciones',
        { metodo: 'GET', conAuth: true }
    );
    return r.exito ? r.asignaciones ?? [] : [];
}
