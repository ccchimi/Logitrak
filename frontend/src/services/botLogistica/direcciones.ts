import { BARRIOS, CONFIG_OPERATIVA, LOCALIDADES, TIPOS_VIA } from './conocimiento';
import { esTextoDePrueba, esTextoIlegible, normalizar, similitud } from './nlp';
import {
    AnalisisDireccion,
    ComponentesDireccion,
    Localidad,
    NivelConfianza,
    ProblemaDeteccion,
    VeredictoDireccion,
} from './types';

const CONECTORES = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'al']);

function capitalizar(texto: string): string {
    return texto
        .split(' ')
        .filter(Boolean)
        .map((palabra, i) =>
            CONECTORES.has(palabra) && i > 0
                ? palabra
                : palabra.charAt(0).toUpperCase() + palabra.slice(1)
        )
        .join(' ');
}

export interface ResolucionLocalidad {
    localidad: Localidad;
    corregida: boolean;
    barrio: string | null;
}

interface Candidato {
    alias: string;
    localidad: Localidad;
    barrio: string | null;
}

const CANDIDATOS: readonly Candidato[] = [
    ...LOCALIDADES.flatMap((localidad) => localidad.alias.map((alias) => ({ alias, localidad, barrio: null }))),
    ...BARRIOS.flatMap((barrio) => {
        const localidad = LOCALIDADES.find((l) => l.id === barrio.localidadId);
        if (!localidad) return [];
        return [normalizar(barrio.nombre), ...(barrio.alias ?? [])].map((alias) => ({
            alias,
            localidad,
            barrio: barrio.nombre,
        }));
    }),
];

// Tramos donde puede estar la ciudad: lo que va después de la primera coma o,
// sin comas, lo que sigue a la altura. El nombre de la calle nunca cuenta:
// "Av. Corrientes 1300" no es la ciudad de Corrientes ni "Av. Santa Fe" la de
// Santa Fe. Se descartan los tramos con números (piso, depto, código postal).
export function segmentosDeLocalidad(texto: string): string[] {
    const n = normalizar(texto);
    const partes = n.split(',').map((s) => s.trim());

    let tramos: string[];
    if (partes.length > 1) {
        tramos = partes.slice(1);
    } else {
        const palabras = n.split(' ');
        const iAltura = palabras.findIndex((p, i) => i > 0 && /^\d{1,5}$/.test(p));
        tramos = iAltura >= 0 ? [palabras.slice(iAltura + 1).join(' ')] : [];
    }

    return tramos
        .map((t) => t.split(' ').filter((p) => p && !/\d/.test(p)).join(' ').replace(/[.;:]+$/g, '').trim())
        .filter((t) => t.length >= 3 && !/^(piso|dpto|depto|departamento|cp)\b/.test(t));
}

function contienePalabras(tramo: string, alias: string): boolean {
    return ` ${tramo} `.includes(` ${alias} `);
}

export function resolverLocalidad(texto: string): ResolucionLocalidad | null {
    const tramos = segmentosDeLocalidad(texto);

    // Primero coincidencias exactas, tramo por tramo y en orden: "..., Quilmes,
    // Buenos Aires" es Quilmes aunque "buenos aires" sea un alias de CABA. Entre
    // los alias que entran en un mismo tramo gana el más largo ("palermo soho").
    for (const tramo of tramos) {
        const coincidencias = CANDIDATOS.filter((c) => contienePalabras(tramo, c.alias));
        if (coincidencias.length) {
            const elegido = coincidencias.reduce((a, b) => (b.alias.length > a.alias.length ? b : a));
            return { localidad: elegido.localidad, corregida: false, barrio: elegido.barrio };
        }
    }

    let mejor: (Candidato & { puntaje: number }) | null = null;
    for (const tramo of tramos.filter((t) => t.length >= 4)) {
        for (const candidato of CANDIDATOS) {
            const s = similitud(tramo, candidato.alias);
            if (s >= 0.78 && (!mejor || s > mejor.puntaje)) mejor = { ...candidato, puntaje: s };
        }
    }

    return mejor ? { localidad: mejor.localidad, corregida: true, barrio: mejor.barrio } : null;
}

function extraerComponentes(texto: string): ComponentesDireccion {
    const n = normalizar(texto);

    const cpa = n.match(/\b[a-z]\d{4}[a-z]{3}\b/);
    const cpPrefijo = n.match(/\bc\.?p\.?\s*:?\s*(\d{4})\b/);
    const codigoPostal = cpa ? cpa[0].toUpperCase() : cpPrefijo ? cpPrefijo[1] : null;
    const piso = n.match(/\b(?:piso\s*\d+|\d+\s*[°º]\s*(?:piso)?|dpto\.?\s*[a-z0-9]|depto\.?\s*[a-z0-9]|departamento\s*[a-z0-9])\b/);
    const pisoDepto = piso ? piso[0] : null;
    const palabras = texto
        .split(',')[0]
        .split(/\s+/)
        .filter(Boolean)
        .filter((p) => !codigoPostal || normalizar(p) !== normalizar(codigoPostal));

    let tipoVia: string | null = null;
    let nombreVia: string | null = null;
    let altura: number | null = null;

    let indiceAltura = -1;
    for (let i = 0; i < palabras.length; i++) {
        const hayViaPrevia = palabras.slice(0, i).some((p) => /[a-zñáéíóú]/i.test(p));
        if (hayViaPrevia && /^\d{1,5}$/.test(palabras[i])) {
            indiceAltura = i;
            altura = parseInt(palabras[i], 10);
            break;
        }
    }

    const palabrasVia = (indiceAltura >= 0 ? palabras.slice(0, indiceAltura) : palabras).filter(
        (p) => /[a-zñáéíóú0-9]/i.test(p)
    );
    const primera = palabrasVia[0] ? normalizar(palabrasVia[0]).replace(/\./g, '') : null;

    if (primera && TIPOS_VIA.includes(primera)) {
        tipoVia = primera;
        nombreVia = palabrasVia.slice(1).join(' ') || null;
    } else if (palabrasVia.length > 0) {
        nombreVia = palabrasVia.join(' ');
    }

    return { tipoVia, nombreVia, altura, pisoDepto, codigoPostal };
}

function nivelDesdePuntaje(puntaje: number): NivelConfianza {
    if (puntaje >= 75) return 'alta';
    if (puntaje >= 50) return 'media';
    return 'baja';
}

function construirNormalizada(
    componentes: ComponentesDireccion,
    localidad: Localidad | null,
    barrio: string | null,
    textoOriginal: string
): string {
    if (!componentes.nombreVia) return textoOriginal.trim();

    const ABREVIATURAS: Record<string, string> = {
        av: 'Av.', avda: 'Av.', avenida: 'Av.',
        bv: 'Bv.', bulevar: 'Bv.', boulevard: 'Bv.',
        diag: 'Diag.', pje: 'Pje.', au: 'Au.',
        rn: 'RN', rp: 'RP',
    };

    const tipo = componentes.tipoVia
        ? ABREVIATURAS[componentes.tipoVia] ?? capitalizar(componentes.tipoVia)
        : '';

    const partes: string[] = [];
    const via = `${tipo} ${capitalizar(componentes.nombreVia)}`.trim();
    partes.push(componentes.altura ? `${via} ${componentes.altura}` : via);
    if (componentes.pisoDepto) partes.push(capitalizar(componentes.pisoDepto));
    if (barrio) partes.push(barrio);
    if (localidad) {
        partes.push(localidad.nombre);
        if (localidad.provincia !== localidad.nombre) partes.push(localidad.provincia);
    }

    return partes.join(', ');
}

export function analizarDireccion(textoOriginal: string): AnalisisDireccion {
    const problemas: ProblemaDeteccion[] = [];
    const texto = textoOriginal.trim();

    const base: Omit<AnalisisDireccion, 'veredicto' | 'puntaje' | 'confianza'> = {
        textoOriginal,
        textoNormalizado: texto,
        componentes: { tipoVia: null, nombreVia: null, altura: null, pisoDepto: null, codigoPostal: null },
        localidad: null,
        localidadCorregida: false,
        barrio: null,
        problemas,
    };

    const invalida = (extra?: Partial<AnalisisDireccion>): AnalisisDireccion => ({
        ...base,
        ...extra,
        veredicto: 'invalida',
        puntaje: 0,
        confianza: 'baja',
        problemas,
    });

    if (!texto) {
        problemas.push({
            codigo: 'direccion_vacia',
            severidad: 'critica',
            mensaje: 'No recibí ninguna dirección.',
            sugerencia: 'Indicá calle, altura y localidad. Ej: "Av. Corrientes 1300, CABA".',
        });
        return invalida();
    }

    if (texto.length < 6) {
        problemas.push({
            codigo: 'direccion_corta',
            severidad: 'critica',
            mensaje: 'La dirección es demasiado corta para ser real.',
            sugerencia: 'Necesito al menos calle y altura. Ej: "Mitre 450, Quilmes".',
        });
        return invalida();
    }

    if (esTextoDePrueba(texto)) {
        problemas.push({
            codigo: 'texto_de_prueba',
            severidad: 'critica',
            mensaje: 'Eso parece un texto de prueba, no una dirección real.',
            sugerencia: 'Escribí la dirección verdadera de retiro o entrega.',
        });
        return invalida();
    }

    if (esTextoIlegible(texto)) {
        problemas.push({
            codigo: 'texto_ilegible',
            severidad: 'critica',
            mensaje: 'No puedo reconocer una dirección en ese texto.',
            sugerencia: 'Revisá que esté bien escrita, con calle, altura y localidad.',
        });
        return invalida();
    }

    const componentes = extraerComponentes(texto);
    const resolucion = resolverLocalidad(texto);
    const localidad = resolucion?.localidad ?? null;
    const localidadCorregida = resolucion?.corregida ?? false;
    const barrio = resolucion?.barrio ?? null;

    let puntaje = 0;

    if (componentes.nombreVia && componentes.nombreVia.length >= 3 && /[aeiouáéíóú]/i.test(componentes.nombreVia)) {
        puntaje += 35;
    } else {
        problemas.push({
            codigo: 'sin_nombre_de_via',
            severidad: 'critica',
            mensaje: 'No identifico el nombre de la calle o avenida.',
            sugerencia: 'Empezá por la calle. Ej: "Av. Santa Fe 3200".',
        });
    }

    if (componentes.altura !== null) {
        if (componentes.altura > 0 && componentes.altura <= CONFIG_OPERATIVA.limites.alturaCalleMax) {
            puntaje += 25;
        } else {
            problemas.push({
                codigo: 'altura_implausible',
                severidad: 'advertencia',
                mensaje: `La altura ${componentes.altura} no parece existir en una calle real.`,
                sugerencia: 'Verificá el número de puerta.',
            });
            puntaje += 5;
        }
    } else {
        problemas.push({
            codigo: 'sin_altura',
            severidad: 'advertencia',
            mensaje: 'Falta la altura (número de puerta).',
            sugerencia: 'Agregá el número para que el chofer llegue sin demoras.',
        });
    }

    if (localidad) {
        puntaje += localidadCorregida ? 15 : 25;
        if (localidadCorregida) {
            problemas.push({
                codigo: 'localidad_corregida',
                severidad: 'info',
                mensaje: `Interpreté la localidad como ${localidad.nombre} (${localidad.provincia}).`,
            });
        }
    } else {
        // Se distingue "no dijo la ciudad" de "dijo algo que no es una ciudad
        // de la cobertura", que suele ser un barrio confundido con la localidad.
        const escrito = segmentosDeLocalidad(texto)[0];
        problemas.push(
            escrito
                ? {
                      codigo: 'localidad_desconocida',
                      severidad: 'advertencia',
                      mensaje: `No reconozco "${capitalizar(escrito)}" como una ciudad o localidad de nuestra cobertura.`,
                      sugerencia:
                          'Si es un barrio, agregá la ciudad al final. Ej: "Cabildo 2000, Belgrano, CABA" o "Mitre 450, Bernal, Quilmes".',
                  }
                : {
                      codigo: 'localidad_desconocida',
                      severidad: 'advertencia',
                      mensaje: 'Falta la ciudad o localidad.',
                      sugerencia: 'Agregala después de una coma. Ej: "Av. Corrientes 1300, CABA" o "Bv. Oroño 1200, Rosario".',
                  }
        );
    }

    if (componentes.tipoVia) puntaje += 10;
    if (componentes.codigoPostal) puntaje += 5;

    puntaje = Math.min(100, puntaje);

    let veredicto: VeredictoDireccion;
    if (puntaje >= 75 && localidad) veredicto = 'verificada';
    else if (puntaje >= 55) veredicto = 'plausible';
    else if (puntaje >= 35) veredicto = 'dudosa';
    else veredicto = 'invalida';

    return {
        ...base,
        textoNormalizado: construirNormalizada(componentes, localidad, barrio, texto),
        componentes,
        localidad,
        localidadCorregida,
        barrio,
        veredicto,
        puntaje,
        confianza: nivelDesdePuntaje(puntaje),
        problemas,
    };
}

export function esMismaDireccion(a: AnalisisDireccion, b: AnalisisDireccion): boolean {
    if (
        a.componentes.nombreVia &&
        b.componentes.nombreVia &&
        a.componentes.altura !== null &&
        b.componentes.altura !== null
    ) {
        const mismaVia = similitud(a.componentes.nombreVia, b.componentes.nombreVia) >= 0.85;
        const mismaLocalidad = !a.localidad || !b.localidad || a.localidad.id === b.localidad.id;
        return mismaVia && a.componentes.altura === b.componentes.altura && mismaLocalidad;
    }
    return similitud(a.textoNormalizado, b.textoNormalizado) >= 0.92;
}

export function distanciaHaversineKm(a: Localidad, b: Localidad): number {
    const R = 6371;
    const rad = (g: number) => (g * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

export interface EstimacionDistancia {
    km: number;
    estimada: boolean;
    detalle: string;
}

export function estimarDistancia(origen: AnalisisDireccion, destino: AnalisisDireccion): EstimacionDistancia {
    const { factorRuta, distanciaUrbanaPorDefectoKm } = CONFIG_OPERATIVA;

    if (origen.localidad && destino.localidad) {
        if (origen.localidad.id === destino.localidad.id) {
            const km = Math.max(2, origen.localidad.radioKm * 0.7);
            return {
                km: Math.round(km * 10) / 10,
                estimada: true,
                detalle: `tramo urbano dentro de ${origen.localidad.nombre}`,
            };
        }
        const km = distanciaHaversineKm(origen.localidad, destino.localidad) * factorRuta;
        return {
            km: Math.round(km * 10) / 10,
            estimada: false,
            detalle: `${origen.localidad.nombre} → ${destino.localidad.nombre} por red vial estimada`,
        };
    }

    return {
        km: distanciaUrbanaPorDefectoKm,
        estimada: true,
        detalle: 'tramo urbano asumido por falta de localidad verificable',
    };
}
