-- ============================================================
-- CRITICAL: User Auth Linkage Recovery Script
-- ============================================================
-- This script links usuario.correo to auth.users.email
-- to restore auth_user_id relationships after deletion incident
--
-- MUST be executed in a transaction with verification at each step
-- DO NOT commit until all verification steps show expected results

BEGIN;  -- Start transaction

-- STEP 1: Verify no existing auth_user_id conflicts
SELECT correo, COUNT(*) as duplicate_count
FROM usuario
WHERE auth_user_id IS NOT NULL
GROUP BY correo
HAVING COUNT(*) > 1;
-- Expected: 0 rows. If > 0, investigate duplicate users first. STOP if duplicates found.

-- STEP 2: Count how many will be linked
SELECT COUNT(*) as usuarios_to_link
FROM usuario u
WHERE u.auth_user_id IS NULL
  AND u.correo IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users a WHERE a.email = u.correo);
-- Expected: N > 0 (number of users to restore)
-- Document this number carefully

-- STEP 3: Show which users will be linked (verification)
SELECT
  u.id_usuario,
  u.correo,
  a.id as auth_id,
  'WILL_LINK' as action
FROM usuario u
JOIN auth.users a ON a.email = u.correo
WHERE u.auth_user_id IS NULL
ORDER BY u.correo;
-- Review this list carefully - verify emails are correct

-- STEP 4: Link users (main operation)
UPDATE usuario u
SET auth_user_id = (
  SELECT id FROM auth.users a
  WHERE a.email = u.correo
  LIMIT 1
)
WHERE u.auth_user_id IS NULL
  AND u.correo IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users a
    WHERE a.email = u.correo
  );

-- STEP 5: Verify linkage succeeded
SELECT COUNT(*) as still_unlinked
FROM usuario
WHERE auth_user_id IS NULL AND correo IS NOT NULL;
-- Expected: 0 (all users linked successfully)
-- If > 0: Something failed, investigate why before committing

-- STEP 6: Show recovery results
SELECT
  u.id_usuario,
  u.nombres,
  u.correo,
  CASE
    WHEN u.auth_user_id IS NOT NULL THEN 'LINKED ✓'
    WHEN u.correo IS NULL THEN 'NO_EMAIL'
    ELSE 'FAILED'
  END as linkage_status,
  u.auth_user_id::text as auth_id
FROM usuario u
ORDER BY u.auth_user_id DESC
LIMIT 20;
-- Review this list - all should show LINKED

-- FINAL VERIFICATION: Confirm auth linkage integrity
SELECT
  COUNT(DISTINCT u.id_usuario) as total_usuarios,
  COUNT(DISTINCT CASE WHEN u.auth_user_id IS NOT NULL THEN u.id_usuario END) as linked_usuarios,
  COUNT(DISTINCT CASE WHEN u.auth_user_id IS NULL THEN u.id_usuario END) as unlinked_usuarios
FROM usuario u;
-- Expected: linked_usuarios = total_usuarios (all linked)

-- If all verifications pass (steps 1-6), proceed to COMMIT
-- If anything failed, ROLLBACK instead

COMMIT;  -- <-- UNCOMMENT ONLY AFTER ALL VERIFICATIONS PASS
-- ROLLBACK;  -- <-- Uncomment if verifications failed
