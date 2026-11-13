// Hito 2.1: la compensación por SLA pasa de la app al servidor.
//
// sla_revisado_en marca que el job ya evaluó el SLA del envío (haya emitido
// cupón o no), para no evaluarlo dos veces. Los envíos que ya existían quedan
// marcados como revisados: con la regla anterior el cupón lo pedía la app, y no
// corresponde compensar ahora, de golpe, todo el historial.

export const up = (pgm) => {
    pgm.addColumn('envios', { sla_revisado_en: { type: 'timestamptz' } }, { ifNotExists: true });
    pgm.sql(`UPDATE envios SET sla_revisado_en = now() WHERE sla_revisado_en IS NULL`);
    pgm.createIndex('envios', 'sla_vence_en', {
        name: 'idx_envios_sla_sin_revisar',
        where: "sla_revisado_en IS NULL AND sla_vence_en IS NOT NULL AND estado_pago = 'pagado'",
        ifNotExists: true,
    });
};

export const down = (pgm) => {
    pgm.dropIndex('envios', 'sla_vence_en', { name: 'idx_envios_sla_sin_revisar', ifExists: true });
    pgm.dropColumn('envios', 'sla_revisado_en', { ifExists: true });
};
