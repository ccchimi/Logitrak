/**
 * Base de conocimiento del motor logístico.
 * Es la "memoria de largo plazo" del bot: geografía verificable, flota
 * disponible, taxonomía de cargas y parámetros tarifarios. La lógica que
 * razona sobre estos datos vive en los demás módulos.
 */

import { CategoriaCarga, Localidad, VehiculoFlota } from './types';

/* ------------------------------------------------------------------ */
/* Geografía verificable (coordenadas reales aproximadas)              */
/* ------------------------------------------------------------------ */

export const LOCALIDADES: readonly Localidad[] = [
    { id: 'caba', nombre: 'CABA', provincia: 'CABA', lat: -34.6037, lng: -58.3816, radioKm: 11, indiceDemanda: 1.1, alias: ['caba', 'capital federal', 'capital', 'ciudad autonoma de buenos aires', 'ciudad de buenos aires', 'baires', 'bs as', 'bsas', 'buenos aires'] },
    { id: 'la-plata', nombre: 'La Plata', provincia: 'Buenos Aires', lat: -34.9215, lng: -57.9545, radioKm: 8, indiceDemanda: 1.02, alias: ['la plata'] },
    { id: 'mar-del-plata', nombre: 'Mar del Plata', provincia: 'Buenos Aires', lat: -38.0055, lng: -57.5426, radioKm: 9, indiceDemanda: 1.04, alias: ['mar del plata', 'mardel', 'mdq'] },
    { id: 'bahia-blanca', nombre: 'Bahía Blanca', provincia: 'Buenos Aires', lat: -38.7183, lng: -62.2663, radioKm: 7, indiceDemanda: 1.0, alias: ['bahia blanca', 'bahia'] },
    { id: 'tandil', nombre: 'Tandil', provincia: 'Buenos Aires', lat: -37.3217, lng: -59.1332, radioKm: 5, indiceDemanda: 0.98, alias: ['tandil'] },
    { id: 'junin', nombre: 'Junín', provincia: 'Buenos Aires', lat: -34.5939, lng: -60.9466, radioKm: 5, indiceDemanda: 0.97, alias: ['junin'] },
    { id: 'pergamino', nombre: 'Pergamino', provincia: 'Buenos Aires', lat: -33.8896, lng: -60.5733, radioKm: 5, indiceDemanda: 0.97, alias: ['pergamino'] },
    { id: 'lujan', nombre: 'Luján', provincia: 'Buenos Aires', lat: -34.5703, lng: -59.105, radioKm: 5, indiceDemanda: 0.98, alias: ['lujan'] },
    { id: 'quilmes', nombre: 'Quilmes', provincia: 'Buenos Aires', lat: -34.7203, lng: -58.2546, radioKm: 6, indiceDemanda: 1.05, alias: ['quilmes'] },
    { id: 'avellaneda', nombre: 'Avellaneda', provincia: 'Buenos Aires', lat: -34.6627, lng: -58.3656, radioKm: 5, indiceDemanda: 1.06, alias: ['avellaneda'] },
    { id: 'lanus', nombre: 'Lanús', provincia: 'Buenos Aires', lat: -34.7033, lng: -58.3956, radioKm: 5, indiceDemanda: 1.05, alias: ['lanus'] },
    { id: 'lomas-de-zamora', nombre: 'Lomas de Zamora', provincia: 'Buenos Aires', lat: -34.76, lng: -58.4, radioKm: 5, indiceDemanda: 1.04, alias: ['lomas de zamora', 'lomas'] },
    { id: 'moron', nombre: 'Morón', provincia: 'Buenos Aires', lat: -34.6534, lng: -58.6198, radioKm: 5, indiceDemanda: 1.03, alias: ['moron'] },
    { id: 'san-isidro', nombre: 'San Isidro', provincia: 'Buenos Aires', lat: -34.4708, lng: -58.5128, radioKm: 5, indiceDemanda: 1.05, alias: ['san isidro'] },
    { id: 'vicente-lopez', nombre: 'Vicente López', provincia: 'Buenos Aires', lat: -34.5266, lng: -58.4796, radioKm: 4, indiceDemanda: 1.06, alias: ['vicente lopez', 'vte lopez'] },
    { id: 'tigre', nombre: 'Tigre', provincia: 'Buenos Aires', lat: -34.426, lng: -58.5797, radioKm: 6, indiceDemanda: 1.03, alias: ['tigre'] },
    { id: 'pilar', nombre: 'Pilar', provincia: 'Buenos Aires', lat: -34.4587, lng: -58.9142, radioKm: 7, indiceDemanda: 1.02, alias: ['pilar'] },
    { id: 'rosario', nombre: 'Rosario', provincia: 'Santa Fe', lat: -32.9468, lng: -60.6393, radioKm: 9, indiceDemanda: 1.06, alias: ['rosario'] },
    { id: 'santa-fe', nombre: 'Santa Fe', provincia: 'Santa Fe', lat: -31.6333, lng: -60.7, radioKm: 7, indiceDemanda: 1.0, alias: ['santa fe', 'santa fe capital'] },
    { id: 'cordoba', nombre: 'Córdoba', provincia: 'Córdoba', lat: -31.4201, lng: -64.1888, radioKm: 10, indiceDemanda: 1.06, alias: ['cordoba', 'cordoba capital'] },
    { id: 'rio-cuarto', nombre: 'Río Cuarto', provincia: 'Córdoba', lat: -33.1232, lng: -64.3493, radioKm: 5, indiceDemanda: 0.98, alias: ['rio cuarto'] },
    { id: 'villa-maria', nombre: 'Villa María', provincia: 'Córdoba', lat: -32.4075, lng: -63.2406, radioKm: 4, indiceDemanda: 0.97, alias: ['villa maria'] },
    { id: 'mendoza', nombre: 'Mendoza', provincia: 'Mendoza', lat: -32.8895, lng: -68.8458, radioKm: 8, indiceDemanda: 1.04, alias: ['mendoza', 'mendoza capital'] },
    { id: 'san-juan', nombre: 'San Juan', provincia: 'San Juan', lat: -31.5375, lng: -68.5364, radioKm: 6, indiceDemanda: 0.99, alias: ['san juan'] },
    { id: 'san-luis', nombre: 'San Luis', provincia: 'San Luis', lat: -33.3017, lng: -66.3378, radioKm: 5, indiceDemanda: 0.97, alias: ['san luis'] },
    { id: 'tucuman', nombre: 'San Miguel de Tucumán', provincia: 'Tucumán', lat: -26.8083, lng: -65.2176, radioKm: 7, indiceDemanda: 1.02, alias: ['tucuman', 'san miguel de tucuman'] },
    { id: 'salta', nombre: 'Salta', provincia: 'Salta', lat: -24.7821, lng: -65.4232, radioKm: 7, indiceDemanda: 1.0, alias: ['salta', 'salta capital'] },
    { id: 'jujuy', nombre: 'San Salvador de Jujuy', provincia: 'Jujuy', lat: -24.1858, lng: -65.2995, radioKm: 5, indiceDemanda: 0.98, alias: ['jujuy', 'san salvador de jujuy'] },
    { id: 'santiago', nombre: 'Santiago del Estero', provincia: 'Santiago del Estero', lat: -27.7834, lng: -64.2642, radioKm: 5, indiceDemanda: 0.96, alias: ['santiago del estero'] },
    { id: 'catamarca', nombre: 'San Fernando del Valle de Catamarca', provincia: 'Catamarca', lat: -28.4696, lng: -65.7852, radioKm: 4, indiceDemanda: 0.95, alias: ['catamarca'] },
    { id: 'la-rioja', nombre: 'La Rioja', provincia: 'La Rioja', lat: -29.4135, lng: -66.8565, radioKm: 4, indiceDemanda: 0.95, alias: ['la rioja'] },
    { id: 'parana', nombre: 'Paraná', provincia: 'Entre Ríos', lat: -31.7333, lng: -60.5333, radioKm: 5, indiceDemanda: 0.98, alias: ['parana'] },
    { id: 'corrientes', nombre: 'Corrientes', provincia: 'Corrientes', lat: -27.4692, lng: -58.8306, radioKm: 5, indiceDemanda: 0.97, alias: ['corrientes', 'corrientes capital'] },
    { id: 'resistencia', nombre: 'Resistencia', provincia: 'Chaco', lat: -27.4514, lng: -58.9867, radioKm: 5, indiceDemanda: 0.96, alias: ['resistencia'] },
    { id: 'posadas', nombre: 'Posadas', provincia: 'Misiones', lat: -27.3621, lng: -55.9007, radioKm: 5, indiceDemanda: 0.97, alias: ['posadas'] },
    { id: 'formosa', nombre: 'Formosa', provincia: 'Formosa', lat: -26.1849, lng: -58.1731, radioKm: 4, indiceDemanda: 0.95, alias: ['formosa'] },
    { id: 'neuquen', nombre: 'Neuquén', provincia: 'Neuquén', lat: -38.9516, lng: -68.0591, radioKm: 6, indiceDemanda: 1.05, alias: ['neuquen', 'neuquen capital'] },
    { id: 'bariloche', nombre: 'San Carlos de Bariloche', provincia: 'Río Negro', lat: -41.1335, lng: -71.3103, radioKm: 5, indiceDemanda: 1.08, alias: ['bariloche', 'san carlos de bariloche'] },
    { id: 'viedma', nombre: 'Viedma', provincia: 'Río Negro', lat: -40.8135, lng: -62.9967, radioKm: 4, indiceDemanda: 1.0, alias: ['viedma'] },
    { id: 'santa-rosa', nombre: 'Santa Rosa', provincia: 'La Pampa', lat: -36.6167, lng: -64.2833, radioKm: 4, indiceDemanda: 0.97, alias: ['santa rosa'] },
    { id: 'trelew', nombre: 'Trelew', provincia: 'Chubut', lat: -43.2531, lng: -65.309, radioKm: 4, indiceDemanda: 1.04, alias: ['trelew'] },
    { id: 'comodoro', nombre: 'Comodoro Rivadavia', provincia: 'Chubut', lat: -45.8641, lng: -67.4966, radioKm: 5, indiceDemanda: 1.08, alias: ['comodoro rivadavia', 'comodoro'] },
    { id: 'rio-gallegos', nombre: 'Río Gallegos', provincia: 'Santa Cruz', lat: -51.623, lng: -69.2168, radioKm: 4, indiceDemanda: 1.1, alias: ['rio gallegos'] },
    { id: 'ushuaia', nombre: 'Ushuaia', provincia: 'Tierra del Fuego', lat: -54.8019, lng: -68.303, radioKm: 4, indiceDemanda: 1.12, alias: ['ushuaia'] },
];

/** Tipos de vía reconocidos al parsear direcciones. */
export const TIPOS_VIA: readonly string[] = [
    'avenida', 'av', 'avda', 'calle', 'ruta', 'rn', 'rp', 'camino', 'pasaje',
    'pje', 'diagonal', 'diag', 'boulevard', 'bulevar', 'bv', 'autopista', 'au',
    'peatonal', 'costanera',
];

/** Banco de vías reales frecuentes, usado por el generador de viajes. */
export const BANCO_VIAS: Record<string, readonly { via: string; alturaMax: number }[]> = {
    caba: [
        { via: 'Av. Rivadavia', alturaMax: 11500 },
        { via: 'Av. Corrientes', alturaMax: 6800 },
        { via: 'Av. Santa Fe', alturaMax: 5200 },
        { via: 'Av. Cabildo', alturaMax: 4700 },
        { via: 'Av. Directorio', alturaMax: 3500 },
        { via: 'Av. Las Heras', alturaMax: 3900 },
        { via: 'Av. Juan B. Justo', alturaMax: 9500 },
        { via: 'Av. Triunvirato', alturaMax: 5500 },
        { via: 'Av. Córdoba', alturaMax: 6700 },
        { via: 'Av. Belgrano', alturaMax: 3900 },
        { via: 'Av. San Juan', alturaMax: 3700 },
        { via: 'Av. Scalabrini Ortiz', alturaMax: 3400 },
    ],
    generico: [
        { via: 'Av. San Martín', alturaMax: 4500 },
        { via: 'Calle Mitre', alturaMax: 2500 },
        { via: 'Av. Belgrano', alturaMax: 3000 },
        { via: 'Calle Sarmiento', alturaMax: 2200 },
        { via: 'Av. 9 de Julio', alturaMax: 3200 },
        { via: 'Calle Moreno', alturaMax: 1800 },
        { via: 'Av. Independencia', alturaMax: 3600 },
        { via: 'Calle España', alturaMax: 2000 },
    ],
};

/* ------------------------------------------------------------------ */
/* Taxonomía de cargas                                                 */
/* ------------------------------------------------------------------ */

export const CATEGORIAS_CARGA: readonly CategoriaCarga[] = [
    {
        id: 'documentos',
        etiqueta: 'Documentación',
        indicadores: ['documento', 'sobre', 'papeles', 'carpeta', 'contrato', 'escritura', 'expediente', 'titulo', 'factura', 'tramite'],
        recargoPct: 0,
        requisitos: ['Entrega bajo firma del receptor'],
        capacidadRequerida: null,
        perfilTipico: { pesoKg: [0.2, 2], bultos: [1, 2] },
    },
    {
        id: 'electronica',
        etiqueta: 'Electrónica',
        indicadores: ['tv', 'televisor', 'notebook', 'computadora', 'pc', 'monitor', 'consola', 'celular', 'tablet', 'impresora', 'repuesto electronico', 'electronica', 'parlante', 'camara'],
        recargoPct: 8,
        requisitos: ['Embalaje antiestático recomendado', 'Manipuleo vertical, sin apilar'],
        capacidadRequerida: null,
        perfilTipico: { pesoKg: [2, 25], bultos: [1, 3] },
    },
    {
        id: 'fragil',
        etiqueta: 'Carga frágil',
        indicadores: ['vidrio', 'cristal', 'porcelana', 'espejo', 'cuadro', 'ceramica', 'botella', 'vajilla', 'fragil', 'copas', 'jarron'],
        recargoPct: 12,
        requisitos: ['Embalaje reforzado obligatorio', 'Traslado con sujeción independiente'],
        capacidadRequerida: null,
        perfilTipico: { pesoKg: [3, 30], bultos: [1, 4] },
    },
    {
        id: 'refrigerado',
        etiqueta: 'Cadena de frío',
        indicadores: ['refrigerado', 'congelado', 'frio', 'perecedero', 'lacteo', 'carne', 'pescado', 'helado', 'fresco'],
        recargoPct: 18,
        requisitos: ['Cadena de frío activa de punta a punta', 'Registro de temperatura al retirar y entregar'],
        capacidadRequerida: 'cadena_frio',
        perfilTipico: { pesoKg: [5, 60], bultos: [1, 6] },
    },
    {
        id: 'medicinal',
        etiqueta: 'Insumos médicos',
        indicadores: ['medicamento', 'medicinal', 'insumo medico', 'insumos medicos', 'farmacia', 'vacuna', 'ortopedia', 'quirurgico', 'laboratorio'],
        recargoPct: 15,
        requisitos: ['Prioridad de entrega sanitaria', 'Cadena de custodia documentada'],
        capacidadRequerida: 'cadena_frio',
        perfilTipico: { pesoKg: [1, 15], bultos: [1, 3] },
    },
    {
        id: 'alimentos',
        etiqueta: 'Alimentos',
        indicadores: ['comida', 'gastronomico', 'pizza', 'vianda', 'catering', 'panaderia', 'almacen', 'bebida', 'alimento', 'verdura', 'fruta'],
        recargoPct: 5,
        requisitos: ['Transporte separado de productos no alimenticios'],
        capacidadRequerida: null,
        perfilTipico: { pesoKg: [2, 25], bultos: [1, 5] },
    },
    {
        id: 'peligroso',
        etiqueta: 'Mercancía regulada',
        indicadores: ['pintura', 'solvente', 'quimico', 'bateria', 'combustible', 'gas', 'aerosol', 'inflamable', 'corrosivo', 'garrafa'],
        recargoPct: 30,
        requisitos: ['Documentación de mercancía peligrosa', 'Vehículo habilitado y ventilado', 'Prohibido consolidar con otras cargas'],
        capacidadRequerida: 'mercancia_peligrosa',
        perfilTipico: { pesoKg: [5, 80], bultos: [1, 6] },
    },
    {
        id: 'voluminoso',
        etiqueta: 'Carga voluminosa',
        indicadores: ['mueble', 'sillon', 'sofa', 'colchon', 'ropero', 'placard', 'mudanza', 'escritorio', 'mesa', 'heladera', 'lavarropas', 'cocina', 'freezer', 'aire acondicionado', 'bicicleta'],
        recargoPct: 10,
        requisitos: ['Se requiere ayudante de carga y descarga', 'Verificar accesos y ascensor en destino'],
        capacidadRequerida: 'carga_voluminosa',
        perfilTipico: { pesoKg: [25, 220], bultos: [1, 8] },
    },
    {
        id: 'indumentaria',
        etiqueta: 'Indumentaria y textil',
        indicadores: ['ropa', 'indumentaria', 'calzado', 'zapatillas', 'textil', 'tela', 'prendas', 'lote mayorista'],
        recargoPct: 0,
        requisitos: ['Proteger de humedad'],
        capacidadRequerida: null,
        perfilTipico: { pesoKg: [5, 60], bultos: [2, 12] },
    },
    {
        id: 'general',
        etiqueta: 'Carga general',
        indicadores: [],
        recargoPct: 0,
        requisitos: [],
        capacidadRequerida: null,
        perfilTipico: { pesoKg: [2, 40], bultos: [1, 5] },
    },
];

/* ------------------------------------------------------------------ */
/* Flota                                                               */
/* ------------------------------------------------------------------ */

export const FLOTA: readonly VehiculoFlota[] = [
    {
        id: 'moto',
        nombre: 'Motomensajería',
        maxKg: 6,
        maxBultos: 2,
        maxVolumenDm3: 45,
        tarifaBase: 1900,
        porKg: 130,
        porBulto: 160,
        porKm: 95,
        velocidadMediaKmH: 32,
        capacidades: [],
    },
    {
        id: 'utilitario',
        nombre: 'Utilitario liviano',
        maxKg: 350,
        maxBultos: 15,
        maxVolumenDm3: 2500,
        tarifaBase: 4300,
        porKg: 85,
        porBulto: 120,
        porKm: 140,
        velocidadMediaKmH: 38,
        capacidades: ['cadena_frio'],
    },
    {
        id: 'furgon',
        nombre: 'Furgón mediano',
        maxKg: 1500,
        maxBultos: 40,
        maxVolumenDm3: 9000,
        tarifaBase: 7800,
        porKg: 70,
        porBulto: 100,
        porKm: 185,
        velocidadMediaKmH: 42,
        capacidades: ['cadena_frio', 'carga_voluminosa'],
    },
    {
        id: 'camion',
        nombre: 'Camión de carga pesada',
        maxKg: 12000,
        maxBultos: 200,
        maxVolumenDm3: 45000,
        tarifaBase: 14500,
        porKg: 55,
        porBulto: 85,
        porKm: 260,
        velocidadMediaKmH: 58,
        capacidades: ['cadena_frio', 'carga_voluminosa', 'mercancia_peligrosa'],
    },
];

/* ------------------------------------------------------------------ */
/* Parámetros tarifarios y operativos                                  */
/* ------------------------------------------------------------------ */

export const CONFIG_OPERATIVA = {
    /** Divisor estándar IATA-like para peso volumétrico (cm³/kg). */
    divisorVolumetrico: 5000,
    /** El precio final se redondea a múltiplos de este valor. */
    redondeoARS: 50,
    /** Factor ruta: la distancia real vial supera a la geodésica. */
    factorRuta: 1.25,
    /** Distancia asumida cuando no se puede resolver ninguna localidad. */
    distanciaUrbanaPorDefectoKm: 8,
    /** Peajes estimados por cada 50 km de tramo interurbano. */
    peajeCada50KmARS: 950,
    /** Umbral a partir del cual un viaje se considera interurbano. */
    umbralInterurbanoKm: 50,
    /** Porcentaje del seguro sobre el valor declarado. */
    seguroPctValorDeclarado: 0.012,
    /** Porción de la tarifa que cobra el transportista. */
    comisionChofer: 0.78,
    /** Minutos de validez de una cotización emitida. */
    validezCotizacionMin: 15,
    /** Límites duros de la operación. */
    limites: {
        pesoMinKg: 0.05,
        pesoMaxKg: 12000,
        bultosMax: 200,
        dimensionMaxCm: 600,
        alturaCalleMax: 30000,
    },
    /** Recargos por franja horaria (se evalúan con la hora local del dispositivo). */
    franjasHorarias: [
        { desde: 7, hasta: 10, nombre: 'pico matutino', multiplicador: 1.12 },
        { desde: 17, hasta: 20, nombre: 'pico vespertino', multiplicador: 1.15 },
        { desde: 22, hasta: 24, nombre: 'nocturno', multiplicador: 1.25 },
        { desde: 0, hasta: 6, nombre: 'nocturno', multiplicador: 1.25 },
    ],
    /** Multiplicadores por día de la semana (0 = domingo). */
    multiplicadorPorDia: [1.18, 1, 1, 1, 1, 1.05, 1.08] as readonly number[],
} as const;
