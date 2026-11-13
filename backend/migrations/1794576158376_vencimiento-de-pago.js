// Un pedido que no se paga no puede quedar pendiente para siempre.
//
// pago_vence_en es el límite para pagar (5 minutos desde que se crea, por
// defecto). Pasado ese límite el pedido ya no acepta pagos y un trabajo lo borra
// de la base. Los pedidos impagos que ya existían reciben el mismo plazo contado
// desde su creación: casi todos ya vencieron, así que el primer barrido los
// limpia (verificando antes con la pasarela que no tengan un pago en curso).

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
