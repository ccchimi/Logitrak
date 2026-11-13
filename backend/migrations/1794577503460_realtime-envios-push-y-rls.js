// Hito 2.3: seguimiento en tiempo real, tokens de push y RLS en todas las tablas.
//
// 1) push_tokens: los teléfonos registrados de cada usuario (Expo push token).
//
// 2) RLS en todas las tablas de la API. La app recibe la anon key de Supabase
//    para conectarse a Realtime, y con esa clave la API REST de Supabase expone
//    cualquier tabla del schema public que no tenga RLS (usuarios con sus
//    hashes, choferes con su DNI...). Con RLS activo y sin políticas, nadie que
//    entre con la anon key o con nuestro token de Realtime puede leer nada. El
//    backend no se ve afectado: es el dueño de las tablas, y el dueño no pasa
//    por RLS (no usamos FORCE ROW LEVEL SECURITY).
//
// 3) Solo en Supabase: políticas de SOLO LECTURA para envios y envio_eventos
//    (el cliente ve los suyos, el chofer los que tiene asignados, el admin
//    todos), REPLICA IDENTITY FULL y la publicación de Realtime, igual que el
//    chat de soporte.

const TABLAS = [
    'usuarios', 'choferes', 'auditoria_accesos', 'vehiculos', 'cotizaciones', 'envios',
    'envio_eventos', 'asignaciones', 'cupones', 'pagos', 'sesiones', 'outbox_events',
    'notificaciones', 'push_tokens', 'soporte_tickets', 'soporte_mensajes', 'pgmigrations',
];

export const up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS push_tokens (
            id             SERIAL       PRIMARY KEY,
            usuario_id     INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            token          VARCHAR(200) NOT NULL UNIQUE,
            plataforma     VARCHAR(10)  NOT NULL CHECK (plataforma IN ('android', 'ios')),
            creado_en      TIMESTAMPTZ  NOT NULL DEFAULT now(),
            actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_push_tokens_usuario ON push_tokens (usuario_id);
    `);

    for (const tabla of TABLAS) pgm.sql(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY;`);

    pgm.sql(`
        DO $realtime$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
                RAISE NOTICE 'Sin esquema auth: se omite Realtime de envíos (no estamos en Supabase).';
                RETURN;
            END IF;

            -- SECURITY DEFINER: la política la evalúa el rol del token, que no
            -- puede leer choferes (tiene RLS sin políticas). Esta función sí, y
            -- solo devuelve el id del chofer del propio usuario.
            EXECUTE $sql$
                CREATE OR REPLACE FUNCTION public.logitrak_chofer_id()
                RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
                AS 'SELECT id FROM public.choferes WHERE usuario_id = public.logitrak_usuario_id()'
            $sql$;
            REVOKE ALL ON FUNCTION public.logitrak_chofer_id() FROM PUBLIC;
            GRANT EXECUTE ON FUNCTION public.logitrak_chofer_id() TO authenticated, anon;

            ALTER TABLE envios        REPLICA IDENTITY FULL;
            ALTER TABLE envio_eventos REPLICA IDENTITY FULL;

            DROP POLICY IF EXISTS envios_lectura ON envios;
            CREATE POLICY envios_lectura ON envios FOR SELECT
                USING (
                    public.logitrak_es_admin()
                    OR cliente_id = public.logitrak_usuario_id()
                    OR (chofer_id IS NOT NULL AND chofer_id = public.logitrak_chofer_id())
                );

            DROP POLICY IF EXISTS envio_eventos_lectura ON envio_eventos;
            CREATE POLICY envio_eventos_lectura ON envio_eventos FOR SELECT
                USING (EXISTS (SELECT 1 FROM envios e WHERE e.id = envio_eventos.envio_id));

            IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'envios') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE envios;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'envio_eventos') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE envio_eventos;
            END IF;
        END
        $realtime$;
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        DROP POLICY IF EXISTS envios_lectura ON envios;
        DROP POLICY IF EXISTS envio_eventos_lectura ON envio_eventos;
        DROP FUNCTION IF EXISTS public.logitrak_chofer_id();
    `);
    for (const tabla of TABLAS.filter((t) => !t.startsWith('soporte_') && t !== 'push_tokens')) {
        pgm.sql(`ALTER TABLE ${tabla} DISABLE ROW LEVEL SECURITY;`);
    }
    pgm.sql('DROP TABLE IF EXISTS push_tokens;');
};
