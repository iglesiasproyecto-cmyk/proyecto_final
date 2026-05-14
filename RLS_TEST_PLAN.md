# RLS Testing Plan

## Test Users Available

| Email | Role | Iglesia | Purpose |
|-------|------|---------|---------|
| super@test.dev | Super Administrador | Iglesia Central (1) | Full access test |
| admin@test.dev | Administrador de Iglesia | Iglesia Central (1) | Admin scoping test |
| lider@test.dev | Líder | Iglesia Central (1) | Leader ministerio test |
| servidor@test.dev | Servidor | Iglesia Central (1) | User own record test |
| quinteroquinterod19@gmail.com | Servidor | Iglesia CentralL (2) | Cross-iglesia isolation test |

## Test Cases

### 1. SUPER ADMIN Tests
**User:** super@test.dev  
**Expected:** Full access to all iglesias and data

- [ ] ✅ Navigate to /app/iglesias → Ver 2 iglesias
- [ ] ✅ Navigate to /app/1/usuarios → Ver TODOS los usuarios de Iglesia 1
- [ ] ✅ Navigate to /app/1/ministerios → Ver TODOS los ministerios
- [ ] ✅ Create curso, modulo, evento → Should succeed
- [ ] ✅ Update any user/evento/tarea → Should succeed
- [ ] ✅ Delete any record → Should succeed

### 2. ADMIN IGLESIA Tests
**User:** admin@test.dev (Iglesia 1)  
**Expected:** Only see/manage Iglesia 1 data

- [ ] ✅ Navigate to /app/1/usuarios → Ver solo usuarios de Iglesia 1
  - Should NOT see users from Iglesia 2
  - Should NOT see Super Administrador users
- [ ] ✅ Navigate to /app/1/ministerios → Ver solo ministerios de Iglesia 1
- [ ] ✅ Create new usuario → Should succeed for Iglesia 1 only
- [ ] ✅ Create new curso → Should succeed
- [ ] ✅ Update usuario in Iglesia 1 → Should succeed
- [ ] ✅ Try to access /app/2/... → Should be blocked or show empty
- [ ] ✅ Try DELETE on user → Should succeed

### 3. LIDER Tests
**User:** lider@test.dev (Líder in Iglesia 1)  
**Expected:** Only see ministerios where is lider

- [ ] ✅ Navigate to /app/1/ministerios → See only their ministerios
- [ ] ✅ Create evento in their ministerio → Should succeed
- [ ] ✅ Create tarea in their ministerio → Should succeed
- [ ] ✅ Try to see ministerios from other lideres → Should be blocked
- [ ] ✅ Update their own evento → Should succeed

### 4. SERVIDOR Tests
**User:** servidor@test.dev (Servidor in Iglesia 1)  
**Expected:** Only see own records

- [ ] ✅ Navigate to /app/1/usuarios → See own record only
- [ ] ✅ Update own notificacion → Should succeed
- [ ] ✅ Update own hoja_de_vida → Should succeed
- [ ] ✅ Try to see other user's records → Should be blocked
- [ ] ✅ Try to create/edit curso → Should be blocked

### 5. Cross-Iglesia Isolation Test
**Scenario:** usuario from Iglesia 2 vs Iglesia 1  
**Expected:** Complete isolation

- [ ] ✅ Admin Iglesia 1 cannot see usuario from Iglesia 2
- [ ] ✅ Usuario from Iglesia 2 cannot see Iglesia 1 data
- [ ] ✅ Super admin CAN see both

### 6. CRUD Operation Tests

#### CREATE (INSERT)
- [ ] ✅ CURSO: Admin iglesia can create → Should succeed
- [ ] ✅ MINISTERIO: Admin iglesia can create in their iglesia → Should succeed
- [ ] ✅ EVENTO: Admin iglesia can create → Should succeed
- [ ] ✅ USUARIO_ROL: Admin can assign roles in their iglesia → Should succeed

#### READ (SELECT)
- [ ] ✅ CURSO: Solo curso scoped → works
- [ ] ✅ MINISTERIO: Solo ministerio scoped → works
- [ ] ✅ EVENTO: Solo evento scoped → works
- [ ] ✅ TAREA: Solo tarea scoped → works
- [ ] ✅ MODULO: Solo modulo scoped → works

#### UPDATE (Symmetric USING/WITH CHECK)
- [ ] ✅ CURSO: Creator can update own → Should succeed (not silently fail)
- [ ] ✅ TAREA: Creator can update own → Should succeed (not silently fail)
- [ ] ✅ EVENTO: Admin can update → Should succeed
- [ ] ✅ MINISTERIO: Admin can update in their iglesia → Should succeed

#### DELETE
- [ ] ✅ CURSO: Only super admin → Should succeed
- [ ] ✅ EVENTO: Admin iglesia can delete → Should succeed
- [ ] ✅ TAREA: Admin iglesia can delete → Should succeed
- [ ] ✅ MINISTERIO: Admin iglesia can delete → Should succeed

### 7. Silent Failure Detection Tests
**Critical:** These MUST NOT silently fail (return 0 rows)

- [ ] ✅ Creator UPDATE on CURSO
  - Try to UPDATE own course as creator
  - Result: Row updated (not 0 rows affected)
  
- [ ] ✅ Creator UPDATE on TAREA
  - Try to UPDATE own task as creator
  - Result: Row updated (not 0 rows affected)
  
- [ ] ✅ Admin UPDATE on MINISTERIO
  - Try to UPDATE ministerio in their iglesia
  - Result: Row updated (not 0 rows affected)

## Test Execution Checklist

### Phase 1: Browser Navigation Tests
**Date:** ___________
**Tester:** ___________

- [ ] Start server: `npm run dev`
- [ ] Open http://localhost:5173
- [ ] Login as each user role
- [ ] Navigate to key pages
- [ ] Verify data filtering

### Phase 2: CRUD Operation Tests
**Date:** ___________
**Tester:** ___________

- [ ] Create new records
- [ ] Update existing records
- [ ] Delete records
- [ ] Verify operations succeed/fail appropriately

### Phase 3: Silent Failure Detection
**Date:** ___________
**Tester:** ___________

- [ ] Open browser DevTools → Network tab
- [ ] Look for PATCH/PUT requests that update rows
- [ ] Verify response shows affected rows > 0
- [ ] Document any 0-row updates (indicates silent failure)

### Phase 4: RLS Policy Verification
**Date:** ___________
**Tester:** ___________

- [ ] Check database logs for RLS policy violations
- [ ] Verify no "permission denied" errors on valid operations
- [ ] Verify no access to restricted data from non-authorized users

## Expected Outcomes

✅ **PASS:** All test cases pass without silent failures
❌ **FAIL:** Any silent failure (UPDATE returns 0 rows) or unauthorized access
🔄 **RETRY:** If failures found, apply additional RLS fixes

## Documentation

- Testing Date: __________
- Environment: Development (localhost:5173)
- Database: Supabase project heibyj...
- Total Tests: 45+
- Passed: ___
- Failed: ___
- Issues Found: ___________

---

## Post-Testing Actions

If all pass:
1. ✅ Deploy to staging
2. ✅ Document RLS architecture
3. ✅ Add to CI/CD regression tests

If failures found:
1. ❌ Document specific failure case
2. ❌ Identify RLS policy issue
3. ❌ Apply additional fixes
4. ❌ Re-test
