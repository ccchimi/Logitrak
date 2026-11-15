// Hito 3.1: entrega segura.
//
// pin_entrega: 4 dígitos que el cliente le pasa a quien recibe; el chofer lo
// tiene que ingresar para cerrar la entrega. pin_intentos y pin_bloqueado_en
// frenan la adivinanza (son 10.000 combinaciones): a los 5 errores se bloquea
// y lo desbloquea un admin. foto_entrega_path es la foto de comprobante, en el
// bucket privado. Los envíos en curso reciben un PIN para poder cerrarse.

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
