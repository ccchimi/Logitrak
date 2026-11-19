import type { RealtimeChannel } from '@supabase/supabase-js';
import { obtenerClienteRealtime } from './realtimeCliente';
import { ubicacionDesdeFila, type UbicacionChofer } from '../helpers/ubicacion';

export interface SuscripcionEnvio {
    cerrar: () => void;
}

export async function escucharEnvio(
    envioId: number,
    alCambiar: () => void,
    alConectar: (conectado: boolean) => void,
    alMoverChofer?: (ubicacion: UbicacionChofer | null) => void
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
            // La posición del chofer llega sola en el aviso: no hace falta
            // volver a pedir el envío entero cada vez que se mueve.
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ubicaciones_chofer', filter: `envio_id=eq.${envioId}` },
                (cambio) => alMoverChofer?.(cambio.eventType === 'DELETE' ? null : ubicacionDesdeFila(cambio.new as Record<string, unknown>))
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
