-- ============================================================
-- Migration: get_my_ministerios_as_lider() + scope lider INSERT/UPDATE policies
--
-- Problem: a user with rol_en_ministerio='servidor' in Ministerio B but
-- rol_en_ministerio='lider' in Ministerio A could create events/tasks
-- for Ministerio B because the old policies only checked get_my_ministerios()
-- (which returns ALL ministerios the user belongs to, regardless of their role).
--
-- Fix: new function returns only ministerios where rol_en_ministerio='lider'.
-- Used in WITH CHECK of evento and tarea INSERT/UPDATE for the lider branch.
-- ============================================================

-- ── Function: get_my_ministerios_as_lider ─────────────────
CREATE OR REPLACE FUNCTION public.get_my_ministerios_as_lider()
RETURNS SETOF bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id_ministerio
  FROM public.miembro_ministerio
  WHERE id_usuario = public.get_my_usuario_id()
    AND fecha_salida IS NULL
    AND lower(
          translate(
            coalesce(rol_en_ministerio, ''),
            'íÍáÁéÉóÓúÚüÜñÑ',
            'iIaAeEoOuUuUnN'
          )
        ) LIKE '%lider%';
$$;

-- ── Update evento policies ─────────────────────────────────
-- Drop the two lider-affected policies and recreate them scoped to lider-role ministerios.
-- The admin_iglesia and admin_sede branches are unchanged.

DROP POLICY IF EXISTS "evento_insert" ON public.evento;
DROP POLICY IF EXISTS "evento_update" ON public.evento;

CREATE POLICY "evento_insert"
  ON public.evento FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND
      id_iglesia = public.get_my_tenant_id()
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_iglesia = public.get_my_tenant_id() AND
      (
        id_sede IN (SELECT id FROM public.get_my_sedes())
        OR (
          id_ministerio IS NOT NULL AND
          id_ministerio IN (
            SELECT m.id_ministerio FROM public.ministerio m
            WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
          )
        )
      )
    )
    OR (
      public.is_lider() AND
      id_iglesia = public.get_my_tenant_id() AND
      id_ministerio IS NOT NULL AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

CREATE POLICY "evento_update"
  ON public.evento FOR UPDATE TO authenticated
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
      public.is_lider() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND
      id_iglesia = public.get_my_tenant_id()
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_iglesia = public.get_my_tenant_id() AND
      (
        id_sede IN (SELECT id FROM public.get_my_sedes())
        OR (
          id_ministerio IS NOT NULL AND
          id_ministerio IN (
            SELECT m.id_ministerio FROM public.ministerio m
            WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
          )
        )
      )
    )
    OR (
      public.is_lider() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

-- ── Update tarea policies ──────────────────────────────────
DROP POLICY IF EXISTS "tarea_insert" ON public.tarea;
DROP POLICY IF EXISTS "tarea_update" ON public.tarea;

CREATE POLICY "tarea_insert"
  ON public.tarea FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia() AND
      id_usuario_creador = public.get_my_usuario_id() AND
      (
        id_iglesia = public.get_my_tenant_id() OR
        id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE s.id_iglesia = public.get_my_tenant_id()
        )
      )
    )
    OR (
      public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
      id_usuario_creador = public.get_my_usuario_id() AND
      id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
      )
    )
    OR (
      public.is_lider() AND
      id_usuario_creador = public.get_my_usuario_id() AND
      id_ministerio IS NOT NULL AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

CREATE POLICY "tarea_update"
  ON public.tarea FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR id_usuario_creador = public.get_my_usuario_id()
    OR (
      public.is_admin_iglesia() AND
      (
        id_iglesia = public.get_my_tenant_id() OR
        id_ministerio IN (
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
      public.is_lider() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR id_usuario_creador = public.get_my_usuario_id()
    OR (
      public.is_admin_iglesia() AND
      (
        id_iglesia = public.get_my_tenant_id() OR
        id_ministerio IN (
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
      public.is_lider() AND
      id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );
