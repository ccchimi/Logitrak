import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELOS_DIR = process.env.FACE_MODELS_DIR || join(__dirname, '..', '..', 'models');

export const UMBRAL_MATCH = 0.55;

export function distanciaDescriptores(a, b) {
    if (!a || !b || a.length !== b.length) return Infinity;
    let suma = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        suma += d * d;
    }
    return Math.sqrt(suma);
}

export function evaluarMatch(distancia, umbral = UMBRAL_MATCH) {
    return { coincide: distancia <= umbral, distancia, umbral };
}

let runtime = null;

async function cargarRuntime() {
    if (runtime) return runtime === 'no_disponible' ? null : runtime;
    try {
        await import('@tensorflow/tfjs-node');
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