export const up = (pgm) => {
    pgm.addColumn('envios', { retirado_en: { type: 'timestamptz' } }, { ifNotExists: true });
    pgm.sql(`
        UPDATE envios e
        SET retirado_en = COALESCE(
            (SELECT min(ev.creado_en) FROM envio_eventos ev
             WHERE ev.envio_id = e.id AND ev.tipo IN ('retirado', 'en_viaje')),
            e.actualizado_en)
        WHERE e.estado = 'en_viaje' AND e.retirado_en IS NULL`);
};

export const down = (pgm) => {
    pgm.dropColumn('envios', 'retirado_en', { ifExists: true });
};
