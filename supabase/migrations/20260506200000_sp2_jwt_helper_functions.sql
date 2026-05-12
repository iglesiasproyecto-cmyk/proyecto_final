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
-- SKIP (defined in 20260415000000): CREATE OR REPLACE FUNCTION public.is_super_admin()
-- SKIP (defined in 20260415000000): RETURNS boolean
-- SKIP (defined in 20260415000000): LANGUAGE sql STABLE SECURITY DEFINER
-- SKIP (defined in 20260415000000): SET search_path = public
-- SKIP (defined in 20260415000000): AS $$
-- SKIP (defined in 20260415000000):   SELECT COALESCE(get_my_role() = 'super_admin', false);
-- SKIP (defined in 20260415000000): $$;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): CREATE OR REPLACE FUNCTION public.is_admin_iglesia()
-- SKIP (defined in 20260415000000): RETURNS boolean
-- SKIP (defined in 20260415000000): LANGUAGE sql STABLE SECURITY DEFINER
-- SKIP (defined in 20260415000000): SET search_path = public
-- SKIP (defined in 20260415000000): AS $$
-- SKIP (defined in 20260415000000):   SELECT COALESCE(get_my_role() = 'admin_iglesia', false);
-- SKIP (defined in 20260415000000): $$;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): -- ── Helper de usuario ────────────────────────────────────────────
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): CREATE OR REPLACE FUNCTION public.get_my_usuario_id()
-- SKIP (defined in 20260415000000): RETURNS bigint
-- SKIP (defined in 20260415000000): LANGUAGE sql STABLE SECURITY DEFINER
-- SKIP (defined in 20260415000000): SET search_path = public
-- SKIP (defined in 20260415000000): AS $$
-- SKIP (defined in 20260415000000):   SELECT id_usuario
-- SKIP (defined in 20260415000000):   FROM public.usuario
-- SKIP (defined in 20260415000000):   WHERE auth_user_id = auth.uid()
-- SKIP (defined in 20260415000000):     AND deleted_at IS NULL
-- SKIP (defined in 20260415000000):   LIMIT 1;
-- SKIP (defined in 20260415000000): $$;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): -- ── Helper de ministerios ────────────────────────────────────────
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): CREATE OR REPLACE FUNCTION public.get_my_ministerios()
-- SKIP (defined in 20260415000000): RETURNS TABLE(id bigint)
-- SKIP (defined in 20260415000000): LANGUAGE sql STABLE SECURITY DEFINER
-- SKIP (defined in 20260415000000): SET search_path = public
-- SKIP (defined in 20260415000000): AS $$
-- SKIP (defined in 20260415000000):   SELECT mm.id_ministerio
-- SKIP (defined in 20260415000000):   FROM public.miembro_ministerio mm
-- SKIP (defined in 20260415000000):   WHERE mm.id_usuario = get_my_usuario_id()
-- SKIP (defined in 20260415000000):     AND mm.fecha_salida IS NULL;
-- SKIP (defined in 20260415000000): $$;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): -- Verificar si el usuario autenticado tiene acceso a una iglesia específica
-- SKIP (defined in 20260415000000): CREATE OR REPLACE FUNCTION public.can_access_iglesia(p_id_iglesia bigint)
-- SKIP (defined in 20260415000000): RETURNS boolean
-- SKIP (defined in 20260415000000): LANGUAGE sql STABLE SECURITY DEFINER
-- SKIP (defined in 20260415000000): SET search_path = public
-- SKIP (defined in 20260415000000): AS $$
-- SKIP (defined in 20260415000000):   SELECT is_super_admin()
-- SKIP (defined in 20260415000000):       OR (
-- SKIP (defined in 20260415000000):         get_my_role() IN ('admin_iglesia', 'lider', 'servidor')
-- SKIP (defined in 20260415000000):         AND get_my_tenant_id() = p_id_iglesia
-- SKIP (defined in 20260415000000):       );
-- SKIP (defined in 20260415000000): $$;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): -- Grants
-- SKIP (defined in 20260415000000): REVOKE EXECUTE ON FUNCTION public.get_my_tenant_id() FROM public, anon;
-- SKIP (defined in 20260415000000): REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM public, anon;
-- SKIP (defined in 20260415000000): REVOKE EXECUTE ON FUNCTION public.get_my_usuario_id() FROM public, anon;
-- SKIP (defined in 20260415000000): REVOKE EXECUTE ON FUNCTION public.get_my_ministerios() FROM public, anon;
-- SKIP (defined in 20260415000000): REVOKE EXECUTE ON FUNCTION public.can_access_iglesia(bigint) FROM public, anon;
-- SKIP (defined in 20260415000000): GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
-- SKIP (defined in 20260415000000): GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
-- SKIP (defined in 20260415000000): GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
-- SKIP (defined in 20260415000000): GRANT EXECUTE ON FUNCTION public.is_admin_iglesia() TO authenticated;
-- SKIP (defined in 20260415000000): GRANT EXECUTE ON FUNCTION public.get_my_usuario_id() TO authenticated;
-- SKIP (defined in 20260415000000): GRANT EXECUTE ON FUNCTION public.get_my_ministerios() TO authenticated;
-- SKIP (defined in 20260415000000): GRANT EXECUTE ON FUNCTION public.can_access_iglesia(bigint) TO authenticated;
