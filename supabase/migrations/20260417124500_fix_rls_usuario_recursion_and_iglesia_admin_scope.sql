-- Fix production incident:
-- 1) Remove RLS recursion on public.usuario policy evaluation.
-- 2) Allow Super Administrador through iglesia admin helper.
-- 3) Replace direct usuario lookups in dependent policies.

CREATE OR REPLACE FUNCTION public.current_usuario_id()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  SELECT u.id_usuario
    INTO v_id
  FROM public.usuario u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_usuario_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_iglesias()
RETURNS TABLE(id_iglesia bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ur.id_iglesia
  FROM public.usuario_rol ur
  WHERE ur.id_usuario = public.current_usuario_id()
    AND ur.id_iglesia IS NOT NULL
    AND ur.fecha_fin IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = public.current_usuario_id()
      AND ur.fecha_fin IS NULL
      AND r.nombre = 'Super Administrador'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_iglesia()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = public.current_usuario_id()
      AND ur.fecha_fin IS NULL
      AND r.nombre = 'Administrador de Iglesia'
  );
END;
$$;

DROP POLICY IF EXISTS "Scoped select usuario por iglesia" ON public.usuario;
DROP POLICY IF EXISTS "Scoped update usuario" ON public.usuario;

CREATE POLICY "Scoped select usuario por iglesia"
  ON public.usuario FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuario_rol ur_me
      JOIN public.usuario_rol ur_target
        ON ur_target.id_iglesia = ur_me.id_iglesia
       AND ur_target.fecha_fin IS NULL
      WHERE ur_me.id_usuario = public.current_usuario_id()
        AND ur_me.fecha_fin IS NULL
        AND ur_me.id_iglesia IS NOT NULL
        AND ur_target.id_usuario = usuario.id_usuario
    )
  );

CREATE POLICY "Scoped update usuario"
  ON public.usuario FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuario_rol ur_me
      JOIN public.rol r_me ON r_me.id_rol = ur_me.id_rol
      JOIN public.usuario_rol ur_target
        ON ur_target.id_iglesia = ur_me.id_iglesia
       AND ur_target.fecha_fin IS NULL
      WHERE ur_me.id_usuario = public.current_usuario_id()
        AND ur_me.fecha_fin IS NULL
        AND ur_me.id_iglesia IS NOT NULL
        AND r_me.nombre IN ('Administrador de Iglesia')
        AND ur_target.id_usuario = usuario.id_usuario
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuario_rol ur_me
      JOIN public.rol r_me ON r_me.id_rol = ur_me.id_rol
      JOIN public.usuario_rol ur_target
        ON ur_target.id_iglesia = ur_me.id_iglesia
       AND ur_target.fecha_fin IS NULL
      WHERE ur_me.id_usuario = public.current_usuario_id()
        AND ur_me.fecha_fin IS NULL
        AND ur_me.id_iglesia IS NOT NULL
        AND r_me.nombre IN ('Administrador de Iglesia')
        AND ur_target.id_usuario = usuario.id_usuario
    )
  );

DROP POLICY IF EXISTS "Usuario ve sus roles" ON public.usuario_rol;
CREATE POLICY "Usuario ve sus roles"
  ON public.usuario_rol FOR SELECT
  TO authenticated
  USING (id_usuario = public.current_usuario_id());

DROP POLICY IF EXISTS "Usuario ve sus evaluaciones" ON public.evaluacion;
CREATE POLICY "Usuario ve sus evaluaciones"
  ON public.evaluacion FOR SELECT
  TO authenticated
  USING (id_usuario = public.current_usuario_id());

DROP POLICY IF EXISTS "Usuario ve sus notificaciones" ON public.notificacion;
CREATE POLICY "Usuario ve sus notificaciones"
  ON public.notificacion FOR SELECT
  TO authenticated
  USING (id_usuario = public.current_usuario_id());