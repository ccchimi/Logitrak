import { normalizar } from '../botLogistica/nlp';
import { CONOCIMIENTO, PRESETS, presetDe } from './conocimiento';
import type { ContextoSoporte, ResultadoSoporte } from './types';

export const BOT_SOPORTE_META = {
    nombre: 'Boxy',
    modo: 'soporte',
    version: '1.0.0',
} as const;

export * from './types';
export { PRESETS, presetDe };

/** Después de estos intentos sin acertar, el bot deja de insistir y deriva. */
const MAX_INTENTOS = 2;

const REGEX_ENVIO = /\bTRK-\d{4}-\d{6}\b/i;

export function extraerCodigoEnvio(texto: string): string | null {
    const m = texto.match(REGEX_ENVIO);
    return m ? m[0].toUpperCase() : null;
}

/** Palabras que no aportan nada al matcheo. */
const VACIAS = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'que', 'y', 'o', 'a',
    'en', 'mi', 'me', 'se', 'es', 'por', 'para', 'con', 'no', 'si', 'lo', 'al',
]);

function palabras(texto: string): string[] {
    return normalizar(texto)
        .split(/\s+/)
        .filter((p) => p.length > 1 && !VACIAS.has(p));
}

/**
 * Decide qué responde el bot. La regla de fondo: solo contesta cuando hay una
 * coincidencia clara en el banco de respuestas. Ante la duda deriva, porque en
 * soporte una respuesta inventada cuesta más que una derivación de más.
 */
export function resolverConsulta(texto: string, contexto: ContextoSoporte): ResultadoSoporte {
    const preset = presetDe(contexto.categoria);

    if (preset.derivaDirecto) {
        return {
            tipo: 'derivar',
            respuesta: 'Esto lo tiene que ver una persona del equipo. Ya se lo paso con todo lo que escribiste.',
        };
    }

    // Cuando la categoría necesita un envío y todavía no lo tenemos, lo pedimos
    // antes de intentar responder cualquier otra cosa.
    if (preset.pideEnvio && !contexto.envioCodigo && !extraerCodigoEnvio(texto)) {
        if (contexto.intentosFallidos >= MAX_INTENTOS) {
            return {
                tipo: 'derivar',
                respuesta: 'Sin el código del envío no puedo avanzar solo. Te paso con el equipo para que lo busquen ellos.',
            };
        }
        return {
            tipo: 'pide_dato',
            respuesta: 'Necesito el código del envío para mirarlo. Es el que empieza con TRK- y lo ves en la tarjeta del panel.',
        };
    }

    const entradas = CONOCIMIENTO[contexto.categoria] ?? [];
    const términos = palabras(texto);

    let mejor: { respuesta: string; puntaje: number } | null = null;
    for (const entrada of entradas) {
        const aciertos = entrada.claves.filter((c) => términos.includes(normalizar(c))).length;
        if (aciertos === 0) continue;
        const puntaje = aciertos * (entrada.peso ?? 1);
        if (!mejor || puntaje > mejor.puntaje) mejor = { respuesta: entrada.respuesta, puntaje };
    }

    if (mejor && mejor.puntaje >= 1) {
        return { tipo: 'resuelto', respuesta: mejor.respuesta };
    }

    if (contexto.intentosFallidos >= MAX_INTENTOS) {
        return {
            tipo: 'derivar',
            respuesta: 'No estoy pudiendo resolverlo yo. Te paso con una persona del equipo, que va a leer todo el hilo.',
        };
    }

    return {
        tipo: 'pide_dato',
        respuesta:
            'No termino de entender el problema. ¿Podés contarme con un poco más de detalle qué pasó? Si no, te paso con el equipo.',
    };
}
