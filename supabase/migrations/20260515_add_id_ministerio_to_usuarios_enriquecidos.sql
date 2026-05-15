-- Add id_ministerio to usuarios enriquecidos RPC functions for scope filtering

-- Update get_all_usuarios_enriquecidos to include id_ministerio
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
    u.nombres::text,
    u.apellidos::text,
    u.correo::text,
    u.telefono::text,
    u.activo,
    u.ultimo_acceso,
    u.auth_user_id,
    u.creado_en,
    u.updated_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_usuario_rol', ur.id_usuario_rol,
        'id_rol',         ur.id_rol,
        'id_iglesia',     ur.id_iglesia,
        'fecha_fin',      ur.fecha_fin,
        'rol_nombre',     r.nombre,
        'iglesia_nombre', i.nombre
      ))
      FROM public.usuario_rol ur
      JOIN public.rol r ON r.id_rol = ur.id_rol
      LEFT JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia
      WHERE ur.id_usuario = u.id_usuario
        AND ur.fecha_fin IS NULL
    ), '[]'::jsonb) AS roles,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_ministerio',         mm.id_ministerio,
        'id_miembro_ministerio', mm.id_miembro_ministerio,
        'activo',                mm.fecha_salida IS NULL,
        'rol_en_ministerio',     mm.rol_en_ministerio,
        'ministerio_nombre',     m.nombre
      ))
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = u.id_usuario
        AND mm.fecha_salida IS NULL
    ), '[]'::jsonb) AS ministerios
  FROM public.usuario u
  WHERE u.deleted_at IS NULL
  ORDER BY u.apellidos, u.nombres;
$$;

-- Update get_usuarios_by_iglesia to include id_ministerio
CREATE OR REPLACE FUNCTION public.get_usuarios_by_iglesia(p_id_iglesia bigint)
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
    u.nombres::text,
    u.apellidos::text,
    u.correo::text,
    u.telefono::text,
    u.activo,
    u.ultimo_acceso,
    u.auth_user_id,
    u.creado_en,
    u.updated_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_usuario_rol', ur.id_usuario_rol,
        'id_rol',         ur.id_rol,
        'id_iglesia',     ur.id_iglesia,
        'fecha_fin',      ur.fecha_fin,
        'rol_nombre',     r.nombre,
        'iglesia_nombre', i.nombre
      ))
      FROM public.usuario_rol ur
      JOIN public.rol r ON r.id_rol = ur.id_rol
      LEFT JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia
      WHERE ur.id_usuario = u.id_usuario
        AND ur.fecha_fin IS NULL
    ), '[]'::jsonb) AS roles,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_ministerio',         mm.id_ministerio,
        'id_miembro_ministerio', mm.id_miembro_ministerio,
        'activo',                mm.fecha_salida IS NULL,
        'rol_en_ministerio',     mm.rol_en_ministerio,
        'ministerio_nombre',     m.nombre
      ))
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = u.id_usuario
        AND mm.fecha_salida IS NULL
    ), '[]'::jsonb) AS ministerios
  FROM public.usuario u
  WHERE u.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.usuario_rol ur
      WHERE ur.id_usuario  = u.id_usuario
        AND ur.id_iglesia   = p_id_iglesia
        AND ur.fecha_fin   IS NULL
    )
  ORDER BY u.apellidos, u.nombres;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_usuarios_by_iglesia(bigint) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.get_usuarios_by_iglesia(bigint) TO authenticated;
