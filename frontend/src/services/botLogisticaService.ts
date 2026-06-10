export interface ResultadoCotizacion {
    vehiculo: string;
    precio: number;
    explicacion: string;
}

export interface AsignacionViaje {
    origen: string;
    destino: string;
    carga: string;
    tarifa: number;
}

export interface DimensionesCm {
    largo?: number;
    ancho?: number;
    alto?: number;
}

const DIVISOR_VOLUMETRICO = 5000;

const FLOTA = [
    { nombre: 'Motomensajería', maxKg: 5, maxBultos: 2, base: 1800, porKg: 120, porBulto: 150 },
    { nombre: 'Auto/Camioneta', maxKg: 30, maxBultos: 8, base: 4200, porKg: 90, porBulto: 120 },
    { nombre: 'Camión de Carga Pesada', maxKg: Infinity, maxBultos: Infinity, base: 12000, porKg: 60, porBulto: 90 },
];

const LOCALIDADES = [
    'caba', 'capital', 'buenos aires', 'rosario', 'cordoba', 'córdoba', 'mendoza',
    'la plata', 'mar del plata', 'santa fe', 'tucuman', 'tucumán', 'salta',
    'neuquen', 'neuquén', 'bahia blanca', 'bahía blanca', 'san juan',
];

function detectarLocalidad(texto: string): string | null {
    const t = texto.toLowerCase();
    return LOCALIDADES.find((loc) => t.includes(loc)) ?? null;
}

function esInterurbano(origen: string, destino: string): boolean {
    const a = detectarLocalidad(origen);
    const b = detectarLocalidad(destino);
    return !!a && !!b && a !== b;
}

function calcular(
    pesoKg: number,
    bultos: number,
    origen: string,
    destino: string,
    dim?: DimensionesCm
): ResultadoCotizacion {
    const pesoReal = Math.max(0, pesoKg) || 0;
    const cantBultos = Math.max(1, Math.floor(bultos) || 1);

    const volumen =
        dim?.largo && dim?.ancho && dim?.alto ? dim.largo * dim.ancho * dim.alto : 0; // cm³
    const pesoVolumetrico = volumen > 0 ? volumen / DIVISOR_VOLUMETRICO : 0;
    const pesoFacturable = Math.max(pesoReal, pesoVolumetrico);

    const unidad =
        FLOTA.find((v) => pesoFacturable <= v.maxKg && cantBultos <= v.maxBultos) ??
        FLOTA[FLOTA.length - 1];

    const interurbano = esInterurbano(origen, destino);
    let precio =
        unidad.base + Math.ceil(pesoFacturable) * unidad.porKg + cantBultos * unidad.porBulto;
    if (interurbano) precio = precio * 1.4;
    precio = Math.round(precio / 50) * 50; // redondeo a $50

    const usoVolumetrico = pesoVolumetrico > pesoReal && pesoVolumetrico > 0;
    const factor = usoVolumetrico
        ? `peso volumétrico de ${pesoVolumetrico.toFixed(1)} kg (volumen ${(volumen / 1000).toFixed(1)} dm³)`
        : `peso de ${pesoReal} kg`;
    const explicacion =
        `Se asignó ${unidad.nombre} por ${factor} y ${cantBultos} bulto(s)` +
        `${interurbano ? ', con recargo interurbano del 40%' : ''}.`;

    return { vehiculo: unidad.nombre, precio, explicacion };
}

export function cotizarEnvio(
    peso: string,
    bultos: string,
    origen: string,
    destino: string,
    dim?: DimensionesCm
): Promise<ResultadoCotizacion> {
    const resultado = calcular(parseFloat(peso), parseInt(bultos, 10), origen, destino, dim);
    return new Promise((res) => setTimeout(() => res(resultado), 600));
}

const DIRECCIONES_CABA = [
    'Av. Rivadavia 4900, Caballito, CABA',
    'Av. Corrientes 1300, San Nicolás, CABA',
    'Av. Santa Fe 3200, Palermo, CABA',
    'Av. Cabildo 2000, Belgrano, CABA',
    'Av. Directorio 1500, Flores, CABA',
    'Av. Las Heras 2100, Recoleta, CABA',
    'Av. Juan B. Justo 5200, Villa Crespo, CABA',
    'Av. Triunvirato 4300, Villa Urquiza, CABA',
];

const CARGAS = [
    { desc: 'Caja con repuestos electrónicos', peso: 6, bultos: 1 },
    { desc: 'Smart TV 55 pulgadas', peso: 18, bultos: 1 },
    { desc: 'Documentación y sobres', peso: 1, bultos: 1 },
    { desc: 'Pedido gastronómico (3 cajas)', peso: 4, bultos: 3 },
    { desc: 'Electrodoméstico (heladera)', peso: 55, bultos: 1 },
    { desc: 'Indumentaria (lote mayorista)', peso: 22, bultos: 6 },
    { desc: 'Insumos médicos refrigerados', peso: 9, bultos: 2 },
];

function elegir<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generarAsignacionViaje(): Promise<AsignacionViaje> {
    const origen = elegir(DIRECCIONES_CABA);
    let destino = elegir(DIRECCIONES_CABA);
    while (destino === origen) destino = elegir(DIRECCIONES_CABA);

    const carga = elegir(CARGAS);
    const { precio } = calcular(carga.peso, carga.bultos, origen, destino);

    const asignacion: AsignacionViaje = {
        origen,
        destino,
        carga: carga.desc,
        tarifa: precio,
    };
    return new Promise((res) => setTimeout(() => res(asignacion), 700));
}