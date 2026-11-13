import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { credencialRealtime } from './soporteService';

// Cliente de Supabase Realtime compartido (chat de soporte y seguimiento).
//
// El backend firma un JWT con el JWT secret del proyecto y dos claims propios
// (`logitrak_usuario_id` y `logitrak_rol`), porque los usuarios de Logitrak no
// están en Supabase Auth. Las políticas RLS leen esos claims, y como no hay
// políticas de INSERT ni UPDATE, con este token solo se puede LEER.
//
// Si Realtime no está configurado (falta el JWT secret, la URL o la anon key),
// devuelve null y cada pantalla cae sola a consultar cada tanto.

let cliente: SupabaseClient | null = null;
let credencialCache: { url: string; anonKey: string; token: string } | null = null;

export async function obtenerClienteRealtime(): Promise<SupabaseClient | null> {
    if (cliente) return cliente;

    if (!credencialCache) {
        const c = await credencialRealtime();
        if (!c.disponible || !c.url || !c.anonKey || !c.token) return null;
        credencialCache = { url: c.url, anonKey: c.anonKey, token: c.token };
    }

    cliente = createClient(credencialCache.url, credencialCache.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // Sin este setAuth el socket viaja con la anon key y RLS no ve nuestros
    // claims, así que el canal se suscribe pero no llega ningún evento. La
    // opción `accessToken` del cliente no alcanza: no la propaga al socket.
    await cliente.realtime.setAuth(credencialCache.token);

    return cliente;
}

/** Se llama al cerrar sesión: el token viejo ya no sirve. */
export function olvidarCredencialRealtime() {
    credencialCache = null;
    cliente = null;
}
