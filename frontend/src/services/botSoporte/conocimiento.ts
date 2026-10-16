import type { CategoriaSoporte, PresetSoporte, RespuestaConocida } from './types';

// Los presets son los botones que ve el usuario al abrir soporte. Cubren los
// motivos reales por los que alguien escribe: nada de categorías genéricas que
// después obligan a preguntar de nuevo.
export const PRESETS: readonly PresetSoporte[] = [
    {
        categoria: 'envio_demorado',
        etiqueta: 'Mi envío está demorado',
        asunto: 'Envío demorado',
        respuesta:
            'Veamos qué pasó. Pasame el código del envío (empieza con TRK-) y te digo en qué estado está y qué corresponde.',
        pideEnvio: true,
    },
    {
        categoria: 'envio_danado',
        etiqueta: 'Llegó dañado o incompleto',
        asunto: 'Envío dañado o incompleto',
        respuesta:
            'Lamento que haya pasado. Para hacer el reclamo necesito el código del envío y una foto de cómo llegó el paquete. Podés adjuntarla acá abajo.',
        pideAdjunto: true,
        pideEnvio: true,
    },
    {
        categoria: 'problema_pago',
        etiqueta: 'Problema con un pago',
        asunto: 'Problema con un pago',
        respuesta:
            'Contame qué pasó: ¿te cobraron y el envío no se registró, te cobraron dos veces, o no te llegó la devolución? Si tenés el comprobante, adjuntalo.',
        pideAdjunto: true,
    },
    {
        categoria: 'facturacion',
        etiqueta: 'Facturación y comprobantes',
        asunto: 'Facturación',
        respuesta:
            'Puedo ayudarte con eso. ¿Necesitás el comprobante de un envío puntual o los datos de facturación de tu cuenta?',
    },
    {
        categoria: 'cuenta',
        etiqueta: 'Mi cuenta o mis datos',
        asunto: 'Cuenta y datos personales',
        respuesta: '¿Qué querés cambiar? Puedo guiarte con la contraseña, tus datos de perfil o la verificación de identidad.',
    },
    {
        categoria: 'chofer',
        etiqueta: 'Algo con el chofer',
        asunto: 'Consulta sobre el chofer',
        respuesta:
            'Esto lo ve una persona del equipo, porque involucra a otro usuario. Contame qué pasó con el mayor detalle que puedas.',
        derivaDirecto: true,
    },
    {
        categoria: 'otro',
        etiqueta: 'Otra cosa',
        asunto: 'Consulta general',
        respuesta: 'Contame qué necesitás. Si no puedo resolverlo, te paso con alguien del equipo.',
    },
] as const;

export function presetDe(categoria: CategoriaSoporte): PresetSoporte {
    return PRESETS.find((p) => p.categoria === categoria) ?? PRESETS[PRESETS.length - 1];
}

// Banco de respuestas por categoría. El bot solo contesta lo que sabe con
// certeza y que no depende de mirar la base: todo lo demás se deriva. Preferimos
// derivar de más antes que inventar una respuesta.
export const CONOCIMIENTO: Record<CategoriaSoporte, readonly RespuestaConocida[]> = {
    envio_demorado: [
        {
            claves: ['cuanto', 'demora', 'tarda', 'tiempo', 'llega'],
            respuesta:
                'El plazo depende del vehículo y la distancia: la estimación que viste al cotizar es el compromiso de SLA. Si se pasa de ese plazo, el sistema genera un cupón de compensación automáticamente, no hace falta que lo pidas.',
        },
        {
            claves: ['chofer', 'nadie', 'toma', 'asigna'],
            respuesta:
                'Si ningún chofer toma el envío dentro de los primeros 5 minutos, se cancela solo y te devolvemos el importe al mismo medio con el que pagaste. No tenés que hacer nada.',
        },
        {
            claves: ['donde', 'ubicacion', 'seguir', 'mapa', 'rastrear'],
            respuesta:
                'Podés seguirlo en el mapa desde el panel: tocá la tarjeta del envío y después "Seguir en el mapa". Ahí ves el recorrido y el estado en vivo.',
        },
    ],
    envio_danado: [],
    problema_pago: [
        {
            claves: ['dos', 'doble', 'duplicado', 'repetido'],
            respuesta:
                'Si ves dos cobros por el mismo envío, uno se devuelve. Pasame el código del envío y el comprobante del cobro de más para que el equipo lo verifique.',
        },
        {
            claves: ['no', 'aparece', 'pague', 'pagado', 'registro', 'figura'],
            respuesta:
                'A veces el aviso de la pasarela tarda en llegar. Abrí el detalle del envío desde el panel: si el pago figura aprobado ahí, ya está tomado. Si sigue pendiente después de unos minutos, avisame y lo escalo.',
        },
        {
            claves: ['devolucion', 'reembolso', 'devuelto', 'plata'],
            respuesta:
                'Las devoluciones vuelven al mismo medio de pago. En tarjeta pueden tardar hasta dos resúmenes en verse, según el banco. En el detalle del envío vas a ver la fecha exacta en que se emitió.',
        },
    ],
    facturacion: [
        {
            claves: ['comprobante', 'factura', 'recibo', 'descargar'],
            respuesta:
                'El comprobante de cada pago está en el detalle del envío, en la sección "Cómo se pagó". Tiene el número que empieza con COMP-.',
        },
    ],
    cuenta: [
        {
            claves: ['contrasena', 'clave', 'password', 'olvide', 'recuperar'],
            respuesta:
                'Podés restablecerla desde la pantalla de ingreso, en "¿Olvidaste tu contraseña?". Te pide el usuario y después la nueva clave.',
        },
        {
            claves: ['datos', 'perfil', 'telefono', 'domicilio', 'cambiar', 'editar'],
            respuesta: 'Desde Perfil podés editar tus datos. Los cambios se guardan al confirmar.',
        },
        {
            claves: ['verificacion', 'identidad', 'dni', 'validar'],
            respuesta:
                'La verificación de identidad se hace escaneando el código del dorso del DNI desde la app. Si te la rechazó, probá con mejor luz y el documento completo dentro del recuadro.',
        },
    ],
    chofer: [],
    otro: [],
};
