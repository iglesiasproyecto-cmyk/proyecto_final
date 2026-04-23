-- Security hardening: tenant scope for usuario visibility and usuario_rol mutations.

-- Helper to validate iglesia scope (super admin global, admin iglesia scoped).
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

GRANT EXECUTE ON FUNCTION public.is_admin_of_iglesia(bigint) TO authenticated;

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

GRANT EXECUTE ON FUNCTION public.is_super_admin_role(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_role(bigint) TO authenticated;

-- Scope SELECT on usuario: self, super admin, or users belonging to iglesias under admin scope.
DROP POLICY IF EXISTS "Scoped select usuario por iglesia" ON public.usuario;

CREATE POLICY "Scoped select usuario por iglesia"
  ON public.usuario FOR SELECT
  TO authenticated
  USING (
    auth_user_id = (SELECT auth.uid())
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuario_rol ur_target
      WHERE ur_target.id_usuario = usuario.id_usuario
        AND ur_target.fecha_fin IS NULL
        AND public.is_admin_of_iglesia(ur_target.id_iglesia)
    )
  );

-- Replace permissive UPDATE with scoped UPDATE.
DROP POLICY IF EXISTS "Authenticated update usuario" ON public.usuario;
DROP POLICY IF EXISTS "Scoped update usuario" ON public.usuario;

CREATE POLICY "Scoped update usuario"
  ON public.usuario FOR UPDATE
  TO authenticated
  USING (
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
  WITH CHECK (
    auth_user_id = (SELECT auth.uid())
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuario_rol ur_target
      WHERE ur_target.id_usuario = usuario.id_usuario
        AND ur_target.fecha_fin IS NULL
        AND public.is_admin_of_iglesia(ur_target.id_iglesia)
    )
  );

-- Replace permissive usuario_rol mutation policies with scoped ones.
DROP POLICY IF EXISTS "Authenticated insert usuario_rol" ON public.usuario_rol;
DROP POLICY IF EXISTS "Authenticated update usuario_rol" ON public.usuario_rol;
DROP POLICY IF EXISTS "Authenticated delete usuario_rol" ON public.usuario_rol;
DROP POLICY IF EXISTS "Scoped insert usuario_rol" ON public.usuario_rol;
DROP POLICY IF EXISTS "Scoped update usuario_rol" ON public.usuario_rol;
DROP POLICY IF EXISTS "Scoped delete usuario_rol" ON public.usuario_rol;

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

-- Scope RPC list to own iglesia visibility (super admin keeps global view).
CREATE OR REPLACE FUNCTION public.get_all_usuarios_enriquecidos()
RETURNS TABLE (
  id_usuario bigint,
  nombres text,
  apellidos text,
  correo text,
  telefono text,
  activo boolean,
  ultimo_acceso timestamptz,
  auth_user_id uuid,
  creado_en timestamptz,
  updated_at timestamptz,
  roles jsonb,
  ministerios jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id_usuario,
    u.nombres,
    u.apellidos,
    u.correo,
    u.telefono,
    u.activo,
    u.ultimo_acceso,
    u.auth_user_id,
    u.creado_en,
    u.updated_at,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id_usuario_rol', ur.id_usuario_rol,
          'id_rol', ur.id_rol,
          'id_iglesia', ur.id_iglesia,
          'fecha_fin', ur.fecha_fin,
          'rol_nombre', r.nombre,
          'iglesia_nombre', i.nombre
        )
      )
      FROM public.usuario_rol ur
      JOIN public.rol r ON r.id_rol = ur.id_rol
      JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia
      WHERE ur.id_usuario = u.id_usuario
    ), '[]'::jsonb) AS roles,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id_miembro_ministerio', mm.id_miembro_ministerio,
          'activo', mm.fecha_salida IS NULL,
          'rol_en_ministerio', mm.rol_en_ministerio,
          'fecha_salida', mm.fecha_salida,
          'ministerio_nombre', m.nombre
        )
      )
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = u.id_usuario
    ), '[]'::jsonb) AS ministerios
  FROM public.usuario u
  WHERE
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuario_rol ur_target
      WHERE ur_target.id_usuario = u.id_usuario
        AND ur_target.fecha_fin IS NULL
        AND ur_target.id_iglesia IN (SELECT g.id_iglesia FROM public.get_user_iglesias() g)
    )
  ORDER BY u.apellidos, u.nombres;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() TO authenticated;
