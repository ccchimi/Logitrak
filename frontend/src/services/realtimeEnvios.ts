import type { RealtimeChannel } from '@supabase/supabase-js';
import { obtenerClienteRealtime } from './realtimeCliente';

// Seguimiento en tiempo real (Hito 2.3): en vez de consultar el envío cada 5
// segundos, la pantalla escucha los cambios del envío y sus eventos nuevos.
// Las políticas RLS solo dejan escuchar los envíos propios (o los asignados,
// si es chofer). El aviso no trae los datos: dispara una consulta a la API,
// que sigue siendo la que decide qué puede ver cada uno.

export interface SuscripcionEnvio {
    cerrar: () => void;
}

/**
 * Escucha un envío. `alConectar(true)` avisa que el canal quedó suscripto (la
 * pantalla puede espaciar las consultas); `false`, que se cayó. Devuelve null
 * si Realtime no está disponible.
 */
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
