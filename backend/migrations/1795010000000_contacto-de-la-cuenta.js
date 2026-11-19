// Email y teléfono en la cuenta, para todos los roles (antes solo los tenían los
// choferes, en su ficha). Se copian los de los choferes que ya existen; desde
// ahora, la ficha del chofer se mantiene sincronizada con la cuenta.
export const up = (pgm) => {
    pgm.sql(`
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(120);
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(30);

        UPDATE usuarios u SET email = lower(c.email), telefono = NULLIF(c.telefono, '')
        FROM choferes c
        WHERE c.usuario_id = u.id AND u.email IS NULL AND u.eliminado_en IS NULL;

        CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (lower(email)) WHERE email IS NOT NULL;
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        DROP INDEX IF EXISTS idx_usuarios_email;
        ALTER TABLE usuarios DROP COLUMN IF EXISTS telefono;
        ALTER TABLE usuarios DROP COLUMN IF EXISTS email;
    `);
};
