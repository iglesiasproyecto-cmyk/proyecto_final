-- Función RPC para invitar usuarios (reemplaza Edge Function)
-- Esta función puede ser llamada desde el frontend sin problemas de CORS

CREATE OR REPLACE FUNCTION public.invite_user_rpc(
  p_correo text,
  p_nombres text,
  p_apellidos text,
  p_id_iglesia bigint,
  p_id_rol bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_usuario_id bigint;
  v_existing_usuario_id bigint;
  v_auth_user_id uuid;
  v_result jsonb;
BEGIN
  -- Verificar que el caller está autenticado y tiene permisos
  SELECT id_usuario INTO v_caller_usuario_id
  FROM usuario
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_caller_usuario_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  END IF;

  -- Verificar permisos (Super Admin o Admin de la iglesia)
  IF NOT (
    EXISTS (
      SELECT 1 FROM usuario_rol ur
      JOIN rol r ON r.id_rol = ur.id_rol
      WHERE ur.id_usuario = v_caller_usuario_id
      AND ur.fecha_fin IS NULL
      AND r.nombre = 'Super Administrador'
    ) OR EXISTS (
      SELECT 1 FROM usuario_rol ur
      WHERE ur.id_usuario = v_caller_usuario_id
      AND ur.id_iglesia = p_id_iglesia
      AND ur.fecha_fin IS NULL
      AND EXISTS (
        SELECT 1 FROM rol r WHERE r.id_rol = ur.id_rol AND r.nombre = 'Administrador de Iglesia'
      )
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'No tienes permisos para gestionar esta iglesia');
  END IF;

  -- Verificar que el rol no sea Super Admin si el caller no lo es
  IF NOT EXISTS (
    SELECT 1 FROM usuario_rol ur
    JOIN rol r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = v_caller_usuario_id
    AND ur.fecha_fin IS NULL
    AND r.nombre = 'Super Administrador'
  ) AND EXISTS (
    SELECT 1 FROM rol WHERE id_rol = p_id_rol AND nombre = 'Super Administrador'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'No puedes asignar rol de Super Administrador');
  END IF;

  -- Verificar si el usuario ya existe
  SELECT id_usuario INTO v_existing_usuario_id
  FROM usuario
  WHERE correo = lower(trim(p_correo))
  LIMIT 1;

  -- Si el usuario ya existe, solo asignar el rol
  IF v_existing_usuario_id IS NOT NULL THEN
    -- Verificar si ya tiene este rol asignado
    IF EXISTS (
      SELECT 1 FROM usuario_rol
      WHERE id_usuario = v_existing_usuario_id
      AND id_rol = p_id_rol
      AND id_iglesia = p_id_iglesia
      AND fecha_fin IS NULL
    ) THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'El usuario ya tiene este rol asignado',
        'userAlreadyExisted', true,
        'roleAssigned', false
      );
    END IF;

    -- Asignar rol
    INSERT INTO usuario_rol (id_usuario, id_rol, id_iglesia, fecha_inicio)
    VALUES (v_existing_usuario_id, p_id_rol, p_id_iglesia, CURRENT_DATE);

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Rol asignado al usuario existente',
      'userAlreadyExisted', true,
      'roleAssigned', true
    );
  END IF;

  -- Si el usuario no existe, esto debería hacerse desde el frontend
  -- porque PostgreSQL no puede enviar emails directamente
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Usuario no existe. Usa la API de Supabase Auth desde el frontend para enviar invitación',
    'needsFrontendInvite', true
  );

END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.invite_user_rpc(text, text, text, bigint, bigint) TO authenticated;