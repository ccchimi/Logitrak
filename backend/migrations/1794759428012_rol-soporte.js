export const up = (pgm) => {
    pgm.sql(`
        -- La restricción del rol se creó junto con la tabla y su nombre depende
        -- de cuándo se creó la base: se borra cualquiera que controle el rol.
        DO $roles$
        DECLARE r record;
        BEGIN
            FOR r IN SELECT conname FROM pg_constraint
                     WHERE conrelid = 'usuarios'::regclass AND contype = 'c'
                       AND pg_get_constraintdef(oid) ILIKE '%rol%'
            LOOP
                EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', r.conname);
            END LOOP;
        END
        $roles$;
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
            CHECK (rol IN ('admin', 'cliente', 'chofer', 'soporte'));

        DO $realtime$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
                RETURN;
            END IF;

            EXECUTE $sql$
                CREATE OR REPLACE FUNCTION public.logitrak_es_personal()
                RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_catalog
                AS 'SELECT COALESCE(auth.jwt() ->> ''logitrak_rol'', '''') IN (''admin'', ''soporte'')'
            $sql$;

            DROP POLICY IF EXISTS envios_lectura ON envios;
            CREATE POLICY envios_lectura ON envios FOR SELECT
                USING (
                    public.logitrak_es_personal()
                    OR cliente_id = public.logitrak_usuario_id()
                    OR (chofer_id IS NOT NULL AND chofer_id = public.logitrak_chofer_id())
                );

            DROP POLICY IF EXISTS soporte_tickets_lectura ON soporte_tickets;
            CREATE POLICY soporte_tickets_lectura ON soporte_tickets FOR SELECT
                USING (public.logitrak_es_personal() OR usuario_id = public.logitrak_usuario_id());

            DROP POLICY IF EXISTS soporte_mensajes_lectura ON soporte_mensajes;
            CREATE POLICY soporte_mensajes_lectura ON soporte_mensajes FOR SELECT
                USING (
                    public.logitrak_es_personal()
                    OR EXISTS (SELECT 1 FROM soporte_tickets t
                               WHERE t.id = soporte_mensajes.ticket_id
                                 AND t.usuario_id = public.logitrak_usuario_id())
                );
        END
        $realtime$;
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        UPDATE usuarios SET rol = 'cliente' WHERE rol = 'soporte';
        ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'cliente', 'chofer'));
    `);
};
