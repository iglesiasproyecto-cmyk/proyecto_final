-- Implement iglesia-based RLS for usuario table
-- Admin can only see users from their church

-- Drop existing usuario SELECT policies
DROP POLICY IF EXISTS usuario_select ON public.usuario;

-- Create new SELECT policy that filters by iglesia
CREATE POLICY usuario_select ON public.usuario
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR auth_user_id = auth.uid()
    OR (
      is_admin_iglesia()
      AND id_usuario IN (
        SELECT DISTINCT id_usuario
        FROM public.usuario_rol
        WHERE id_iglesia = get_my_tenant_id()
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.usuario_rol ur
        WHERE ur.id_usuario = id_usuario
          AND ur.id_iglesia = get_my_tenant_id()
          AND ur.rol_en_usuario_rol != 'Administrador de Iglesia'
      )
    )
  );

-- Drop existing usuario_rol SELECT policy
DROP POLICY IF EXISTS usuario_rol_select ON public.usuario_rol;

-- Create new usuario_rol SELECT policy that filters by iglesia
CREATE POLICY usuario_rol_select ON public.usuario_rol
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_lider() AND id_iglesia = get_my_tenant_id()
    )
  );

-- Drop existing usuario_rol_sede SELECT policy if it exists
DROP POLICY IF EXISTS usuario_rol_sede_select ON public.usuario_rol_sede;

-- Create new usuario_rol_sede SELECT policy that filters by sede
CREATE POLICY usuario_rol_sede_select ON public.usuario_rol_sede
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND id_sede IN (
        SELECT DISTINCT id_sede
        FROM public.usuario_rol_sede
        WHERE id_usuario = get_my_usuario_id()
      )
    )
    OR (
      is_lider() AND id_iglesia = get_my_tenant_id()
    )
  );

GRANT SELECT ON public.usuario TO authenticated;
GRANT SELECT ON public.usuario_rol TO authenticated;
GRANT SELECT ON public.usuario_rol_sede TO authenticated;
