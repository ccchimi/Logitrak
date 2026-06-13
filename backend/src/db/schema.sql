-- Esquema de logitrak.

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
    -- ID público del chofer: es lo único (junto al nombre) que ve el cliente.
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
    -- 'simulado' hasta tener convenio/credenciales reales de RENAPER.
    renaper_modo         VARCHAR(10)  NOT NULL DEFAULT 'simulado'
                         CHECK (renaper_modo IN ('simulado', 'real')),
    verificado_en        TIMESTAMPTZ,
    creado_en            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Auditoría de accesos: queda registro de cada intento de login.
CREATE TABLE IF NOT EXISTS auditoria_accesos (
    id         SERIAL PRIMARY KEY,
    usuario    VARCHAR(20)  NOT NULL,
    exito      BOOLEAN      NOT NULL,
    motivo     VARCHAR(60),
    ip         VARCHAR(45),
    user_agent VARCHAR(300),
    fecha      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol            ON usuarios (rol);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_fecha ON auditoria_accesos (usuario, fecha DESC);
