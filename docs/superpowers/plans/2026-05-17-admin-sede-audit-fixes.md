# Administrador de Sede Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `admin_sede` role so it can only operate inside its assigned sede(s), with matching DB/RLS, Edge Function, service, and UI behavior.

**Architecture:** Treat PostgreSQL/RLS as the source of truth and make frontend checks a UX layer only. Replace global SECURITY DEFINER access with scoped RPCs, enforce caller authorization inside privileged functions, and make UI reads/mutations use the same sede scope returned by `get_my_roles`.

**Tech Stack:** Supabase Postgres, Supabase Edge Functions (Deno), React 18, Vite, React Query, TypeScript, Tailwind CSS, shadcn/ui.

---

## File Structure

- Create: `supabase/migrations/20260517000100_harden_admin_sede_role_scope.sql`
  - Adds/updates DB functions and RLS policies for `admin_sede` scope.
- Modify: `supabase/functions/invite-user/index.ts`
  - Lets `admin_sede` invite only allowed roles into its own sede and ministerios.
- Modify: `src/services/usuarios.service.ts`
  - Replaces global user RPC usage with a scoped RPC and removes client assumptions that bypass RLS.
- Modify: `src/services/eventos.service.ts`
  - Reads `usuario_rol_sede` when checking admin_sede scope for task assignment.
- Modify: `src/app/components/MembersPage.tsx`
  - Enables member management for admin_sede in ministerios from its sede(s).
- Modify: `src/app/components/TasksPage.tsx`
  - Removes `sedesDelUsuario[0]` assumptions and supports all assigned sedes.
- Modify: `src/app/components/UsuariosPage.tsx`
  - Removes single-sede assumptions in filtering/defaults and only shows assignable roles.
- Modify: `src/app/components/AdministradorPage.tsx`
  - Adds an explicit role guard so direct URL access does not render admin assignment UI for admin_sede.
- Modify: `src/app/routes.ts`
  - Optional: keep route but rely on component guard; no route split required.
- Create: `scripts/audit-admin-sede.sql`
  - Verifies effective DB policies, grants, and duplicate task policies after migration.

---

### Task 1: Add DB Hardening Migration

**Files:**
- Create: `supabase/migrations/20260517000100_harden_admin_sede_role_scope.sql`
- Create: `scripts/audit-admin-sede.sql`

- [ ] **Step 1: Create the migration file**

Add `supabase/migrations/20260517000100_harden_admin_sede_role_scope.sql`:

```sql
-- Harden Administrador de Sede scope.
-- Root causes fixed:
-- 1. SECURITY DEFINER RPCs exposed global users/role assignment without caller checks.
-- 2. admin_sede aula policies were iglesia-scoped instead of sede-scoped.
-- 3. stale tarea policies duplicated newer policies and made effective permissions hard to reason about.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_sedes()
RETURNS TABLE(id bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT urs.id_sede::bigint
  FROM public.usuario_rol_sede urs
  JOIN public.rol r ON r.id_rol = urs.id_rol
  WHERE urs.id_usuario = public.get_my_usuario_id()
    AND urs.fecha_fin IS NULL
    AND urs.id_sede IS NOT NULL
    AND lower(translate(r.nombre, 'íÍáÁéÉóÓúÚüÜñÑ', 'iIaAeEoOuUuUnN')) = 'administrador de sede';
$$;

CREATE OR REPLACE FUNCTION public.can_manage_sede(p_id_sede bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.sede s
        WHERE s.id_sede = p_id_sede
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_admin_sede()
      AND NOT public.is_admin_iglesia()
      AND p_id_sede IN (SELECT id FROM public.get_my_sedes())
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_ministerio(p_id_ministerio bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.ministerio m
      JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE m.id_ministerio = p_id_ministerio
        AND (
          (public.is_admin_iglesia() AND s.id_iglesia = public.get_my_tenant_id())
          OR (
            public.is_admin_sede()
            AND NOT public.is_admin_iglesia()
            AND m.id_sede IN (SELECT id FROM public.get_my_sedes())
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_assign_role_scoped(
  p_target_role_id bigint,
  p_id_iglesia bigint,
  p_id_sede bigint DEFAULT NULL,
  p_id_ministerio bigint DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_name text;
BEGIN
  SELECT nombre INTO v_role_name
  FROM public.rol
  WHERE id_rol = p_target_role_id;

  IF v_role_name IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  IF v_role_name = 'Super Administrador' THEN
    RETURN false;
  END IF;

  IF public.is_admin_iglesia() THEN
    RETURN p_id_iglesia = public.get_my_tenant_id();
  END IF;

  IF public.is_admin_sede() AND NOT public.is_admin_iglesia() THEN
    IF v_role_name NOT IN ('Administrador de Sede', 'Líder', 'Servidor') THEN
      RETURN false;
    END IF;

    IF p_id_sede IS NULL OR p_id_sede NOT IN (SELECT id FROM public.get_my_sedes()) THEN
      RETURN false;
    END IF;

    IF v_role_name IN ('Líder', 'Servidor') THEN
      RETURN p_id_ministerio IS NOT NULL AND public.can_manage_ministerio(p_id_ministerio);
    END IF;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_role_with_ministerio(
  p_id_usuario bigint,
  p_id_rol bigint,
  p_id_iglesia bigint,
  p_id_sede bigint DEFAULT NULL,
  p_id_ministerio bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sede_roles bigint[] := ARRAY[3, 4, 9];
  v_min_roles bigint[] := ARRAY[3, 4];
  v_is_sede_role boolean;
  v_needs_min boolean;
  v_id_asignado bigint;
  v_rol_label text;
BEGIN
  IF NOT public.can_assign_role_scoped(p_id_rol, p_id_iglesia, p_id_sede, p_id_ministerio) THEN
    RAISE EXCEPTION 'No autorizado para asignar este rol en el alcance solicitado'
      USING ERRCODE = '42501';
  END IF;

  v_is_sede_role := p_id_rol = ANY(v_sede_roles);
  v_needs_min := p_id_rol = ANY(v_min_roles);

  IF v_is_sede_role THEN
    INSERT INTO public.usuario_rol_sede(id_usuario, id_rol, id_iglesia, id_sede, fecha_inicio)
    SELECT p_id_usuario, p_id_rol, p_id_iglesia, p_id_sede, CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND id_sede IS NOT DISTINCT FROM p_id_sede
        AND fecha_fin IS NULL
    )
    RETURNING id_usuario_rol_sede INTO v_id_asignado;

    IF v_id_asignado IS NULL THEN
      SELECT id_usuario_rol_sede INTO v_id_asignado
      FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND id_sede IS NOT DISTINCT FROM p_id_sede
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  ELSE
    INSERT INTO public.usuario_rol(id_usuario, id_rol, id_iglesia, fecha_inicio)
    SELECT p_id_usuario, p_id_rol, p_id_iglesia, CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
    )
    RETURNING id_usuario_rol INTO v_id_asignado;

    IF v_id_asignado IS NULL THEN
      SELECT id_usuario_rol INTO v_id_asignado
      FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  END IF;

  IF v_needs_min AND p_id_ministerio IS NOT NULL THEN
    v_rol_label := CASE p_id_rol WHEN 3 THEN 'Líder' ELSE 'Servidor' END;
    INSERT INTO public.miembro_ministerio(id_usuario, id_ministerio, rol_en_ministerio, fecha_ingreso)
    VALUES (p_id_usuario, p_id_ministerio, v_rol_label, CURRENT_DATE)
    ON CONFLICT (id_usuario, id_ministerio) WHERE fecha_salida IS NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'id_asignacion', v_id_asignado);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_usuarios_enriquecidos_scoped()
RETURNS TABLE(
  id_usuario bigint,
  nombres text,
  apellidos text,
  correo text,
  telefono text,
  fecha_nacimiento date,
  activo boolean,
  ultimo_acceso timestamptz,
  auth_user_id uuid,
  creado_en timestamptz,
  updated_at timestamptz,
  roles jsonb,
  ministerios jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH visible_users AS (
    SELECT DISTINCT u.id_usuario
    FROM public.usuario u
    WHERE public.is_super_admin()
       OR u.auth_user_id = auth.uid()
       OR (
         public.is_admin_iglesia()
         AND EXISTS (
           SELECT 1 FROM public.usuario_rol ur
           WHERE ur.id_usuario = u.id_usuario
             AND ur.id_iglesia = public.get_my_tenant_id()
             AND ur.fecha_fin IS NULL
         )
       )
       OR (
         public.is_admin_sede()
         AND NOT public.is_admin_iglesia()
         AND (
           EXISTS (
             SELECT 1 FROM public.usuario_rol_sede urs
             WHERE urs.id_usuario = u.id_usuario
               AND urs.id_sede IN (SELECT id FROM public.get_my_sedes())
               AND urs.fecha_fin IS NULL
           )
           OR EXISTS (
             SELECT 1
             FROM public.miembro_ministerio mm
             JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
             WHERE mm.id_usuario = u.id_usuario
               AND mm.fecha_salida IS NULL
               AND m.id_sede IN (SELECT id FROM public.get_my_sedes())
           )
         )
       )
  )
  SELECT
    u.id_usuario,
    u.nombres,
    u.apellidos,
    u.correo,
    u.telefono,
    u.fecha_nacimiento,
    u.activo,
    u.ultimo_acceso,
    u.auth_user_id,
    u.creado_en,
    u.updated_at,
    COALESCE((
      SELECT jsonb_agg(role_row ORDER BY role_row->>'rol_nombre')
      FROM (
        SELECT jsonb_build_object(
          'id_usuario_rol', ur.id_usuario_rol,
          'id_rol', ur.id_rol,
          'id_iglesia', ur.id_iglesia,
          'id_sede', NULL,
          'fecha_fin', ur.fecha_fin,
          'rol_nombre', r.nombre,
          'iglesia_nombre', i.nombre,
          'sede_nombre', NULL,
          'source', 'usuario_rol'
        ) AS role_row
        FROM public.usuario_rol ur
        JOIN public.rol r ON r.id_rol = ur.id_rol
        JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia
        WHERE ur.id_usuario = u.id_usuario
          AND ur.fecha_fin IS NULL

        UNION ALL

        SELECT jsonb_build_object(
          'id_usuario_rol', urs.id_usuario_rol_sede,
          'id_rol', urs.id_rol,
          'id_iglesia', urs.id_iglesia,
          'id_sede', urs.id_sede,
          'fecha_fin', urs.fecha_fin,
          'rol_nombre', r.nombre,
          'iglesia_nombre', i.nombre,
          'sede_nombre', s.nombre,
          'source', 'usuario_rol_sede'
        ) AS role_row
        FROM public.usuario_rol_sede urs
        JOIN public.rol r ON r.id_rol = urs.id_rol
        JOIN public.iglesia i ON i.id_iglesia = urs.id_iglesia
        JOIN public.sede s ON s.id_sede = urs.id_sede
        WHERE urs.id_usuario = u.id_usuario
          AND urs.fecha_fin IS NULL
      ) roles_union
    ), '[]'::jsonb) AS roles,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_ministerio', m.id_ministerio,
        'ministerio_nombre', m.nombre,
        'rol_en_ministerio', mm.rol_en_ministerio
      ) ORDER BY m.nombre)
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = u.id_usuario
        AND mm.fecha_salida IS NULL
    ), '[]'::jsonb) AS ministerios
  FROM public.usuario u
  JOIN visible_users vu ON vu.id_usuario = u.id_usuario
  ORDER BY u.apellidos, u.nombres;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_usuarios_enriquecidos_scoped() TO authenticated;

DROP POLICY IF EXISTS "aula_curso_admin_sede_select" ON public.aula_curso;
DROP POLICY IF EXISTS "aula_curso_admin_sede_insert" ON public.aula_curso;
DROP POLICY IF EXISTS "aula_curso_admin_sede_update" ON public.aula_curso;
DROP POLICY IF EXISTS "aula_curso_admin_sede_delete" ON public.aula_curso;

CREATE POLICY "aula_curso_admin_sede_select" ON public.aula_curso
FOR SELECT TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
);

CREATE POLICY "aula_curso_admin_sede_insert" ON public.aula_curso
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
);

CREATE POLICY "aula_curso_admin_sede_update" ON public.aula_curso
FOR UPDATE TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
)
WITH CHECK (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
);

CREATE POLICY "aula_curso_admin_sede_delete" ON public.aula_curso
FOR DELETE TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
);

DROP POLICY IF EXISTS "aula_modulo_admin_sede_select" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_admin_sede_insert" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_admin_sede_update" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_admin_sede_delete" ON public.aula_modulo;

CREATE POLICY "aula_modulo_admin_sede_select" ON public.aula_modulo
FOR SELECT TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_curso = aula_modulo.id_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
);

CREATE POLICY "aula_modulo_admin_sede_insert" ON public.aula_modulo
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_curso = aula_modulo.id_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
);

CREATE POLICY "aula_modulo_admin_sede_update" ON public.aula_modulo
FOR UPDATE TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_curso = aula_modulo.id_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
)
WITH CHECK (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_curso = aula_modulo.id_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
);

CREATE POLICY "aula_modulo_admin_sede_delete" ON public.aula_modulo
FOR DELETE TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_curso = aula_modulo.id_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
);

DROP POLICY IF EXISTS "Tarea select por rol" ON public.tarea;
DROP POLICY IF EXISTS "Tarea insert por lider" ON public.tarea;
DROP POLICY IF EXISTS "Tarea update por gestion" ON public.tarea;
DROP POLICY IF EXISTS "Tarea delete por gestion" ON public.tarea;

COMMIT;
```

- [ ] **Step 2: Create the audit SQL script**

Add `scripts/audit-admin-sede.sql`:

```sql
-- Run after applying 20260517000100_harden_admin_sede_role_scope.sql.

select p.proname, p.prosecdef, p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'assign_role_with_ministerio',
    'can_assign_role_scoped',
    'get_all_usuarios_enriquecidos',
    'get_usuarios_enriquecidos_scoped',
    'get_my_sedes'
  )
order by p.proname;

select tablename, cmd, count(*) as policy_count, string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
  and tablename in ('tarea', 'aula_curso', 'aula_modulo', 'usuario', 'usuario_rol_sede', 'usuario_sede')
group by tablename, cmd
order by tablename, cmd;

select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('aula_curso', 'aula_modulo')
  and policyname ilike '%admin_sede%'
order by tablename, cmd, policyname;
```

- [ ] **Step 3: Apply the migration to Supabase**

Run with the Supabase MCP migration tool or project CLI.

Expected: migration applies without errors.

- [ ] **Step 4: Run DB audit query**

Run `scripts/audit-admin-sede.sql` against the project database.

Expected:
- `get_all_usuarios_enriquecidos` is not executable by `authenticated`.
- `get_usuarios_enriquecidos_scoped` is executable by `authenticated`.
- `tarea` no longer has the stale `Tarea * por *` policies.
- `aula_curso_admin_sede_*` and `aula_modulo_admin_sede_*` policies reference ministerio/sede scope, not iglesia-only scope.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260517000100_harden_admin_sede_role_scope.sql scripts/audit-admin-sede.sql
git commit -m "fix: harden admin sede database scope"
```

---

### Task 2: Fix Invite Edge Function Authorization

**Files:**
- Modify: `supabase/functions/invite-user/index.ts:140-195`

- [ ] **Step 1: Replace caller role lookup**

Replace the block that only queries `usuario_rol` with a combined lookup from `usuario_rol` and `usuario_rol_sede`:

```ts
    const [{ data: callerChurchRoles, error: callerChurchRolesError }, { data: callerSedeRoles, error: callerSedeRolesError }] = await Promise.all([
      supabaseAdmin
        .from('usuario_rol')
        .select('id_iglesia, rol:rol!inner(nombre)')
        .eq('id_usuario', callerUsuario.id_usuario)
        .is('fecha_fin', null),
      supabaseAdmin
        .from('usuario_rol_sede')
        .select('id_iglesia, id_sede, rol:rol!inner(nombre)')
        .eq('id_usuario', callerUsuario.id_usuario)
        .is('fecha_fin', null),
    ])

    if (callerChurchRolesError) throw callerChurchRolesError
    if (callerSedeRolesError) throw callerSedeRolesError

    const activeChurchRoles = (callerChurchRoles ?? []) as Array<{ id_iglesia: number; rol: { nombre: string } }>
    const activeSedeRoles = (callerSedeRoles ?? []) as Array<{ id_iglesia: number; id_sede: number | null; rol: { nombre: string } }>
    const isSuperAdmin = activeChurchRoles.some((r) => r.rol?.nombre === 'Super Administrador')
    const isAdminIglesia = activeChurchRoles.some((r) => r.rol?.nombre === 'Administrador de Iglesia' && r.id_iglesia === idIglesia)
    const adminSedeIds = new Set(
      activeSedeRoles
        .filter((r) => r.rol?.nombre === 'Administrador de Sede' && r.id_iglesia === idIglesia && r.id_sede)
        .map((r) => Number(r.id_sede))
    )
```

- [ ] **Step 2: Replace iglesia authorization check**

Replace:

```ts
    if (!isSuperAdmin && !managedIglesias.has(idIglesia)) {
      return jsonResponse(origin, { message: 'No autorizado para gestionar esa iglesia' }, 403)
    }
```

With:

```ts
    if (!isSuperAdmin && !isAdminIglesia && adminSedeIds.size === 0) {
      return jsonResponse(origin, { message: 'No autorizado para gestionar esa iglesia' }, 403)
    }
```

- [ ] **Step 3: Add admin_sede role/scope validation after `targetRole` is loaded**

Insert after `requiresMinisterio` is computed:

```ts
    const callerIsOnlyAdminSede = !isSuperAdmin && !isAdminIglesia && adminSedeIds.size > 0

    if (callerIsOnlyAdminSede) {
      const allowedRoles = new Set(['Administrador de Sede', 'Líder', 'Servidor'])
      if (!allowedRoles.has(targetRole.nombre)) {
        return jsonResponse(origin, { message: 'No autorizado para asignar ese rol' }, 403)
      }

      if (!sedeId || !adminSedeIds.has(sedeId)) {
        return jsonResponse(origin, { message: 'Solo puedes gestionar usuarios de tu sede' }, 403)
      }

      if (ministerioId) {
        const { data: ministerioScope, error: ministerioScopeError } = await supabaseAdmin
          .from('ministerio')
          .select('id_ministerio')
          .eq('id_ministerio', ministerioId)
          .eq('id_sede', sedeId)
          .maybeSingle()

        if (ministerioScopeError) throw ministerioScopeError
        if (!ministerioScope) {
          return jsonResponse(origin, { message: 'El ministerio no pertenece a tu sede' }, 403)
        }
      }
    }
```

- [ ] **Step 4: Deploy Edge Function**

Deploy `invite-user` with JWT verification enabled.

Expected: deployment succeeds.

- [ ] **Step 5: Manual verification**

Use an admin_sede session to invite:
- A `Servidor` in the same sede: expected success.
- A `Servidor` in another sede: expected 403.
- An `Administrador de Iglesia`: expected 403.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/invite-user/index.ts
git commit -m "fix: scope admin sede invitations"
```

---

### Task 3: Use Scoped Users RPC in Frontend

**Files:**
- Modify: `src/services/usuarios.service.ts:125-149`

- [ ] **Step 1: Replace the RPC name**

Change:

```ts
  const { data, error } = await supabase.rpc('get_all_usuarios_enriquecidos')
```

To:

```ts
  const { data, error } = await supabase.rpc('get_usuarios_enriquecidos_scoped')
```

- [ ] **Step 2: Preserve mapping and include `fechaNacimiento`**

Ensure the mapper keeps the existing shape:

```ts
  return (data ?? []).map((r: any) => ({
    ...mapUsuario(r),
    roleNames: (r.roles ?? []).map((rol: any) => ({
      idUsuarioRol: rol.id_usuario_rol,
      idRol: rol.id_rol,
      idIglesia: rol.id_iglesia,
      idSede: rol.id_sede ?? null,
      rolNombre: rol.rol_nombre ?? '',
      iglesiaNombre: rol.iglesia_nombre ?? '',
      sedeNombre: rol.sede_nombre ?? '',
      fechaFin: rol.fecha_fin,
      source: rol.source ?? 'usuario_rol',
    })),
    minNames: (r.ministerios ?? []).map((min: any) => ({
      idMinisterio: min.id_ministerio ?? 0,
      nombre: min.ministerio_nombre ?? `Ministerio #${min.id_ministerio}`,
      rol: min.rol_en_ministerio ?? '',
    })),
  }))
```

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/services/usuarios.service.ts
git commit -m "fix: scope enriched user reads"
```

---

### Task 4: Fix Task Assignment Scope for Admin Sede

**Files:**
- Modify: `src/services/eventos.service.ts:421-448`

- [ ] **Step 1: Replace role lookup with both role tables**

Replace the `Promise.all` role query block with:

```ts
  const [{ data: churchRoles }, { data: sedeRoles }, { data: taskRow, error: taskError }] = await Promise.all([
    supabase
      .from('usuario_rol')
      .select('id_iglesia, fecha_fin, rol:rol(nombre)')
      .eq('id_usuario', actor.id_usuario)
      .is('fecha_fin', null),
    supabase
      .from('usuario_rol_sede')
      .select('id_sede, id_iglesia, fecha_fin, rol:rol(nombre)')
      .eq('id_usuario', actor.id_usuario)
      .is('fecha_fin', null),
    supabase
      .from('tarea')
      .select('id_tarea, id_ministerio, titulo, ministerio(id_sede, sede(id_iglesia))')
      .eq('id_tarea', input.idTarea)
      .single(),
  ])
```

- [ ] **Step 2: Replace `roleNames`/`hasScope` logic**

Use:

```ts
  const churchRoleNames = ((churchRoles || []) as any[]).map(r => `${r.rol?.nombre || ''}`.toLowerCase())
  const sedeRoleNames = ((sedeRoles || []) as any[]).map(r => `${r.rol?.nombre || ''}`.toLowerCase())
  const isSuper = churchRoleNames.some(n => n.includes('super'))
  const isAdminIglesia = isSuper || churchRoleNames.some(n => n.includes('iglesia'))
  const isAdminSede = sedeRoleNames.some(n => n.includes('sede'))

  const taskSedeId = (taskRow as any).ministerio?.id_sede as number | undefined
  const taskIglesiaId = (taskRow as any).ministerio?.sede?.id_iglesia as number | undefined

  const hasScope = isSuper
    || (isAdminIglesia && (churchRoles || []).some((r: any) => !r.id_iglesia || r.id_iglesia === taskIglesiaId))
    || (isAdminSede && (sedeRoles || []).some((r: any) => r.id_sede && r.id_sede === taskSedeId))
```

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/services/eventos.service.ts
git commit -m "fix: resolve admin sede task assignment scope"
```

---

### Task 5: Enable Miembros CRUD for Admin Sede by Sede Scope

**Files:**
- Modify: `src/app/components/MembersPage.tsx:32-60`

- [ ] **Step 1: Include `sedesDelUsuario` and role flag**

Change:

```ts
  const { usuarioActual, iglesiaActual, rolActual } = useApp();
```

To:

```ts
  const { usuarioActual, iglesiaActual, rolActual, sedesDelUsuario } = useApp();
```

Then replace the role flags with:

```ts
  const isAdminIglesiaOrSuper = rolActual === "admin_iglesia" || rolActual === "super_admin";
  const isAdminSede = rolActual === "admin_sede";
  const isLider = rolActual === "lider" && ministeriosIdsUsuario.length > 0;
  const canManageMembers = isAdminIglesiaOrSuper || isAdminSede || isLider;
```

- [ ] **Step 2: Replace visible ministerios calculation**

Replace:

```ts
  const ministeriosVisibles = useMemo(() => {
    if (isAdmin) return ministerios;
    if (isLider) return ministerios.filter((m) => ministerioIdsLider.has(m.idMinisterio));
    return ministerios.filter((m) => ministerioIdsLider.has(m.idMinisterio));
  }, [isAdmin, isLider, ministerios, ministerioIdsLider]);
```

With:

```ts
  const sedeIdsAdmin = useMemo(() => new Set(sedesDelUsuario.map((s) => s.id)), [sedesDelUsuario]);
  const ministeriosVisibles = useMemo(() => {
    if (isAdminIglesiaOrSuper) return ministerios;
    if (isAdminSede) return ministerios.filter((m) => sedeIdsAdmin.has(m.idSede));
    if (isLider) return ministerios.filter((m) => ministerioIdsLider.has(m.idMinisterio));
    return [];
  }, [isAdminIglesiaOrSuper, isAdminSede, isLider, ministerios, ministerioIdsLider, sedeIdsAdmin]);
```

- [ ] **Step 3: Replace `isAdmin` references in selection logic**

Change these expressions:

```ts
if (isAdmin) return;
const effectiveMinisterioId = (!isAdmin && ministeriosVisibles.length > 0)
const showMinisterioColumn = isAdmin && selectedMinisterioId === 0;
{isAdmin && <option value={0}>Todos los ministerios</option>}
```

To:

```ts
if (isAdminIglesiaOrSuper) return;
const effectiveMinisterioId = (!isAdminIglesiaOrSuper && ministeriosVisibles.length > 0)
const showMinisterioColumn = isAdminIglesiaOrSuper && selectedMinisterioId === 0;
{isAdminIglesiaOrSuper && <option value={0}>Todos los ministerios</option>}
```

- [ ] **Step 4: Build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 5: Manual verification**

As admin_sede:
- Open `/app/<idIglesia>/miembros`.
- Expected: can select ministerios from assigned sede(s), not other sedes.
- Expected: can add/remove members only inside those ministerios.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/MembersPage.tsx
git commit -m "fix: allow admin sede member management by sede"
```

---

### Task 6: Remove Single-Sede Assumptions in Usuarios and Tasks

**Files:**
- Modify: `src/app/components/UsuariosPage.tsx`
- Modify: `src/app/components/TasksPage.tsx`

- [ ] **Step 1: Update UsuariosPage sede filtering**

In `UsuariosPage.tsx`, replace:

```ts
      const mySede = sedesDelUsuario[0]; // Use admin's assigned sede
      const hasRoleInMySede = u.roleNames.some(rn => rn.idSede === mySede.id);
```

With:

```ts
      const mySedeIds = new Set(sedesDelUsuario.map((s) => s.id));
      const hasRoleInMySede = u.roleNames.some(rn => rn.idSede != null && mySedeIds.has(rn.idSede));
```

- [ ] **Step 2: Update UsuariosPage ministerio filter**

Replace:

```ts
  const ministeriosParaFiltro = isAdminSede
    ? ministeriosInvite.filter(m => m.idSede === sedesDelUsuario[0]?.id)
```

With:

```ts
  const adminSedeIds = new Set(sedesDelUsuario.map((s) => s.id));
  const ministeriosParaFiltro = isAdminSede
    ? ministeriosInvite.filter(m => adminSedeIds.has(m.idSede))
```

- [ ] **Step 3: Update TasksPage admin_sede ministerios**

In `TasksPage.tsx`, replace:

```ts
      const sedeId = sedesDelUsuario[0]?.id ?? 0;
      return ministerios.filter(m => m.idSede === sedeId);
```

With:

```ts
      const sedeIds = new Set(sedesDelUsuario.map((s) => s.id));
      return ministerios.filter(m => sedeIds.has(m.idSede));
```

- [ ] **Step 4: Update TasksPage default assign scope**

Replace:

```ts
      const defaultSedeId = sedesDelUsuario[0]?.id ?? 0;
      setAssignScope(prev => ({ ...prev, idSede: defaultSedeId }));
```

With:

```ts
      const currentTaskSedeId = task?.idSede ?? sedesDelUsuario[0]?.id ?? 0;
      const allowedSedeIds = new Set(sedesDelUsuario.map((s) => s.id));
      const defaultSedeId = allowedSedeIds.has(currentTaskSedeId) ? currentTaskSedeId : (sedesDelUsuario[0]?.id ?? 0);
      setAssignScope(prev => ({ ...prev, idSede: defaultSedeId }));
```

- [ ] **Step 5: Build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 6: Manual verification**

As an admin_sede assigned to two sedes:
- Expected: user filters include both sedes.
- Expected: task assignment can target ministerios in both assigned sedes.
- Expected: no mutation allows another sede.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/UsuariosPage.tsx src/app/components/TasksPage.tsx
git commit -m "fix: support multi sede admin scope"
```

---

### Task 7: Add Guard to AdministradorPage

**Files:**
- Modify: `src/app/components/AdministradorPage.tsx`

- [ ] **Step 1: Import `useApp`**

Add near existing imports:

```ts
import { useApp } from "../store/AppContext";
```

- [ ] **Step 2: Add explicit role guard at start of component**

Inside `export function AdministradorPage()`, add before data mutations are available to users:

```ts
  const { rolActual } = useApp();
  const canAccessAdministrador = rolActual === "super_admin" || rolActual === "admin_iglesia";

  if (!canAccessAdministrador) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-semibold text-foreground">Acceso restringido</h1>
          <p className="text-sm text-muted-foreground mt-2">
            No tienes permisos para gestionar administradores de iglesia o sede.
          </p>
        </div>
      </div>
    );
  }
```

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 4: Manual verification**

As admin_sede, navigate directly to `/app/<idIglesia>/administrador`.

Expected: restricted access message. No admin assignment cards render.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/AdministradorPage.tsx
git commit -m "fix: guard administrator page by role"
```

---

### Task 8: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Build production bundle**

Run:

```bash
npm run build
```

Expected: production build succeeds.

- [ ] **Step 2: Run Supabase advisors**

Run security and performance advisors through Supabase MCP.

Expected:
- No new RLS disabled warnings for public tables touched in this plan.
- No exposed SECURITY DEFINER user listing function executable by `authenticated` except the new scoped function.

- [ ] **Step 3: Manual end-to-end role matrix**

Verify as `admin_sede`:
- Login hydrates profile and role as `admin_sede`.
- Sidebar only shows Dashboard, Usuarios, Miembros, Eventos, Tareas, Estadísticas, Cumpleaños, Aula, Notificaciones, Perfil.
- Usuarios list only shows users from assigned sede(s) or their ministerios.
- Invite `Servidor` inside assigned sede succeeds.
- Invite `Servidor` outside assigned sede fails with 403.
- Assign `Administrador de Iglesia` fails with 403.
- Miembros CRUD works only for ministerios from assigned sede(s).
- Eventos CRUD works only for assigned sede(s)/ministerios.
- Tareas CRUD and assignment work only for assigned sede(s)/ministerios.
- Aula course/module CRUD works only for courses attached to ministerios in assigned sede(s).

- [ ] **Step 4: Inspect git diff**

Run:

```bash
git status
git diff --stat
git diff
```

Expected: only files from this plan are modified.

- [ ] **Step 5: Commit verification notes if a doc is added**

Only if a verification document is created:

```bash
git add docs/audit/admin-sede-verification.md
git commit -m "docs: record admin sede verification"
```

---

## Self-Review

**Spec coverage:**
- DB/RLS audited and fixed through Task 1.
- Functions restricted through Task 1 and Task 2.
- Sede-only scope enforced through `get_my_sedes`, `can_manage_sede`, `can_manage_ministerio`, and updated Aula policies.
- CRUD access aligned through Tasks 3-7.
- Silent UI bugs addressed in Tasks 4-7.

**Placeholder scan:**
- No `TBD`, `TODO`, or unspecified code steps remain.

**Type consistency:**
- Existing frontend names are preserved: `idUsuario`, `idRol`, `idIglesia`, `idSede`, `idMinisterio`, `roleNames`, `minNames`.
- New RPC `get_usuarios_enriquecidos_scoped` returns fields consumed by `mapUsuario` and current role/ministry mapping.
