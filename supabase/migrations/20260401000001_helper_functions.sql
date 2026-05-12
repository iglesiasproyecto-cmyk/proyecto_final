-- ============================================================
-- Helper Functions: RLS and authorization
-- Must run EARLY before any policies that use these functions
-- ============================================================

-- Check if current user is Super Admin
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

-- Get iglesias that current user administers
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

-- Check if current user is admin of a specific iglesia
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

-- Get ministerios where current user is a leader
CREATE OR REPLACE FUNCTION public.get_user_ministerios()
RETURNS TABLE(id_ministerio bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT mm.id_ministerio
  FROM public.miembro_ministerio mm
  WHERE mm.id_usuario = (
    SELECT id_usuario FROM public.usuario
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  )
  AND mm.fecha_salida IS NULL
  AND mm.rol_en_ministerio = 'Líder';
END;
$$;

-- Get current user ID
CREATE OR REPLACE FUNCTION public.current_usuario_id()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Check if user can read a module as a student
CREATE OR REPLACE FUNCTION public.can_read_modulo_as_student(p_id_modulo bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.modulo m
    JOIN public.curso c ON c.id_curso = m.id_curso
    JOIN public.proceso_asignado_curso p ON p.id_curso = c.id_curso
    JOIN public.detalle_proceso_curso d ON d.id_proceso_asignado_curso = p.id_proceso_asignado_curso
    WHERE m.id_modulo = p_id_modulo
      AND m.estado = 'publicado'
      AND c.estado = 'activo'
      AND d.id_usuario = public.current_usuario_id()
      AND d.estado IN ('inscrito', 'en_progreso')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_iglesias() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_of_iglesia(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_ministerios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_modulo_as_student(bigint) TO authenticated;
