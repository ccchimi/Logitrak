import { llamarApi } from './api';

export type MetodoPago = 'mercadopago' | 'modo' | 'tarjeta';
export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | 'expirado';

export interface Pago {
    id: number;
    codigo: string;
    envioId: number;
    metodo: MetodoPago;
    monto: number;
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
    metodo: 'mercadopago' | 'modo'
): Promise<{ pago: Pago; checkout: CheckoutPago } | null> {
    const r = await llamarApi<{ exito: true; pago: Pago; checkout: CheckoutPago }>('/api/pagos/checkout', {
        metodo: 'POST',
        cuerpo: { envioCodigo, metodo },
        conAuth: true,
    });
    return r.exito ? { pago: r.pago, checkout: r.checkout } : null;
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
    datos: DatosTarjeta
): Promise<ResultadoTarjeta> {
    const r = (await llamarApi<{ exito: boolean }>('/api/pagos/tarjeta', {
        metodo: 'POST',
        cuerpo: { envioCodigo, ...datos },
        conAuth: true,
    })) as any;

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
