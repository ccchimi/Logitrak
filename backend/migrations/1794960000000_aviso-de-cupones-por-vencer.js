export const up = (pgm) => {
    pgm.addColumns('cupones', { aviso_vencimiento_en: { type: 'timestamptz' } }, { ifNotExists: true });
};

export const down = (pgm) => {
    pgm.dropColumns('cupones', ['aviso_vencimiento_en'], { ifExists: true });
};
