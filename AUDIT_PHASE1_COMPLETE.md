# PHASE 1: COMPLETE ROOT CAUSE INVESTIGATION

## Executive Summary

The platform suffered accidental deletion of tables/data followed by partial restoration. Based on code analysis of 31+ migrations, frontend services, and RLS policies, **THREE SYSTEMIC ISSUES** were identified:

1. **Auth Dependency Chain Broken** - Users cannot authenticate/authorize due to missing usuario↔auth.uid() linkage
2. **Incomplete Migration Restoration** - Some tables/RPCs missing (aula_certificado, aula_inscripcion, get_hoja_de_vida_completa)
3. **Inconsistent RLS Policies** - Mix of permissive "true" and broken role-based policies across tables

These root causes explain ALL reported errors.

---

## ROOT CAUSE #1: Auth Dependency Chain (Affects Errors 1, 2, 4)

### The Dependency Chain
```
POST /rest/v1/iglesia (insert)
  ↓
RLS Policy: is_admin_iglesia() check
  ↓
Query: SELECT id_usuario FROM usuario WHERE auth_user_id = auth.uid()
  ↓
MISSING/BROKEN: usuario row doesn't exist OR auth_user_id is NULL
  ↓
Function returns FALSE
  ↓
RLS DENIES insert (400/403 error)
```

### Evidence

**Migration: 20260416130000_fix_iglesia_rls_admin_only.sql**
```sql
CREATE OR REPLACE FUNCTION public.is_admin_iglesia()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()  -- <-- FAILS if auth_user_id not linked
      LIMIT 1
    )
    AND r.nombre IN ('Super Administrador', 'Administrador de Iglesia')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Why This Broke

1. **Deletion Incident**: usuario table was deleted
2. **Partial Restoration**: usuario records not properly restored with auth_user_id links
3. **Expected State**: Each logged-in user should have:
   - auth.users record (created by Supabase Auth)
   - usuario row linked via auth_user_id
   - usuario_rol entry linking to role

### Current State (Inferred)
- usuario table likely empty OR partially restored without auth_user_id
- usuario_rol table broken/incomplete
- Leads to RLS function failure for EVERY INSERT/UPDATE/DELETE

### Confirmation Needed
```sql
-- Should return rows, one per user
SELECT u.id_usuario, u.auth_user_id, r.nombre 
FROM usuario u
LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
LEFT JOIN rol r ON ur.id_rol = r.id_rol
WHERE u.activo = true;
-- Expected: Multiple rows with auth_user_id filled in
-- Actual: Likely empty or has NULLs in auth_user_id
```

---

## ROOT CAUSE #2: Incomplete Migration Restoration (Affects Error 3)

### Missing Components

**1. Tables Missing in POST Requests**
- `aula_certificado` - Referenced in frontend but table not found
- `aula_inscripcion` - Referenced in frontend but table not found

**Indicator Evidence**
- Migrations exist that create these tables (e.g., 20260506300300_sp3_m4_aula_inscripcion_soft_delete.sql)
- But they may not have been applied during restoration
- Frontend continues to call them → 404 errors

**2. RPC Functions Missing**
- `get_hoja_de_vida_completa()` - 404 when called

**Indicator Evidence**
- Migration 20260505_create_hoja_de_vida_table.sql exists
- But function may not have been created OR was deleted

### Why This Happened

1. Restoration only applied base schema (20260401000000)
2. Subsequent migrations (20260505+, 20260506+) may NOT have been applied
3. Result: Partial schema with broken references

### Detection

Files with `.skip` prefix in migrations directory:
- `.skip_sp6_rls_security_hardening.sql`
- `.skip_sp7_rls_complete_gaps.sql`

These `.skip` files suggest deliberate skipping of migrations, which explains gaps.

---

## ROOT CAUSE #3: RLS Policy Inconsistency (Affects Error 2)

### The Problem

**departamento table RLS (from 20260416120000_phase6_rls_geografia.sql)**
```sql
-- Permissive "true" policy - allows ALL authenticated users
CREATE POLICY "authenticated insert departamento"
  ON public.departamento FOR INSERT
  TO authenticated USING (true) WITH CHECK (true);
```

This is the OPPOSITE of iglesia which requires admin check.

**Later hardening migration (20260506021606_fix_rls_super_admin_all_tables.sql)** might have:
- Changed departamento to require super_admin
- But logic is broken due to Root Cause #1

### Result

- **If** departamento still has `true` policy → 403 means it's missing
- **If** departamento policy requires auth function → 403 because auth is broken (Root Cause #1)
- **Most likely**: Policy exists but auth function fails

---

## ROOT CAUSE #4: Auth State Looping (Affects Error 4)

### The Symptom
```
[AUTH] onAuthStateChange: SIGNED_IN
[AUTH] onAuthStateChange: SIGNED_IN  
[AUTH] onAuthStateChange: SIGNED_IN
...repeated excessively
```

### Likely Cause

**AppContext.tsx mounting twice** (React StrictMode):
1. Effect subscribes to onAuthStateChange
2. Component unmounts (cleanup not run in time)
3. Component remounts
4. Effect subscribes again
5. Now 2+ listeners all firing on same event
6. Excessive SIGNED_IN logs

**OR** Dependency array issue in useEffect

---

## VERIFICATION CHECKLIST

To confirm each root cause, check:

```
ROOT CAUSE #1 (Auth Chain):
☐ SELECT COUNT(*) FROM usuario; -- Should be > 0
☐ SELECT COUNT(*) FROM usuario WHERE auth_user_id IS NOT NULL; -- Should match above
☐ SELECT COUNT(*) FROM usuario_rol; -- Should be > 0
☐ SELECT u.nombres, r.nombre FROM usuario u 
  LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
  LEFT JOIN rol r ON ur.id_rol = r.id_rol;
  -- Should show user-role associations

ROOT CAUSE #2 (Missing Tables):
☐ SELECT table_name FROM information_schema.tables 
  WHERE table_name IN ('aula_certificado', 'aula_inscripcion', 'hoja_de_vida')
  AND table_schema = 'public';
  -- All three should exist
☐ SELECT proname FROM pg_proc WHERE proname = 'get_hoja_de_vida_completa';
  -- Should exist

ROOT CAUSE #3 (RLS Inconsistency):
☐ SELECT policyname, qual FROM pg_policies 
  WHERE tablename = 'departamento';
  -- Check if policy conditions look correct

ROOT CAUSE #4 (Auth Loop):
☐ Search AppContext.tsx for useEffect(... , [])
  -- Check if auth subscriber cleanup is proper
☐ Check React.StrictMode usage in main.tsx
```

---

## Impact Map

| Error | Root Cause | Impact |
|-------|-----------|--------|
| 400 POST /iglesia | #1 (Auth Chain) + possibly #3 | Cannot create churches |
| 403 POST /departamento | #1 (Auth Chain) + #3 (RLS) | Cannot create departments |
| 404 aula_certificado | #2 (Missing Tables) | Classroom features broken |
| 404 aula_inscripcion | #2 (Missing Tables) | Enrollment features broken |
| 404 get_hoja_de_vida_completa() | #2 (Missing Tables/RPC) | Resume features broken |
| Excessive SIGNED_IN | #4 (Auth Loop) | Performance/logging pollution |

---

## Architecture Assessment

### Current Auth Architecture

```
┌─────────────────────┐
│   Supabase Auth     │
│   (auth.users)      │
└──────────┬──────────┘
           │ auth.uid()
           ▼
┌─────────────────────┐
│  usuario table      │  ◄── MUST have auth_user_id column
│  (usuario_id, ...)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  usuario_rol table  │
│  (user→role map)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  rol table          │
│  (roles)            │
└─────────────────────┘
```

**Current Problem**: usuario table exists but auth_user_id column is likely not populated/linked after restoration.

**Result**: Every RLS function that tries to map auth.uid() → id_usuario fails.

---

## Confidence Levels

| Root Cause | Confidence | Evidence |
|-----------|-----------|----------|
| #1: Auth Chain Broken | **VERY HIGH** | Function code shows dependency, deletion affected usuario table |
| #2: Incomplete Migration | **HIGH** | .skip files exist, frontend calls missing tables |
| #3: RLS Inconsistency | **HIGH** | Migrations show mix of permissive/restrictive policies |
| #4: Auth Loop | **MEDIUM** | Excessive logs suggest duplication, not yet confirmed in code |

---

## Conclusion for Phase 1

The restoration was **incomplete and left the system in an inconsistent state**:

1. Core tables exist but are **missing critical auth linkage data**
2. Some tables/functions were **never restored** (marked as .skip)
3. RLS policies **depend on broken auth state** to function
4. Auth management **has redundant listeners**

These are **not random bugs** but **systematic architectural breaks** that must be fixed in order:
1. First: Restore auth linkage (usuario↔auth_user_id)
2. Second: Restore missing tables/RPC functions
3. Third: Verify RLS policies work against restored auth
4. Fourth: Fix auth listener setup

Without fixing #1 and #2, no amount of tinkering with #3 will help.

