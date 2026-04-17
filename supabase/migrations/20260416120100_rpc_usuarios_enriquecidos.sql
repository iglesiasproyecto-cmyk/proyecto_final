-- RPC para listar usuarios enriquecidos sin quedar bloqueado por RLS en joins.
-- SECURITY DEFINER se usa de forma explícita y con search_path fijo.

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
  ORDER BY u.apellidos, u.nombres;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() TO authenticated;
