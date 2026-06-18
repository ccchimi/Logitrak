const hayCredencialesReales = () =>
    Boolean(process.env.RENAPER_API_URL && process.env.RENAPER_API_KEY);

const ES_DNI = /^\d{7,8}$/;
const ES_SEXO = /^[MF]$/i;
const ES_FECHA = /^\d{2}\/\d{2}\/\d{4}$/;

function normalizarTexto(valor) {
    return (valor || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function soloDigitos(valor) {
    return (valor || '').replace(/\D/g, '');
}

export function parsearDniPdf417(raw) {
    if (!raw || !raw.includes('@')) return null;
    const partes = raw.split('@').map((p) => p.trim());
    if (partes.length < 5) return null;

    const base = {
        tramite: null, apellido: null, nombre: null, sexo: null,
        dni: null, ejemplar: null, fechaNacimiento: null, fechaEmision: null, raw,
    };

    if (ES_DNI.test(partes[4] ?? '') && ES_SEXO.test(partes[3] ?? '')) {
        return {
            ...base,
            tramite: partes[0] || null,
            apellido: partes[1] || null,
            nombre: partes[2] || null,
            sexo: partes[3].toUpperCase(),
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
        sexo: sexo === 'M' || sexo === 'F' ? sexo : null,
        dni,
        fechaNacimiento: fechas[0] ?? null,
        fechaEmision: fechas[1] ?? null,
    };
}

function verificarOffline({ nombreCompleto, dni, dniEscaneado, escaneoFacialOk, livenessOk }) {
    if (!ES_DNI.test(soloDigitos(dni))) {
        return { aprobada: false, motivo: 'El DNI debe tener 7 u 8 dígitos, sin puntos.' };
    }
    if (normalizarTexto(nombreCompleto).split(' ').length < 2) {
        return { aprobada: false, motivo: 'Ingresá nombre y apellido como figuran en tu DNI.' };
    }
    if (!dniEscaneado) {
        return { aprobada: false, motivo: 'Tenés que escanear el código del dorso de tu DNI para verificar tu identidad.' };
    }

    const datos = parsearDniPdf417(dniEscaneado);
    if (!datos) {
        return { aprobada: false, motivo: 'El código escaneado no corresponde a un DNI válido.' };
    }

    const dniTipeado = soloDigitos(dni);
    const dniLeido = soloDigitos(datos.dni);
    if (!dniLeido || dniLeido !== dniTipeado) {
        return { aprobada: false, motivo: 'El DNI del documento escaneado no coincide con el número ingresado.' };
    }

    const nombreTipeado = normalizarTexto(nombreCompleto);
    const apellido = normalizarTexto(datos.apellido);
    const primerNombre = normalizarTexto(datos.nombre).split(' ')[0] ?? '';
    if (apellido && !nombreTipeado.includes(apellido)) {
        return { aprobada: false, motivo: 'El apellido del DNI no coincide con el nombre ingresado.' };
    }
    if (primerNombre && !nombreTipeado.includes(primerNombre)) {
        return { aprobada: false, motivo: 'El nombre del DNI no coincide con el ingresado.' };
    }

    if (!escaneoFacialOk) {
        return { aprobada: false, motivo: 'Tenés que tomarte la selfie para completar la verificación.' };
    }

    if (process.env.LIVENESS_REQUERIDO === 'true' && livenessOk !== true) {
        return { aprobada: false, motivo: 'No pudimos confirmar la prueba de vida. Repetí los gestos frente a la cámara.' };
    }

    return { aprobada: true, motivo: null, datosDni: datos };
}

async function llamarApiReal(_datos) {
    throw new Error('Integración real con RENAPER aún no implementada.');
}

export async function verificarIdentidad(datos) {
    if (hayCredencialesReales()) {
        const resultado = await llamarApiReal(datos);
        return { ...resultado, modo: 'real' };
    }
    return { ...verificarOffline(datos), modo: 'pdf417' };
}