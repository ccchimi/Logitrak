// Verificación de identidad contra RENAPER (Registro Nacional de las Personas).
//
// IMPORTANTE: RENAPER no expone una API pública autoservicio. El acceso real
// se hace vía el Sistema de Identidad Digital (SID) y requiere un convenio
// con el organismo. Cuando tengas credenciales, cargá RENAPER_API_URL y
// RENAPER_API_KEY en el .env y completá llamarApiReal() según la
// documentación que te entreguen con el convenio.
//
// Mientras tanto, este módulo corre en MODO SIMULADO: valida formato y
// consistencia de los datos (DNI plausible, nombre real, escaneo facial
// realizado) y deja registrado en la base que la verificación fue simulada.

const hayCredencialesReales = () =>
    Boolean(process.env.RENAPER_API_URL && process.env.RENAPER_API_KEY);

function validarSimulado({ nombreCompleto, dni, escaneoFacialOk }) {
    if (!/^\d{7,8}$/.test(dni)) {
        return { aprobada: false, motivo: 'El DNI debe tener 7 u 8 dígitos, sin puntos.' };
    }
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length < 2) {
        return { aprobada: false, motivo: 'Ingresá nombre y apellido como figuran en tu DNI.' };
    }
    if (!escaneoFacialOk) {
        return { aprobada: false, motivo: 'Tenés que completar el escaneo facial para verificar tu identidad.' };
    }
    return { aprobada: true, motivo: null };
}

async function llamarApiReal(datos) {
    // TODO (requiere convenio con RENAPER/SID): armar la request real, p. ej.:
    // const respuesta = await fetch(`${process.env.RENAPER_API_URL}/verificar`, {
    //     method: 'POST',
    //     headers: {
    //         'Authorization': `Bearer ${process.env.RENAPER_API_KEY}`,
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(datos),
    // });
    // y mapear la respuesta a { aprobada, motivo }.
    throw new Error('Integración real con RENAPER aún no implementada.');
}

export async function verificarIdentidad(datos) {
    if (hayCredencialesReales()) {
        const resultado = await llamarApiReal(datos);
        return { ...resultado, modo: 'real' };
    }
    return { ...validarSimulado(datos), modo: 'simulado' };
}
