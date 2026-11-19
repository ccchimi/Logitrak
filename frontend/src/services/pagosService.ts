import { llamarApi } from './api';
import { nuevoUuid } from '../helpers/uuid';

const clavesPendientes = new Map<string, string>();

function claveIdempotencia(operacion: string): string {
    let clave = clavesPendientes.get(operacion);
    if (!clave) {
        clave = nuevoUuid();
        clavesPendientes.set(operacion, clave);
    }
    return clave;
}

function cerrarOperacion(operacion: string, respuesta: unknown) {
    if (!(respuesta as { sinConexion?: boolean })?.sinConexion) clavesPendientes.delete(operacion);
}

export type MetodoPago = 'mercadopago' | 'modo' | 'tarjeta';
export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | 'expirado' | 'reembolsado';

export interface Pago {
    id: number;
    codigo: string;
    envioId: number;
    metodo: MetodoPago;
    monto: number;
    descuento?: number | null;
    moneda: string;
    estado: EstadoPago;
    modoProc: 'sandbox' | 'real';
    tarjetaMarca: string | null;
    tarjetaUltimos: string | null;
    cuotas: number | null;
    comprobante: string | null;
    creadoEn: string;
    pagadoEn: string | null;
}

export interface CheckoutPago {
    metodo: MetodoPago;
    sandbox: boolean;
    qr: string | null;
    deeplink: string | null;
    url: string | null;
    expiraEnMin: number;
}

export async function iniciarCheckout(
    envioCodigo: string,
    metodo: 'mercadopago' | 'modo',
    cuponCodigo?: string | null
): Promise<{ pago: Pago; checkout: CheckoutPago } | { error: string }> {
    const operacion = `checkout:${envioCodigo}:${metodo}:${cuponCodigo ?? '-'}`;
    const r = (await llamarApi<{ exito: true; pago: Pago; checkout: CheckoutPago }>('/api/pagos/checkout', {
        metodo: 'POST',
        cuerpo: { envioCodigo, metodo, ...(cuponCodigo ? { cuponCodigo } : {}) },
        conAuth: true,
        encabezados: { 'Idempotency-Key': claveIdempotencia(operacion) },
    })) as any;
    cerrarOperacion(operacion, r);
    return r.exito ? { pago: r.pago, checkout: r.checkout } : { error: r.error || 'Probá de nuevo o con otro método.' };
}

export interface DatosTarjeta {
    numero: string;
    titular: string;
    vencimiento: string;
    cvv: string;
    cuotas: number;
}

export interface ResultadoTarjeta {
    aprobado: boolean;
    motivo: string;
    pago: Pago | null;
}

export async function pagarConTarjeta(
    envioCodigo: string,
    datos: DatosTarjeta,
    cuponCodigo?: string | null
): Promise<ResultadoTarjeta> {
    const operacion = `tarjeta:${envioCodigo}:${cuponCodigo ?? '-'}`;
    const r = (await llamarApi<{ exito: boolean }>('/api/pagos/tarjeta', {
        metodo: 'POST',
        cuerpo: { envioCodigo, ...datos, ...(cuponCodigo ? { cuponCodigo } : {}) },
        conAuth: true,
        encabezados: { 'Idempotency-Key': claveIdempotencia(operacion) },
    })) as any;
    cerrarOperacion(operacion, r);

    return {
        aprobado: Boolean(r.aprobado),
        motivo: r.motivo || r.error || 'No se pudo procesar el pago.',
        pago: r.pago ?? null,
    };
}

export async function confirmarPagoSandbox(codigo: string): Promise<Pago | null> {
    const r = await llamarApi<{ exito: true; pago: Pago }>(
        `/api/pagos/${encodeURIComponent(codigo)}/confirmar`,
        { metodo: 'POST', conAuth: true }
    );
    return r.exito ? r.pago : null;
}

export async function obtenerPago(codigo: string): Promise<Pago | null> {
    const r = await llamarApi<{ exito: true; pago: Pago }>(
        `/api/pagos/${encodeURIComponent(codigo)}`,
        { conAuth: true }
    );
    return r.exito ? r.pago : null;
}

export interface DevolucionPendiente {
    codigo: string;
    envioCodigo: string;
    envioEstado: string;
    metodo: 'mercadopago' | 'modo' | 'tarjeta';
    monto: number;
    moneda: string;
    real: boolean;
    idEnLaPasarela: string | null;
    motivo: string;
    duplicado: boolean;
    pagadoEn: string | null;
    pendienteDesde: string;
}

/** Devoluciones que la pasarela no pudo hacer sola (solo admin). */
export async function listarDevolucionesPendientes(): Promise<DevolucionPendiente[] | null> {
    const r = (await llamarApi<{ exito: true; pagos: DevolucionPendiente[] }>('/api/pagos/devoluciones-pendientes', {
        conAuth: true,
    })) as any;
    return r.exito ? r.pagos : null;
}

/** Registra que la devolución se hizo a mano desde el panel de la pasarela. */
export async function registrarDevolucionManual(
    pagoCodigo: string,
    referencia: string
): Promise<{ exito: true } | { exito: false; error: string }> {
    const r = (await llamarApi(`/api/pagos/${encodeURIComponent(pagoCodigo)}/devolucion-manual`, {
        metodo: 'POST',
        cuerpo: referencia.trim() ? { referencia: referencia.trim() } : {},
        conAuth: true,
    })) as any;
    return r.exito ? { exito: true } : { exito: false, error: r.error || 'No se pudo registrar la devolución.' };
}
