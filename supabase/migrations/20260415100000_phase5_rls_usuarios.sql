-- Phase 5: RLS mutation policies for usuario, usuario_rol, and notificacion tables
-- Allows authenticated users to perform INSERT/UPDATE/DELETE operations

-- ── usuario ──

DO $$ BEGIN
  CREATE POLICY "Authenticated update usuario"
    ON public.usuario FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── usuario_rol ──

DO $$ BEGIN
  CREATE POLICY "Authenticated insert usuario_rol"
    ON public.usuario_rol FOR INSERT TO authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update usuario_rol"
    ON public.usuario_rol FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete usuario_rol"
    ON public.usuario_rol FOR DELETE TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── notificacion (write policies) ──

DO $$ BEGIN
  CREATE POLICY "Authenticated insert notificacion"
    ON public.notificacion FOR INSERT TO authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update notificacion"
    ON public.notificacion FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete notificacion"
    ON public.notificacion FOR DELETE TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
