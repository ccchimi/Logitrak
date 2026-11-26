// Recuperación de contraseña a cargo de soporte: el equipo genera una
// contraseña temporal que vence y que hay que cambiar al primer ingreso.
export const up = (pgm) => {
    pgm.sql(`
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena_temporal_vence_en TIMESTAMPTZ;
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        ALTER TABLE usuarios DROP COLUMN IF EXISTS contrasena_temporal_vence_en;
    `);
};
