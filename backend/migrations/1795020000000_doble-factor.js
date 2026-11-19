// Verificación en dos pasos (TOTP) para el equipo. El secreto se guarda cifrado;
// los códigos de respaldo, solo como hash.
export const up = (pgm) => {
    pgm.sql(`
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_secreto       TEXT;
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_pendiente     TEXT;
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_pendiente_en  TIMESTAMPTZ;
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_activado_en   TIMESTAMPTZ;
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_ultimo_paso   BIGINT;

        CREATE TABLE IF NOT EXISTS codigos_respaldo (
            id         SERIAL      PRIMARY KEY,
            usuario_id INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            hash       CHAR(64)    NOT NULL,
            creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
            usado_en   TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_codigos_respaldo_usuario ON codigos_respaldo (usuario_id) WHERE usado_en IS NULL;
        ALTER TABLE codigos_respaldo ENABLE ROW LEVEL SECURITY;
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS codigos_respaldo;
        ALTER TABLE usuarios DROP COLUMN IF EXISTS totp_ultimo_paso;
        ALTER TABLE usuarios DROP COLUMN IF EXISTS totp_activado_en;
        ALTER TABLE usuarios DROP COLUMN IF EXISTS totp_pendiente_en;
        ALTER TABLE usuarios DROP COLUMN IF EXISTS totp_pendiente;
        ALTER TABLE usuarios DROP COLUMN IF EXISTS totp_secreto;
    `);
};
