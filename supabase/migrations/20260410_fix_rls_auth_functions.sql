-- ============================================================
-- Fix: función SECURITY DEFINER para buscar usuario por auth_user_id
-- Esto bypasea RLS y evita el cuelgue en el login
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Función que busca el usuario actual (bypasea RLS)
CREATE OR REPLACE FUNCTION public.get_my_usuario()
RETURNS SETOF public.usuario
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.usuario
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Dar acceso a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_my_usuario() TO authenticated;

-- Función para obtener roles del usuario actual (bypasea RLS)
-- Super Admin no requiere iglesia asignada, otros roles sí
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE (
  id_rol bigint,
  fecha_fin date,
  rol_nombre text,
  iglesia_id bigint,
  iglesia_nombre text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    ur.id_rol,
    ur.fecha_fin,
    r.nombre AS rol_nombre,
    CASE
      WHEN r.nombre = 'Super Administrador' THEN NULL
      ELSE i.id_iglesia
    END AS iglesia_id,
    CASE
      WHEN r.nombre = 'Super Administrador' THEN NULL
      ELSE i.nombre
    END AS iglesia_nombre
  FROM public.usuario_rol ur
  JOIN public.rol r ON r.id_rol = ur.id_rol
  LEFT JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia
  WHERE ur.id_usuario = (
    SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1
  )
  AND ur.fecha_fin IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

-- Función para contar notificaciones no leídas
CREATE OR REPLACE FUNCTION public.get_my_unread_notifications_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.notificacion
  WHERE id_usuario = (
    SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1
  )
  AND leida = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_unread_notifications_count() TO authenticated;
