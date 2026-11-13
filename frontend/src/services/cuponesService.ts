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

// Los cupones por SLA incumplido los acredita el servidor (Hito 2.1): la app
// solo los lista.
