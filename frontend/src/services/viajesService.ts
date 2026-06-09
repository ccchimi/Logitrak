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
        { id: '4', codigo: 'TRK-2026-004', destino: 'Rosario -> Santa Fe', estado: 'En Viaje', chofer: 'Lucía Fernández', fecha: '09/06/2026' },
        { id: '5', codigo: 'TRK-2026-005', destino: 'Salta -> Tucumán', estado: 'Pendiente', chofer: 'Diego Martínez', fecha: '10/06/2026' },
        { id: '6', codigo: 'TRK-2026-006', destino: 'CABA -> La Plata', estado: 'Entregado', chofer: 'Sofía Romero', fecha: '06/06/2026' },
        { id: '7', codigo: 'TRK-2026-007', destino: 'Neuquén -> Bahía Blanca', estado: 'En Viaje', chofer: 'Martín Suárez', fecha: '09/06/2026' },
        { id: '8', codigo: 'TRK-2026-008', destino: 'Mendoza -> San Juan', estado: 'Pendiente', chofer: 'Carolina Ríos', fecha: '11/06/2026' },
        { id: '9', codigo: 'TRK-2026-009', destino: 'Córdoba -> CABA', estado: 'Entregado', chofer: 'Andrés López', fecha: '05/06/2026' },
        { id: '10', codigo: 'TRK-2026-010', destino: 'La Plata -> Mar del Plata', estado: 'En Viaje', chofer: 'Valentina Díaz', fecha: '10/06/2026' },
    ];
};