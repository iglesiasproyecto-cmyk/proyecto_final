# Supabase Recovery & Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully stabilize a Supabase + React SPA platform after accidental table/data deletion by fixing four systemic issues in sequence: auth linkage recovery, missing schema restoration, RLS policy hardening, and auth listener cleanup.

**Architecture:** Recovery executed in 4 phases addressing root causes in dependency order:
1. **Phase 2A:** Restore auth linkage (usuario↔auth_user_id) — blocks all other phases
2. **Phase 2B:** Restore missing tables/RPCs (aula_certificado, aula_inscripcion, get_hoja_de_vida_completa)
3. **Phase 2C:** Harden RLS policies (replace permissive "true" with role-based checks)
4. **Phase 2D:** Fix auth listener setup (eliminate duplicates, stabilize session)

Each phase produces working, testable changes with frequent commits.

**Tech Stack:** PostgreSQL/Supabase, RLS policies, Auth.uid() dependency mapping, React hooks, Supabase CLI v1.219.0

---

## Critical Path Summary

**The 4 root causes (in order of blocking dependency):**

1. ⛔ **Auth Dependency Chain Broken** - usuario↔auth_user_id not linked → ALL RLS functions fail → iglesia/departamento cannot be created
2. ⛔ **Incomplete Migration Restoration** - Some tables never restored → 404 errors for aula_* features
3. ⚠️ **RLS Policy Inconsistency** - Permissive "true" mixed with broken role checks → unauthorized access possible
4. ⚠️ **Auth State Looping** - Duplicate listeners → excessive logs, minor performance issue

**Execution Order:** Must be 2A → 2B → 2C → 2D (each phase unblocks next)

---

## PHASE 2A: AUTH LINKAGE RECOVERY

---

### Task 2A.1: Diagnose Current Auth State

**Files:** Reference only (no changes)
- `supabase/migrations/20260407031108_auth_user_id_and_trigger.sql`
- `supabase/migrations/20260416130000_fix_iglesia_rls_admin_only.sql`

- [ ] **Step 1: Access Supabase SQL Editor**

Open: https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm/sql/new

- [ ] **Step 2: Run diagnostic query**

```sql
-- Diagnose auth linkage damage
SELECT 
  (SELECT COUNT(*) FROM usuario) as total_usuarios,
  (SELECT COUNT(*) FROM usuario WHERE auth_user_id IS NOT NULL) as usuarios_with_auth_link,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM usuario_rol WHERE fecha_fin IS NULL) as active_role_assignments,
  (SELECT COUNT(*) FROM rol) as total_roles;
```

**Expected Results:**
- `total_usuarios > 0` (users exist)
- `usuarios_with_auth_link > 0` (at least some linked)
- `total_auth_users >= usuarios_with_auth_link` (auth users exist)
- `active_role_assignments > 0` (users have roles)
- `total_roles >= 5` (expected roles exist)

**If Results Show Problems:**
- `usuarios_with_auth_link = 0` → **CRITICAL**: ALL users unlinked, must fix
- `total_auth_users = 0` → **CRITICAL**: No auth users exist, restoration incomplete
- `active_role_assignments = 0` → **CRITICAL**: No role mappings, auth broken

Document actual numbers in console. These will guide Phase 2A intensity.

- [ ] **Step 3: Check for role definitions**

```sql
SELECT id_rol, nombre FROM rol 
WHERE nombre IN ('Super Administrador', 'Administrador de Iglesia', 'Administrador de Sede', 'Lider', 'Servidor')
ORDER BY nombre;
```

**Expected:** 5 rows with these exact role names

**If Missing:** Any role missing means that role type is completely broken in system

- [ ] **Step 4: Document findings in RECOVERY.txt**

Create: `/home/juanda/Proyectofinal/RECOVERY.txt`

```
RECOVERY LOG - Session Start
=============================

Date: 2026-05-12
Phase: 2A Diagnosis

Findings:
  total_usuarios: [NUMBER]
  usuarios_with_auth_link: [NUMBER]
  total_auth_users: [NUMBER]
  active_role_assignments: [NUMBER]
  total_roles: [NUMBER]

Missing Roles: [LIST or "NONE"]

Severity: [CRITICAL|HIGH|MEDIUM]
```

- [ ] **Step 5: Commit diagnostic results**

```bash
git add RECOVERY.txt
git commit -m "docs(recovery): baseline audit of auth linkage state"
```

---

### Task 2A.2: Create Auth Recovery Migration

**Files:**
- Create: `supabase/migrations/20260512_phase2a_restore_auth_linkage.sql`

- [ ] **Step 1: Create migration file**

```bash
cd /home/juanda/Proyectofinal
touch supabase/migrations/20260512_phase2a_restore_auth_linkage.sql
```

- [ ] **Step 2: Write recovery migration content**

```sql
-- ============================================================
-- PHASE 2A: Restore Auth Linkage After Deletion Incident
-- ============================================================
-- After accidental deletion, usuario.auth_user_id was nullified
-- This migration restores the critical link between usuario and auth.users

-- STEP 1: Ensure auth_user_id column exists (should exist from migration 20260407031108)
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- STEP 2: Ensure handle_new_user trigger exists (auto-provisions usuarios on auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuario (
    nombres, apellidos, correo, contrasena_hash, auth_user_id, activo
  ) VALUES (
    COALESCE(new.raw_user_meta_data->>'nombre', ''),
    COALESCE(new.raw_user_meta_data->>'apellido', ''),
    new.email,
    '',
    new.id,
    true
  )
  ON CONFLICT (correo) DO UPDATE
  SET auth_user_id = new.id
  WHERE usuario.auth_user_id IS NULL;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 3: Ensure all required roles exist
INSERT INTO rol (nombre, descripcion)
VALUES 
  ('Super Administrador', 'Full system access - can view/edit all churches, users, roles'),
  ('Administrador de Iglesia', 'Church administrator - can manage one church and its branches'),
  ('Administrador de Sede', 'Branch administrator - can manage one branch'),
  ('Lider', 'Ministry leader - can manage ministry members and events'),
  ('Servidor', 'Regular member - limited access')
ON CONFLICT (nombre) DO NOTHING;

-- STEP 4: Create helper function to check super admin status
-- (may already exist, this is defensive)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
    AND r.nombre = 'Super Administrador'
    AND ur.fecha_fin IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Create helper function to check admin iglesia status
CREATE OR REPLACE FUNCTION public.is_admin_iglesia()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
    AND r.nombre IN ('Super Administrador', 'Administrador de Iglesia')
    AND ur.fecha_fin IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Create helper function to check admin sede status
CREATE OR REPLACE FUNCTION public.is_admin_sede()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
    AND r.nombre IN ('Super Administrador', 'Administrador de Sede')
    AND ur.fecha_fin IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 7: Log recovery completion
-- (informational - helps track when this was applied)
INSERT INTO notificacion (id_usuario, titulo, mensaje, tipo)
SELECT 
  MIN(id_usuario), 
  'Sistema Recuperado',
  'Recovery Phase 2A: Auth linkage restored',
  'informacion'::tipo_notificacion
FROM usuario
LIMIT 1;
```

- [ ] **Step 3: Edit file and paste content**

```bash
cat > /home/juanda/Proyectofinal/supabase/migrations/20260512_phase2a_restore_auth_linkage.sql << 'EOFMIG'
-- [paste content from Step 2 above]
EOFMIG
```

- [ ] **Step 4: Apply migration via Supabase SQL Editor**

1. Open: https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm/sql/new
2. Copy entire migration content (Step 2 above)
3. Paste into SQL Editor
4. Click "Run"
5. Verify: No errors, query completes

- [ ] **Step 5: Test migration was applied**

```sql
-- Verify functions created
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN ('handle_new_user', 'is_super_admin', 'is_admin_iglesia', 'is_admin_sede');
-- Expected: 4 rows
```

- [ ] **Step 6: Commit migration**

```bash
git add supabase/migrations/20260512_phase2a_restore_auth_linkage.sql
git commit -m "fix(auth): restore auth linkage infrastructure and role definitions"
```

---

### Task 2A.3: Link Existing Users (Manual Operation)

**This step requires careful manual execution to avoid linking wrong users.**

- [ ] **Step 1: Prepare linking query**

In Supabase SQL Editor, run (but DON'T execute the UPDATE yet):

```sql
-- STEP 1: Identify unlinked usuarios with matching auth.users
SELECT 
  u.id_usuario,
  u.correo,
  a.id as auth_id,
  CASE WHEN a.id IS NOT NULL THEN 'CAN_LINK' ELSE 'NO_MATCH' END as link_status
FROM usuario u
LEFT JOIN auth.users a ON a.email = u.correo
WHERE u.auth_user_id IS NULL
  AND u.correo IS NOT NULL
ORDER BY u.correo;
```

This shows which users CAN be linked. Review for correctness before proceeding.

- [ ] **Step 2: Count how many will be linked**

```sql
-- STEP 2: Count linkable users
SELECT COUNT(*) as usuarios_to_link
FROM usuario u
WHERE u.auth_user_id IS NULL 
  AND u.correo IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users a WHERE a.email = u.correo);
```

Document this number. It should match "unlinked_usuarios" from Task 2A.1.

- [ ] **Step 3: Execute linking in transaction**

```sql
BEGIN;

-- Link users
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

-- Verify linkage succeeded
SELECT COUNT(*) as still_unlinked
FROM usuario
WHERE auth_user_id IS NULL AND correo IS NOT NULL;
-- Expected: 0 or very small number

COMMIT;
```

- [ ] **Step 4: Verify all users linked**

```sql
SELECT COUNT(*) as unlinked_without_email
FROM usuario
WHERE auth_user_id IS NULL AND (correo IS NULL OR correo = '');
```

If > 0: These are orphaned users without emails, cannot be auto-linked. Leave NULL (they will fail RLS).

- [ ] **Step 5: Document linking completion**

Update RECOVERY.txt:

```
Auth Linkage Restoration:
  usuarios_linked: [count from Step 2]
  Still unlinked: [count from Step 4]
  Status: COMPLETE ✓
```

- [ ] **Step 6: Commit (informational)**

```bash
git add RECOVERY.txt
git commit -m "docs(recovery): auth linkage restoration complete"
```

---

### Task 2A.4: Test RLS Functions Work

- [ ] **Step 1: Test is_super_admin() function logic**

Find a user with Super Administrador role, then test:

```sql
-- STEP 1: Find a super admin
SELECT id_usuario, nombres, correo
FROM usuario u
JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
JOIN rol r ON ur.id_rol = r.id_rol
WHERE r.nombre = 'Super Administrador'
  AND ur.fecha_fin IS NULL
LIMIT 1;
-- Call this SUPER_ADMIN_ID

-- STEP 2: Simulate auth.uid() for that user
-- (Cannot directly simulate in SQL, but verify role exists)
SELECT EXISTS (
  SELECT 1
  FROM usuario_rol ur
  JOIN rol r ON ur.id_rol = r.id_rol
  WHERE ur.id_usuario = [SUPER_ADMIN_ID]  -- <-- Replace
    AND r.nombre = 'Super Administrador'
    AND ur.fecha_fin IS NULL
) as has_super_admin_role;
-- Expected: true
```

- [ ] **Step 2: Test is_admin_iglesia() function logic**

Same as Step 1, but check for either role:

```sql
SELECT EXISTS (
  SELECT 1
  FROM usuario_rol ur
  JOIN rol r ON ur.id_rol = r.id_rol
  WHERE ur.id_usuario = [SUPER_ADMIN_ID]
    AND r.nombre IN ('Super Administrador', 'Administrador de Iglesia')
    AND ur.fecha_fin IS NULL
) as has_iglesia_admin_role;
-- Expected: true
```

- [ ] **Step 3: Test iglesia INSERT policy (will test in Phase 2D with real auth)**

Document: RLS function checks verified, ready for integration test.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "test(auth): verify RLS helper functions post-restoration"
```

---

## PHASE 2B: RESTORE MISSING TABLES & RPC FUNCTIONS

---

### Task 2B.1: Check Which Tables Are Missing

- [ ] **Step 1: Query to list tables**

In Supabase SQL Editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Check if these exist:
- `aula_certificado` 
- `aula_inscripcion`
- `hoja_de_vida`

Document which are missing.

- [ ] **Step 2: Check if RPC exists**

```sql
SELECT proname FROM pg_proc
WHERE proname = 'get_hoja_de_vida_completa'
  AND pg_proc.proowner = (SELECT usesysid FROM pg_user WHERE usename = 'postgres');
```

If 0 rows: RPC is missing, must create.

- [ ] **Step 3: Document findings**

Update RECOVERY.txt with missing table/RPC list.

- [ ] **Step 4: Commit**

```bash
git add RECOVERY.txt
git commit -m "audit(schema): identify missing tables and RPC functions"
```

---

### Task 2B.2: Create Missing Tables

**Files:** Create: `supabase/migrations/20260512_phase2b_restore_missing_tables.sql`

- [ ] **Step 1: Create migration file**

```bash
touch /home/juanda/Proyectofinal/supabase/migrations/20260512_phase2b_restore_missing_tables.sql
```

- [ ] **Step 2: Write migration content**

```sql
-- ============================================================
-- PHASE 2B: Restore Missing Tables After Deletion
-- ============================================================
-- These tables were present in pre-deletion schema but were not restored

-- TABLE 1: hoja_de_vida (if missing)
CREATE TABLE IF NOT EXISTS hoja_de_vida (
  id_hoja_de_vida BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  perfil_profesional TEXT,
  experiencia_laboral TEXT,
  formacion_academica TEXT,
  habilidades TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at_hoja_de_vida ON hoja_de_vida;
CREATE TRIGGER set_updated_at_hoja_de_vida
  BEFORE UPDATE ON hoja_de_vida FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_hoja_de_vida_usuario ON hoja_de_vida(id_usuario);
ALTER TABLE hoja_de_vida ENABLE ROW LEVEL SECURITY;

-- TABLE 2: aula_inscripcion (if missing)  
CREATE TABLE IF NOT EXISTS aula_inscripcion (
  id_aula_inscripcion BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_aula_curso BIGINT NOT NULL REFERENCES aula_curso(id_aula_curso) ON DELETE CASCADE,
  fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_retiro DATE,
  estado estado_detalle NOT NULL DEFAULT 'inscrito',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_usuario, id_aula_curso),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS set_updated_at_aula_inscripcion ON aula_inscripcion;
CREATE TRIGGER set_updated_at_aula_inscripcion
  BEFORE UPDATE ON aula_inscripcion FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_usuario ON aula_inscripcion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_aula_curso ON aula_inscripcion(id_aula_curso);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_deleted ON aula_inscripcion(deleted_at) WHERE deleted_at IS NOT NULL;
ALTER TABLE aula_inscripcion ENABLE ROW LEVEL SECURITY;

-- TABLE 3: aula_certificado (if missing)
CREATE TABLE IF NOT EXISTS aula_certificado (
  id_aula_certificado BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_aula_curso BIGINT NOT NULL REFERENCES aula_curso(id_aula_curso) ON DELETE CASCADE,
  fecha_certificacion DATE NOT NULL,
  numero_certificado VARCHAR(100) UNIQUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at_aula_certificado ON aula_certificado;
CREATE TRIGGER set_updated_at_aula_certificado
  BEFORE UPDATE ON aula_certificado FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_aula_certificado_usuario ON aula_certificado(id_usuario);
ALTER TABLE aula_certificado ENABLE ROW LEVEL SECURITY;

-- RPC 1: get_hoja_de_vida_completa() - Fetch user resume/CV data
CREATE OR REPLACE FUNCTION public.get_hoja_de_vida_completa(usuario_id bigint)
RETURNS TABLE (
  id_usuario bigint,
  nombres varchar,
  apellidos varchar,
  correo varchar,
  perfil_profesional text,
  experiencia_laboral text,
  formacion_academica text,
  habilidades text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id_usuario,
    u.nombres,
    u.apellidos,
    u.correo,
    COALESCE(hv.perfil_profesional, '') as perfil_profesional,
    COALESCE(hv.experiencia_laboral, '') as experiencia_laboral,
    COALESCE(hv.formacion_academica, '') as formacion_academica,
    COALESCE(hv.habilidades, '') as habilidades
  FROM usuario u
  LEFT JOIN hoja_de_vida hv ON u.id_usuario = hv.id_usuario
  WHERE u.id_usuario = usuario_id
    AND u.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_hoja_de_vida_completa(bigint) TO authenticated;
```

- [ ] **Step 3: Apply migration**

1. Copy migration content into Supabase SQL Editor
2. Execute
3. Verify no errors

- [ ] **Step 4: Verify tables created**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('hoja_de_vida', 'aula_inscripcion', 'aula_certificado')
  AND table_schema = 'public'
ORDER BY table_name;
-- Expected: 3 rows
```

- [ ] **Step 5: Verify RPC created**

```sql
SELECT proname, pronargs FROM pg_proc
WHERE proname = 'get_hoja_de_vida_completa';
-- Expected: 1 row
```

- [ ] **Step 6: Test RPC**

```sql
SELECT * FROM get_hoja_de_vida_completa(1)
LIMIT 1;
-- Expected: No error (may return empty row, that's OK)
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260512_phase2b_restore_missing_tables.sql
git commit -m "feat(schema): restore missing tables and RPC after deletion incident"
```

---

## PHASE 2C: RLS POLICY HARDENING

---

### Task 2C.1: Audit Existing RLS Policies

- [ ] **Step 1: List all RLS policies**

In Supabase SQL Editor:

```sql
SELECT 
  tablename,
  policyname,
  permissive,
  qual as condition,
  with_check as check_condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Document which tables have RLS, which don't.

- [ ] **Step 2: Identify permissive "true" policies**

```sql
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true');
```

These are security risks. Document which ones exist.

- [ ] **Step 3: Document findings**

Update RECOVERY.txt with list of:
- Tables with permissive "true" INSERT
- Tables with permissive "true" UPDATE
- Tables with permissive "true" DELETE

- [ ] **Step 4: Commit**

```bash
git add RECOVERY.txt
git commit -m "audit(rls): identify permissive policies for hardening"
```

---

### Task 2C.2: Harden RLS Policies

**Files:** Create: `supabase/migrations/20260512_phase2c_harden_rls_policies.sql`

- [ ] **Step 1: Create migration file**

- [ ] **Step 2: Write hardening migration**

```sql
-- ============================================================
-- PHASE 2C: Harden RLS Policies
-- ============================================================
-- Replace permissive "true" policies with role-based access control

-- HARDENING 1: departamento - Restrict to super_admin for mutations
DROP POLICY IF EXISTS "authenticated insert departamento" ON departamento;
DROP POLICY IF EXISTS "authenticated update departamento" ON departamento;
DROP POLICY IF EXISTS "authenticated delete departamento" ON departamento;

CREATE POLICY "super_admin insert departamento"
  ON departamento FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin update departamento"
  ON departamento FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin delete departamento"
  ON departamento FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- SELECT remains as is (already restrictive)

-- HARDENING 2: pais - Restrict to super_admin for mutations
DROP POLICY IF EXISTS "authenticated insert pais" ON pais;
DROP POLICY IF EXISTS "authenticated update pais" ON pais;
DROP POLICY IF EXISTS "authenticated delete pais" ON pais;

CREATE POLICY "super_admin insert pais"
  ON pais FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin update pais"
  ON pais FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin delete pais"
  ON pais FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- HARDENING 3: ciudad - Restrict to super_admin for mutations
DROP POLICY IF EXISTS "authenticated insert ciudad" ON ciudad;
DROP POLICY IF EXISTS "authenticated update ciudad" ON ciudad;
DROP POLICY IF EXISTS "authenticated delete ciudad" ON ciudad;

CREATE POLICY "super_admin insert ciudad"
  ON ciudad FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin update ciudad"
  ON ciudad FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin delete ciudad"
  ON ciudad FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- Note: Repeat this pattern for other geographic tables
-- and apply role-specific hardening to iglesia, sede, ministerio, etc.
```

- [ ] **Step 3: Apply migration**

1. Copy into Supabase SQL Editor
2. Execute
3. Verify no errors

- [ ] **Step 4: Verify hardened policies**

```sql
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('departamento', 'pais', 'ciudad');
-- Policies should reference is_super_admin(), not just "true"
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260512_phase2c_harden_rls_policies.sql
git commit -m "fix(rls): harden policies, replace permissive true with role-based checks"
```

---

## PHASE 2D: AUTH LISTENER CLEANUP

---

### Task 2D.1: Review AppContext Auth Setup

**Files:** Reference: `src/app/store/AppContext.tsx`

- [ ] **Step 1: Search for duplicate listeners**

```bash
grep -n "onAuthStateChange\|useEffect" /home/juanda/Proyectofinal/src/app/store/AppContext.tsx | head -20
```

Count how many useEffect and onAuthStateChange calls exist.

- [ ] **Step 2: Check dependency array**

Look for the useEffect containing onAuthStateChange. Verify it has:

```typescript
useEffect(() => {
  // ... subscription logic ...
}, []);  // <-- MUST be empty array
```

NOT:

```typescript
useEffect(() => { // <-- BAD: missing dependency array
useEffect(() => { ... }, [state]) // <-- BAD: dependencies cause re-subscriptions
```

- [ ] **Step 3: Check for React.StrictMode**

```bash
grep -n "StrictMode" /home/juanda/Proyectofinal/src/main.tsx
```

If it exists, that's OK (helps find bugs in dev).

- [ ] **Step 4: Document findings**

Update RECOVERY.txt:

```
Auth Listener Setup:
  useEffect count: [number]
  Duplicate listeners: [YES/NO]
  Dependency array correct: [YES/NO]
  React.StrictMode: [YES/NO]
```

- [ ] **Step 5: Commit findings**

```bash
git add RECOVERY.txt
git commit -m "audit(auth): review listener setup for optimization"
```

---

### Task 2D.2: Fix Duplicate Listeners (If Found)

**Precondition:** Task 2D.1 found duplicates

- [ ] **Step 1: Edit AppContext.tsx**

If Task 2D.1 found 2+ useEffect with onAuthStateChange, remove duplicates, keeping only the first.

**BEFORE:**
```typescript
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => { ... })
}, []);

useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => { ... })  // DUPLICATE
}, []);
```

**AFTER:**
```typescript
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => { ... })
}, []);
// Second one removed
```

- [ ] **Step 2: Verify dependency array is empty**

Ensure the remaining useEffect has `[]` dependency array, not `[state]` or missing.

- [ ] **Step 3: Test locally**

```bash
cd /home/juanda/Proyectofinal
npm run dev
```

In browser console (DevTools → Console), sign in and watch for logs.

Expected: `[AUTH] onAuthStateChange: SIGNED_IN` appears ONCE per login, not repeated.

If still repeated: Check if component unmounting/remounting (React.StrictMode in dev causes this, which is intended).

- [ ] **Step 4: Commit fix**

```bash
git add src/app/store/AppContext.tsx
git commit -m "fix(auth): consolidate duplicate onAuthStateChange subscribers"
```

---

### Task 2D.3: Integration Test (Full Auth Flow)

Precondition: All Phases 2A-2D migrations applied to Supabase

- [ ] **Step 1: Create test user (Manual in Supabase)**

1. Open: https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm/auth/users
2. Click "Add user"
3. Email: `test-admin@local.test`
4. Password: `Test123!@#`
5. Create user

- [ ] **Step 2: Assign super_admin role**

In Supabase SQL Editor:

```sql
INSERT INTO usuario_rol (id_usuario, id_rol, fecha_inicio)
VALUES (
  (SELECT id_usuario FROM usuario WHERE correo = 'test-admin@local.test'),
  (SELECT id_rol FROM rol WHERE nombre = 'Super Administrador'),
  NOW()::date
);
```

- [ ] **Step 3: Ensure a city exists (for iglesia creation)**

```sql
SELECT id_ciudad, nombre FROM ciudad LIMIT 1;
-- Expected: at least one city exists
-- If not: CREATE manually or use existing data
```

- [ ] **Step 4: Test frontend login**

1. Open app: http://localhost:5173 (after `npm run dev`)
2. Click login
3. Enter: `test-admin@local.test` / `Test123!@#`
4. Expected: Login succeeds, redirects to dashboard

If fails: Check console for auth errors. Likely cause: usuario↔auth_user_id link missing (go back to Task 2A).

- [ ] **Step 5: Test iglesia creation**

1. Navigate to iglesia creation
2. Fill form:
   - Nombre: "Test Iglesia Recovery"
   - Ciudad: [select from dropdown]
   - Estado: "activa"
3. Click Create
4. Expected: Success message, record appears in list

If fails with 400/403: RLS policy blocked. Check:
- Is user linked to auth.users? (Task 2A issue)
- Does user have admin role? (Task 2A.2 issue)
- Is iglesia RLS policy correctly referencing is_admin_iglesia()? (Task 2A.2 issue)

- [ ] **Step 6: Test departamento creation**

1. Navigate to departamento creation
2. Fill form:
   - Nombre: "Test Departamento Recovery"
   - País: [select from dropdown]
3. Click Create
4. Expected: Success message

If fails with 403: RLS hardening issue. Check:
- Migration 2C applied? 
- Policy references is_super_admin()? 
- User has super_admin role?

- [ ] **Step 7: Commit test**

```bash
git commit --allow-empty -m "test(recovery): full auth flow verification passed"
```

---

## FINAL VALIDATION CHECKLIST

After all tasks complete:

- [ ] **PHASE 2A Complete**
  - [ ] Auth linkage migration applied
  - [ ] All usuarios linked to auth.users
  - [ ] RLS helper functions exist
  - [ ] Role definitions complete

- [ ] **PHASE 2B Complete**
  - [ ] Missing tables created (hoja_de_vida, aula_inscripcion, aula_certificado)
  - [ ] RPC get_hoja_de_vida_completa() exists and callable
  - [ ] No 404 errors for missing tables

- [ ] **PHASE 2C Complete**
  - [ ] Permissive "true" policies replaced
  - [ ] departamento, pais, ciudad policies hardened
  - [ ] RLS checks role membership (not just "true")

- [ ] **PHASE 2D Complete**
  - [ ] No duplicate onAuthStateChange listeners
  - [ ] Dependency array is empty []
  - [ ] No excessive [AUTH] logs on login

- [ ] **System Level**
  - [ ] iglesia CREATE works (no 400/403)
  - [ ] departamento CREATE works (no 403)
  - [ ] No 404 errors for missing tables
  - [ ] Auth login/logout works
  - [ ] Session persists across page reloads

---

## Execution Instructions

**This plan is ready to execute in two ways:**

### Option 1: Subagent-Driven (Recommended)
Use `superpowers:subagent-driven-development` to execute each task with fresh subagent per task, review between tasks, parallel execution possible.

### Option 2: Inline Execution
Use `superpowers:executing-plans` to execute sequentially in this session with checkpoints.

**Which execution method do you prefer?**
