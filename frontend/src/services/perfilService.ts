import { llamarApi } from './api';

export interface ResumenPerfil {
    usuario: string;
    nombreCompleto: string;
    rol: 'admin' | 'cliente' | 'chofer';
    enviosTotales: number;
    enviosEntregados: number;
    cuponesActivos: number;
    clienteDesde: number;
}

export async function obtenerResumenPerfil(): Promise<ResumenPerfil | null> {
    const r = await llamarApi<{ exito: true; resumen: ResumenPerfil }>('/api/perfil/resumen', {
        conAuth: true,
    });
    return r.exito ? r.resumen : null;
}
