// Requisitos de la carga en el envío y un solo viaje en curso por chofer
// (observaciones del Parcial 2).
//
// Hasta ahora el envío copiaba de la cotización solo el peso real y los bultos,
// así que las ofertas a los choferes ignoraban el volumen, el peso volumétrico
// y la capacidad especial (cadena de frío, carga voluminosa, mercancía
// peligrosa) con los que el cotizador eligió el vehículo. Se guardan en el
// envío y se completan los existentes desde su cotización.
//
// El índice único impide en la base que un chofer tenga dos envíos asignados o
// en viaje a la vez. Si los datos actuales ya tienen un caso así, el índice no
// se crea (la regla igual la controla la API) y queda un aviso en el log.
export const up = (pgm) => {
    pgm.sql(`
        ALTER TABLE envios ADD COLUMN IF NOT EXISTS peso_facturable_kg NUMERIC(10,2);
        ALTER TABLE envios ADD COLUMN IF NOT EXISTS volumen_dm3 NUMERIC(12,2);
        ALTER TABLE envios ADD COLUMN IF NOT EXISTS capacidad_requerida VARCHAR(30);

        UPDATE envios e
        SET peso_facturable_kg = c.peso_facturable_kg,
            volumen_dm3 = CASE
                WHEN c.largo_cm IS NOT NULL AND c.ancho_cm IS NOT NULL AND c.alto_cm IS NOT NULL
                THEN round(c.largo_cm * c.ancho_cm * c.alto_cm * COALESCE(c.bultos, 1) / 1000.0, 2)
                ELSE 0
            END,
            capacidad_requerida = NULLIF(c.detalle -> 'carga' ->> 'capacidadRequerida', '')
        FROM cotizaciones c
        WHERE c.id = e.cotizacion_id AND e.peso_facturable_kg IS NULL;

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT chofer_id FROM envios
                WHERE chofer_id IS NOT NULL AND estado IN ('asignado', 'en_viaje')
                GROUP BY chofer_id HAVING count(*) > 1
            ) THEN
                CREATE UNIQUE INDEX IF NOT EXISTS uq_envios_un_viaje_por_chofer
                    ON envios (chofer_id) WHERE estado IN ('asignado', 'en_viaje');
            ELSE
                RAISE NOTICE 'Hay choferes con más de un envío en curso: no se creó uq_envios_un_viaje_por_chofer.';
            END IF;
        END $$;
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        DROP INDEX IF EXISTS uq_envios_un_viaje_por_chofer;
        ALTER TABLE envios DROP COLUMN IF EXISTS capacidad_requerida;
        ALTER TABLE envios DROP COLUMN IF EXISTS volumen_dm3;
        ALTER TABLE envios DROP COLUMN IF EXISTS peso_facturable_kg;
    `);
};
