import { randomInt, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { almacenamientoDisponible, esProduccion, subirArchivo } from '../almacenamiento.js';

export const MAX_INTENTOS_PIN = 5;
export const MAX_BYTES_FOTO = 8 * 1024 * 1024;

export const generarPin = () => String(randomInt(0, 10000)).padStart(4, '0');

export function pinCorrecto(esperado, recibido) {
    if (typeof esperado !== 'string' || typeof recibido !== 'string' || esperado.length !== 4 || recibido.length !== 4) return false;
    return timingSafeEqual(Buffer.from(esperado), Buffer.from(recibido));
}

const FIRMAS = [
    { tipo: 'image/jpeg', ext: 'jpg', es: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    { tipo: 'image/png', ext: 'png', es: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { tipo: 'image/webp', ext: 'webp', es: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
];

export function leerFoto(base64) {
    if (typeof base64 !== 'string' || !base64) return { error: 'Falta la foto de la entrega.' };
    const limpio = base64.replace(/^data:[\w/+.-]+;base64,/, '');
    const buffer = Buffer.from(limpio, 'base64');
    if (buffer.length < 100) return { error: 'La foto de la entrega no es válida.' };
    if (buffer.length > MAX_BYTES_FOTO) return { error: 'La foto pesa más de 8 MB. Sacala con menos calidad.' };
    const firma = FIRMAS.find((f) => f.es(buffer));
    if (!firma) return { error: 'La foto tiene que ser JPG, PNG o WebP.' };
    return { buffer, tipo: firma.tipo, ext: firma.ext };
}

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export async function guardarFotoEntrega(envioCodigo, foto) {
    const nombre = `${Date.now()}.${foto.ext}`;
    const ruta = `entregas/${envioCodigo}/${nombre}`;
    if (almacenamientoDisponible()) return subirArchivo(ruta, foto.buffer, foto.tipo);
    if (esProduccion()) return null;
    const dir = join(RAIZ, 'uploads', 'entregas', envioCodigo);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, nombre), foto.buffer);
    return `uploads/entregas/${envioCodigo}/${nombre}`;
}
