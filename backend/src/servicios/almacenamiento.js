import { createClient } from '@supabase/supabase-js';

const BUCKET = process.env.SUPABASE_BUCKET || 'verificacion-identidad';

let clienteCache = null;

function obtenerCliente() {
    if (clienteCache) return clienteCache;
    const url = process.env.SUPABASE_URL;
    const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !clave) return null;
    clienteCache = createClient(url, clave, { auth: { persistSession: false } });
    return clienteCache;
}

export function almacenamientoDisponible() {
    return Boolean(obtenerCliente());
}

export async function subirArchivo(ruta, buffer, contentType = 'application/octet-stream') {
    const supa = obtenerCliente();
    if (!supa || !buffer) return null;
    const { error } = await supa.storage.from(BUCKET).upload(ruta, buffer, {
        contentType,
        upsert: true,
    });
    if (error) {
        throw new Error(`No se pudo subir el archivo a Storage: ${error.message}`);
    }
    return ruta;
}

// Alias histórico: la verificación de identidad ya lo usaba con este nombre.
export const subirImagen = (ruta, buffer, contentType = 'image/jpeg') =>
    subirArchivo(ruta, buffer, contentType);

export async function urlFirmada(ruta, expiraEnSegundos = 3600) {
    const supa = obtenerCliente();
    if (!supa || !ruta || ruta.startsWith('uploads/')) return null;
    const { data, error } = await supa.storage
        .from(BUCKET)
        .createSignedUrl(ruta, expiraEnSegundos);
    if (error) return null;
    return data.signedUrl;
}
