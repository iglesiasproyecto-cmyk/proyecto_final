-- Phase A: hardening user management scope for Administrador de Iglesia
-- Goal: enforce tenant boundaries for usuario and usuario_rol mutations.

-- -------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER with fixed search_path)
-- -------------------------------------------------------------------

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
    WHERE ur.id_usuario = (
      SELECT id_usuario
      FROM public.usuario
      WHERE auth_user_id = (SELECT auth.uid())
      LIMIT 1
    )
    AND ur.fecha_fin IS NULL
    AND r.nombre = 'Super Administrador'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_iglesias()
RETURNS TABLE(id_iglesia bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ur.id_iglesia
  FROM public.usuario_rol ur
  JOIN public.rol r ON r.id_rol = ur.id_rol
  WHERE ur.id_usuario = (
    SELECT id_usuario
    FROM public.usuario
    WHERE auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
  AND ur.fecha_fin IS NULL
  AND r.nombre IN ('Super Administrador', 'Administrador de Iglesia');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_iglesia(target_iglesia_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.get_user_iglesias() g
      WHERE g.id_iglesia = target_iglesia_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_role(target_role_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rol r
    WHERE r.id_rol = target_role_id
      AND r.nombre = 'Super Administrador'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_assign_role(target_role_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR NOT public.is_super_admin_role(target_role_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_iglesias() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_of_iglesia(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin_role(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_role(bigint) TO authenticated;

-- -------------------------------------------------------------------
-- usuario policies
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated update usuario" ON public.usuario;

CREATE POLICY "Scoped update usuario"
  ON public.usuario FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      auth_user_id = (SELECT auth.uid())
      OR public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.usuario_rol ur_target
        WHERE ur_target.id_usuario = usuario.id_usuario
          AND ur_target.fecha_fin IS NULL
          AND public.is_admin_of_iglesia(ur_target.id_iglesia)
      )
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      auth_user_id = (SELECT auth.uid())
      OR public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.usuario_rol ur_target
        WHERE ur_target.id_usuario = usuario.id_usuario
          AND ur_target.fecha_fin IS NULL
          AND public.is_admin_of_iglesia(ur_target.id_iglesia)
      )
    )
  );

-- -------------------------------------------------------------------
-- usuario_rol policies
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated insert usuario_rol" ON public.usuario_rol;
DROP POLICY IF EXISTS "Authenticated update usuario_rol" ON public.usuario_rol;
DROP POLICY IF EXISTS "Authenticated delete usuario_rol" ON public.usuario_rol;

CREATE POLICY "Scoped insert usuario_rol"
  ON public.usuario_rol FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_of_iglesia(id_iglesia)
    AND public.can_assign_role(id_rol)
  );

CREATE POLICY "Scoped update usuario_rol"
  ON public.usuario_rol FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_of_iglesia(id_iglesia)
    AND public.can_assign_role(id_rol)
  )
  WITH CHECK (
    public.is_admin_of_iglesia(id_iglesia)
    AND public.can_assign_role(id_rol)
  );

CREATE POLICY "Scoped delete usuario_rol"
  ON public.usuario_rol FOR DELETE
  TO authenticated
  USING (
    public.is_admin_of_iglesia(id_iglesia)
    AND public.can_assign_role(id_rol)
  );
