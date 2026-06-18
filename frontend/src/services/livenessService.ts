/**
 * Lógica de "prueba de vida" (liveness) on-device, separada de la cámara para
 * poder testearla. El componente toma fotos con expo-camera, las pasa por el
 * detector de ML Kit (@react-native-ml-kit/face-detection) y evalúa acá si el
 * gesto pedido realmente ocurrió. Una foto estática no puede a la vez sonreír y
 * girar la cabeza, así que la secuencia de gestos descarta el "foto de una foto".
 */

export type GestoLiveness = 'sonrisa' | 'giro';

/** Datos relevantes de una detección de rostro (subconjunto del Face de ML Kit). */
export interface DeteccionRostro {
    /** Cantidad de caras detectadas en la foto. */
    caras: number;
    smilingProbability?: number;
    rotationY?: number;
    leftEyeOpenProbability?: number;
    rightEyeOpenProbability?: number;
}

export const UMBRALES = {
    sonrisa: 0.6,
    /** Grados de giro (yaw) para dar por válido el "girá la cabeza". */
    giroGrados: 12,
    ojoAbierto: 0.4,
};

export interface MetaGesto {
    gesto: GestoLiveness;
    instruccion: string;
    icono: string;
}

/** Secuencia de gestos que se le pide al usuario, en orden. */
export const SECUENCIA_LIVENESS: MetaGesto[] = [
    { gesto: 'sonrisa', instruccion: 'Sonreí mirando a la cámara', icono: '😄' },
    { gesto: 'giro', instruccion: 'Girá la cabeza hacia un costado', icono: '↪️' },
];

export interface ResultadoGesto {
    ok: boolean;
    motivo?: string;
}

/** Evalúa si una detección satisface el gesto pedido. */
export function evaluarGesto(gesto: GestoLiveness, d: DeteccionRostro): ResultadoGesto {
    if (!d || d.caras === 0) {
        return { ok: false, motivo: 'No detecté ninguna cara. Acercate y mirá a la cámara.' };
    }
    if (d.caras > 1) {
        return { ok: false, motivo: 'Detecté más de una cara. Que se vea solo la tuya.' };
    }

    if (gesto === 'sonrisa') {
        if ((d.smilingProbability ?? 0) >= UMBRALES.sonrisa) return { ok: true };
        return { ok: false, motivo: 'Sonreí un poco más para confirmar que sos vos.' };
    }

    // giro
    if (Math.abs(d.rotationY ?? 0) >= UMBRALES.giroGrados) return { ok: true };
    return { ok: false, motivo: 'Girá un poco más la cabeza hacia un costado.' };
}

/** Normaliza el primer rostro devuelto por ML Kit a DeteccionRostro. */
export function desdeMlKit(caras: Array<Record<string, number | undefined>>): DeteccionRostro {
    const primera = caras[0] ?? {};
    return {
        caras: caras.length,
        smilingProbability: primera.smilingProbability,
        rotationY: primera.rotationY,
        leftEyeOpenProbability: primera.leftEyeOpenProbability,
        rightEyeOpenProbability: primera.rightEyeOpenProbability,
    };
}
