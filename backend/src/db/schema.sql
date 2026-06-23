CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    usuario         VARCHAR(20)  UNIQUE NOT NULL,
    contrasena_hash TEXT         NOT NULL,
    rol             VARCHAR(10)  NOT NULL DEFAULT 'cliente'
                    CHECK (rol IN ('admin', 'cliente', 'chofer')),
    nombre_completo VARCHAR(120) NOT NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS choferes (
    id                   SERIAL PRIMARY KEY,
    codigo               VARCHAR(12)  UNIQUE NOT NULL,
    usuario_id           INTEGER      UNIQUE NOT NULL
                         REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_completo      VARCHAR(120) NOT NULL,
    email                VARCHAR(120) NOT NULL,
    telefono             VARCHAR(30)  NOT NULL,
    domicilio            VARCHAR(200) NOT NULL,
    dni                  VARCHAR(10)  UNIQUE NOT NULL,
    escaneo_facial_ok    BOOLEAN      NOT NULL DEFAULT FALSE,
    verificacion_renaper VARCHAR(10)  NOT NULL DEFAULT 'pendiente'
                         CHECK (verificacion_renaper IN ('pendiente', 'aprobada', 'rechazada')),
    renaper_modo         VARCHAR(10)  NOT NULL DEFAULT 'simulado'
                         CHECK (renaper_modo IN ('simulado', 'real')),
    metodo_verificacion  VARCHAR(12),
    selfie_path          VARCHAR(300),
    verificado_en        TIMESTAMPTZ,
    creado_en            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE choferes ADD COLUMN IF NOT EXISTS metodo_verificacion VARCHAR(12);
ALTER TABLE choferes ADD COLUMN IF NOT EXISTS selfie_path          VARCHAR(300);
ALTER TABLE choferes ADD COLUMN IF NOT EXISTS liveness_ok          BOOLEAN;
ALTER TABLE choferes ADD COLUMN IF NOT EXISTS face_match_score     NUMERIC(5,4);

CREATE TABLE IF NOT EXISTS auditoria_accesos (
    id         SERIAL PRIMARY KEY,
    usuario    VARCHAR(20)  NOT NULL,
    exito      BOOLEAN      NOT NULL,
    motivo     VARCHAR(60),
    ip         VARCHAR(45),
    user_agent VARCHAR(300),
    fecha      TIMESTAMPTZ  NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS vehiculos (
    id                  VARCHAR(20)  PRIMARY KEY,
    nombre              VARCHAR(60)   NOT NULL,
    max_kg              NUMERIC(10,2) NOT NULL,
    max_bultos          INTEGER       NOT NULL,
    max_volumen_dm3     NUMERIC(12,2) NOT NULL,
    tarifa_base         NUMERIC(12,2) NOT NULL,
    por_kg              NUMERIC(12,2) NOT NULL,
    por_bulto           NUMERIC(12,2) NOT NULL,
    por_km              NUMERIC(12,2) NOT NULL,
    velocidad_media_kmh NUMERIC(6,2)  NOT NULL,
    capacidades         TEXT[]        NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS cotizaciones (
    id                 SERIAL PRIMARY KEY,
    codigo             VARCHAR(40)   UNIQUE NOT NULL,
    cliente_id         INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
    origen             VARCHAR(200)  NOT NULL,
    destino            VARCHAR(200)  NOT NULL,
    descripcion_carga  VARCHAR(300),
    categoria_carga    VARCHAR(20),
    peso_kg            NUMERIC(10,2) NOT NULL,
    peso_facturable_kg NUMERIC(10,2),
    bultos             INTEGER       NOT NULL,
    largo_cm           NUMERIC(8,2),
    ancho_cm           NUMERIC(8,2),
    alto_cm            NUMERIC(8,2),
    valor_declarado    NUMERIC(14,2),
    vehiculo_id        VARCHAR(20)   REFERENCES vehiculos(id),
    vehiculo_nombre    VARCHAR(60),
    distancia_km       NUMERIC(10,2),
    distancia_estimada BOOLEAN,
    precio             NUMERIC(14,2) NOT NULL,
    moneda             VARCHAR(3)    NOT NULL DEFAULT 'ARS',
    confianza          VARCHAR(10),
    puntaje_confianza  INTEGER,
    validez_min        INTEGER,
    estado             VARCHAR(12)   NOT NULL DEFAULT 'emitida'
                       CHECK (estado IN ('emitida', 'confirmada', 'vencida', 'descartada')),
    detalle            JSONB,
    emitida_en         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS envios_codigo_seq;

CREATE TABLE IF NOT EXISTS envios (
    id                SERIAL PRIMARY KEY,
    codigo            VARCHAR(24)   UNIQUE NOT NULL
                      DEFAULT ('TRK-' || to_char(now(), 'YYYY') || '-'
                               || lpad(nextval('envios_codigo_seq')::text, 6, '0')),
    cliente_id        INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cotizacion_id     INTEGER       REFERENCES cotizaciones(id) ON DELETE SET NULL,
    chofer_id         INTEGER       REFERENCES choferes(id) ON DELETE SET NULL,
    origen            VARCHAR(200)  NOT NULL,
    destino           VARCHAR(200)  NOT NULL,
    origen_lat        NUMERIC(9,6),
    origen_lng        NUMERIC(9,6),
    destino_lat       NUMERIC(9,6),
    destino_lng       NUMERIC(9,6),
    descripcion_carga VARCHAR(300),
    categoria_carga   VARCHAR(20),
    peso_kg           NUMERIC(10,2),
    bultos            INTEGER,
    vehiculo_id       VARCHAR(20)   REFERENCES vehiculos(id),
    vehiculo_nombre   VARCHAR(60),
    distancia_km      NUMERIC(10,2),
    precio            NUMERIC(14,2) NOT NULL,
    moneda            VARCHAR(3)    NOT NULL DEFAULT 'ARS',
    estado            VARCHAR(14)   NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'asignado', 'en_viaje', 'entregado', 'cancelado')),
    sla_min           INTEGER,
    sla_vence_en      TIMESTAMPTZ,
    chofer_nombre     VARCHAR(120),
    creado_en         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    entregado_en      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS envio_eventos (
    id        SERIAL PRIMARY KEY,
    envio_id  INTEGER      NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
    tipo      VARCHAR(24)  NOT NULL
              CHECK (tipo IN ('creado', 'asignado', 'chofer_en_camino', 'retirado',
                              'en_viaje', 'entregado', 'sla_excedido', 'cancelado')),
    titulo    VARCHAR(120) NOT NULL,
    detalle   VARCHAR(300),
    lat       NUMERIC(9,6),
    lng       NUMERIC(9,6),
    creado_en TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asignaciones (
    id                 SERIAL PRIMARY KEY,
    codigo             VARCHAR(40)   UNIQUE NOT NULL,
    chofer_id          INTEGER       NOT NULL REFERENCES choferes(id) ON DELETE CASCADE,
    envio_id           INTEGER       REFERENCES envios(id) ON DELETE SET NULL,
    origen             VARCHAR(200)  NOT NULL,
    destino            VARCHAR(200)  NOT NULL,
    distancia_km       NUMERIC(10,2),
    descripcion_carga  VARCHAR(300),
    categoria_etiqueta VARCHAR(60),
    peso_kg            NUMERIC(10,2),
    bultos             INTEGER,
    vehiculo_requerido VARCHAR(60),
    tarifa             NUMERIC(14,2),
    pago_chofer        NUMERIC(14,2),
    prioridad          VARCHAR(6)    CHECK (prioridad IN ('alta', 'media', 'baja')),
    eta_retiro_min     INTEGER,
    tiempo_viaje_min   INTEGER,
    estado             VARCHAR(12)   NOT NULL DEFAULT 'ofrecida'
                       CHECK (estado IN ('ofrecida', 'aceptada', 'rechazada', 'expirada', 'completada')),
    recomendacion      JSONB,
    requisitos         TEXT[]        NOT NULL DEFAULT '{}',
    generada_en        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expira_en          TIMESTAMPTZ,
    respondida_en      TIMESTAMPTZ
);

CREATE SEQUENCE IF NOT EXISTS cupones_codigo_seq;

CREATE TABLE IF NOT EXISTS cupones (
    id            SERIAL PRIMARY KEY,
    codigo        VARCHAR(40)  UNIQUE NOT NULL
                  DEFAULT ('SLA-INCUMP-' || lpad(nextval('cupones_codigo_seq')::text, 3, '0')),
    cliente_id    INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    envio_id      INTEGER      REFERENCES envios(id) ON DELETE SET NULL,
    descuento_pct INTEGER      NOT NULL,
    motivo        VARCHAR(200) NOT NULL,
    estado        VARCHAR(10)  NOT NULL DEFAULT 'activo'
                  CHECK (estado IN ('activo', 'usado', 'vencido')),
    creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    usado_en      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol            ON usuarios (rol);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_fecha ON auditoria_accesos (usuario, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente    ON cotizaciones (cliente_id, emitida_en DESC);
CREATE INDEX IF NOT EXISTS idx_envios_cliente          ON envios (cliente_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_envios_chofer           ON envios (chofer_id);
CREATE INDEX IF NOT EXISTS idx_envios_estado           ON envios (estado);
CREATE INDEX IF NOT EXISTS idx_envio_eventos_envio     ON envio_eventos (envio_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_asignaciones_chofer     ON asignaciones (chofer_id, generada_en DESC);
CREATE INDEX IF NOT EXISTS idx_cupones_cliente         ON cupones (cliente_id, creado_en DESC);


CREATE SEQUENCE IF NOT EXISTS pagos_codigo_seq;
CREATE SEQUENCE IF NOT EXISTS comprobantes_seq;

CREATE TABLE IF NOT EXISTS pagos (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(24)   UNIQUE NOT NULL
                    DEFAULT ('PAY-' || to_char(now(), 'YYYY') || '-'
                             || lpad(nextval('pagos_codigo_seq')::text, 6, '0')),
    envio_id        INTEGER       NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
    cliente_id      INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    metodo          VARCHAR(12)   NOT NULL
                    CHECK (metodo IN ('mercadopago', 'modo', 'tarjeta')),
    monto           NUMERIC(14,2) NOT NULL,
    moneda          VARCHAR(3)    NOT NULL DEFAULT 'ARS',
    estado          VARCHAR(12)   NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'cancelado', 'expirado')),
    modo_proc       VARCHAR(10)   NOT NULL DEFAULT 'sandbox'
                    CHECK (modo_proc IN ('sandbox', 'real')),
    tarjeta_marca   VARCHAR(20),
    tarjeta_ultimos VARCHAR(4),
    cuotas          INTEGER,
    referencia_ext  VARCHAR(120),
    pago_ext_id     VARCHAR(120),
    comprobante     VARCHAR(24),
    detalle         JSONB,
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    pagado_en       TIMESTAMPTZ
);

ALTER TABLE envios ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(10) NOT NULL DEFAULT 'pendiente'
    CHECK (estado_pago IN ('pendiente', 'pagado', 'rechazado'));

CREATE INDEX IF NOT EXISTS idx_pagos_envio   ON pagos (envio_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cliente ON pagos (cliente_id, creado_en DESC);
