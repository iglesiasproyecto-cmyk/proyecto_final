-- Test script to verify Super Admin global access works correctly
-- Run this after applying the migration

-- Test 1: Verify get_my_roles() returns Super Admin with NULL iglesia
SELECT 'Test 1: get_my_roles() for Super Admin should show iglesia_id = NULL' as test_name;

-- Note: This would need to be run as a Super Admin user to test properly
-- SELECT * FROM public.get_my_roles();

-- Test 2: Verify is_super_admin() works
SELECT 'Test 2: is_super_admin() should work regardless of iglesia assignment' as test_name;

-- Test 3: Verify get_user_iglesias() doesn't return iglesias for Super Admin
SELECT 'Test 3: get_user_iglesias() should return empty for Super Admin' as test_name;

-- Test 4: Check that Super Admin assignments have NULL iglesia_id
SELECT 'Test 4: Check Super Admin assignments have NULL iglesia_id' as test_name;

SELECT
  u.nombres || ' ' || u.apellidos as usuario,
  r.nombre as rol,
  ur.id_iglesia,
  CASE WHEN ur.id_iglesia IS NULL THEN '✅ Correcto (NULL)' ELSE '❌ Incorrecto (tiene iglesia)' END as estado
FROM public.usuario_rol ur
JOIN public.usuario u ON u.id_usuario = ur.id_usuario
JOIN public.rol r ON r.id_rol = ur.id_rol
WHERE r.nombre = 'Super Administrador'
AND ur.fecha_fin IS NULL;

-- Test 5: Verify RLS policies still work for Super Admin
SELECT 'Test 5: RLS policies should allow Super Admin global access' as test_name;
-- This would require testing with actual user context