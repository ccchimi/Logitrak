// Fotos en el chat del envío: un mensaje puede llevar texto, una foto o ambos.
export const up = (pgm) => {
    pgm.sql(`
        ALTER TABLE envio_mensajes ADD COLUMN IF NOT EXISTS foto_ruta VARCHAR(300);
        ALTER TABLE envio_mensajes ADD COLUMN IF NOT EXISTS foto_tipo VARCHAR(20);
        ALTER TABLE envio_mensajes ALTER COLUMN texto DROP NOT NULL;
        ALTER TABLE envio_mensajes DROP CONSTRAINT IF EXISTS envio_mensajes_texto_check;
        ALTER TABLE envio_mensajes DROP CONSTRAINT IF EXISTS envio_mensajes_con_contenido;
        ALTER TABLE envio_mensajes ADD CONSTRAINT envio_mensajes_con_contenido CHECK (
            (texto IS NULL OR length(btrim(texto)) > 0) AND (texto IS NOT NULL OR foto_ruta IS NOT NULL)
        );
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        DELETE FROM envio_mensajes WHERE texto IS NULL;
        ALTER TABLE envio_mensajes DROP CONSTRAINT IF EXISTS envio_mensajes_con_contenido;
        ALTER TABLE envio_mensajes ALTER COLUMN texto SET NOT NULL;
        ALTER TABLE envio_mensajes ADD CONSTRAINT envio_mensajes_texto_check CHECK (length(btrim(texto)) > 0);
        ALTER TABLE envio_mensajes DROP COLUMN IF EXISTS foto_tipo;
        ALTER TABLE envio_mensajes DROP COLUMN IF EXISTS foto_ruta;
    `);
};
