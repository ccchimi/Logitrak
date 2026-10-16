// Tipado propio del asistente de soporte. Deliberadamente separado del de
// botLogistica: aquel modela una cotización (direcciones, carga, tarifas) y
// este modela una consulta que puede terminar derivada a una persona.

export type CategoriaSoporte =
    | 'envio_demorado'
    | 'envio_danado'
    | 'problema_pago'
    | 'facturacion'
    | 'cuenta'
    | 'chofer'
    | 'otro';

export interface PresetSoporte {
    categoria: CategoriaSoporte;
    /** Lo que ve el usuario en el botón. */
    etiqueta: string;
    /** Asunto con el que se abre el ticket. */
    asunto: string;
    /** Primera respuesta del bot al elegir el preset. */
    respuesta: string;
    /** Si es true, el bot ofrece adjuntar un comprobante o una foto. */
    pideAdjunto?: boolean;
    /** Si es true, el bot deriva al equipo sin intentar resolverlo. */
    derivaDirecto?: boolean;
    /** Pide el código del envío para poder responder con datos concretos. */
    pideEnvio?: boolean;
}

/** Cada entrada del banco de respuestas que el bot puede dar por sí solo. */
export interface RespuestaConocida {
    /** Palabras que tienen que aparecer para considerar la coincidencia. */
    claves: readonly string[];
    respuesta: string;
    /** Cuánto pesa esta entrada al desempatar contra otra. */
    peso?: number;
}

export type ResultadoSoporte =
    | { tipo: 'resuelto'; respuesta: string }
    | { tipo: 'pide_dato'; respuesta: string }
    | { tipo: 'derivar'; respuesta: string };

export interface ContextoSoporte {
    categoria: CategoriaSoporte;
    /** Cuántas veces ya intentó el bot sin acertar. */
    intentosFallidos: number;
    /** Código de envío mencionado, si lo hay. */
    envioCodigo: string | null;
}
