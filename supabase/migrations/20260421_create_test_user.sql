-- Crear usuario de prueba con email confirmado
-- Este script crea un usuario que puede acceder inmediatamente

-- Primero, insertamos en auth.users con email confirmado
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'adso28352@gmail.com',
  crypt('Danna123', gen_salt('bf')),
  NOW(),
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO UPDATE
SET 
  encrypted_password = crypt('Danna123', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW();

-- Crear o actualizar el usuario en la tabla pública 'usuario'
INSERT INTO public.usuario (
  idUsuario,
  nombres,
  apellidos,
  correo,
  estado,
  creadoEn
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Usuario',
  'Prueba',
  'adso28352@gmail.com',
  'activo',
  NOW()
)
ON CONFLICT (idUsuario) DO UPDATE
SET
  nombres = 'Usuario',
  apellidos = 'Prueba',
  estado = 'activo',
  ultimoAcceso = NOW();

-- Asignar rol de servidor por defecto
INSERT INTO public.usuario_rol (idUsuario, idRol)
SELECT '550e8400-e29b-41d4-a716-446655440000'::uuid, id
FROM public.rol
WHERE nombreRol = 'servidor'
ON CONFLICT DO NOTHING;
