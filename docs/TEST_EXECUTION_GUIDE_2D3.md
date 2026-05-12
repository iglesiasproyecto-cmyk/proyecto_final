# Task 2D.3: Integration Test (Full Auth Flow) - Complete Execution Guide

**Date:** 2026-05-12  
**Project:** IGLESIABD  
**Phase:** 2D.3 - Recovery Verification  
**Duration:** 30-45 minutes (mostly manual browser interaction)

---

## Overview

This is a **comprehensive end-to-end test** of the recovery plan. It validates that:
- Auth linkage between usuario and auth.users works
- RLS functions (is_super_admin, is_admin_iglesia) evaluate correctly  
- Database tables are properly restored
- Frontend can authenticate and create records

**Important:** Most of this test requires **manual browser interaction**. The test coordinator (you) must manually:
1. Create a user in Supabase Auth UI
2. Execute SQL to assign roles
3. Login to frontend and interact with forms
4. Observe success/failure and document results

---

## Prerequisites

Before starting, verify these are in place:

- [x] Phase 2A migration applied (20260512_phase2a_restore_auth_linkage.sql)
- [x] Phase 2B migration applied (20260512_phase2b_restore_missing_tables.sql)
- [x] Phase 2C migration applied (20260512_phase2c_harden_rls_policies.sql)
- [ ] Frontend dev server can start (npm run dev available)
- [ ] Browser available for testing
- [ ] Supabase project accessible at: https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm

---

## Test Execution

### STEP 1: Create Test User in Supabase Auth

**Objective:** Create an authenticated user account that will be linked to usuario table

**Instructions:**

1. Open browser to Supabase Auth Dashboard:
   ```
   https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm/auth/users
   ```

2. Click **"Add user"** button (top right)

3. Fill in the signup form:
   - **Email:** `test-admin@local.test`
   - **Password:** `Test123!@#`
   - **Auto confirm email:** Checked (optional, helps with testing)

4. Click **"Create user"** button

5. **Verify:** User appears in the users table with email "test-admin@local.test"

**Expected Result:** 
```
Email: test-admin@local.test
Created: [current timestamp]
Status: Confirmed / Not confirmed
```

**If it fails:**
- Ensure email format is exactly `test-admin@local.test`
- Ensure password meets requirements (uppercase, lowercase, number, special char)
- Check if user already exists (try different email if needed)

**Next step:** Record result and proceed to STEP 2

---

### STEP 2: Assign Super Admin Role

**Objective:** Grant the test user "Super Administrador" role to enable all system permissions

**Instructions:**

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm/sql/new
   ```

2. Paste and execute this query:
   ```sql
   INSERT INTO usuario_rol (id_usuario, id_rol, fecha_inicio)
   VALUES (
     (SELECT id_usuario FROM usuario WHERE correo = 'test-admin@local.test'),
     (SELECT id_rol FROM rol WHERE nombre = 'Super Administrador'),
     NOW()::date
   );
   ```

3. Click **"Execute"** or **Ctrl+Enter**

4. **Verify success:** Query result shows "INSERT 1" or similar confirmation

5. **Double-check with verification query:**
   ```sql
   SELECT ur.id_usuario_rol, u.correo, r.nombre, ur.fecha_inicio
   FROM usuario_rol ur
   JOIN rol r ON ur.id_rol = r.id_rol
   JOIN usuario u ON ur.id_usuario = u.id_usuario
   WHERE u.correo = 'test-admin@local.test'
     AND ur.fecha_fin IS NULL;
   ```

**Expected Result:**
```
id_usuario_rol | correo                | nombre               | fecha_inicio
               | test-admin@local.test | Super Administrador  | 2026-05-12
```

**If verification query returns 0 rows:**
- Ensure usuario table has a row with correo='test-admin@local.test'
  - Check: `SELECT id_usuario, correo, auth_user_id FROM usuario WHERE correo = 'test-admin@local.test';`
  - If no row exists, the Phase 2A trigger may not have fired
- Ensure rol table has a row with nombre='Super Administrador'
  - Check: `SELECT id_rol, nombre FROM rol WHERE nombre = 'Super Administrador';`

**Next step:** Proceed to STEP 3

---

### STEP 3: Verify Test Data (City) Exists

**Objective:** Ensure at least one city exists (needed to create iglesia in STEP 5)

**Instructions:**

1. In the same SQL Editor, execute:
   ```sql
   SELECT id_ciudad, nombre FROM ciudad LIMIT 1;
   ```

2. **Result should show at least 1 city row**

**Expected Result:**
```
id_ciudad | nombre
          | [City Name]
```

**If query returns 0 rows:**

You have two options:

**Option A: Create a test city**
```sql
INSERT INTO ciudad (nombre, id_departamento)
VALUES (
  'Test City',
  (SELECT id_departamento FROM departamento LIMIT 1)
);
-- If departamento doesn't exist, create that first:
INSERT INTO departamento (nombre, id_pais)
VALUES (
  'Test Department',
  (SELECT id_pais FROM pais LIMIT 1)
);
```

**Option B: Use existing data**
Run query to find any existing data:
```sql
SELECT id_ciudad, nombre FROM ciudad;
SELECT id_departamento, nombre FROM departamento;
SELECT id_pais, nombre FROM pais;
```

**Next step:** Once a city exists, proceed to STEP 4

---

### STEP 4: Start Frontend Dev Server

**Objective:** Start the React development server for browser testing

**Instructions:**

1. **Open terminal** in project directory:
   ```bash
   cd /home/juanda/Proyectofinal
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Wait for output** (should appear within 10-15 seconds):
   ```
    ➜  Local:   http://localhost:5173/
    ➜  press h to show help
   ```

4. **Keep terminal open** (dev server must stay running during tests)

5. **Note the port:** Default is 5173, but if occupied it will show a different port

**If npm run dev fails:**
- Ensure dependencies installed: `npm install`
- Check Node.js version: `node --version` (should be v18+)
- Check if port 5173 is already in use (try different port or kill process)

**Next step:** Open frontend in browser

---

### STEP 5: Test Frontend Login

**Objective:** Verify that authentication flow works and user can access the dashboard

**Instructions:**

1. **Open browser** to frontend URL:
   ```
   http://localhost:5173
   ```

2. **Observe:** Landing page should load with:
   - Logo / App name visible
   - "Login" button visible
   - Navigation menu (optional)

3. **Click** the "Login" button or navigate to login page

4. **Enter credentials:**
   - Email: `test-admin@local.test`
   - Password: `Test123!@#`

5. **Click** "Sign In" or "Login" button

6. **Observe loading state** (spinner, skeleton screens, or disabled button)

7. **Wait 5-10 seconds** for authentication to complete

8. **Expected outcome:** 
   - Page redirects to dashboard/home page
   - Sidebar with navigation menu appears
   - Welcome message or user name displayed
   - No error messages in visible UI

9. **Verify in browser DevTools (F12):**
   - **Console tab:** Check for any red errors (should be none or minor warnings)
   - **Application tab:** Look for localStorage → "sb-[project]-auth-token" (should exist)
   - **Network tab:** Last request should be successful (200 OK or similar)

**Common Failure Points:**

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid credentials" | Wrong email/password or user not created | Re-check STEP 1 |
| 401 Unauthorized | usuario table not linked to auth.users | Check usuario.auth_user_id is NOT NULL |
| RLS policy violation (403) | usuario.auth_user_id is NULL | Phase 2A trigger may not have fired |
| Page stays blank | React error | Check browser console (F12) for errors |
| Redirect to login loop | Session not persisted | Check localStorage for auth token |

**If login PASSES:**
- Document this in RECOVERY.txt: STEP 4 Result = "LOGIN SUCCESS"
- Proceed to STEP 5

**If login FAILS:**
- Document the error message in RECOVERY.txt
- Check troubleshooting section in RECOVERY.txt
- Do NOT proceed to STEP 5/6 until login works

---

### STEP 6: Test iglesia Creation

**Objective:** Verify that authenticated super admin can create a church record (iglesia)

**Prerequisites:**
- Login from STEP 4 was successful
- User is on dashboard
- City exists (from STEP 3)

**Instructions:**

1. **Locate iglesia creation page:**
   - Look in sidebar for "Iglesias", "Churches", or "Configuración"
   - Click to navigate to iglesia list/management page
   - Look for "Create", "New Iglesia", or "+" button

2. **Click create button** to open form

3. **Fill in the form:**
   ```
   Nombre (Name):          "Test Iglesia Recovery"
   Ciudad (City):          Select from dropdown (use city from STEP 3)
   Estado (Status):        Select "activa" (active)
   Descripción (optional): "Recovery test iglesia"
   [Any other visible fields]: Fill as appropriate
   ```

4. **Click** "Create", "Save", or "Submit" button

5. **Observe:**
   - Loading spinner appears (form should be disabled while submitting)
   - Wait 3-5 seconds for network request to complete
   - Expected: Success message appears, form clears, record appears in list

6. **Browser DevTools verification (F12):**
   - **Network tab:** Find POST request to `/rest/v1/iglesia`
   - Check HTTP Status: Should be `201 Created` or `200 OK`
   - Response body should contain the created record

7. **Verify in database (SQL Editor):**
   ```sql
   SELECT id_iglesia, nombre, estado FROM iglesia 
   WHERE nombre = 'Test Iglesia Recovery' LIMIT 1;
   ```
   Should return 1 row

**Common Failure Points:**

| Error | HTTP Status | Cause | Fix |
|-------|------------|-------|-----|
| "Missing required field" | 400 | Campo requerido no rellenado | Check that id_ciudad is selected |
| RLS policy denied | 403 | is_admin_iglesia() returned false | Verify usuario_rol has Super Administrador role |
| Database error | 500 | PostgreSQL constraint violation | Check Supabase logs, verify FK references |
| Network error | N/A | No response from server | Check if npm dev server is still running |
| Form validation error | N/A | Client-side validation failed | Check for red error text under field |

**If iglesia creation PASSES:**
- Document: STEP 5 Result = "IGLESIA CREATION SUCCESS"
- Proceed to STEP 6

**If iglesia creation FAILS:**
- Document error message and HTTP status
- See RECOVERY.txt troubleshooting section
- If HTTP 403: The RLS hardening may be the issue
- If HTTP 400: Missing required field

---

### STEP 7: Test departamento Creation

**Objective:** Verify that super admin can create geographic departments (Phase 2C hardening test)

**Prerequisites:**
- iglesia creation from STEP 6 passed (or at least login works)
- A country exists in pais table

**Instructions:**

1. **Navigate to departamento page:**
   - Look in sidebar for "Configuración", "Admin", or "Geografía"
   - Find "Departamentos" or "Departments" section
   - Click to navigate to departamento list page

2. **Click create button** to open form

3. **Fill in the form:**
   ```
   Nombre (Name):   "Test Departamento Recovery"
   País (Country):  Select from dropdown
   [Any other fields]: Fill if visible
   ```

4. **Click** "Create" or "Submit" button

5. **Observe:**
   - Loading state appears
   - Wait 3-5 seconds
   - Expected: Success message, record appears in list

6. **Browser DevTools verification (F12):**
   - **Network tab:** Find POST to `/rest/v1/departamento`
   - Check HTTP Status: Should be `201 Created`
   - Response should contain created record

7. **Verify in database:**
   ```sql
   SELECT id_departamento, nombre FROM departamento 
   WHERE nombre = 'Test Departamento Recovery' LIMIT 1;
   ```
   Should return 1 row

**Why this test matters:**
- STEP 6 tests general iglesia creation (is_admin_iglesia check)
- STEP 7 tests **Phase 2C hardening** which restricts to is_super_admin() ONLY
- If STEP 7 fails but STEP 6 passes, it's a RLS hardening issue

**Common Failure Points:**

| Error | HTTP Status | Cause | Fix |
|-------|------------|-------|-----|
| RLS policy denied | 403 | Phase 2C hardening: is_super_admin() returned false | Verify usuario_rol exists with fecha_fin IS NULL |
| Function not found | 500 | is_super_admin() function missing | Check Phase 2A migration was applied |
| Missing country | 400 | id_pais is required but no value selected | Ensure country dropdown has options |

**If departamento creation PASSES:**
- Document: STEP 6 Result = "DEPARTAMENTO CREATION SUCCESS"
- This confirms Phase 2C hardening is working
- Proceed to STEP 8

**If departamento creation FAILS with HTTP 403:**
- This is a critical RLS hardening issue
- Document error carefully
- Check Phase 2C migration contents
- Verify is_super_admin() function exists

---

### STEP 8: Commit Test Results

**Objective:** Document the test results in git history

**Instructions:**

1. **Summarize results:**
   - Did login succeed? YES / NO
   - Did iglesia creation succeed? YES / NO  
   - Did departamento creation succeed? YES / NO
   - Any errors to document? (list HTTP statuses, RLS violations, etc)

2. **Commit to git:**
   ```bash
   cd /home/juanda/Proyectofinal
   git add RECOVERY.txt
   git commit -m "test(recovery): full auth flow verification - RESULTS DOCUMENTED"
   ```

   Or if you prefer empty commit:
   ```bash
   git commit --allow-empty -m "test(recovery): full auth flow verification [PASS/FAIL]"
   ```

3. **Verify commit created:**
   ```bash
   git log -1 --oneline
   # Should show: test(recovery): full auth flow verification
   ```

**Expected output:**
```
[main abc123f] test(recovery): full auth flow verification - RESULTS DOCUMENTED
 1 file changed, 150 insertions(+), 5 deletions(-)
```

---

## Test Results Summary

### Success Checklist

After completing all 8 steps, you should have documented:

- [x] STEP 1: Test user created in Supabase Auth
- [x] STEP 2: Super admin role assigned  
- [x] STEP 3: City exists
- [x] STEP 4: Frontend login succeeds
- [x] STEP 5: iglesia creation succeeds
- [x] STEP 6: departamento creation succeeds
- [x] STEP 7: Test results committed to git

### Overall Test Outcome

**If all 7 items above are ✅ PASS:**
```
✅ RECOVERY COMPLETE
All critical functionality working end-to-end.
System is stabilized and ready for Phase 2E (monitoring/observability).
```

**If 5-6 items PASS, 1-2 FAIL:**
```
⚠️  PARTIAL RECOVERY
Core features working, but some RLS/creation issues remain.
Next step: Debug failures using troubleshooting guide in RECOVERY.txt
```

**If fewer than 5 PASS:**
```
❌ RECOVERY INCOMPLETE
Critical issues preventing system use.
Root cause analysis required - check Phase 2A/2B/2C migrations.
```

---

## Troubleshooting Reference

### Login Fails with 401 Error

**Cause:** usuario table missing link to auth.users

**Check:**
```sql
SELECT correo, auth_user_id 
FROM usuario 
WHERE correo = 'test-admin@local.test';
-- Should show: auth_user_id = [UUID], NOT NULL
```

**Fix:**
- If auth_user_id is NULL: Phase 2A trigger didn't fire
- If row doesn't exist: Phase 2A trigger needs to be re-run
- Check trigger exists: `SELECT * FROM information_schema.routines WHERE routine_name = 'handle_new_user';`

### iglesia Creation Fails with 403

**Cause:** RLS denied - is_admin_iglesia() returned false

**Check:**
```sql
-- Check if user has admin role
SELECT ur.id_usuario_rol, r.nombre, ur.fecha_fin
FROM usuario_rol ur
JOIN rol r ON ur.id_rol = r.id_rol
WHERE ur.id_usuario = (SELECT id_usuario FROM usuario WHERE correo = 'test-admin@local.test')
  AND ur.fecha_fin IS NULL;
  
-- Should show: 1 row with nombre containing 'Administrador'
```

**Fix:**
- If 0 rows: STEP 2 didn't work, re-run role assignment
- If fecha_fin is NOT NULL: Role is expired, update it or create new assignment

### departamento Creation Fails with 403

**Cause:** Phase 2C hardening - requires is_super_admin(), not just is_admin_iglesia()

**Check:**
```sql
-- Manually test is_super_admin() function
-- First, get a token for the test user
-- Then in SQL Editor, run as that user:
SELECT public.is_super_admin();
-- Should return: true
```

**Fix:**
- Verify usuario_rol exists for test user with role = 'Super Administrador'
- Verify fecha_fin IS NULL (role not expired)
- Verify is_super_admin() function exists: `\df is_super_admin`

### Frontend Shows Blank Page After Login

**Cause:** React component error during hydration

**Check:**
1. Open DevTools (F12) → Console tab
2. Look for red error messages
3. Check the error message text for clues

**Common causes:**
- AppContext accessing null values
- Missing roles or usuario data
- Supabase client initialization error

**Fix:**
- Check browser console for specific error
- Try refreshing page (Ctrl+R)
- Check that npm run dev is still running without errors

### Network Request Returns 500

**Cause:** Database error during INSERT

**Check:**
- In Supabase dashboard, check SQL logs for error
- Look for FK constraint violations
- Check required fields are all populated

**Fix:**
- Ensure all required fields are filled in form
- Ensure id_ciudad / id_pais exist (STEP 3)
- Check Supabase SQL logs for specific constraint error

---

## Post-Test Actions

### If Tests Pass (✅)

1. **Verify all 6 success criteria met** (documented above)
2. **Commit results to git** (STEP 8)
3. **Document in RECOVERY.txt:**
   - Test date
   - All steps passed
   - No HTTP 403/500 errors
   - System deemed "Stabilized"
4. **Proceed to Phase 2E** (Monitoring and Observability)

### If Tests Partially Pass (⚠️)

1. **Document which steps failed** (step number + error details)
2. **Note HTTP status codes** (400, 403, 500, etc)
3. **Check troubleshooting section** for each failure
4. **Create follow-up issue/ticket** for non-passing items
5. **Commit partial results** to git with detailed notes
6. **Plan Phase 2E.1** (Investigation and fixes)

### If Tests Fail Completely (❌)

1. **Document all failures** with error messages
2. **Check Phase 2A/2B/2C migrations** applied successfully
3. **Review migration SQL** for potential issues
4. **Check Supabase project state** (tables exist, RLS enabled, etc)
5. **Consider rolling back** if system is in worse state
6. **Create incident report** with findings
7. **Plan remediation** before retesting

---

## Appendix: File References

All documentation and migrations for this test:

| File | Purpose |
|------|---------|
| RECOVERY.txt | Main recovery log (updated during test) |
| docs/audit/RECOVERY_PLAN.md | Full recovery plan reference |
| supabase/migrations/20260512_phase2a_*.sql | Auth linkage restore |
| supabase/migrations/20260512_phase2b_*.sql | Missing tables restore |
| supabase/migrations/20260512_phase2c_*.sql | RLS hardening |
| docs/TEST_EXECUTION_GUIDE_2D3.md | This file |

---

## Questions or Issues?

If you encounter problems not covered in troubleshooting:

1. **Check the detailed RECOVERY.txt** - it has more troubleshooting
2. **Review Phase 2A/2B/2C migrations** - check SQL syntax
3. **Check Supabase project state:**
   - Navigate to https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm
   - Look at SQL logs for error messages
   - Verify tables exist in "Schemas" section
4. **Check frontend dev server logs** - might show client-side errors
5. **Document findings and create follow-up issue**

---

**Test Version:** 2D.3  
**Last Updated:** 2026-05-12  
**Status:** Ready for execution
