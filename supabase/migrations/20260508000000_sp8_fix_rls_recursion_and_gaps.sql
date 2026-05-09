-- SP-8: Fix infinite recursion in usuario RLS, stale ministerio policies,
--        and add missing RLS for usuario_rol_sede.
--
-- Root causes fixed:
--  1. get_my_usuario_id() was LANGUAGE sql → PostgreSQL planner inlines it into
--     every policy that calls it. When that policy is on `usuario`, the planner
--     sees `SELECT FROM usuario` nested inside `usuario`'s own policy → 42P17.
--     Fix: convert to LANGUAGE plpgsql (opaque to planner, no inlining).
--
--  2. Old "Lectura ministerios Líderes" policy on ministerio calls
--     get_user_ministerios() which references mm.rol_ministerio (column was
--     renamed to rol_en_ministerio) → SQL error → HTTP 500.
--     Fix: drop the stale policy (ministerio_select_tenant from sp2 covers it).
--
--  3. usuario_rol_sede has no RLS policies → all rows blocked → HTTP 500.
--     Fix: add tenant-scoped policies.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Fix get_my_usuario_id() — sql → plpgsql prevents planner inlining
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_usuario_id()
RETURNS bigint
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  SELECT id_usuario INTO v_id
  FROM public.usuario
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
  RETURN v_id;
END;
$$;

-- Fix get_my_ministerios() for consistency (also sql → plpgsql)
CREATE OR REPLACE FUNCTION public.get_my_ministerios()
RETURNS TABLE(id bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT mm.id_ministerio
  FROM public.miembro_ministerio mm
  WHERE mm.id_usuario = get_my_usuario_id()
    AND mm.fecha_salida IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_ministerios() TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Clean up ALL stale SELECT/UPDATE policies on usuario
--    (accumulated from phases 1–A and sp2 without full cleanup)
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop every known SELECT policy name on usuario
DROP POLICY IF EXISTS "Usuario ve su propio perfil"       ON public.usuario;
DROP POLICY IF EXISTS "Scoped select usuario por iglesia" ON public.usuario;
DROP POLICY IF EXISTS "Acceso autenticado usuarios"       ON public.usuario;
DROP POLICY IF EXISTS "Acceso desarrollo"                 ON public.usuario;
DROP POLICY IF EXISTS "usuario_select_tenant"             ON public.usuario;
DROP POLICY IF EXISTS "usuario super admin"               ON public.usuario;

-- Drop every known UPDATE policy name on usuario
DROP POLICY IF EXISTS "Authenticated update usuario"      ON public.usuario;
DROP POLICY IF EXISTS "Scoped update usuario"             ON public.usuario;
DROP POLICY IF EXISTS "usuario_update_admin"              ON public.usuario;

-- Drop every known INSERT policy name on usuario
DROP POLICY IF EXISTS "usuario_insert_admin"              ON public.usuario;

-- Drop every known DELETE policy name on usuario
DROP POLICY IF EXISTS "usuario_delete_admin"              ON public.usuario;
DROP POLICY IF EXISTS "delete_usuario_super_admin"        ON public.usuario;

-- ── Recreate clean, canonical usuario policies ───────────────────────────────

CREATE POLICY "usuario_select_tenant" ON public.usuario
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR auth_user_id = auth.uid()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.usuario_rol ur
        WHERE ur.id_usuario = usuario.id_usuario
          AND ur.id_iglesia = get_my_tenant_id()
          AND ur.fecha_fin IS NULL
      )
    )
    OR (
      get_my_role() IN ('lider', 'servidor')
      AND EXISTS (
        SELECT 1 FROM public.miembro_ministerio mm
        JOIN public.miembro_ministerio mm2 ON mm2.id_ministerio = mm.id_ministerio
        WHERE mm2.id_usuario = get_my_usuario_id()
          AND mm.id_usuario = usuario.id_usuario
          AND mm.fecha_salida IS NULL
          AND mm2.fecha_salida IS NULL
      )
    )
  );

CREATE POLICY "usuario_insert_admin" ON public.usuario
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR is_admin_iglesia() OR auth_user_id = auth.uid());

CREATE POLICY "usuario_update_admin" ON public.usuario
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR auth_user_id = auth.uid()
    OR (is_admin_iglesia() AND EXISTS (
      SELECT 1 FROM public.usuario_rol ur
      WHERE ur.id_usuario = usuario.id_usuario
        AND ur.id_iglesia = get_my_tenant_id()
        AND ur.fecha_fin IS NULL
    ))
  )
  WITH CHECK (is_super_admin() OR is_admin_iglesia() OR auth_user_id = auth.uid());

CREATE POLICY "usuario_delete_admin" ON public.usuario
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND EXISTS (
      SELECT 1 FROM public.usuario_rol ur
      WHERE ur.id_usuario = usuario.id_usuario
        AND ur.id_iglesia = get_my_tenant_id()
        AND ur.fecha_fin IS NULL
    ))
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Clean up stale usuario_rol SELECT policy
--    "Usuario ve sus roles" (20260407031130) — has inline SELECT FROM usuario
--    which re-triggers usuario's RLS. Replaced by usuario_rol_select_tenant.
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Usuario ve sus roles"        ON public.usuario_rol;
DROP POLICY IF EXISTS "Scoped insert usuario_rol"   ON public.usuario_rol;
DROP POLICY IF EXISTS "Scoped update usuario_rol"   ON public.usuario_rol;
DROP POLICY IF EXISTS "Scoped delete usuario_rol"   ON public.usuario_rol;
DROP POLICY IF EXISTS "usuario_rol_select_tenant"   ON public.usuario_rol;
DROP POLICY IF EXISTS "usuario_rol_insert_admin"    ON public.usuario_rol;
DROP POLICY IF EXISTS "usuario_rol_update_admin"    ON public.usuario_rol;
DROP POLICY IF EXISTS "usuario_rol_delete_admin"    ON public.usuario_rol;
DROP POLICY IF EXISTS "usuario_rol super admin"     ON public.usuario_rol;

CREATE POLICY "usuario_rol_select_tenant" ON public.usuario_rol
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY "usuario_rol_insert_admin" ON public.usuario_rol
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_iglesia = get_my_tenant_id()
      AND id_rol NOT IN (SELECT id_rol FROM public.rol WHERE nombre ILIKE '%super%')
    )
  );

CREATE POLICY "usuario_rol_update_admin" ON public.usuario_rol
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()))
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()
      AND id_rol NOT IN (SELECT id_rol FROM public.rol WHERE nombre ILIKE '%super%'))
  );

CREATE POLICY "usuario_rol_delete_admin" ON public.usuario_rol
  FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Fix ministerio: drop stale policies calling get_user_ministerios()
--    (function references mm.rol_ministerio which no longer exists → 500)
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Lectura ministerios Líderes"     ON public.ministerio;
DROP POLICY IF EXISTS "Lectura autenticada"              ON public.ministerio;
DROP POLICY IF EXISTS "Líderes insert ministerio"        ON public.ministerio;
DROP POLICY IF EXISTS "Líderes update ministerio"        ON public.ministerio;
DROP POLICY IF EXISTS "Líderes delete ministerio"        ON public.ministerio;
DROP POLICY IF EXISTS "ministerio super admin"           ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_select_tenant"         ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_insert_admin"          ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_update_admin_lider"    ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_delete_admin"          ON public.ministerio;

CREATE POLICY "ministerio_select_tenant" ON public.ministerio
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.sede s
      WHERE s.id_sede = ministerio.id_sede
        AND s.id_iglesia = get_my_tenant_id()
    )
  );

CREATE POLICY "ministerio_insert_admin" ON public.ministerio
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = id_sede
          AND s.id_iglesia = get_my_tenant_id()
      )
    )
  );

CREATE POLICY "ministerio_update_admin_lider" ON public.ministerio
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND EXISTS (
      SELECT 1 FROM public.sede s
      WHERE s.id_sede = ministerio.id_sede AND s.id_iglesia = get_my_tenant_id()
    ))
    OR id_ministerio IN (SELECT id FROM get_my_ministerios())
  )
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND EXISTS (
      SELECT 1 FROM public.sede s
      WHERE s.id_sede = id_sede AND s.id_iglesia = get_my_tenant_id()
    ))
  );

CREATE POLICY "ministerio_delete_admin" ON public.ministerio
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND EXISTS (
      SELECT 1 FROM public.sede s
      WHERE s.id_sede = ministerio.id_sede AND s.id_iglesia = get_my_tenant_id()
    ))
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Add RLS for usuario_rol_sede (no policies existed → all rows blocked)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.usuario_rol_sede ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuario_rol_sede_select ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_insert ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_update ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_delete ON public.usuario_rol_sede;

CREATE POLICY usuario_rol_sede_select ON public.usuario_rol_sede
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY usuario_rol_sede_insert ON public.usuario_rol_sede
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY usuario_rol_sede_update ON public.usuario_rol_sede
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()))
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

CREATE POLICY usuario_rol_sede_delete ON public.usuario_rol_sede
  FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));
