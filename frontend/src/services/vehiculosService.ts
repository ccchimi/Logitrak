import { llamarApi } from './api';

export interface VehiculoFlota {
    id: string;
    nombre: string;
    maxKg: number;
    maxBultos: number;
    maxVolumenDm3: number;
    capacidades: string[];
}

export async function listarVehiculos(): Promise<VehiculoFlota[]> {
    const r = await llamarApi<{ exito: true; vehiculos: VehiculoFlota[] }>('/api/vehiculos', {
        metodo: 'GET',
        conAuth: true,
    });
    return r.exito ? r.vehiculos ?? [] : [];
}
