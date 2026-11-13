import type { RealtimeChannel } from '@supabase/supabase-js';
import { obtenerClienteRealtime } from './realtimeCliente';

// Suscripción a los mensajes nuevos de un ticket vía Supabase Realtime. El
// cliente y la credencial se comparten con el seguimiento (realtimeCliente.ts).
export { olvidarCredencialRealtime } from './realtimeCliente';

export interface SuscripcionSoporte {
    cerrar: () => void;
}

/**
 * Escucha los mensajes nuevos de un ticket. Devuelve null si Realtime no está
 * disponible, para que quien llame haga polling en su lugar.
 */
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
