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
    etiqueta: string;
    asunto: string;
    respuesta: string;
    pideAdjunto?: boolean;
    derivaDirecto?: boolean;
    pideEnvio?: boolean;
}

export interface RespuestaConocida {
    claves: readonly string[];
    respuesta: string;
    peso?: number;
}

export type ResultadoSoporte =
    | { tipo: 'resuelto'; respuesta: string }
    | { tipo: 'pide_dato'; respuesta: string }
    | { tipo: 'derivar'; respuesta: string };

export interface ContextoSoporte {
    categoria: CategoriaSoporte;
    intentosFallidos: number;
    envioCodigo: string | null;
}
