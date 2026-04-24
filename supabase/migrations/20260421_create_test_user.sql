-- =============================================================================
-- CREAR USUARIO DE PRUEBA FUNCIONAL
-- =============================================================================
-- Este script crea un usuario de prueba con email confirmado que puede
-- acceder inmediatamente a la aplicación.
--
-- NOTA: Ejecutar DESPUÉS de que existan las tablas y el trigger handle_new_user
-- =============================================================================

DO $$
DECLARE
  v_auth_user_id UUID := '550e8400-e29b-41d4-a716-446655440000'::uuid;
  v_email TEXT := 'adso28352@gmail.com';
  v_password TEXT := 'Danna123';
  v_nombres TEXT := 'Usuario';
  v_apellidos TEXT := 'Prueba';
  v_id_rol_servidor INTEGER;
  v_id_usuario INTEGER;
BEGIN

  -- 1. Obtener el ID del rol 'Servidor'
  SELECT id_rol INTO v_id_rol_servidor
  FROM public.rol
  WHERE nombre = 'Servidor'
  LIMIT 1;

  IF v_id_rol_servidor IS NULL THEN
    RAISE EXCEPTION 'No se encontró el rol Servidor. Asegúrate de ejecutar el seed de datos primero.';
  END IF;

  -- 2. Limpiar usuario de prueba anterior si existe (para evitar conflictos)
  DELETE FROM public.usuario_rol WHERE id_usuario IN (SELECT id_usuario FROM public.usuario WHERE auth_user_id = v_auth_user_id);
  DELETE FROM public.miembro_ministerio WHERE id_usuario IN (SELECT id_usuario FROM public.usuario WHERE auth_user_id = v_auth_user_id);
  DELETE FROM public.usuario WHERE auth_user_id = v_auth_user_id;
  DELETE FROM auth.users WHERE id = v_auth_user_id;

  -- 3. Insertar en auth.users CON raw_user_meta_data para que el trigger funcione
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_auth_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_email,
    crypt(v_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nombres', v_nombres, 'apellidos', v_apellidos),
    NOW(),
    NOW()
  );

  -- 4. El trigger on_auth_user_created debería haber creado el public.usuario
  -- Verificamos y actualizamos con datos completos
  SELECT id_usuario INTO v_id_usuario
  FROM public.usuario
  WHERE auth_user_id = v_auth_user_id;

  IF v_id_usuario IS NULL THEN
    -- Si el trigger no funcionó, creamos manualmente
    INSERT INTO public.usuario (auth_user_id, nombres, apellidos, correo, contrasena_hash, activo)
    VALUES (v_auth_user_id, v_nombres, v_apellidos, v_email, '', true)
    RETURNING id_usuario INTO v_id_usuario;
  ELSE
    -- Aseguramos que esté activo y con datos correctos
    UPDATE public.usuario
    SET nombres = v_nombres,
        apellidos = v_apellidos,
        correo = v_email,
        activo = true,
        telefono = '3001234567',
        updated_at = NOW()
    WHERE id_usuario = v_id_usuario;
  END IF;

  -- 5. Asignar rol de Servidor con una iglesia activa
  INSERT INTO public.usuario_rol (id_usuario, id_rol, id_iglesia, id_sede, fecha_inicio)
  SELECT v_id_usuario, v_id_rol_servidor, i.id_iglesia, s.id_sede, NOW()
  FROM public.iglesia i
  JOIN public.sede s ON s.id_iglesia = i.id_iglesia
  WHERE i.estado = 'activa'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  -- 6. Insertar en miembro_ministerio para que tenga acceso a tareas
  INSERT INTO public.miembro_ministerio (id_usuario, id_ministerio, rol_en_ministerio, fecha_ingreso)
  SELECT v_id_usuario, m.id_ministerio, 'servidor', NOW()
  FROM public.ministerio m
  JOIN public.sede s ON s.id_sede = m.id_sede
  JOIN public.iglesia i ON i.id_iglesia = s.id_iglesia
  WHERE i.estado = 'activa'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Usuario de prueba creado exitosamente: % (id_usuario: %)', v_email, v_id_usuario;

END $$;
