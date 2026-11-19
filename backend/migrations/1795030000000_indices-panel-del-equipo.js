// Índices para el panel y la consulta de pedidos del equipo, que recorren todos
// los envíos (no los de un cliente): la serie por día filtra por rango de fechas
// de creación y de entrega, y la consulta ordena por los más recientes. Sin estos
// índices PostgreSQL leía la tabla completa (TP4 de Calidad de Software, E-1 y E-2).
export const up = (pgm) => {
    pgm.sql(`
        CREATE INDEX IF NOT EXISTS idx_envios_recientes ON envios (creado_en DESC, id DESC) WHERE archivado_en IS NULL;
        CREATE INDEX IF NOT EXISTS idx_envios_entregados ON envios (entregado_en) WHERE estado = 'entregado' AND archivado_en IS NULL;
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        DROP INDEX IF EXISTS idx_envios_entregados;
        DROP INDEX IF EXISTS idx_envios_recientes;
    `);
};
