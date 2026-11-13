// Hito 2.2: patrón outbox.
//
// outbox_events guarda los hechos de negocio (pago aprobado, envío cancelado,
// cupón acreditado) en la MISMA transacción que los produce: si la transacción
// se revierte, el evento tampoco existe; si se confirma, el evento queda
// garantizado aunque el proceso se caiga un segundo después. Un despachador
// los lee después y hace los efectos (notificaciones, más adelante push o mail).
//
// notificaciones es la bandeja de cada usuario dentro de la app. El par
// (evento_id, usuario_id) es único: si el despachador reprocesa un evento, no
// se duplica la notificación.

export const up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS outbox_events (
            id              BIGSERIAL    PRIMARY KEY,
            aggregate_type  VARCHAR(30)  NOT NULL,
            aggregate_id    VARCHAR(40)  NOT NULL,
            event_type      VARCHAR(60)  NOT NULL,
            payload         JSONB        NOT NULL DEFAULT '{}',
            processed       BOOLEAN      NOT NULL DEFAULT FALSE,
            processed_at    TIMESTAMPTZ,
            attempts        INTEGER      NOT NULL DEFAULT 0,
            next_attempt_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
            last_error      TEXT,
            failed_at       TIMESTAMPTZ,
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_outbox_pendientes
            ON outbox_events (next_attempt_at, id)
            WHERE NOT processed AND failed_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_outbox_agregado
            ON outbox_events (aggregate_type, aggregate_id, created_at);

        CREATE TABLE IF NOT EXISTS notificaciones (
            id          BIGSERIAL    PRIMARY KEY,
            usuario_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            evento_id   BIGINT       REFERENCES outbox_events(id) ON DELETE SET NULL,
            tipo        VARCHAR(60)  NOT NULL,
            titulo      VARCHAR(120) NOT NULL,
            cuerpo      VARCHAR(400) NOT NULL,
            datos       JSONB,
            creada_en   TIMESTAMPTZ  NOT NULL DEFAULT now(),
            leida_en    TIMESTAMPTZ,
            CONSTRAINT uq_notificacion_evento_usuario UNIQUE (evento_id, usuario_id)
        );

        CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario
            ON notificaciones (usuario_id, creada_en DESC);
        CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas
            ON notificaciones (usuario_id) WHERE leida_en IS NULL;
    `);
};

export const down = (pgm) => {
    pgm.sql('DROP TABLE IF EXISTS notificaciones; DROP TABLE IF EXISTS outbox_events;');
};
