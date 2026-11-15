import { createClient } from '@supabase/supabase-js';

const BUCKET = process.env.SUPABASE_BUCKET || 'verificacion-identidad';

export const SEGUNDOS_URL_DOCUMENTO = 300;

let clienteCache = null;
let bucketPrivado = null;

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

export { esDesplegado as esProduccion } from '../config/entorno.js';

async function exigirBucketPrivado(supa) {
    if (bucketPrivado === true) return;
    const { data, error } = await supa.storage.getBucket(BUCKET);
    if (error) throw new Error(`No se pudo verificar el bucket ${BUCKET}: ${error.message}`);
    if (data.public) {
        bucketPrivado = false;
        throw new Error(`El bucket ${BUCKET} es público: no se suben datos personales hasta hacerlo privado.`);
    }
    bucketPrivado = true;
}

export async function verificarAlmacenamiento() {
    const supa = obtenerCliente();
    if (!supa) return { estado: 'no_configurado' };
    const { data, error } = await supa.storage.getBucket(BUCKET);
    if (error) return { estado: 'error', motivo: error.message };
    if (data.public) return { estado: 'error', motivo: `El bucket ${BUCKET} es público.` };
    return { estado: 'ok' };
}

export async function subirArchivo(ruta, buffer, contentType = 'application/octet-stream') {
    const supa = obtenerCliente();
    if (!supa || !buffer) return null;
    await exigirBucketPrivado(supa);
    const { error } = await supa.storage.from(BUCKET).upload(ruta, buffer, {
        contentType,
        upsert: true,
    });
    if (error) {
        throw new Error(`No se pudo subir el archivo a Storage: ${error.message}`);
    }
    return ruta;
}

export const subirImagen = (ruta, buffer, contentType = 'image/jpeg') =>
    subirArchivo(ruta, buffer, contentType);

export async function urlFirmada(ruta, expiraEnSegundos = SEGUNDOS_URL_DOCUMENTO) {
    const supa = obtenerCliente();
    if (!supa || !ruta || ruta.startsWith('uploads/')) return null;
    const { data, error } = await supa.storage
        .from(BUCKET)
        .createSignedUrl(ruta, expiraEnSegundos);
    if (error) return null;
    return data.signedUrl;
}

export async function borrarArchivos(rutas) {
    const enStorage = rutas.filter((r) => r && !r.startsWith('uploads/'));
    const supa = obtenerCliente();
    if (!enStorage.length) return [];
    if (!supa) return enStorage;
    const { error } = await supa.storage.from(BUCKET).remove(enStorage);
    return error ? enStorage : [];
}
