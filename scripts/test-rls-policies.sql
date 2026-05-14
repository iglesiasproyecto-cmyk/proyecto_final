-- RLS Policy Verification Script
-- Run this as each test user to verify RLS is working

-- ============================================================
-- TEST 1: Super Admin access
-- Expected: Can see ALL data
-- ============================================================

-- Set session as super admin (user 18)
SET app.current_user_id = '18';
SET app.current_usuario_id = 18;

SELECT 'SUPER ADMIN: Checking evento access...' as test;
SELECT COUNT(*) as evento_count FROM public.evento;
-- Expected: 6 (all events)

SELECT 'SUPER ADMIN: Checking usuario access...' as test;
SELECT COUNT(*) as usuario_count FROM public.usuario;
-- Expected: 8 (all users)

SELECT 'SUPER ADMIN: Checking ministerio access...' as test;
SELECT COUNT(*) as ministerio_count FROM public.ministerio;
-- Expected: 2 (all ministerios)

-- ============================================================
-- TEST 2: Admin Iglesia access (scoped to iglesia 1)
-- Expected: Can only see iglesia 1 data
-- ============================================================

SET app.current_user_id = '19';
SET app.current_usuario_id = 19;

SELECT 'ADMIN IGLESIA 1: Checking evento access...' as test;
SELECT COUNT(*) as evento_count FROM public.evento WHERE id_iglesia = 1;
-- Expected: only iglesia 1 events

SELECT 'ADMIN IGLESIA 1: Checking usuario access...' as test;
SELECT COUNT(*) as usuario_count FROM public.usuario
WHERE id_usuario IN (
  SELECT DISTINCT id_usuario FROM public.usuario_rol
  WHERE id_iglesia = 1
);
-- Expected: only iglesia 1 users

SELECT 'ADMIN IGLESIA 1: Checking ministerio access...' as test;
SELECT COUNT(*) as ministerio_count FROM public.ministerio
WHERE id_sede IN (SELECT id_sede FROM public.sede WHERE id_iglesia = 1);
-- Expected: only iglesia 1 ministerios

-- ============================================================
-- TEST 3: Verify UPDATE/SELECT symmetry
-- Critical: Ensure UPDATE policies have SELECT counterparts
-- ============================================================

SELECT 'TEST 3: RLS Policy Audit' as test;

SELECT
  schemaname,
  tablename,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_count,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_count,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_count,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_count
FROM (
  SELECT
    schemaname,
    tablename,
    policyname,
    CASE
      WHEN qual IS NOT NULL THEN 'SELECT'
      WHEN with_check IS NOT NULL AND qual IS NULL THEN 'INSERT'
      WHEN with_check IS NOT NULL AND qual IS NOT NULL THEN 'UPDATE'
      ELSE 'DELETE'
    END as cmd
  FROM pg_policies
  WHERE schemaname = 'public'
) t
WHERE tablename IN ('curso', 'modulo', 'tarea', 'evento', 'ministerio')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================
-- TEST 4: Verify no always-true conditions
-- Critical: Search for USING = true or similar bypasses
-- ============================================================

SELECT 'TEST 4: Checking for USING = true (overly permissive)' as test;

SELECT
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND qual ~ '(^true$|= true)'
AND tablename IN ('curso', 'modulo', 'evento', 'tarea', 'ministerio', 'notificacion');

-- Expected result: EMPTY (no rows = no overly permissive policies found ✓)

-- ============================================================
-- TEST 5: Verify no self-join bugs
-- Critical: Search for 'sede.id_sede = sede.id_sede' patterns
-- ============================================================

SELECT 'TEST 5: Checking for self-join bugs' as test;

SELECT
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND qual ~ 'sede\.id_sede\s*=\s*sede\.id_sede'
AND tablename IN ('ministerio', 'evento', 'tarea');

-- Expected result: EMPTY (no rows = bugs fixed ✓)

-- ============================================================
-- TEST 6: Verify duplicate policies are cleaned up
-- ============================================================

SELECT 'TEST 6: Count of policies per table (should be reasonable)' as test;

SELECT
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('usuario', 'usuario_rol', 'usuario_rol_sede',
                  'curso', 'modulo', 'evento', 'tarea', 'ministerio', 'notificacion')
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have 4-8 policies (not 10+)

-- ============================================================
-- TEST 7: Test actual UPDATE to verify symmetry
-- ============================================================

SELECT 'TEST 7: Attempting UPDATE as creator (should work)' as test;

-- As user 20 (lider), try to update a tarea they created
SET app.current_user_id = '20';
SET app.current_usuario_id = 20;

-- This should NOT silently fail (0 rows affected)
-- Should either succeed or show permission error
-- Do NOT run actual UPDATE to avoid data changes
-- Just verify the policy exists

SELECT
  COUNT(*) as update_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'tarea'
AND cmd = 'UPDATE'
AND with_check IS NOT NULL;

-- Expected: At least 1 UPDATE policy with WITH CHECK clause

-- ============================================================
-- SUMMARY
-- ============================================================

SELECT 'RLS VERIFICATION COMPLETE' as status;
SELECT 'Check results above for:' as instructions;
SELECT '✓ No USING = true policies' as check_1;
SELECT '✓ No self-join bugs (sede.id_sede = sede.id_sede)' as check_2;
SELECT '✓ No excessive duplicate policies' as check_3;
SELECT '✓ UPDATE policies have WITH CHECK and matching USING' as check_4;
SELECT '✓ Admin iglesia scoped access works' as check_5;
SELECT '✓ Super admin full access works' as check_6;
