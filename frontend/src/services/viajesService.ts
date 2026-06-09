export interface Viaje {
    id: string;
    codigo: string;
    destino: string;
    estado: 'En Viaje' | 'Entregado' | 'Pendiente';
    chofer: string;
    fecha: string;
}

export const obtenerViajesActivos = async (): Promise<Viaje[]> => {
    return [
        { id: '1', codigo: 'TRK-2026-001', destino: 'Buenos Aires -> Rosario', estado: 'En Viaje', chofer: 'Carlos Pérez', fecha: '08/06/2026' },
        { id: '2', codigo: 'TRK-2026-002', destino: 'Córdoba -> Mendoza', estado: 'Pendiente', chofer: 'Mariano Gómez', fecha: '09/06/2026' },
        { id: '3', codigo: 'TRK-2026-003', destino: 'Mar del Plata -> CABA', estado: 'Entregado', chofer: 'Juan Rodriguez', fecha: '07/06/2026' },
    ];
};