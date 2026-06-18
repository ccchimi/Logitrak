import { Envio, EstadoEnvio, listarEnvios } from './enviosService';

export interface Viaje {
    id: string;
    codigo: string;
    destino: string;
    estado: 'En Viaje' | 'Entregado' | 'Pendiente';
    chofer: string;
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
        fecha: formatearFecha(e.creadoEn),
    };
}

export const obtenerViajesActivos = async (): Promise<Viaje[]> => {
    const envios = await listarEnvios();
    return envios.map(mapearEnvio);
};
