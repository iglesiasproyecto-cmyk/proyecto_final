-- ============================================================
-- FIX: evento RLS policies to allow admin_iglesia, admin_sede, and lider
-- ============================================================
-- Using actual DB structure with get_my_ministerios() function

-- Drop ALL old evento policies
DROP POLICY IF EXISTS "Authenticated insert evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated update evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated delete evento" ON public.evento;
DROP POLICY IF EXISTS evento_insert ON public.evento;
DROP POLICY IF EXISTS evento_update ON public.evento;
DROP POLICY IF EXISTS evento_delete ON public.evento;
DROP POLICY IF EXISTS evento_select ON public.evento;

-- ── EVENTO ──
-- Super admin can CRUD all eventos
-- Admin iglesia can CRUD eventos in their iglesia
-- Admin sede can CRUD eventos in their sedes
-- Lider can create/update eventos in ministerios they belong to (via get_my_ministerios)

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
        OR id_ministerio IN (SELECT get_my_ministerios())
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
      AND id_ministerio IN (SELECT get_my_ministerios())
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
      AND id_ministerio IN (SELECT get_my_ministerios())
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

CREATE POLICY evento_select ON public.evento
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_iglesia = get_my_tenant_id()
    OR id_ministerio IN (SELECT get_my_ministerios())
  );

-- Ensure authenticated role has permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento TO authenticated;
