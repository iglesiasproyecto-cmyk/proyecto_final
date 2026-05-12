-- COMPLETE SETUP FOR admin_sede USER
-- Esta migración completa la configuración del usuario admin_sede con:
-- 1. Crear/verificar usuario en tabla usuario
-- 2. Asignar el rol de "Administrador de Sede"
-- 3. Enlazar usuario_rol_sede a la sede correcta

-- ========================================
-- 1. VERIFICAR/CREAR USUARIO
-- ========================================

-- Si el usuario NO existe, insertarlo
INSERT INTO usuario (
  id_usuario,
  correo,
  nombres,
  apellidos,
  telefono,
  fecha_nacimiento,
  activo,
  auth_user_id,
  creado_en,
  updated_at
) VALUES (
  26,
  'admin_sede@test.dev',
  'Admin',
  'Sede',
  NULL,
  NULL,
  true,
  '6763a324-4b68-4393-98fe-107390b8bdd3',
  NOW(),
  NOW()
)
ON CONFLICT (id_usuario) DO UPDATE SET
  correo = 'admin_sede@test.dev',
  nombres = 'Admin',
  apellidos = 'Sede',
  activo = true,
  auth_user_id = '6763a324-4b68-4393-98fe-107390b8bdd3',
  updated_at = NOW();

-- ========================================
-- 2. VERIFICAR QUE EL ROL EXISTE
-- ========================================

-- Crear rol si no existe
INSERT INTO rol (id_rol, nombre, descripcion)
VALUES (9, 'Administrador de Sede', 'Admin con acceso a una sede específica')
ON CONFLICT (id_rol) DO UPDATE SET
  nombre = 'Administrador de Sede',
  descripcion = 'Admin con acceso a una sede específica';

-- ========================================
-- 3. ASIGNAR USUARIO_ROL (relación simple)
-- ========================================

-- Crear relación usuario_rol si no existe
INSERT INTO usuario_rol (id_usuario, id_rol)
VALUES (26, 9)
ON CONFLICT (id_usuario, id_rol) DO NOTHING;

-- ========================================
-- 4. ASIGNAR USUARIO_ROL_SEDE (scope a sede)
-- ========================================

-- Esta tabla vincula al usuario con una SEDE específica
INSERT INTO usuario_rol_sede (id_usuario, id_rol, id_sede, id_iglesia)
VALUES (26, 9, 1, 1)  -- Usuario 26, Rol 9, Sede 1 (Sede Principal), Iglesia 1 (Iglesia Central)
ON CONFLICT (id_usuario, id_rol, id_sede) DO NOTHING;

-- ========================================
-- 5. VERIFICACIÓN - MOSTRAR RESULTADO
-- ========================================

SELECT
  'USUARIO' as tipo,
  u.id_usuario,
  u.correo,
  u.nombres,
  u.apellidos,
  u.activo,
  u.auth_user_id
FROM usuario u
WHERE u.id_usuario = 26
UNION ALL
SELECT
  'ROL_ASIGNADO' as tipo,
  ur.id_usuario::text,
  r.nombre,
  NULL,
  NULL,
  NULL,
  NULL
FROM usuario_rol ur
JOIN rol r ON ur.id_rol = r.id_rol
WHERE ur.id_usuario = 26
UNION ALL
SELECT
  'SEDE_ASIGNADA' as tipo,
  urs.id_usuario::text,
  'Sede ' || s.nombre || ' (id=' || s.id_sede::text || ')',
  NULL,
  NULL,
  NULL,
  NULL
FROM usuario_rol_sede urs
JOIN sede s ON urs.id_sede = s.id_sede
WHERE urs.id_usuario = 26;
