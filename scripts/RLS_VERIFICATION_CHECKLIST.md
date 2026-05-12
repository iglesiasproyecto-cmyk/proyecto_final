# RLS Functions Verification Checklist

**Task:** Task 2A.4: Test RLS Functions Work  
**Date:** 2026-05-12  
**Migration:** 20260512_phase2a_restore_auth_linkage.sql

## Overview
This checklist verifies that the RLS helper functions (is_super_admin, is_admin_iglesia, is_admin_sede) created in Task 2A.2 are working correctly after auth linkage restoration.

## Test Execution Steps

### TEST 1: Verify Functions Exist
**File:** `test_rls_functions.sql` - Lines 9-14  
**Expected Result:** 4 rows (handle_new_user, is_super_admin, is_admin_iglesia, is_admin_sede)

```
Status: [ ] PASSED [ ] FAILED
Details: _______________________________________________________
```

### TEST 2: Verify Roles Exist
**File:** `test_rls_functions.sql` - Lines 16-21  
**Expected Result:** 5 rows (all roles present)
- Super Administrador
- Administrador de Iglesia
- Administrador de Sede
- Lider
- Servidor

```
Status: [ ] PASSED [ ] FAILED
Details: _______________________________________________________
```

### TEST 3: Find Super Admin User
**File:** `test_rls_functions.sql` - Lines 23-32  
**Expected Result:** At least 1 row with super admin user linked to auth

```
Status: [ ] PASSED [ ] FAILED
Super Admin ID found: _______________________
User Email: _______________________________
```

### TEST 4: Verify Super Admin Role Mapping
**File:** `test_rls_functions.sql` - Lines 34-45  
**How to Execute:**
1. Take the `id_usuario` from TEST 3 result
2. Replace `[SUPER_ADMIN_ID]` placeholder with actual ID
3. Run the query

**Expected Result:** At least 1 row showing super admin assignment

```
Status: [ ] PASSED [ ] FAILED
Admin Role Found: [ ] Super Administrador [ ] Administrador de Iglesia [ ] Administrador de Sede
Details: _______________________________________________________
```

### TEST 5: Verify iglesia RLS Policy
**File:** `test_rls_functions.sql` - Lines 47-52  
**Expected Result:** Policies should reference `is_admin_iglesia()` function

```
Status: [ ] PASSED [ ] FAILED
Policy Count: __________
Function References: [ ] is_admin_iglesia [ ] Other
Details: _______________________________________________________
```

### TEST 6: Verify departamento RLS Policy
**File:** `test_rls_functions.sql` - Lines 54-59  
**Expected Result:** Should reference `is_super_admin()` or similar role check

```
Status: [ ] PASSED [ ] FAILED
Policy Count: __________
Function References: [ ] is_super_admin [ ] Other
Details: _______________________________________________________
```

### TEST 7: Count Authenticated vs Unlinked Users
**File:** `test_rls_functions.sql` - Lines 61-70  
**Expected Result:** 
- linked_usuarios should equal or nearly equal total_usuarios
- unlinked_usuarios should be 0 or minimal

```
Status: [ ] PASSED [ ] FAILED
Total Usuarios: ________
Linked Usuarios: ________
Unlinked Usuarios: ________
Success Criteria: unlinked < 5% of total
```

### TEST 8: Trigger Verification
**File:** `test_rls_functions.sql` - Lines 72-77  
**Expected Result:** 1 row showing on_auth_user_created trigger exists

```
Status: [ ] PASSED [ ] FAILED
Trigger Exists: [ ] YES [ ] NO
Trigger Name: _______________________________
```

## Overall Verification Summary

| Test | Status | Notes |
|------|--------|-------|
| TEST 1: Functions Exist | [ ] | |
| TEST 2: Roles Exist | [ ] | |
| TEST 3: Super Admin User | [ ] | |
| TEST 4: Role Mapping | [ ] | |
| TEST 5: iglesia Policy | [ ] | |
| TEST 6: departamento Policy | [ ] | |
| TEST 7: User Linking | [ ] | |
| TEST 8: Trigger | [ ] | |

## Pass/Fail Criteria

**PASS:** 7 or 8 tests pass (TEST 7 unlinked count < 5% is acceptable if legacy data exists)  
**FAIL:** 2 or more tests fail OR critical functions/roles missing

## Action Items After Verification

- [ ] Document any failures in issue tracker
- [ ] Review migration logs if tests fail
- [ ] Check Supabase function definitions if function tests fail
- [ ] Verify auth linkage script completed successfully if user linking tests fail

## Notes

**Important:** TEST 4 requires manual placeholder substitution. The query uses parameterized format `[SUPER_ADMIN_ID]` which must be replaced with actual ID from TEST 3.

**Legacy Data:** If unlinked users exist from TEST 7, investigate whether they are:
- Legacy test accounts (safe to ignore)
- Recently created users (may need re-linking)
- Data migration artifacts (expected for Phase 2A)

---

**Completed By:** _____________________  
**Date Verified:** _____________________  
**Notes:** _______________________________________________________
