-- supabase/migrations/20260506200000_sp2_jwt_helper_functions.sql

-- ── Helpers de JWT ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::bigint;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- Reemplaza la función existente manteniendo retrocompatibilidad
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(get_my_role() = 'super_admin', false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_iglesia()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(get_my_role() = 'admin_iglesia', false);
$$;

-- ── Helper de usuario ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_usuario_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id_usuario
  FROM public.usuario
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- ── Helper de ministerios ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_ministerios()
RETURNS TABLE(id bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mm.id_ministerio
  FROM public.miembro_ministerio mm
  WHERE mm.id_usuario = get_my_usuario_id()
    AND mm.fecha_salida IS NULL;
$$;

-- Verificar si el usuario autenticado tiene acceso a una iglesia específica
CREATE OR REPLACE FUNCTION public.can_access_iglesia(p_id_iglesia bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
      OR (
        get_my_role() IN ('admin_iglesia', 'lider', 'servidor')
        AND get_my_tenant_id() = p_id_iglesia
      );
$$;

-- Grants
REVOKE EXECUTE ON FUNCTION public.get_my_tenant_id() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_usuario_id() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_ministerios() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_iglesia(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_iglesia() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_ministerios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_iglesia(bigint) TO authenticated;
