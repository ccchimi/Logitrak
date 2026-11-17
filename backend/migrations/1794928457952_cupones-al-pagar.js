export const up = (pgm) => {
    pgm.addColumns('pagos', {
        cupon_id: { type: 'integer', references: 'cupones', onDelete: 'SET NULL' },
        descuento: { type: 'numeric(14,2)' },
    }, { ifNotExists: true });
    pgm.addColumns('cupones', {
        usado_envio_id: { type: 'integer', references: 'envios', onDelete: 'SET NULL' },
    }, { ifNotExists: true });
    pgm.createIndex('pagos', 'cupon_id', { name: 'idx_pagos_cupon', where: 'cupon_id IS NOT NULL', ifNotExists: true });
};

export const down = (pgm) => {
    pgm.dropIndex('pagos', 'cupon_id', { name: 'idx_pagos_cupon', ifExists: true });
    pgm.dropColumns('cupones', ['usado_envio_id'], { ifExists: true });
    pgm.dropColumns('pagos', ['cupon_id', 'descuento'], { ifExists: true });
};
