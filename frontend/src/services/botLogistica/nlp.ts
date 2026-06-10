/**
 * Núcleo de procesamiento de lenguaje del bot.
 * No depende de servicios externos: todo el análisis es local y determinístico.
 */

/** Pasa a minúsculas, quita acentos y colapsa espacios. */
export function normalizar(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function tokenizar(texto: string): string[] {
    return normalizar(texto)
        .split(/[^a-z0-9ñ]+/)
        .filter(Boolean);
}

/** Distancia de Levenshtein clásica (costo 1 por inserción/borrado/sustitución). */
export function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    let fila = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i++) {
        const nueva = [i];
        for (let j = 1; j <= b.length; j++) {
            const costo = a[i - 1] === b[j - 1] ? 0 : 1;
            nueva[j] = Math.min(nueva[j - 1] + 1, fila[j] + 1, fila[j - 1] + costo);
        }
        fila = nueva;
    }

    return fila[b.length];
}

/** Similitud 0–1 basada en Levenshtein, robusta a strings de distinto largo. */
export function similitud(a: string, b: string): number {
    const na = normalizar(a);
    const nb = normalizar(b);
    const max = Math.max(na.length, nb.length);
    if (max === 0) return 1;
    return 1 - levenshtein(na, nb) / max;
}

const NUMEROS_EN_PALABRAS: Record<string, number> = {
    cero: 0, medio: 0.5, media: 0.5, un: 1, uno: 1, una: 1, dos: 2, tres: 3,
    cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
    once: 11, doce: 12, docena: 12, trece: 13, catorce: 14, quince: 15,
    dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
    veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
    setenta: 70, ochenta: 80, noventa: 90, cien: 100, doscientos: 200,
    quinientos: 500, mil: 1000,
};

type DominioUnidad = 'peso' | 'longitud';

const UNIDADES: Record<DominioUnidad, Record<string, number>> = {
    peso: {
        kg: 1, kilo: 1, kilos: 1, kilogramo: 1, kilogramos: 1, kgs: 1,
        g: 0.001, gr: 0.001, grs: 0.001, gramo: 0.001, gramos: 0.001,
        t: 1000, tn: 1000, tonelada: 1000, toneladas: 1000,
    },
    longitud: {
        cm: 1, centimetro: 1, centimetros: 1,
        m: 100, mt: 100, mts: 100, metro: 100, metros: 100,
        mm: 0.1, milimetro: 0.1, milimetros: 0.1,
    },
};

export interface NumeroExtraido {
    valor: number;
    unidadDetectada: string | null;
}

/**
 * Extrae una cantidad de un texto libre: acepta dígitos con coma o punto
 * decimal, números escritos en palabras y unidades ("8,5 kg", "dos cajas",
 * "media tonelada", "40cm").
 */
export function extraerNumero(texto: string, dominio?: DominioUnidad): NumeroExtraido | null {
    const limpio = normalizar(texto).replace(/(\d)\s*,\s*(\d)/g, '$1.$2');

    const conDigitos = limpio.match(/-?\d+(?:\.\d+)?/);
    let valor: number | null = conDigitos ? parseFloat(conDigitos[0]) : null;

    if (valor === null) {
        const tokens = limpio.split(/[^a-z0-9ñ.]+/).filter(Boolean);
        let acumulado = 0;
        let encontrado = false;
        for (const token of tokens) {
            if (token in NUMEROS_EN_PALABRAS) {
                acumulado += NUMEROS_EN_PALABRAS[token];
                encontrado = true;
            }
        }
        if (encontrado) valor = acumulado;
    }

    if (valor === null || !isFinite(valor)) return null;

    let unidadDetectada: string | null = null;
    if (dominio) {
        const tabla = UNIDADES[dominio];
        for (const token of limpio.split(/[^a-z]+/).filter(Boolean)) {
            if (token in tabla) {
                valor *= tabla[token];
                unidadDetectada = token;
                break;
            }
        }
    }

    return { valor, unidadDetectada };
}

const SECUENCIAS_TECLADO = [
    'qwert', 'werty', 'asdf', 'sdfg', 'dfgh', 'zxcv', 'xcvb', 'hjkl',
    '12345', '23456', '98765', 'qazwsx', 'poiuy', 'mnbvc',
];

const PLACEHOLDERS = [
    'test', 'prueba', 'ejemplo', 'asd', 'asdasd', 'qwerty', 'nose', 'no se',
    'cualquiera', 'cualquier cosa', 'nada', 'ninguna', 'xxx', 'aaa', 'abc',
    'lorem ipsum', 'direccion', 'calle falsa',
];

/** Detecta si un texto es un placeholder típico de prueba ("test", "asd", "calle falsa 123"). */
export function esTextoDePrueba(texto: string): boolean {
    const n = normalizar(texto).replace(/\d+/g, '').trim();
    return PLACEHOLDERS.some((p) => n === p || (p.length > 3 && n.includes(p)));
}

/**
 * Heurística de "texto inventado": tecleo al azar, secuencias de teclado,
 * caracteres repetidos o palabras sin estructura silábica plausible.
 */
export function esTextoIlegible(texto: string): boolean {
    const n = normalizar(texto);
    const letras = n.replace(/[^a-zñ]/g, '');

    if (letras.length === 0) return true;
    if (/(.)\1{3,}/.test(n)) return true;
    if (SECUENCIAS_TECLADO.some((s) => n.includes(s))) return true;

    const palabras = n.split(/[^a-zñ]+/).filter((p) => p.length >= 4);
    if (palabras.length === 0) return false;

    let sospechosas = 0;
    for (const palabra of palabras) {
        const vocales = (palabra.match(/[aeiou]/g) || []).length;
        const ratioVocales = vocales / palabra.length;
        const consonantesSeguidas = /[^aeiou]{5,}/.test(palabra);
        if (ratioVocales < 0.22 || consonantesSeguidas) sospechosas++;
    }

    return sospechosas / palabras.length > 0.5;
}

const AFIRMACIONES = [
    'si', 's', 'sip', 'sii', 'dale', 'ok', 'okey', 'okay', 'obvio', 'claro',
    'confirmo', 'confirmar', 'confirmado', 'correcto', 'correcta', 'exacto',
    'afirmativo', 'asi es', 'es correcto', 'es correcta', 'yes', 'va', 'de una',
];

const NEGACIONES = [
    'no', 'n', 'nop', 'nope', 'negativo', 'incorrecto', 'incorrecta', 'mal',
    'esta mal', 'cambiar', 'cambialo', 'corregir', 'error', 'me equivoque',
];

export function esAfirmacion(texto: string): boolean {
    const n = normalizar(texto).replace(/[!.]/g, '').trim();
    return AFIRMACIONES.includes(n) || /^si[, ]/.test(n);
}

export function esNegacion(texto: string): boolean {
    const n = normalizar(texto).replace(/[!.]/g, '').trim();
    return NEGACIONES.includes(n) || /^no[, ]/.test(n);
}

/** Hash estable (FNV-1a) para elegir variantes de fraseo de forma determinística. */
export function hashTexto(texto: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
        hash ^= texto.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

/** Elige una variante de una lista en función de un texto semilla. */
export function elegirVariante<T>(variantes: readonly T[], semilla: string): T {
    return variantes[hashTexto(semilla) % variantes.length];
}
