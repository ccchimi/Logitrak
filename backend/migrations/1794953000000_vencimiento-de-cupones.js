export const up = (pgm) => {
    pgm.addColumns('cupones', { vence_en: { type: 'timestamptz' } }, { ifNotExists: true });
    pgm.sql(`UPDATE cupones SET vence_en = creado_en + interval '90 days' WHERE vence_en IS NULL`);
    pgm.alterColumn('cupones', 'vence_en', { notNull: true, default: pgm.func(`now() + interval '90 days'`) });
    pgm.createIndex('cupones', 'vence_en', { name: 'idx_cupones_activos_vence', where: `estado = 'activo'`, ifNotExists: true });
};

export const down = (pgm) => {
    pgm.dropIndex('cupones', 'vence_en', { name: 'idx_cupones_activos_vence', ifExists: true });
    pgm.dropColumns('cupones', ['vence_en'], { ifExists: true });
};
