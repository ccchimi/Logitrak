import type { RealtimeChannel } from '@supabase/supabase-js';
import { obtenerClienteRealtime } from './realtimeCliente';

export interface SuscripcionEnvio {
    cerrar: () => void;
}

export async function escucharEnvio(
    envioId: number,
    alCambiar: () => void,
    alConectar: (conectado: boolean) => void
): Promise<SuscripcionEnvio | null> {
    const supa = await obtenerClienteRealtime();
    if (!supa) return null;

    let canal: RealtimeChannel;
    try {
        canal = supa
            .channel(`envio-${envioId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'envios', filter: `id=eq.${envioId}` }, () => alCambiar())
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'envio_eventos', filter: `envio_id=eq.${envioId}` },
                () => alCambiar()
            )
            .subscribe((estado) => {
                if (estado === 'SUBSCRIBED') alConectar(true);
                else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') alConectar(false);
            });
    } catch {
        return null;
    }

    return {
        cerrar: () => {
            void supa.removeChannel(canal);
        },
    };
}
