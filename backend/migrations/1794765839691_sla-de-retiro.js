// SLA de retiro: la regla que promete la cotización ("chofer en el punto de
// retiro en menos de N min o bonificamos el 10 %"). retirado_en marca cuándo el
// chofer registró el retiro (el envío pasó a en_viaje); el trabajo de SLA lo
// compara con sla_vence_en.
//
// Los envíos que ya estaban en viaje toman la fecha de su primer evento de
// retiro (o, si no lo tienen, la de su última actualización).

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
