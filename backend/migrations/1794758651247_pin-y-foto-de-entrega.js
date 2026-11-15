export const up = (pgm) => {
    pgm.sql(`
        ALTER TABLE envios ADD COLUMN IF NOT EXISTS pin_entrega       CHAR(4);
        ALTER TABLE envios ADD COLUMN IF NOT EXISTS pin_intentos      SMALLINT NOT NULL DEFAULT 0;
        ALTER TABLE envios ADD COLUMN IF NOT EXISTS pin_bloqueado_en  TIMESTAMPTZ;
        ALTER TABLE envios ADD COLUMN IF NOT EXISTS foto_entrega_path VARCHAR(300);

        -- gen_random_uuid() es aleatorio criptográfico: de él sale el PIN.
        UPDATE envios
        SET pin_entrega = lpad((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 10000)::text, 4, '0')
        WHERE pin_entrega IS NULL AND estado IN ('pendiente', 'asignado', 'en_viaje');
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        ALTER TABLE envios DROP COLUMN IF EXISTS foto_entrega_path;
        ALTER TABLE envios DROP COLUMN IF EXISTS pin_bloqueado_en;
        ALTER TABLE envios DROP COLUMN IF EXISTS pin_intentos;
        ALTER TABLE envios DROP COLUMN IF EXISTS pin_entrega;
    `);
};
