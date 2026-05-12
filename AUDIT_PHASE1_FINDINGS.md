# PHASE 1: ROOT CAUSE INVESTIGATION - FINDINGS

## Evidence Gathered

### 1. Database Schema Status

**Base schema migration (20260401000000):**
- ✓ pais table exists
- ✓ departamento table exists  
- ✓ ciudad table exists
- ✓ usuario table exists
- ✓ rol table exists
- ⚠️ iglesia table exists BUT **missing 4 columns** initially

**Subsequent migrations:**
- Migration 20260506021434_add_iglesia_fields.sql:
  ```sql
  ALTER TABLE iglesia ADD COLUMN IF NOT EXISTS direccion TEXT;
  ALTER TABLE iglesia ADD COLUMN IF NOT EXISTS telefono TEXT;
  ALTER TABLE iglesia ADD COLUMN IF NOT EXISTS descripcion TEXT;
  ALTER TABLE iglesia ADD COLUMN IF NOT EXISTS sitio_web TEXT;
  ```
  
**Issue 1: Column Mismatch**
- Frontend types (app.types.ts) expect: idIglesia, nombre, fechaFundacion, estado, idCiudad, direccion, telefono, descripcion, sitioWeb
- Database schema has snake_case: id_iglesia, nombre, fecha_fundacion, estado, id_ciudad, **direccion, telefono, descripcion, sitio_web** (added later)
- Frontend service (iglesias.service.ts) correctly maps snake_case → camelCase

### 2. RLS Policies Status

**iglesia table RLS (20260416130000_fix_iglesia_rls_admin_only.sql):**
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
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
    AND r.nombre IN ('Super Administrador', 'Administrador de Iglesia')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- INSERT Policy: `Admin insert iglesia` - checks is_admin_iglesia()
- UPDATE Policy: `Admin update iglesia` - checks is_admin_iglesia()
- DELETE Policy: `Admin delete iglesia` - checks is_admin_iglesia()

**Critical Issue: Dependency Chain Problem**
The `is_admin_iglesia()` function depends on:
1. usuario table must have row for auth.uid()
2. usuario must have auth_user_id linked
3. usuario_rol must exist linking usuario to role
4. rol must exist with name 'Super Administrador' or 'Administrador de Iglesia'

### 3. Migrations History

**31+ migrations found:**
- 20260401000000_base_schema.sql (base)
- Multiple RLS refinement migrations
- Multiple restoration/fix migrations
- Latest: 20260512011457_fix_aula_curso_rls_allow_creator.sql

**Missing migrations indicator:**
- Files found with .skip prefix:
  - .skip_sp6_rls_security_hardening.sql
  - .skip_sp7_rls_complete_gaps.sql

This suggests incomplete migration history.

### 4. Frontend Integration

**iglesias.service.ts findings:**
- Properly maps database snake_case to frontend camelCase
- Uses Supabase SDK correctly
- Calls to `iglesia` table for CRUD operations

**AppContext.tsx findings:**
- Uses supabase client: `import { supabase } from '@/lib/supabaseClient'`
- Has session/auth management
- Attempts to fetch user and roles from Supabase
- Uses functions: `fetchUsuarioRaw()`, `fetchRolesRaw()`

### 5. Auth Flow Status

**Current flow:**
1. User login via Supabase Auth
2. Auth listener triggers `onAuthStateChange`
3. Fetch usuario record via RPC or direct query
4. Fetch user roles

**Potential issues:**
- Excess SIGNED_IN events suggest listener duplication
- Role fetching complexity with raw HTTP calls

### 6. Critical Missing Audit Data

**Cannot verify without direct DB access:**
- [ ] Does usuario table have data?
- [ ] Does usuario table have auth_user_id links?
- [ ] Do rol records exist for expected roles?
- [ ] Does usuario_rol mapping exist?
- [ ] Are RLS policies actually enabled on tables?
- [ ] Do RPC functions exist?
- [ ] Are departamento RLS policies restrictive?
- [ ] Do missing tables (aula_certificado, aula_inscripcion) exist?
- [ ] Does get_hoja_de_vida_completa() RPC exist?

## Root Cause Analysis - PRELIMINARY

### Error 1: "Super Admin Cannot Create Churches" (400 Bad Request)

**Hypothesis 1.A: Column mismatch**
- Frontend sends: {nombre, idCiudad, direccion, telefono, descripcion, sitioWeb}
- Database expects: id_iglesia, nombre, id_ciudad, direccion, telefono, descripcion, sitio_web
- Supabase REST API maps camelCase from URL but snake_case in body is expected
- **Status**: UNLIKELY - service correctly uses snake_case in insert

**Hypothesis 1.B: RLS INSERT policy failing silently**
- is_admin_iglesia() function depends on usuario record with auth_user_id
- If usuario record missing or not linked, function returns FALSE
- INSERT rejected without explicit error (silent RLS failure)
- **Status**: LIKELY - common issue with auth_user_id linking

**Hypothesis 1.C: Missing dependencies for RLS function**
- usuario table empty or doesn't have the user's record
- usuario_rol table missing the super_admin role link
- rol table missing 'Super Administrador' entry
- **Status**: LIKELY - restoration may have left inconsistent state

### Error 2: "Super Admin Cannot Create Departments" (403 Forbidden)

**Hypothesis 2.A: RLS policy on departamento table**
- departamento likely has "true" allow-all RLS from phase 6 migrations
- Later migrations may have hardened it to "false" or role-based
- **Status**: NEEDS_VERIFICATION

**Hypothesis 2.B: RLS depends on broken auth state**
- Similar to Error 1, if usuario/usuario_rol/auth_user_id missing
- Function check fails → RLS blocks INSERT
- **Status**: LIKELY

### Error 3: Multiple 404 for Missing Tables/RPC

**Hypothesis 3.A: Tables deleted during incident**
- aula_certificado
- aula_inscripcion
- **Status**: LIKELY - these would be in migrations but may not have been applied

**Hypothesis 3.B: RPC functions not restored**
- get_hoja_de_vida_completa()
- Likely depends on other tables being present
- **Status**: LIKELY

### Error 4: Auth State Looping

**Hypothesis 4.A: Duplicate onAuthStateChange listeners**
- AppContext may be mounting multiple times (React StrictMode)
- Multiple subscriptions to same event
- **Status**: NEEDS_CODE_REVIEW

## Next Steps for Complete Investigation

Need direct Supabase database access to:
1. List all tables and confirm presence/absence
2. Check usuario table for data and auth_user_id links
3. Verify rol and usuario_rol relationships
4. List all RLS policies and their conditions
5. Verify all RPC functions exist
6. Check for orphaned data (broken FKs)

## Certainty Levels

| Finding | Certainty |
|---------|-----------|
| Table schema mostly correct | HIGH |
| RLS policy structure exists | HIGH |
| Auth flow has dependency issues | HIGH |
| Missing tables/RPC after restoration | MEDIUM |
| Specific RLS blocking causes | MEDIUM |
| Auth listener duplication | LOW |

