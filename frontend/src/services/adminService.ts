import { llamarApi } from './api';

export async function reiniciarBase(): Promise<{ exito: boolean; mensaje: string }> {
    const r = await llamarApi<{ exito: true; mensaje: string }>('/api/admin/reset', {
        metodo: 'POST',
        conAuth: true,
    });
    if (!r.exito) {
        return { exito: false, mensaje: (r as any).error ?? 'No se pudo reiniciar la base.' };
    }
    return { exito: true, mensaje: r.mensaje };
}
