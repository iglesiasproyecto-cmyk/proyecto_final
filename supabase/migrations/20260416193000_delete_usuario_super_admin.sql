-- Super Admin delete flow for usuarios.
-- Strategy:
-- 1) Verify actor is super admin and not deleting self.
-- 2) Close active role/membership links.
-- 3) Try hard delete from public.usuario.
-- 4) If FK blocks hard delete, fallback to soft anonymization.

CREATE OR REPLACE FUNCTION public.delete_usuario_super_admin(target_usuario_id bigint)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_usuario_id bigint;
  target_exists boolean;
  active_super_admins bigint;
  delete_mode text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado para eliminar usuarios';
  END IF;

  SELECT u.id_usuario
  INTO actor_usuario_id
  FROM public.usuario u
  WHERE u.auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF actor_usuario_id IS NOT NULL AND actor_usuario_id = target_usuario_id THEN
    RAISE EXCEPTION 'No puedes eliminar tu propio usuario';
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.usuario u
    WHERE u.id_usuario = target_usuario_id
  ) INTO target_exists;

  IF NOT target_exists THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = target_usuario_id
      AND ur.fecha_fin IS NULL
      AND r.nombre = 'Super Administrador'
  ) THEN
    SELECT COUNT(*)
    INTO active_super_admins
    FROM public.usuario_rol ur
    JOIN public.rol r ON r.id_rol = ur.id_rol
    WHERE ur.fecha_fin IS NULL
      AND r.nombre = 'Super Administrador';

    IF active_super_admins <= 1 THEN
      RAISE EXCEPTION 'No puedes eliminar el ultimo Super Administrador activo';
    END IF;
  END IF;

  UPDATE public.usuario_rol
  SET fecha_fin = CURRENT_DATE
  WHERE id_usuario = target_usuario_id
    AND fecha_fin IS NULL;

  UPDATE public.miembro_ministerio
  SET fecha_salida = CURRENT_DATE
  WHERE id_usuario = target_usuario_id
    AND fecha_salida IS NULL;

  BEGIN
    DELETE FROM public.usuario
    WHERE id_usuario = target_usuario_id;

    delete_mode := 'hard';
  EXCEPTION
    WHEN foreign_key_violation THEN
      UPDATE public.usuario
      SET activo = false,
          correo = 'eliminado+' || id_usuario::text || '+' || EXTRACT(EPOCH FROM clock_timestamp())::bigint::text || '@local.invalid',
          telefono = NULL,
          auth_user_id = NULL,
          ultimo_acceso = NULL,
          contrasena_hash = ''
      WHERE id_usuario = target_usuario_id;

      delete_mode := 'soft';
  END;

  RETURN delete_mode;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_usuario_super_admin(bigint) FROM public;
REVOKE EXECUTE ON FUNCTION public.delete_usuario_super_admin(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_usuario_super_admin(bigint) TO authenticated;
