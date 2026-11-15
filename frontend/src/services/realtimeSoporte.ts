import type { RealtimeChannel } from '@supabase/supabase-js';
import { obtenerClienteRealtime } from './realtimeCliente';

export { olvidarCredencialRealtime } from './realtimeCliente';

export interface SuscripcionSoporte {
    cerrar: () => void;
}

export async function escucharMensajes(
    ticketId: number,
    alLlegar: () => void
): Promise<SuscripcionSoporte | null> {
    const supa = await obtenerClienteRealtime();
    if (!supa) return null;

    let canal: RealtimeChannel;
    try {
        canal = supa
            .channel(`soporte-${ticketId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'soporte_mensajes',
                    filter: `ticket_id=eq.${ticketId}`,
                },
                () => alLlegar()
            )
            .subscribe();
    } catch {
        return null;
    }

    return {
        cerrar: () => {
            void supa.removeChannel(canal);
        },
    };
}
