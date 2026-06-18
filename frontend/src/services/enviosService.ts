import { llamarApi } from './api';

export type EstadoEnvio = 'pendiente' | 'asignado' | 'en_viaje' | 'entregado' | 'cancelado';

export type TipoEventoEnvio =
    | 'creado'
    | 'asignado'
    | 'chofer_en_camino'
    | 'retirado'
    | 'en_viaje'
    | 'entregado'
    | 'sla_excedido'
    | 'cancelado';

export interface Envio {
    id: number;
    codigo: string;
    clienteId: number;
    cotizacionId: number | null;
    choferId: number | null;
    choferNombre: string | null;
    origen: string;
    destino: string;
    origenLat: number | null;
    origenLng: number | null;
    destinoLat: number | null;
    destinoLng: number | null;
    descripcionCarga: string | null;
    categoriaCarga: string | null;
    pesoKg: number | null;
    bultos: number | null;
    vehiculoId: string | null;
    vehiculoNombre: string | null;
    distanciaKm: number | null;
    precio: number;
    moneda: string;
    estado: EstadoEnvio;
    slaMin: number | null;
    slaVenceEn: string | null;
    creadoEn: string;
    actualizadoEn: string;
    entregadoEn: string | null;
}

export interface EventoEnvio {
    id: number;
    tipo: TipoEventoEnvio;
    titulo: string;
    detalle: string | null;
    lat: number | null;
    lng: number | null;
    creadoEn: string;
}

export interface MetricasEnvios {
    total: number;
    enViaje: number;
    pendientes: number;
    entregados: number;
    cancelados: number;
    cumplimiento: number;
}

export interface DatosNuevoEnvio {
    cotizacionId?: number | null;
    cotizacionCodigo?: string | null;
    origen: string;
    destino: string;
    origenLat?: number | null;
    origenLng?: number | null;
    destinoLat?: number | null;
    destinoLng?: number | null;
    descripcionCarga?: string | null;
    categoriaCarga?: string | null;
    pesoKg?: number | null;
    bultos?: number | null;
    vehiculoId?: string | null;
    vehiculoNombre?: string | null;
    distanciaKm?: number | null;
    precio: number;
    moneda?: string;
    slaMin?: number | null;
}

export async function crearEnvio(datos: DatosNuevoEnvio): Promise<Envio | null> {
    const r = await llamarApi<{ exito: true; envio: Envio }>('/api/envios', {
        metodo: 'POST',
        cuerpo: datos,
        conAuth: true,
    });
    return r.exito ? r.envio : null;
}

export async function listarEnvios(estado?: EstadoEnvio): Promise<Envio[]> {
    const qs = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    const r = await llamarApi<{ exito: true; envios: Envio[] }>(`/api/envios${qs}`, { conAuth: true });
    return r.exito ? r.envios : [];
}

export async function obtenerEnvio(
    codigo: string
): Promise<{ envio: Envio; eventos: EventoEnvio[] } | null> {
    const r = await llamarApi<{ exito: true; envio: Envio; eventos: EventoEnvio[] }>(
        `/api/envios/${encodeURIComponent(codigo)}`,
        { conAuth: true }
    );
    return r.exito ? { envio: r.envio, eventos: r.eventos } : null;
}

export interface NuevoEvento {
    tipo: TipoEventoEnvio;
    titulo: string;
    detalle?: string;
    lat?: number;
    lng?: number;
    choferNombre?: string;
}

export async function agregarEvento(
    codigo: string,
    evento: NuevoEvento
): Promise<{ envio: Envio; evento: EventoEnvio } | null> {
    const r = await llamarApi<{ exito: true; envio: Envio; evento: EventoEnvio }>(
        `/api/envios/${encodeURIComponent(codigo)}/eventos`,
        { metodo: 'POST', cuerpo: evento, conAuth: true }
    );
    return r.exito ? { envio: r.envio, evento: r.evento } : null;
}

export async function obtenerMetricas(): Promise<MetricasEnvios | null> {
    const r = await llamarApi<{ exito: true; metricas: MetricasEnvios }>('/api/envios/metricas', {
        conAuth: true,
    });
    return r.exito ? r.metricas : null;
}
