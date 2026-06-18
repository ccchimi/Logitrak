// Match facial 1:1 (Tier 3): compara la selfie con la foto del frente del DNI.
//
// La DECISIÓN (distancia entre descriptores + umbral) es una función pura y
// testeable. La EXTRACCIÓN de descriptores usa @vladmandic/face-api y se carga
// de forma perezosa: si el runtime (tfjs-node) o los modelos no están, devuelve
// { disponible: false } y el alta sigue su curso sin romperse.
//
// Para activarlo de verdad:
//   1) Node LTS (20/22) + `npm install @tensorflow/tfjs-node`
//   2) Descargar los pesos a backend/models (ssdMobilenetv1, faceLandmark68Net,
//      faceRecognitionNet) desde https://github.com/vladmandic/face-api/tree/master/model
//   3) FACE_MATCH_REQUERIDO=true en el .env para exigir coincidencia.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELOS_DIR = process.env.FACE_MODELS_DIR || join(__dirname, '..', '..', 'models');

// Umbral estándar de face-api: distancia <= 0.6 se considera la misma persona.
export const UMBRAL_MATCH = 0.55;

/** Distancia euclidiana entre dos descriptores faciales (128-d). Función pura. */
export function distanciaDescriptores(a, b) {
    if (!a || !b || a.length !== b.length) return Infinity;
    let suma = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        suma += d * d;
    }
    return Math.sqrt(suma);
}

/** Decide si dos caras coinciden según la distancia. Función pura. */
export function evaluarMatch(distancia, umbral = UMBRAL_MATCH) {
    return { coincide: distancia <= umbral, distancia, umbral };
}

/* ---- Carga perezosa del runtime (no se toca si nunca se usa el match) ---- */

let runtime = null; // { faceapi } | 'no_disponible'

async function cargarRuntime() {
    if (runtime) return runtime === 'no_disponible' ? null : runtime;
    try {
        await import('@tensorflow/tfjs-node'); // registra el backend nativo
        const faceapi = await import('@vladmandic/face-api');
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELOS_DIR);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELOS_DIR);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELOS_DIR);
        runtime = { faceapi };
        return runtime;
    } catch (e) {
        console.warn('Match facial no disponible (runtime/modelos):', e.message);
        runtime = 'no_disponible';
        return null;
    }
}

// Decodifica un JPEG (Buffer) a tensor [h,w,3] usando jpeg-js (puro JS).
async function bufferATensor(faceapi, buffer) {
    const jpeg = (await import('jpeg-js')).default;
    const { data, width, height } = jpeg.decode(buffer, { useTArray: true });
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        rgb[j] = data[i];
        rgb[j + 1] = data[i + 1];
        rgb[j + 2] = data[i + 2];
    }
    return faceapi.tf.tensor3d(rgb, [height, width, 3], 'int32');
}

async function descriptorDeBuffer(faceapi, buffer) {
    const t = await bufferATensor(faceapi, buffer);
    try {
        const det = await faceapi
            .detectSingleFace(t)
            .withFaceLandmarks()
            .withFaceDescriptor();
        return det ? det.descriptor : null;
    } finally {
        t.dispose();
    }
}

/**
 * Compara dos imágenes (selfie y frente del DNI). Devuelve:
 *  - { disponible: false }                      si no hay runtime/modelos
 *  - { disponible: true, caraDetectada: false } si no se detectó cara en alguna
 *  - { disponible: true, caraDetectada: true, coincide, distancia, umbral }
 */
export async function compararCaras(selfieBuf, dniFrenteBuf) {
    if (!selfieBuf || !dniFrenteBuf) return { disponible: false };
    const rt = await cargarRuntime();
    if (!rt) return { disponible: false };

    const [d1, d2] = await Promise.all([
        descriptorDeBuffer(rt.faceapi, selfieBuf),
        descriptorDeBuffer(rt.faceapi, dniFrenteBuf),
    ]);
    if (!d1 || !d2) return { disponible: true, caraDetectada: false };

    const distancia = distanciaDescriptores(d1, d2);
    return { disponible: true, caraDetectada: true, ...evaluarMatch(distancia) };
}
