import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { credencialRealtime } from './soporteService';

// Suscripción a los mensajes nuevos de un ticket vía Supabase Realtime.
//
// El backend firma un JWT con el JWT secret del proyecto y dos claims propios
// (`logitrak_usuario_id` y `logitrak_rol`), porque los usuarios de Logitrak no
// están en Supabase Auth. Las políticas RLS leen esos claims, y como no hay
// políticas de INSERT ni UPDATE, con este token solo se puede LEER.
//
// Si Realtime no está configurado (falta el JWT secret o la anon key), esto
// devuelve null y la pantalla cae sola a consultar cada pocos segundos.

let cliente: SupabaseClient | null = null;
let credencialCache: { url: string; anonKey: string; token: string } | null = null;

async function obtenerCliente(): Promise<SupabaseClient | null> {
    if (cliente) return cliente;

    if (!credencialCache) {
        const c = await credencialRealtime();
        if (!c.disponible || !c.url || !c.anonKey || !c.token) return null;
        credencialCache = { url: c.url, anonKey: c.anonKey, token: c.token };
    }

    cliente = createClient(credencialCache.url, credencialCache.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        // El token dura una hora; si venció, pedimos otro al backend.
        accessToken: async () => {
            if (credencialCache) return credencialCache.token;
            const c = await credencialRealtime();
            if (c.disponible && c.url && c.anonKey && c.token) {
                credencialCache = { url: c.url, anonKey: c.anonKey, token: c.token };
                return c.token;
            }
            return '';
        },
    });

    return cliente;
}

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
    const supa = await obtenerCliente();
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

/** Se llama al cerrar sesión: el token viejo ya no sirve. */
export function olvidarCredencialRealtime() {
    credencialCache = null;
    cliente = null;
}
