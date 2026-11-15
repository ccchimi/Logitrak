import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { credencialRealtime } from './soporteService';

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

    await cliente.realtime.setAuth(credencialCache.token);

    return cliente;
}

export function olvidarCredencialRealtime() {
    credencialCache = null;
    cliente = null;
}
