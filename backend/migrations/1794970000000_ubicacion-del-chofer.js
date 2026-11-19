// RF11: última posición del chofer mientras lleva un envío. Se guarda una sola
// fila por envío (se pisa en cada envío de posición) y se borra sola cuando el
// viaje termina, se cancela o cambia de chofer: no queda historial del
// recorrido del chofer fuera del viaje.
export const up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS ubicaciones_chofer (
            envio_id       INTEGER      PRIMARY KEY REFERENCES envios(id) ON DELETE CASCADE,
            chofer_id      INTEGER      NOT NULL REFERENCES choferes(id) ON DELETE CASCADE,
            lat            NUMERIC(9,6) NOT NULL CHECK (lat BETWEEN -90 AND 90),
            lng            NUMERIC(9,6) NOT NULL CHECK (lng BETWEEN -180 AND 180),
            precision_m    INTEGER      CHECK (precision_m >= 0),
            rumbo          SMALLINT     CHECK (rumbo BETWEEN 0 AND 359),
            velocidad_kmh  SMALLINT     CHECK (velocidad_kmh >= 0),
            actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT now()
        );
        ALTER TABLE ubicaciones_chofer ENABLE ROW LEVEL SECURITY;

        CREATE OR REPLACE FUNCTION public.logitrak_borrar_ubicacion_del_viaje()
        RETURNS trigger LANGUAGE plpgsql AS $fn$
        BEGIN
            IF NEW.estado NOT IN ('asignado', 'en_viaje') OR NEW.chofer_id IS DISTINCT FROM OLD.chofer_id THEN
                DELETE FROM ubicaciones_chofer WHERE envio_id = NEW.id;
            END IF;
            RETURN NEW;
        END
        $fn$;

        DROP TRIGGER IF EXISTS envios_borrar_ubicacion ON envios;
        CREATE TRIGGER envios_borrar_ubicacion
            AFTER UPDATE OF estado, chofer_id ON envios
            FOR EACH ROW EXECUTE FUNCTION public.logitrak_borrar_ubicacion_del_viaje();

        DO $realtime$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
                RAISE NOTICE 'Sin esquema auth: se omite Realtime de la ubicación (no estamos en Supabase).';
                RETURN;
            END IF;

            ALTER TABLE ubicaciones_chofer REPLICA IDENTITY FULL;

            -- Quien puede ver el envío (cliente, su chofer o el personal) ve la
            -- posición, y solo mientras el viaje está en curso.
            DROP POLICY IF EXISTS ubicaciones_chofer_lectura ON ubicaciones_chofer;
            CREATE POLICY ubicaciones_chofer_lectura ON ubicaciones_chofer FOR SELECT
                USING (EXISTS (
                    SELECT 1 FROM envios e
                    WHERE e.id = ubicaciones_chofer.envio_id AND e.estado IN ('asignado', 'en_viaje')
                ));

            IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ubicaciones_chofer') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE ubicaciones_chofer;
            END IF;
        END
        $realtime$;
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        DROP TRIGGER IF EXISTS envios_borrar_ubicacion ON envios;
        DROP FUNCTION IF EXISTS public.logitrak_borrar_ubicacion_del_viaje();
        DROP TABLE IF EXISTS ubicaciones_chofer;
    `);
};
