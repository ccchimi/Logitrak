/**
 * Lectura y verificación del DNI argentino a partir del código PDF417 del dorso.
 *
 * El PDF417 codifica, sin conexión, los datos oficiales separados por "@":
 *   tramite@apellido@nombre@sexo@dni@ejemplar@fechaNac@fechaEmision
 * (hay variantes de orden según la generación de la tarjeta, así que el parser
 * cae a una heurística por formato del dato cuando el orden estándar no encaja).
 *
 * Esto reemplaza la consulta a RENAPER: probamos que la tarjeta codifica datos
 * consistentes y que coinciden con lo que tipeó el usuario. No prueba la
 * autenticidad contra el registro oficial (eso requeriría convenio con el SID).
 */

export interface DniEscaneado {
    tramite: string | null;
    apellido: string | null;
    nombre: string | null;
    sexo: 'M' | 'F' | null;
    dni: string | null;
    ejemplar: string | null;
    fechaNacimiento: string | null;
    fechaEmision: string | null;
    /** Texto crudo del código, tal cual lo leyó la cámara. */
    raw: string;
}

const ES_DNI = /^\d{7,8}$/;
const ES_SEXO = /^[MF]$/i;
const ES_FECHA = /^\d{2}\/\d{2}\/\d{4}$/;

/** Mayúsculas, sin acentos y con espacios colapsados, para comparar nombres. */
export function normalizarTexto(valor: string): string {
    return valor
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/** Solo dígitos (los DNI a veces vienen tipeados con puntos). */
export function soloDigitos(valor: string): string {
    return (valor || '').replace(/\D/g, '');
}

/**
 * Parsea el contenido de un PDF417 de DNI. Devuelve null si el texto no parece
 * un DNI (por si la cámara lee otro código de barras).
 */
export function parsearDniPdf417(raw: string): DniEscaneado | null {
    if (!raw || !raw.includes('@')) return null;

    const partes = raw.split('@').map((p) => p.trim());
    if (partes.length < 5) return null;

    const base: DniEscaneado = {
        tramite: null, apellido: null, nombre: null, sexo: null,
        dni: null, ejemplar: null, fechaNacimiento: null, fechaEmision: null, raw,
    };

    // Formato estándar del DNI tarjeta nuevo (dorso):
    // [0]=tramite [1]=apellido [2]=nombre [3]=sexo [4]=dni [5]=ejemplar [6]=nac [7]=emision
    if (ES_DNI.test(partes[4] ?? '') && ES_SEXO.test(partes[3] ?? '')) {
        return {
            ...base,
            tramite: partes[0] || null,
            apellido: partes[1] || null,
            nombre: partes[2] || null,
            sexo: (partes[3].toUpperCase() as 'M' | 'F') || null,
            dni: partes[4],
            ejemplar: partes[5] || null,
            fechaNacimiento: partes[6] || null,
            fechaEmision: partes[7] || null,
        };
    }

    // Heurística de respaldo: ubicamos cada dato por su formato.
    const dni = partes.find((p) => ES_DNI.test(p)) ?? null;
    if (!dni) return null;

    const sexo = (partes.find((p) => ES_SEXO.test(p)) ?? '').toUpperCase();
    const fechas = partes.filter((p) => ES_FECHA.test(p));
    // Los textos alfabéticos largos son apellido y nombre (en ese orden típico).
    const textos = partes.filter((p) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/.test(p) && !ES_FECHA.test(p));

    return {
        ...base,
        apellido: textos[0] ?? null,
        nombre: textos[1] ?? null,
        sexo: sexo === 'M' || sexo === 'F' ? (sexo as 'M' | 'F') : null,
        dni,
        fechaNacimiento: fechas[0] ?? null,
        fechaEmision: fechas[1] ?? null,
    };
}

export interface ResultadoCruce {
    ok: boolean;
    problemas: string[];
    /** Nombre completo reconstruido desde el DNI (apellido + nombre). */
    nombreDelDni: string | null;
}

/**
 * Cruza los datos escaneados contra lo que tipeó el usuario: el DNI debe ser
 * idéntico y el nombre tipeado debe contener el apellido y el primer nombre.
 */
export function verificarCruce(
    escaneado: DniEscaneado,
    ingresado: { nombreCompleto: string; dni: string }
): ResultadoCruce {
    const problemas: string[] = [];

    const dniTipeado = soloDigitos(ingresado.dni);
    const dniEscaneado = soloDigitos(escaneado.dni ?? '');
    if (!dniEscaneado) {
        problemas.push('No pude leer el número de DNI del código.');
    } else if (dniTipeado && dniTipeado !== dniEscaneado) {
        problemas.push(`El DNI del código (${dniEscaneado}) no coincide con el que ingresaste (${dniTipeado}).`);
    }

    const nombreTipeado = normalizarTexto(ingresado.nombreCompleto);
    const apellido = normalizarTexto(escaneado.apellido ?? '');
    const primerNombre = normalizarTexto(escaneado.nombre ?? '').split(' ')[0] ?? '';

    if (apellido && !nombreTipeado.includes(apellido)) {
        problemas.push(`El apellido del DNI (${escaneado.apellido}) no aparece en el nombre que ingresaste.`);
    }
    if (primerNombre && !nombreTipeado.includes(primerNombre)) {
        problemas.push(`El nombre del DNI (${escaneado.nombre}) no coincide con el que ingresaste.`);
    }

    const nombreDelDni = [escaneado.nombre, escaneado.apellido].filter(Boolean).join(' ') || null;
    return { ok: problemas.length === 0, problemas, nombreDelDni };
}
