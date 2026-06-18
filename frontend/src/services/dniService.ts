export interface DniEscaneado {
    tramite: string | null;
    apellido: string | null;
    nombre: string | null;
    sexo: 'M' | 'F' | null;
    dni: string | null;
    ejemplar: string | null;
    fechaNacimiento: string | null;
    fechaEmision: string | null;
    raw: string;
}

const ES_DNI = /^\d{7,8}$/;
const ES_SEXO = /^[MF]$/i;
const ES_FECHA = /^\d{2}\/\d{2}\/\d{4}$/;

export function normalizarTexto(valor: string): string {
    return valor
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
}

export function soloDigitos(valor: string): string {
    return (valor || '').replace(/\D/g, '');
}

export function parsearDniPdf417(raw: string): DniEscaneado | null {
    if (!raw || !raw.includes('@')) return null;

    const partes = raw.split('@').map((p) => p.trim());
    if (partes.length < 5) return null;

    const base: DniEscaneado = {
        tramite: null, apellido: null, nombre: null, sexo: null,
        dni: null, ejemplar: null, fechaNacimiento: null, fechaEmision: null, raw,
    };

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

    const dni = partes.find((p) => ES_DNI.test(p)) ?? null;
    if (!dni) return null;

    const sexo = (partes.find((p) => ES_SEXO.test(p)) ?? '').toUpperCase();
    const fechas = partes.filter((p) => ES_FECHA.test(p));
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
    nombreDelDni: string | null;
}

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
