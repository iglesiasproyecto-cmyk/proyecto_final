-- ============================================================
-- MIGRACIÓN: Usuarios de Prueba
-- Fecha: 2026-05-11
-- Descripción: Inserta usuarios de prueba con roles específicos
-- ============================================================

-- Limpiar cualquier dato residual de migraciones anteriores
DELETE FROM usuario_rol WHERE id_usuario IN (
  SELECT id_usuario FROM usuario WHERE correo LIKE '%@test.dev'
);
DELETE FROM usuario WHERE correo LIKE '%@test.dev';

-- Crear usuarios de prueba de forma segura
DO $$
DECLARE
  user_id UUID;
  usuario_id BIGINT;
BEGIN

  -- 1. Super Administrador
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated', 'super@test.dev',
    crypt('Test1234!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"nombres": "Super", "apellidos": "Administrador"}'::jsonb
  )
  RETURNING id INTO user_id;

  INSERT INTO usuario (
    auth_user_id, nombres, apellidos, correo, contrasena_hash,
    telefono, activo, creado_en, updated_at
  ) VALUES (
    user_id, 'Super', 'Administrador', 'super@test.dev', '',
    '+57 300 123 4567', true, NOW(), NOW()
  )
  RETURNING id_usuario INTO usuario_id;

  INSERT INTO usuario_rol (id_usuario, id_rol, created_at, updated_at)
  VALUES (usuario_id, 1, NOW(), NOW());

  -- 2. Administrador de Iglesia
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated', 'admin@test.dev',
    crypt('Test1234!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"nombres": "Admin", "apellidos": "Iglesia"}'::jsonb
  )
  RETURNING id INTO user_id;

  INSERT INTO usuario (
    auth_user_id, nombres, apellidos, correo, contrasena_hash,
    telefono, activo, creado_en, updated_at
  ) VALUES (
    user_id, 'Admin', 'Iglesia', 'admin@test.dev', '',
    '+57 300 123 4567', true, NOW(), NOW()
  )
  RETURNING id_usuario INTO usuario_id;

  INSERT INTO usuario_rol (id_usuario, id_rol, created_at, updated_at)
  VALUES (usuario_id, 2, NOW(), NOW());

  -- 3. Líder
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated', 'lider@test.dev',
    crypt('Test1234!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"nombres": "Líder", "apellidos": "Ejemplo"}'::jsonb
  )
  RETURNING id INTO user_id;

  INSERT INTO usuario (
    auth_user_id, nombres, apellidos, correo, contrasena_hash,
    telefono, activo, creado_en, updated_at
  ) VALUES (
    user_id, 'Líder', 'Ejemplo', 'lider@test.dev', '',
    '+57 300 123 4567', true, NOW(), NOW()
  )
  RETURNING id_usuario INTO usuario_id;

  INSERT INTO usuario_rol (id_usuario, id_rol, created_at, updated_at)
  VALUES (usuario_id, 3, NOW(), NOW());

  -- 4. Servidor
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated', 'servidor@test.dev',
    crypt('Test1234!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"nombres": "Servidor", "apellidos": "Ejemplo"}'::jsonb
  )
  RETURNING id INTO user_id;

  INSERT INTO usuario (
    auth_user_id, nombres, apellidos, correo, contrasena_hash,
    telefono, activo, creado_en, updated_at
  ) VALUES (
    user_id, 'Servidor', 'Ejemplo', 'servidor@test.dev', '',
    '+57 300 123 4567', true, NOW(), NOW()
  )
  RETURNING id_usuario INTO usuario_id;

  INSERT INTO usuario_rol (id_usuario, id_rol, created_at, updated_at)
  VALUES (usuario_id, 4, NOW(), NOW());

  RAISE NOTICE 'Usuarios de prueba creados exitosamente';

END $$;