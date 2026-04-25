-- Mejorar políticas RLS para que Super Admin pueda gestionar roles de usuarios
-- Permitir que Super Admin vea roles para gestión, pero mantener restricciones para otros usuarios

-- Actualizar política existente
DROP POLICY IF EXISTS "Usuario roles access" ON public.usuario_rol;
DROP POLICY IF EXISTS "Usuario ve sus roles" ON public.usuario_rol;
DROP POLICY IF EXISTS "SuperAdmin view all usuario_rol" ON public.usuario_rol;

-- Política que permite a Super Admin ver todos los roles para gestión
CREATE POLICY "Usuario roles management"
  ON public.usuario_rol FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()  -- Super Admin puede ver todo para gestión
    OR id_usuario = public.current_usuario_id()  -- Usuario ve sus propios roles
  );

-- Mantener políticas de modificación restrictivas
-- (ya existen políticas Scoped para INSERT/UPDATE/DELETE)