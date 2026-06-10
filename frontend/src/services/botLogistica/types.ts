/**
 * Tipado central del motor de inteligencia logística "Boxy".
 * Todas las respuestas del bot usan uniones discriminadas para que el
 * consumidor esté obligado a manejar éxito y falla de forma explícita.
 */

export type NivelConfianza = 'alta' | 'media' | 'baja';

export type Severidad = 'info' | 'advertencia' | 'critica';

/** Códigos de problemas detectables sobre una dirección o un dato de envío. */
export type CodigoProblema =
    | 'direccion_vacia'
    | 'direccion_corta'
    | 'texto_ilegible'
    | 'texto_de_prueba'
    | 'sin_altura'
    | 'altura_implausible'
    | 'sin_nombre_de_via'
    | 'localidad_desconocida'
    | 'localidad_corregida'
    | 'origen_igual_destino'
    | 'peso_invalido'
    | 'peso_fuera_de_rango'
    | 'bultos_invalido'
    | 'bultos_fuera_de_rango'
    | 'dimension_invalida'
    | 'dimension_fuera_de_rango'
    | 'relacion_peso_bultos_atipica'
    | 'descripcion_insuficiente';

export interface ProblemaDeteccion {
    codigo: CodigoProblema;
    severidad: Severidad;
    mensaje: string;
    sugerencia?: string;
}

/* ------------------------------------------------------------------ */
/* Geografía y direcciones                                             */
/* ------------------------------------------------------------------ */

export interface Localidad {
    id: string;
    nombre: string;
    provincia: string;
    lat: number;
    lng: number;
    /** Radio urbano aproximado, usado para estimar tramos intraurbanos. */
    radioKm: number;
    /** Multiplicador de demanda logística de la plaza (1 = neutro). */
    indiceDemanda: number;
    alias: readonly string[];
}

export type VeredictoDireccion = 'verificada' | 'plausible' | 'dudosa' | 'invalida';

export interface ComponentesDireccion {
    tipoVia: string | null;
    nombreVia: string | null;
    altura: number | null;
    pisoDepto: string | null;
    codigoPostal: string | null;
}

export interface AnalisisDireccion {
    /** Texto tal cual lo ingresó el usuario. */
    textoOriginal: string;
    /** Versión normalizada y reconstruida por el bot. */
    textoNormalizado: string;
    veredicto: VeredictoDireccion;
    /** Puntaje 0–100 de veracidad estimada. */
    puntaje: number;
    confianza: NivelConfianza;
    componentes: ComponentesDireccion;
    /** Localidad resuelta contra la base de conocimiento (con tolerancia a errores de tipeo). */
    localidad: Localidad | null;
    /** true si la localidad se resolvió por similitud y no por coincidencia exacta. */
    localidadCorregida: boolean;
    problemas: ProblemaDeteccion[];
}

/* ------------------------------------------------------------------ */
/* Cargas                                                              */
/* ------------------------------------------------------------------ */

export type CategoriaCargaId =
    | 'documentos'
    | 'electronica'
    | 'fragil'
    | 'refrigerado'
    | 'medicinal'
    | 'alimentos'
    | 'peligroso'
    | 'voluminoso'
    | 'indumentaria'
    | 'general';

export interface CategoriaCarga {
    id: CategoriaCargaId;
    etiqueta: string;
    /** Palabras y raíces que activan la categoría. */
    indicadores: readonly string[];
    /** Recargo porcentual sobre el flete por manipuleo especial. */
    recargoPct: number;
    /** Protocolos operativos que el chofer debe cumplir. */
    requisitos: readonly string[];
    /** Capacidad especial que debe tener el vehículo (si aplica). */
    capacidadRequerida: CapacidadVehiculo | null;
    /** Rangos típicos usados por el generador de viajes. */
    perfilTipico: { pesoKg: readonly [number, number]; bultos: readonly [number, number] };
}

export interface PerfilCarga {
    descripcion: string;
    categoria: CategoriaCargaId;
    etiqueta: string;
    recargoPct: number;
    requisitos: string[];
    capacidadRequerida: CapacidadVehiculo | null;
    /** Confianza de la clasificación (0–100). */
    puntaje: number;
    confianza: NivelConfianza;
}

/* ------------------------------------------------------------------ */
/* Flota                                                               */
/* ------------------------------------------------------------------ */

export type CapacidadVehiculo = 'cadena_frio' | 'carga_voluminosa' | 'mercancia_peligrosa';

export interface VehiculoFlota {
    id: 'moto' | 'utilitario' | 'furgon' | 'camion';
    nombre: string;
    maxKg: number;
    maxBultos: number;
    maxVolumenDm3: number;
    tarifaBase: number;
    porKg: number;
    porBulto: number;
    porKm: number;
    velocidadMediaKmH: number;
    capacidades: readonly CapacidadVehiculo[];
}

/* ------------------------------------------------------------------ */
/* Cotización                                                          */
/* ------------------------------------------------------------------ */

export interface DimensionesCm {
    largo?: number;
    ancho?: number;
    alto?: number;
}

export interface SolicitudCotizacion {
    origen: string;
    destino: string;
    pesoKg: number;
    bultos: number;
    descripcionCarga?: string;
    dimensiones?: DimensionesCm;
    /** Valor declarado en ARS para calcular el seguro de mercadería. */
    valorDeclarado?: number;
    /** Momento de la cotización; por defecto, ahora. Permite testear factores horarios. */
    fecha?: Date;
}

export type TipoLineaDesglose = 'base' | 'variable' | 'recargo' | 'descuento';

export interface LineaDesglose {
    concepto: string;
    monto: number;
    tipo: TipoLineaDesglose;
}

export interface FactoresContexto {
    /** Etiquetas de los factores dinámicos aplicados (franja horaria, día, demanda de plaza). */
    descripcionFranja: string;
    multiplicadorHorario: number;
    multiplicadorDia: number;
    multiplicadorDemanda: number;
}

export interface EstimacionTiempos {
    etaRetiroMin: number;
    tiempoViajeMin: number;
    ventanaEntrega: string;
}

export interface Cotizacion {
    id: string;
    emitidaEn: string;
    validezMin: number;
    moneda: 'ARS';
    precio: number;
    desglose: LineaDesglose[];
    vehiculo: { id: VehiculoFlota['id']; nombre: string; motivo: string };
    distanciaKm: number;
    distanciaEstimada: boolean;
    pesoRealKg: number;
    pesoVolumetricoKg: number;
    pesoFacturableKg: number;
    carga: PerfilCarga;
    origen: AnalisisDireccion;
    destino: AnalisisDireccion;
    factores: FactoresContexto;
    tiempos: EstimacionTiempos;
    confianza: NivelConfianza;
    puntajeConfianza: number;
    advertencias: string[];
    explicacion: string;
    sla: string;
}

export type RespuestaCotizacion =
    | { exito: true; cotizacion: Cotizacion }
    | { exito: false; motivo: string; problemas: ProblemaDeteccion[] };

/* ------------------------------------------------------------------ */
/* Conversación (NLU del chat)                                         */
/* ------------------------------------------------------------------ */

export type CampoConversacion =
    | 'origen'
    | 'destino'
    | 'descripcion'
    | 'peso'
    | 'bultos'
    | 'largo'
    | 'ancho'
    | 'alto';

export interface ContextoConversacion {
    origen?: AnalisisDireccion | null;
    destino?: AnalisisDireccion | null;
    pesoKg?: number | null;
    bultos?: number | null;
}

export type InterpretacionRespuesta =
    | {
          /** El dato es válido: se guarda el valor normalizado y se avanza. */
          resultado: 'aceptado';
          valorNormalizado: string;
          reconocimiento: string;
      }
    | {
          /** El dato es dudoso: el bot pide confirmación antes de aceptarlo. */
          resultado: 'confirmar';
          valorNormalizado: string;
          mensajeBot: string;
      }
    | {
          /** El dato es inválido: el bot explica el problema y vuelve a preguntar. */
          resultado: 'rechazado';
          mensajeBot: string;
      };

/* ------------------------------------------------------------------ */
/* Asignación de viajes (consola del chofer)                           */
/* ------------------------------------------------------------------ */

export type PrioridadViaje = 'alta' | 'media' | 'baja';

export interface RecomendacionBot {
    accion: 'aceptar' | 'evaluar';
    motivo: string;
    /** Rentabilidad relativa del viaje vs. el promedio del corredor (1 = promedio). */
    indiceRentabilidad: number;
}

export interface AsignacionViaje {
    id: string;
    generadaEn: string;
    expiraEnSeg: number;
    origen: string;
    destino: string;
    distanciaKm: number;
    carga: {
        descripcion: string;
        categoriaEtiqueta: string;
        pesoKg: number;
        bultos: number;
    };
    requisitos: string[];
    vehiculoRequerido: string;
    tarifa: number;
    pagoChofer: number;
    prioridad: PrioridadViaje;
    etaRetiroMin: number;
    tiempoViajeMin: number;
    recomendacion: RecomendacionBot;
}
