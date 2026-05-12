-- ============================================================
-- RLS Helper Functions Verification Tests
-- ============================================================
-- Tests verify that auth helper functions work correctly
-- after migration 20260512_phase2a_restore_auth_linkage.sql
-- and user linking to auth.users

-- TEST 1: Verify functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'is_super_admin', 'is_admin_iglesia', 'is_admin_sede')
ORDER BY routine_name;
-- Expected: 4 rows (all functions exist)

-- TEST 2: Verify roles exist
SELECT id_rol, nombre
FROM rol
WHERE nombre IN ('Super Administrador', 'Administrador de Iglesia', 'Administrador de Sede', 'Lider', 'Servidor')
ORDER BY nombre;
-- Expected: 5 rows (all 5 roles exist)

-- TEST 3: Find a super admin user (for testing)
SELECT u.id_usuario, u.nombres, u.correo, u.auth_user_id
FROM usuario u
JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
JOIN rol r ON ur.id_rol = r.id_rol
WHERE r.nombre = 'Super Administrador'
  AND ur.fecha_fin IS NULL
  AND u.auth_user_id IS NOT NULL
LIMIT 1;
-- Expected: At least 1 row with a super admin user linked to auth
-- Note the id_usuario for next tests

-- TEST 4: Verify super admin role mapping logic
-- (Cannot directly test SECURITY DEFINER function, but verify the logic)
SELECT
  u.id_usuario,
  u.correo,
  r.nombre as role_name,
  ur.fecha_fin
FROM usuario u
JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
JOIN rol r ON ur.id_rol = r.id_rol
WHERE u.id_usuario = [SUPER_ADMIN_ID]  -- <-- Replace with id from TEST 3
  AND r.nombre IN ('Super Administrador', 'Administrador de Iglesia', 'Administrador de Sede')
ORDER BY r.nombre;
-- Expected: At least 1 row showing super admin assignment
-- If empty: User has no admin role

-- TEST 5: Verify iglesia RLS policy references function
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'iglesia'
ORDER BY policyname;
-- Expected: Policies should reference is_admin_iglesia() not just "true"

-- TEST 6: Verify departamento RLS policy
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'departamento'
ORDER BY policyname;
-- Expected: Should reference is_super_admin() or similar role check

-- TEST 7: Count authenticated vs unlinked users
SELECT
  COUNT(DISTINCT u.id_usuario) as total_usuarios,
  COUNT(DISTINCT CASE WHEN u.auth_user_id IS NOT NULL THEN u.id_usuario END) as linked_usuarios,
  COUNT(DISTINCT CASE WHEN u.auth_user_id IS NULL THEN u.id_usuario END) as unlinked_usuarios
FROM usuario u;
-- Expected: linked_usuarios should equal or nearly equal total_usuarios
-- unlinked_usuarios should be 0 or minimal

-- TEST 8: Trigger verification - check if trigger exists
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND trigger_name = 'on_auth_user_created'
LIMIT 1;
-- Expected: 1 row showing the trigger on auth.users table
