-- ============================================================
-- FIX: evento RLS policies to allow admin_iglesia, admin_sede, and lider
-- ============================================================
-- Remove old overly-permissive policies
DROP POLICY IF EXISTS "Authenticated insert evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated update evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated delete evento" ON public.evento;

-- ── EVENTO ──
-- Super admin can CRUD all eventos
-- Admin iglesia can CRUD eventos in their iglesia
-- Admin sede can CRUD eventos in their sede
-- Lider can create/update eventos in ministerios they lead

CREATE POLICY evento_select ON public.evento
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_iglesia = get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.ministerio m
      WHERE m.id_ministerio = public.evento.id_ministerio
      AND (
        is_super_admin()
        OR (is_admin_iglesia() AND m.id_iglesia = get_my_tenant_id())
        OR (is_lider() AND m.id_lider = get_my_usuario_id())
      )
    )
  );

CREATE POLICY evento_insert ON public.evento
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = public.evento.id_sede
        AND s.id_iglesia = get_my_tenant_id()
      )
    )
    OR (
      is_lider()
      AND (
        id_ministerio IS NULL
        OR EXISTS (
          SELECT 1 FROM public.ministerio m
          WHERE m.id_ministerio = public.evento.id_ministerio
          AND m.id_lider = get_my_usuario_id()
        )
      )
    )
  );

CREATE POLICY evento_update ON public.evento
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = public.evento.id_sede
        AND s.id_iglesia = get_my_tenant_id()
      )
    )
    OR (
      is_lider()
      AND EXISTS (
        SELECT 1 FROM public.ministerio m
        WHERE m.id_ministerio = public.evento.id_ministerio
        AND m.id_lider = get_my_usuario_id()
      )
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = public.evento.id_sede
        AND s.id_iglesia = get_my_tenant_id()
      )
    )
    OR (
      is_lider()
      AND EXISTS (
        SELECT 1 FROM public.ministerio m
        WHERE m.id_ministerio = public.evento.id_ministerio
        AND m.id_lider = get_my_usuario_id()
      )
    )
  );

CREATE POLICY evento_delete ON public.evento
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = public.evento.id_sede
        AND s.id_iglesia = get_my_tenant_id()
      )
    )
  );

-- Ensure authenticated role has permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento TO authenticated;
