export type NivelConfianza = 'alta' | 'media' | 'baja';
export type Severidad = 'info' | 'advertencia' | 'critica';
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

export interface Localidad {
    id: string;
    nombre: string;
    provincia: string;
    lat: number;
    lng: number;
    radioKm: number;
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
    textoOriginal: string;
    textoNormalizado: string;
    veredicto: VeredictoDireccion;
    puntaje: number;
    confianza: NivelConfianza;
    componentes: ComponentesDireccion;
    localidad: Localidad | null;
    localidadCorregida: boolean;
    problemas: ProblemaDeteccion[];
}

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
    indicadores: readonly string[];
    recargoPct: number;
    requisitos: readonly string[];
    capacidadRequerida: CapacidadVehiculo | null;
    perfilTipico: { pesoKg: readonly [number, number]; bultos: readonly [number, number] };
}

export interface PerfilCarga {
    descripcion: string;
    categoria: CategoriaCargaId;
    etiqueta: string;
    recargoPct: number;
    requisitos: string[];
    capacidadRequerida: CapacidadVehiculo | null;
    puntaje: number;
    confianza: NivelConfianza;
}

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
    valorDeclarado?: number;
    fecha?: Date;
}

export type TipoLineaDesglose = 'base' | 'variable' | 'recargo' | 'descuento';

export interface LineaDesglose {
    concepto: string;
    monto: number;
    tipo: TipoLineaDesglose;
}

export interface FactoresContexto {
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
          resultado: 'aceptado';
          valorNormalizado: string;
          reconocimiento: string;
      }
    | {
          resultado: 'confirmar';
          valorNormalizado: string;
          mensajeBot: string;
      }
    | {
          resultado: 'rechazado';
          mensajeBot: string;
      };

export type PrioridadViaje = 'alta' | 'media' | 'baja';

export interface RecomendacionBot {
    accion: 'aceptar' | 'evaluar';
    motivo: string;
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