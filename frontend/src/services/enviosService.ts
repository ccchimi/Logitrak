import { llamarApi } from './api';

export type EstadoEnvio = 'pendiente' | 'asignado' | 'en_viaje' | 'entregado' | 'cancelado';

export type EstadoPago = 'pendiente' | 'pagado' | 'rechazado' | 'reembolsado';

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
    choferCodigo: string | null;
    choferTelefono: string | null;
    choferVehiculoId: string | null;
    choferVehiculo: string | null;
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
    estadoPago: EstadoPago;
    ofertaVenceEn: string | null;
    archivadoEn: string | null;
    archivadoMotivo: string | null;
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

export interface PagoDeEnvio {
    codigo: string;
    metodo: 'mercadopago' | 'modo' | 'tarjeta';
    monto: number;
    moneda: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | 'expirado' | 'reembolsado';
    modoProc: 'sandbox' | 'real';
    tarjetaMarca: string | null;
    tarjetaUltimos: string | null;
    cuotas: number | null;
    comprobante: string | null;
    pagoExtId: string | null;
    creadoEn: string;
    pagadoEn: string | null;
    reembolsadoEn: string | null;
    // Motivo por el que la pasarela rechazó la devolución, si pasó.
    reembolsoPendiente: string | null;
}

export interface DetalleEnvio {
    envio: Envio;
    eventos: EventoEnvio[];
    pagos: PagoDeEnvio[];
}

export async function obtenerEnvio(codigo: string): Promise<DetalleEnvio | null> {
    const r = await llamarApi<{ exito: true } & DetalleEnvio>(
        `/api/envios/${encodeURIComponent(codigo)}`,
        { conAuth: true }
    );
    return r.exito ? { envio: r.envio, eventos: r.eventos, pagos: r.pagos ?? [] } : null;
}

export type ResultadoAccionAdmin = { exito: boolean; mensaje: string };

export async function archivarEnvio(
    codigo: string,
    opciones: { motivo?: string; reembolsar?: boolean } = {}
): Promise<ResultadoAccionAdmin> {
    const r = (await llamarApi<{ exito: boolean; mensaje: string }>(
        `/api/envios/${encodeURIComponent(codigo)}/archivar`,
        { metodo: 'POST', cuerpo: opciones, conAuth: true }
    )) as any;
    return {
        exito: Boolean(r.exito),
        mensaje: r.mensaje || r.error || 'No se pudo archivar el envío.',
    };
}

export async function reembolsarEnvio(codigo: string): Promise<ResultadoAccionAdmin> {
    const r = (await llamarApi<{ exito: boolean; mensaje: string }>(
        `/api/envios/${encodeURIComponent(codigo)}/reembolsar`,
        { metodo: 'POST', conAuth: true }
    )) as any;
    return {
        exito: Boolean(r.exito),
        mensaje: r.mensaje || r.error || 'No se pudo emitir la devolución.',
    };
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
