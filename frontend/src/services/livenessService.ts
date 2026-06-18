export type GestoLiveness = 'sonrisa' | 'giro';

export interface DeteccionRostro {
    caras: number;
    smilingProbability?: number;
    rotationY?: number;
    leftEyeOpenProbability?: number;
    rightEyeOpenProbability?: number;
}

export const UMBRALES = {
    sonrisa: 0.6,
    giroGrados: 12,
    ojoAbierto: 0.4,
};

export interface MetaGesto {
    gesto: GestoLiveness;
    instruccion: string;
    icono: string;
}

export const SECUENCIA_LIVENESS: MetaGesto[] = [
    { gesto: 'sonrisa', instruccion: 'Sonreí mirando a la cámara', icono: '😄' },
    { gesto: 'giro', instruccion: 'Girá la cabeza hacia un costado', icono: '↪️' },
];

export interface ResultadoGesto {
    ok: boolean;
    motivo?: string;
}

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

    if (Math.abs(d.rotationY ?? 0) >= UMBRALES.giroGrados) return { ok: true };
    return { ok: false, motivo: 'Girá un poco más la cabeza hacia un costado.' };
}

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
