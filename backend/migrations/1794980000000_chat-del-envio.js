// RF13: chat entre el cliente y el chofer de un envío. Se escribe mientras el
// envío está asignado o en viaje; después queda como historial de lectura.
export const up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS envio_mensajes (
            id        BIGSERIAL    PRIMARY KEY,
            envio_id  INTEGER      NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
            autor_id  INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
            autor_rol VARCHAR(8)   NOT NULL CHECK (autor_rol IN ('cliente', 'chofer')),
            texto     VARCHAR(1000) NOT NULL CHECK (length(btrim(texto)) > 0),
            creado_en TIMESTAMPTZ  NOT NULL DEFAULT now(),
            leido_en  TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_envio_mensajes_envio ON envio_mensajes (envio_id, creado_en);
        CREATE INDEX IF NOT EXISTS idx_envio_mensajes_no_leidos
            ON envio_mensajes (envio_id, autor_rol) WHERE leido_en IS NULL;
        ALTER TABLE envio_mensajes ENABLE ROW LEVEL SECURITY;

        DO $realtime$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
                RAISE NOTICE 'Sin esquema auth: se omite Realtime del chat (no estamos en Supabase).';
                RETURN;
            END IF;

            ALTER TABLE envio_mensajes REPLICA IDENTITY FULL;

            -- Lee los mensajes quien puede ver el envío: su cliente, su chofer
            -- y el personal (la política de envios decide).
            DROP POLICY IF EXISTS envio_mensajes_lectura ON envio_mensajes;
            CREATE POLICY envio_mensajes_lectura ON envio_mensajes FOR SELECT
                USING (EXISTS (SELECT 1 FROM envios e WHERE e.id = envio_mensajes.envio_id));

            IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'envio_mensajes') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE envio_mensajes;
            END IF;
        END
        $realtime$;
    `);
};

export const down = (pgm) => {
    pgm.sql('DROP TABLE IF EXISTS envio_mensajes;');
};
