import { llamarApi } from './api';

export interface Cupon {
    id: number;
    codigo: string;
    envioId: number | null;
    descuentoPct: number;
    motivo: string;
    estado: 'activo' | 'usado' | 'vencido';
    creadoEn: string;
    usadoEn: string | null;
}

export async function listarCupones(): Promise<Cupon[]> {
    const r = await llamarApi<{ exito: true; cupones: Cupon[] }>('/api/cupones', { conAuth: true });
    return r.exito ? r.cupones : [];
}

export interface NuevoCupon {
    descuentoPct: number;
    motivo: string;
    envioCodigo?: string;
}

export async function emitirCupon(datos: NuevoCupon): Promise<Cupon | null> {
    const r = await llamarApi<{ exito: true; cupon: Cupon }>('/api/cupones', {
        metodo: 'POST',
        cuerpo: datos,
        conAuth: true,
    });
    return r.exito ? r.cupon : null;
}
