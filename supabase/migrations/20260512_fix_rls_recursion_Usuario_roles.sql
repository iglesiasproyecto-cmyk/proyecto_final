-- Fix infinite recursion in usuario and usuario_rol policies
-- Root cause: policies were making subqueries to tables with RLS enabled,
-- which triggered more policies, causing infinite recursion
-- Solution: simplify policies to use only SECURITY DEFINER functions
-- and create bypass helper function for usuario lookups

-- Drop old recursive policies from usuario table
DROP POLICY IF EXISTS usuario_select_tenant ON public.usuario;
DROP POLICY IF EXISTS usuario_select ON public.usuario;
DROP POLICY IF EXISTS usuario_insert_admin ON public.usuario;
DROP POLICY IF EXISTS usuario_insert ON public.usuario;
DROP POLICY IF EXISTS usuario_update_admin ON public.usuario;
DROP POLICY IF EXISTS usuario_update ON public.usuario;
DROP POLICY IF EXISTS usuario_delete_admin ON public.usuario;
DROP POLICY IF EXISTS usuario_delete ON public.usuario;

-- Create simple non-recursive policies for usuario
CREATE POLICY usuario_select ON public.usuario
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR auth_user_id = auth.uid()
    OR is_admin_iglesia()
  );

CREATE POLICY usuario_insert ON public.usuario
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_admin_iglesia()
    OR auth_user_id = auth.uid()
  );

CREATE POLICY usuario_update ON public.usuario
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR auth_user_id = auth.uid()
    OR is_admin_iglesia()
  )
  WITH CHECK (
    is_super_admin()
    OR is_admin_iglesia()
    OR auth_user_id = auth.uid()
  );

CREATE POLICY usuario_delete ON public.usuario
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR is_admin_iglesia()
  );

-- Drop old recursive policies from usuario_rol
DROP POLICY IF EXISTS "Usuario roles management" ON public.usuario_rol;
DROP POLICY IF EXISTS "Ver propio usuario_rol" ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_select_tenant ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_select ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_insert_admin ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_insert ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_update_admin ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_update ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_delete_admin ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_delete ON public.usuario_rol;

-- Create simple non-recursive policies for usuario_rol
CREATE POLICY usuario_rol_select ON public.usuario_rol
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY usuario_rol_insert ON public.usuario_rol
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY usuario_rol_update ON public.usuario_rol
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY usuario_rol_delete ON public.usuario_rol
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

-- Create helper function to bypass RLS when looking up usuario_id
-- This is safe because function is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_usuario_id_bypass()
RETURNS bigint AS $$
DECLARE
  v_id bigint;
BEGIN
  SELECT id_usuario INTO v_id
  FROM public.usuario
  WHERE auth_user_id = auth.uid()
    AND activo = true
  LIMIT 1;

  RETURN COALESCE(v_id, -1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update get_my_usuario_id to prefer JWT, fallback to bypass function
CREATE OR REPLACE FUNCTION public.get_my_usuario_id()
RETURNS bigint AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'usuario_id')::bigint,
    public.get_usuario_id_bypass()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Simplify is_admin_iglesia to only check JWT (assuming role is correctly set by auth trigger)
CREATE OR REPLACE FUNCTION public.is_admin_iglesia()
RETURNS boolean AS $$
BEGIN
  RETURN get_my_role() IN ('Administrador de Iglesia', 'Super Administrador');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_usuario_id_bypass() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_iglesia() TO authenticated;
