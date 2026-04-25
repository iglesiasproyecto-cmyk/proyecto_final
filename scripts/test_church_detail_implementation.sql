-- Script de prueba para verificar la implementación de ChurchDetailPage
-- Verifica que se muestren correctamente: iglesia, sedes, admins y pastores por sede

-- Prueba 1: Verificar que las nuevas funciones existen
SELECT '✅ Función getPastoresPorIglesia existe' as test
WHERE EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'getPastoresPorIglesia'
);

-- Prueba 2: Verificar que la función getAdminsPorIglesia existe
SELECT '✅ Función getAdminsPorIglesia existe' as test
WHERE EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'getAdminsPorIglesia'
);

-- Prueba 3: Verificar estructura de usuario_rol para iglesia
SELECT '✅ Tabla usuario_rol tiene id_iglesia' as test
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'usuario_rol' AND column_name = 'id_iglesia'
);

-- Prueba 4: Mostrar datos de prueba si existen
SELECT '📊 Datos de iglesias disponibles:' as info;
SELECT
  i.nombre as iglesia,
  COUNT(DISTINCT s.id_sede) as sedes,
  COUNT(DISTINCT ip.id_pastor) as pastores,
  COUNT(DISTINCT CASE WHEN ur.id_rol IS NOT NULL THEN ur.id_usuario END) as admins
FROM iglesia i
LEFT JOIN sede s ON s.id_iglesia = i.id_iglesia
LEFT JOIN iglesia_pastor ip ON ip.id_iglesia = i.id_iglesia AND ip.fecha_fin IS NULL
LEFT JOIN usuario_rol ur ON ur.id_iglesia = i.id_iglesia
  AND ur.fecha_fin IS NULL
  AND EXISTS (SELECT 1 FROM rol r WHERE r.id_rol = ur.id_rol AND r.nombre = 'Administrador de Iglesia')
GROUP BY i.id_iglesia, i.nombre
ORDER BY i.nombre;

-- Prueba 5: Verificar que get_my_roles() funciona para Super Admin
-- (Esto requeriría ejecutar como usuario autenticado)