import { Envio, EstadoEnvio, listarEnvios } from './enviosService';

export interface Viaje {
    id: string;
    codigo: string;
    destino: string;
    estado: 'En Viaje' | 'Entregado' | 'Pendiente';
    chofer: string;
    choferCodigo: string | null;
    vehiculo: string | null;
    fecha: string;
}

function estadoVisible(estado: EstadoEnvio): Viaje['estado'] {
    if (estado === 'en_viaje') return 'En Viaje';
    if (estado === 'entregado') return 'Entregado';
    return 'Pendiente';
}

function formatearFecha(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}/${d.getFullYear()}`;
}

function mapearEnvio(e: Envio): Viaje {
    return {
        id: String(e.id),
        codigo: e.codigo,
        destino: `${e.origen} → ${e.destino}`,
        estado: estadoVisible(e.estado),
        chofer: e.choferNombre ?? 'Sin asignar',
        choferCodigo: e.choferCodigo,
        vehiculo: e.choferVehiculo ?? e.vehiculoNombre,
        fecha: formatearFecha(e.creadoEn),
    };
}

export interface PanelEnvios {
    viajes: Viaje[];
    // Envíos pagos que todavía ningún chofer tomó. No se listan como viajes
    // porque hasta que alguien los tome pueden cancelarse y reembolsarse.
    buscandoChofer: number;
    // Vencimiento más próximo de esos envíos, para el contador del panel.
    proximoVencimiento: string | null;
}

export const obtenerPanelEnvios = async (): Promise<PanelEnvios> => {
    const envios = await listarEnvios();
    const pagos = envios.filter((e) => e.estadoPago === 'pagado');

    const enEspera = pagos.filter((e) => e.estado === 'pendiente');
    const vencimientos = enEspera
        .map((e) => e.ofertaVenceEn)
        .filter((v): v is string => Boolean(v))
        .sort();

    return {
        viajes: pagos.filter((e) => e.estado !== 'pendiente').map(mapearEnvio),
        buscandoChofer: enEspera.length,
        proximoVencimiento: vencimientos[0] ?? null,
    };
};