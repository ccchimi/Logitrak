export const up = (pgm) => {
    pgm.addColumn('envios', { pago_vence_en: { type: 'timestamptz' } }, { ifNotExists: true });
    pgm.sql(`
        UPDATE envios
        SET pago_vence_en = creado_en + interval '5 minutes'
        WHERE pago_vence_en IS NULL
          AND estado = 'pendiente'
          AND estado_pago IN ('pendiente', 'rechazado')
    `);
    pgm.createIndex('envios', 'pago_vence_en', {
        name: 'idx_envios_impagos',
        where: "estado = 'pendiente' AND estado_pago IN ('pendiente', 'rechazado')",
        ifNotExists: true,
    });
};

export const down = (pgm) => {
    pgm.dropIndex('envios', 'pago_vence_en', { name: 'idx_envios_impagos', ifExists: true });
    pgm.dropColumn('envios', 'pago_vence_en', { ifExists: true });
};
