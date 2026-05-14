-- ============================================================
-- Migration: comprehensive CRUD audit fixes
--
-- Bugs fixed:
--   1. Force JWT re-refresh — bump permissions_updated_at so all users
--      get fresh app_metadata on next app load (resolves stale-token 403s).
--   2. get_my_tenant_id() — add fallback via usuario_rol_sede so
--      admin_sede users only in that table get a non-null tenant_id.
--   3. get_my_permissions_updated_at() — also check usuario_rol_sede.updated_at
--      so sede-only admins trigger the stale-claims check correctly.
--   4. evento_delete — lider branch used get_my_ministerios() (all memberships)
--      instead of get_my_ministerios_as_lider() (leader-only).
--   5. tarea_delete — same lider scope bug.
--   6. miembro_ministerio INSERT/UPDATE/DELETE — same lider scope bug.
--   7. ministerio INSERT/UPDATE/DELETE — admin_sede branch lacked explicit
--      is_admin_sede() / NOT is_admin_iglesia() guards.
--   8. usuario_sede SELECT — no self-read policy; members couldn't read
--      their own sede-membership row.
--   9. usuario_select — admin_iglesia couldn't see users whose only
--      membership is in usuario_sede (no usuario_rol/usuario_rol_sede row).
--      Added admin_sede branch too.
-- ============================================================

-- ── Fix 1: Force JWT re-refresh ────────────────────────────
UPDATE public.usuario_rol
SET permissions_updated_at = NOW()
WHERE fecha_fin IS NULL;

-- ── Fix 2: get_my_tenant_id() ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS bigint LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::bigint,
    (
      SELECT DISTINCT id_iglesia
      FROM public.usuario_rol
      WHERE id_usuario IN (
        SELECT id_usuario FROM public.usuario
        WHERE auth_user_id = auth.uid() AND activo = true LIMIT 1
      )
        AND fecha_fin IS NULL
        AND id_iglesia IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT DISTINCT s.id_iglesia
      FROM public.usuario_rol_sede urs
      JOIN public.sede s ON s.id_sede = urs.id_sede
      WHERE urs.id_usuario = public.get_my_usuario_id()
        AND urs.fecha_fin IS NULL
      LIMIT 1
    )
  );
$$;

-- ── Fix 3: get_my_permissions_updated_at() ────────────────
CREATE OR REPLACE FUNCTION public.get_my_permissions_updated_at()
RETURNS timestamptz LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    GREATEST(
      (SELECT MAX(permissions_updated_at)
       FROM public.usuario_rol
       WHERE id_usuario = (
         SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1
       )),
      (SELECT MAX(updated_at)
       FROM public.usuario_rol_sede
       WHERE id_usuario = (
         SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1
       ))
    ),
    NOW()
  );
$$;

-- ── Fix 4: evento_delete — lider scope ────────────────────
DROP POLICY IF EXISTS "evento_delete" ON public.evento;
CREATE POLICY "evento_delete"
  ON public.evento FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin_iglesia() AND id_iglesia = public.get_my_tenant_id())
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_iglesia = public.get_my_tenant_id() AND
      (
        id_sede IN (SELECT id FROM public.get_my_sedes())
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
        )
      )
    )
    OR (
      public.is_lider() AND NOT public.is_admin_sede() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

-- ── Fix 5: tarea_delete — lider scope ─────────────────────
DROP POLICY IF EXISTS "tarea_delete" ON public.tarea;
CREATE POLICY "tarea_delete"
  ON public.tarea FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR id_usuario_creador = public.get_my_usuario_id()
    OR (
      public.is_admin_iglesia() AND (
        id_iglesia = public.get_my_tenant_id()
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE s.id_iglesia = public.get_my_tenant_id()
        )
      )
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
      )
    )
    OR (
      public.is_lider() AND NOT public.is_admin_sede() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

-- ── Fix 6: miembro_ministerio — lider scope ───────────────
DROP POLICY IF EXISTS "miembro_ministerio_insert" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "miembro_ministerio_update" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "miembro_ministerio_delete" ON public.miembro_ministerio;

CREATE POLICY "miembro_ministerio_insert"
  ON public.miembro_ministerio FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND EXISTS (
        SELECT 1 FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
      )
    )
    OR (
      public.is_lider() AND NOT public.is_admin_sede() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

CREATE POLICY "miembro_ministerio_update"
  ON public.miembro_ministerio FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND EXISTS (
        SELECT 1 FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
      )
    )
    OR (
      public.is_lider() AND NOT public.is_admin_sede() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND EXISTS (
        SELECT 1 FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
      )
    )
    OR (
      public.is_lider() AND NOT public.is_admin_sede() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

CREATE POLICY "miembro_ministerio_delete"
  ON public.miembro_ministerio FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND EXISTS (
        SELECT 1 FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
      )
    )
    OR (
      public.is_lider() AND NOT public.is_admin_sede() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

-- ── Fix 7: ministerio INSERT/UPDATE/DELETE ─────────────────
DROP POLICY IF EXISTS "ministerio_insert" ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_update" ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_delete" ON public.ministerio;

CREATE POLICY "ministerio_insert"
  ON public.ministerio FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND
      EXISTS (SELECT 1 FROM public.sede s
              WHERE s.id_sede = ministerio.id_sede
                AND s.id_iglesia = public.get_my_tenant_id())
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_sede IN (SELECT id FROM public.get_my_sedes())
    )
  );

CREATE POLICY "ministerio_update"
  ON public.ministerio FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND
      EXISTS (SELECT 1 FROM public.sede s
              WHERE s.id_sede = ministerio.id_sede
                AND s.id_iglesia = public.get_my_tenant_id())
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_sede IN (SELECT id FROM public.get_my_sedes())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND
      EXISTS (SELECT 1 FROM public.sede s
              WHERE s.id_sede = ministerio.id_sede
                AND s.id_iglesia = public.get_my_tenant_id())
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_sede IN (SELECT id FROM public.get_my_sedes())
    )
  );

CREATE POLICY "ministerio_delete"
  ON public.ministerio FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND
      EXISTS (SELECT 1 FROM public.sede s
              WHERE s.id_sede = ministerio.id_sede
                AND s.id_iglesia = public.get_my_tenant_id())
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_sede IN (SELECT id FROM public.get_my_sedes())
    )
  );

-- ── Fix 8: usuario_sede self-SELECT ───────────────────────
DROP POLICY IF EXISTS "own_usuario_sede_select" ON public.usuario_sede;
CREATE POLICY "own_usuario_sede_select"
  ON public.usuario_sede FOR SELECT TO authenticated
  USING (id_usuario = public.get_my_usuario_id());

-- ── Fix 9: usuario_select — include usuario_sede members ──
DROP POLICY IF EXISTS "usuario_select" ON public.usuario;
CREATE POLICY "usuario_select"
  ON public.usuario FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (auth_user_id = auth.uid())
    OR (
      public.is_admin_iglesia() AND (
        id_usuario IN (
          SELECT DISTINCT ur.id_usuario FROM public.usuario_rol ur
          JOIN public.rol r ON r.id_rol = ur.id_rol
          WHERE ur.id_iglesia = public.get_my_tenant_id()
            AND ur.fecha_fin IS NULL
            AND r.nombre <> 'Super Administrador'
        )
        OR id_usuario IN (
          SELECT DISTINCT urs.id_usuario FROM public.usuario_rol_sede urs
          WHERE urs.id_iglesia = public.get_my_tenant_id()
            AND urs.fecha_fin IS NULL
        )
        OR id_usuario IN (
          SELECT DISTINCT us.id_usuario FROM public.usuario_sede us
          JOIN public.sede s ON s.id_sede = us.id_sede
          WHERE s.id_iglesia = public.get_my_tenant_id()
        )
      )
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_usuario IN (
        SELECT DISTINCT us.id_usuario FROM public.usuario_sede us
        WHERE us.id_sede IN (SELECT id FROM public.get_my_sedes())
      )
    )
  );
