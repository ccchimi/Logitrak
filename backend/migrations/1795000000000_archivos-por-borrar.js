// Archivos (fotos de identidad, de entrega, del chat, adjuntos de soporte) que
// no se pudieron borrar cuando se eliminó la cuenta. Un trabajo los reintenta.
export const up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS archivos_por_borrar (
            ruta             VARCHAR(300) PRIMARY KEY,
            motivo           VARCHAR(60)  NOT NULL,
            intentos         SMALLINT     NOT NULL DEFAULT 0,
            ultimo_error     VARCHAR(300),
            ultimo_intento_en TIMESTAMPTZ,
            creado_en        TIMESTAMPTZ  NOT NULL DEFAULT now()
        );
        ALTER TABLE archivos_por_borrar ENABLE ROW LEVEL SECURITY;
    `);
};

export const down = (pgm) => {
    pgm.sql('DROP TABLE IF EXISTS archivos_por_borrar;');
};
