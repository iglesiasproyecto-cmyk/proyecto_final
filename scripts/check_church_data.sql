-- Script para verificar datos de iglesias en la base de datos

-- Ver iglesias existentes
SELECT '📊 IGLESIAS EXISTENTES:' as info;
SELECT
  id_iglesia,
  nombre,
  estado,
  fecha_fundacion,
  id_ciudad,
  creado_en
FROM iglesia
ORDER BY nombre;

-- Ver sedes por iglesia
SELECT '🏛️ SEDES POR IGLESIA:' as info;
SELECT
  i.nombre as iglesia,
  s.nombre as sede,
  s.direccion,
  s.estado
FROM iglesia i
LEFT JOIN sede s ON s.id_iglesia = i.id_iglesia
ORDER BY i.nombre, s.nombre;

-- Ver administradores por iglesia
SELECT '👑 ADMINISTRADORES POR IGLESIA:' as info;
SELECT
  i.nombre as iglesia,
  u.nombres || ' ' || u.apellidos as administrador,
  u.correo,
  r.nombre as rol
FROM iglesia i
LEFT JOIN usuario_rol ur ON ur.id_iglesia = i.id_iglesia AND ur.fecha_fin IS NULL
LEFT JOIN usuario u ON u.id_usuario = ur.id_usuario
LEFT JOIN rol r ON r.id_rol = ur.id_rol
WHERE r.nombre = 'Administrador de Iglesia'
ORDER BY i.nombre, u.apellidos;

-- Ver pastores por iglesia
SELECT '👨‍⚖️ PASTORES POR IGLESIA:' as info;
SELECT
  i.nombre as iglesia,
  p.nombres || ' ' || p.apellidos as pastor,
  p.correo,
  ip.es_principal
FROM iglesia i
LEFT JOIN iglesia_pastor ip ON ip.id_iglesia = i.id_iglesia AND ip.fecha_fin IS NULL
LEFT JOIN pastor p ON p.id_pastor = ip.id_pastor
ORDER BY i.nombre, ip.es_principal DESC, p.apellidos;

-- Ver usuarios con rol Super Admin
SELECT '🔴 SUPER ADMINS:' as info;
SELECT
  u.nombres || ' ' || u.apellidos as super_admin,
  u.correo,
  ur.id_iglesia,
  CASE WHEN ur.id_iglesia IS NULL THEN '✅ Correcto (sin iglesia)' ELSE '❌ Incorrecto (con iglesia)' END as estado
FROM usuario_rol ur
JOIN usuario u ON u.id_usuario = ur.id_usuario
JOIN rol r ON r.id_rol = ur.id_rol
WHERE r.nombre = 'Super Administrador'
AND ur.fecha_fin IS NULL;