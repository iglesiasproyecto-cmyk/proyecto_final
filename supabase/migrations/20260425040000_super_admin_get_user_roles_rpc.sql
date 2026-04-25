-- Función RPC para que Super Admin pueda ver roles de cualquier usuario
CREATE OR REPLACE FUNCTION public.get_usuario_roles_admin(target_usuario_id bigint)
RETURNS TABLE (
  id_usuario_rol bigint,
  id_usuario bigint,
  id_rol bigint,
  id_iglesia bigint,
  id_sede bigint,
  fecha_inicio date,
  fecha_fin date,
  creado_en timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ur.id_usuario_rol,
    ur.id_usuario,
    ur.id_rol,
    ur.id_iglesia,
    ur.id_sede,
    ur.fecha_inicio,
    ur.fecha_fin,
    ur.creado_en,
    ur.updated_at
  FROM usuario_rol ur
  WHERE ur.id_usuario = target_usuario_id
    AND ur.fecha_fin IS NULL;
$$;

-- Solo Super Admin puede usar esta función
GRANT EXECUTE ON FUNCTION public.get_usuario_roles_admin(bigint) TO authenticated;