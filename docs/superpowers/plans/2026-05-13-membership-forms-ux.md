# Membership, Forms UX & Contextual Ministerio Permissions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `usuario_sede` sede membership, role-aware sede→ministerio cascade forms, and context-aware UI buttons based on `rol_en_ministerio`.

**Architecture:** Three layers: (1) DB — new `usuario_sede` table + RLS + `get_my_ministerios_as_lider()` function that scopes INSERT permissions. (2) Service + hooks — `usuarioSede.service.ts`, `useUsuarioSede`, `useMinisterioRole`. (3) UI — shared `SedeMinisterioSelector` component wired into EventsPage, TasksPage, and MinisteriosPage.

**Tech Stack:** Supabase (bigint IDs, PostgreSQL RLS), React 18, TanStack React Query, Tailwind CSS v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-13-membership-forms-ux-design.md`

---

## File Map

| Action | File |
|--------|------|
| Create | `supabase/migrations/<timestamp>_usuario_sede_rls.sql` |
| Create | `supabase/migrations/<timestamp>_lider_rls_scoping.sql` |
| Modify | `src/types/app.types.ts` |
| Create | `src/services/usuarioSede.service.ts` |
| Create | `src/hooks/useUsuarioSede.ts` |
| Create | `src/hooks/useMinisterioRole.ts` |
| Create | `src/app/components/ui/SedeMinisterioSelector.tsx` |
| Modify | `src/app/components/EventsPage.tsx` |
| Modify | `src/app/components/TasksPage.tsx` |
| Modify | `src/app/components/MinisteriosPage.tsx` |

---

## Task 1: DB Migration — `usuario_sede` table with RLS

**Files:**
- Create: `supabase/migrations/<timestamp>_usuario_sede_rls.sql` (generate with CLI)

- [ ] **Step 1: Generate migration file**

```bash
supabase migration new usuario_sede_rls
```

Expected output: `Created new migration at supabase/migrations/<timestamp>_usuario_sede_rls.sql`

- [ ] **Step 2: Write migration SQL**

Open the generated file and replace its contents with:

```sql
-- Table: usuario_sede
-- A user can be a member of a sede before being in any ministerio ("feligrés")
CREATE TABLE IF NOT EXISTS public.usuario_sede (
  id              bigserial PRIMARY KEY,
  id_usuario      bigint NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  id_sede         bigint NOT NULL REFERENCES public.sede(id_sede) ON DELETE CASCADE,
  fecha_ingreso   date NOT NULL DEFAULT CURRENT_DATE,
  estado          text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_usuario, id_sede)
);

-- Updated_at trigger
CREATE TRIGGER set_usuario_sede_updated_at
  BEFORE UPDATE ON public.usuario_sede
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.usuario_sede ENABLE ROW LEVEL SECURITY;

-- super_admin: full access to all
CREATE POLICY "super_admin_usuario_sede_all"
  ON public.usuario_sede
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- admin_iglesia: access within their iglesia
CREATE POLICY "admin_iglesia_usuario_sede_select"
  ON public.usuario_sede
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_iglesia() AND
    id_sede IN (
      SELECT s.id_sede FROM public.sede s
      WHERE s.id_iglesia = public.get_my_tenant_id()
    )
  );

CREATE POLICY "admin_iglesia_usuario_sede_insert"
  ON public.usuario_sede
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_iglesia() AND
    id_sede IN (
      SELECT s.id_sede FROM public.sede s
      WHERE s.id_iglesia = public.get_my_tenant_id()
    )
  );

CREATE POLICY "admin_iglesia_usuario_sede_update"
  ON public.usuario_sede
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_iglesia() AND
    id_sede IN (
      SELECT s.id_sede FROM public.sede s
      WHERE s.id_iglesia = public.get_my_tenant_id()
    )
  )
  WITH CHECK (
    public.is_admin_iglesia() AND
    id_sede IN (
      SELECT s.id_sede FROM public.sede s
      WHERE s.id_iglesia = public.get_my_tenant_id()
    )
  );

CREATE POLICY "admin_iglesia_usuario_sede_delete"
  ON public.usuario_sede
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_iglesia() AND
    id_sede IN (
      SELECT s.id_sede FROM public.sede s
      WHERE s.id_iglesia = public.get_my_tenant_id()
    )
  );

-- admin_sede: access within their sedes
CREATE POLICY "admin_sede_usuario_sede_select"
  ON public.usuario_sede
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  );

CREATE POLICY "admin_sede_usuario_sede_insert"
  ON public.usuario_sede
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  );

CREATE POLICY "admin_sede_usuario_sede_update"
  ON public.usuario_sede
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  )
  WITH CHECK (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  );

CREATE POLICY "admin_sede_usuario_sede_delete"
  ON public.usuario_sede
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  );

-- lider/servidor: can see their own sede memberships + others in same sedes
CREATE POLICY "member_usuario_sede_select"
  ON public.usuario_sede
  FOR SELECT
  TO authenticated
  USING (
    id_sede IN (
      SELECT m.id_sede FROM public.ministerio m
      INNER JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
      WHERE mm.id_usuario = public.get_my_usuario_id()
        AND mm.fecha_salida IS NULL
    )
  );

-- Grant API access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_sede TO authenticated;
```

- [ ] **Step 3: Apply migration**

```bash
supabase db push
```

Expected: migration applied without errors.

- [ ] **Step 4: Verify table exists**

In Supabase MCP or SQL editor:
```sql
SELECT COUNT(*) FROM public.usuario_sede;
```

Expected: returns `0` (empty table, no error).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add usuario_sede table with RLS for sede-first membership model"
```

---

## Task 2: DB Migration — `get_my_ministerios_as_lider()` + Scoped INSERT Policies

**Files:**
- Create: `supabase/migrations/<timestamp>_lider_rls_scoping.sql`

- [ ] **Step 1: Generate migration file**

```bash
supabase migration new lider_rls_scoping
```

- [ ] **Step 2: Write migration SQL**

```sql
-- Function: get_my_ministerios_as_lider
-- Returns only the ministerios where the current user has rol_en_ministerio = 'lider'
-- Used in RLS WITH CHECK to prevent a 'servidor' from creating events/tasks in ministerios where they don't lead
CREATE OR REPLACE FUNCTION public.get_my_ministerios_as_lider()
RETURNS SETOF bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id_ministerio
  FROM public.miembro_ministerio
  WHERE id_usuario = public.get_my_usuario_id()
    AND fecha_salida IS NULL
    AND lower(
          unaccent(coalesce(rol_en_ministerio, ''))
        ) LIKE '%lider%';
$$;

-- Update evento INSERT/UPDATE policies for 'lider' role to use get_my_ministerios_as_lider()
-- Drop the old lider INSERT/UPDATE policies first, then recreate scoped ones.

-- Drop existing lider insert/update policies on evento (names may vary — drop by name)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'evento'
      AND policyname ILIKE '%lider%insert%'
       OR (schemaname = 'public' AND tablename = 'evento' AND policyname ILIKE '%lider%check%')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.evento';
  END LOOP;
END $$;

-- Recreate: lider can insert eventos only for ministerios where they are lider
CREATE POLICY "lider_evento_insert"
  ON public.evento
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_lider() AND
    (
      id_ministerio IS NULL
      OR id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

CREATE POLICY "lider_evento_update"
  ON public.evento
  FOR UPDATE
  TO authenticated
  USING (
    public.is_lider() AND
    (
      id_ministerio IS NULL
      OR id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  )
  WITH CHECK (
    public.is_lider() AND
    (
      id_ministerio IS NULL
      OR id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
    )
  );

-- Drop and recreate lider INSERT/UPDATE for tarea
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tarea'
      AND policyname ILIKE '%lider%'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.tarea';
  END LOOP;
END $$;

CREATE POLICY "lider_tarea_insert"
  ON public.tarea
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_lider() AND
    id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
  );

CREATE POLICY "lider_tarea_update"
  ON public.tarea
  FOR UPDATE
  TO authenticated
  USING (
    public.is_lider() AND
    id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
  )
  WITH CHECK (
    public.is_lider() AND
    id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
  );

CREATE POLICY "lider_tarea_select"
  ON public.tarea
  FOR SELECT
  TO authenticated
  USING (
    public.is_lider() AND
    id_ministerio IN (SELECT public.get_my_ministerios())
  );
```

- [ ] **Step 3: Check for existing policy names before applying**

```sql
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('evento', 'tarea')
ORDER BY tablename, policyname;
```

Adjust the DROP statements in the migration SQL if policy names differ.

- [ ] **Step 4: Apply migration**

```bash
supabase db push
```

- [ ] **Step 5: Verify function exists**

```sql
SELECT public.get_my_ministerios_as_lider();
```

Expected: runs without error (returns 0 rows if you're not a lider in any ministerio in test session).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add get_my_ministerios_as_lider() and scope lider INSERT policies to lider-role ministerios"
```

---

## Task 3: TypeScript Type + Service — `UsuarioSede`

**Files:**
- Modify: `src/types/app.types.ts`
- Create: `src/services/usuarioSede.service.ts`

- [ ] **Step 1: Add `UsuarioSede` type to app.types.ts**

In `src/types/app.types.ts`, after the `MiembroMinisterio` interface (around line 119), add:

```typescript
export interface UsuarioSede {
  id: number
  idUsuario: number
  idSede: number
  fechaIngreso: string
  estado: 'activo' | 'inactivo'
  creadoEn: string
  actualizadoEn: string
  // enriched
  usuarioNombre?: string
  usuarioCorreo?: string
  sedeNombre?: string
}
```

- [ ] **Step 2: Create `src/services/usuarioSede.service.ts`**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { UsuarioSede } from '@/types/app.types'

function mapUsuarioSede(r: any): UsuarioSede {
  return {
    id: r.id,
    idUsuario: r.id_usuario,
    idSede: r.id_sede,
    fechaIngreso: r.fecha_ingreso,
    estado: r.estado,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
    usuarioNombre: r.usuario
      ? `${r.usuario.nombres ?? ''} ${r.usuario.apellidos ?? ''}`.trim()
      : undefined,
    usuarioCorreo: r.usuario?.correo ?? undefined,
    sedeNombre: r.sede?.nombre ?? undefined,
  }
}

export async function getUsuariosSede(idSede: number): Promise<UsuarioSede[]> {
  const { data, error } = await supabase
    .from('usuario_sede')
    .select('*, usuario(nombres, apellidos, correo), sede(nombre)')
    .eq('id_sede', idSede)
    .eq('estado', 'activo')
    .order('creado_en', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapUsuarioSede)
}

export async function getSedesDeUsuario(idUsuario: number): Promise<UsuarioSede[]> {
  const { data, error } = await supabase
    .from('usuario_sede')
    .select('*, sede(nombre)')
    .eq('id_usuario', idUsuario)
    .eq('estado', 'activo')
  if (error) throw error
  return (data ?? []).map(mapUsuarioSede)
}

export async function createUsuarioSede(data: {
  idUsuario: number
  idSede: number
  fechaIngreso: string
}): Promise<UsuarioSede> {
  const { data: result, error } = await supabase
    .from('usuario_sede')
    .insert([{
      id_usuario: data.idUsuario,
      id_sede: data.idSede,
      fecha_ingreso: data.fechaIngreso,
    }])
    .select('*, usuario(nombres, apellidos, correo), sede(nombre)')
    .single()
  if (error) throw error
  return mapUsuarioSede(result)
}

export async function deleteUsuarioSede(id: number): Promise<void> {
  const { error } = await supabase
    .from('usuario_sede')
    .update({ estado: 'inactivo' })
    .eq('id', id)
  if (error) throw error
}

export async function getMiRolEnMinisterio(
  idMinisterio: number,
  idUsuario: number
): Promise<'lider' | 'servidor' | null> {
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('rol_en_ministerio')
    .eq('id_ministerio', idMinisterio)
    .eq('id_usuario', idUsuario)
    .is('fecha_salida', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const raw = `${data.rol_en_ministerio ?? ''}`
  const norm = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (norm.includes('lider')) return 'lider'
  return 'servidor'
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors related to `UsuarioSede` or `usuarioSede.service.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/types/app.types.ts src/services/usuarioSede.service.ts
git commit -m "feat: add UsuarioSede type and usuarioSede.service CRUD + getMiRolEnMinisterio"
```

---

## Task 4: Hooks — `useUsuarioSede` + `useMinisterioRole`

**Files:**
- Create: `src/hooks/useUsuarioSede.ts`
- Create: `src/hooks/useMinisterioRole.ts`

- [ ] **Step 1: Create `src/hooks/useUsuarioSede.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsuariosSede, getSedesDeUsuario,
  createUsuarioSede, deleteUsuarioSede,
} from '@/services/usuarioSede.service'

export function useUsuariosSede(idSede: number) {
  return useQuery({
    queryKey: ['usuarios-sede', idSede],
    queryFn: () => getUsuariosSede(idSede),
    enabled: idSede > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSedesDeUsuario(idUsuario?: number) {
  return useQuery({
    queryKey: ['sedes-usuario', idUsuario],
    queryFn: () => getSedesDeUsuario(idUsuario as number),
    enabled: !!idUsuario,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateUsuarioSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createUsuarioSede,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['usuarios-sede', variables.idSede] })
      qc.invalidateQueries({ queryKey: ['sedes-usuario'] })
    },
  })
}

export function useDeleteUsuarioSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteUsuarioSede(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios-sede'] })
      qc.invalidateQueries({ queryKey: ['sedes-usuario'] })
    },
  })
}
```

- [ ] **Step 2: Create `src/hooks/useMinisterioRole.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getMiRolEnMinisterio } from '@/services/usuarioSede.service'
import { useApp } from '@/app/store/AppContext'

/**
 * Returns the current user's rol_en_ministerio for a specific ministerio.
 * Returns null when no ministerio is selected or user is not a member.
 * admin_iglesia, admin_sede, and super_admin always return 'lider' (full access).
 */
export function useMinisterioRole(idMinisterio: number | null | undefined) {
  const { usuarioActual, rolActual } = useApp()

  const isHighPrivilege =
    rolActual === 'super_admin' ||
    rolActual === 'admin_iglesia' ||
    rolActual === 'admin_sede'

  return useQuery({
    queryKey: ['ministerio-role', idMinisterio, usuarioActual?.idUsuario],
    queryFn: () =>
      getMiRolEnMinisterio(idMinisterio as number, usuarioActual!.idUsuario),
    enabled: !isHighPrivilege && !!idMinisterio && !!usuarioActual,
    staleTime: 5 * 60 * 1000,
    select: (data) => data,
    placeholderData: isHighPrivilege ? 'lider' : undefined,
  })
}

/**
 * Returns true if the current user can create/edit in the given ministerio context.
 * High-privilege roles (admin_iglesia+) always return true.
 * lider/servidor: true only when rol_en_ministerio = 'lider' in that ministerio.
 */
export function useCanManageMinisterio(idMinisterio: number | null | undefined): boolean {
  const { rolActual } = useApp()

  const isHighPrivilege =
    rolActual === 'super_admin' ||
    rolActual === 'admin_iglesia' ||
    rolActual === 'admin_sede'

  const { data: rolEnMinisterio } = useMinisterioRole(idMinisterio)

  if (isHighPrivilege) return true
  if (!idMinisterio) return false
  return rolEnMinisterio === 'lider'
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors related to the new hooks.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useUsuarioSede.ts src/hooks/useMinisterioRole.ts
git commit -m "feat: add useUsuarioSede and useMinisterioRole hooks"
```

---

## Task 5: Component — `SedeMinisterioSelector`

**Files:**
- Create: `src/app/components/ui/SedeMinisterioSelector.tsx`

- [ ] **Step 1: Create `src/app/components/ui/SedeMinisterioSelector.tsx`**

```tsx
import type { Sede } from '@/types/app.types'
import type { MinisterioEnriquecido } from '@/services/ministerios.service'
import { useApp } from '@/app/store/AppContext'

interface SedeMinisterioSelectorProps {
  sedes: Sede[]
  ministerios: MinisterioEnriquecido[]
  selectedSedeId: number
  selectedMinisterioId: number
  onSedeChange: (idSede: number, clearMinisterio: boolean) => void
  onMinisterioChange: (idMinisterio: number, autoSedeId: number) => void
  sedeReadOnly?: boolean
  ministerioReadOnly?: boolean
  allowNoMinisterio?: boolean   // shows "Sin ministerio" option (for events)
  allowGeneral?: boolean        // shows "General (toda la iglesia)" option (for super/admin_iglesia)
}

function GlassSelect({
  value,
  onChange,
  disabled,
  children,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className={`w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {children}
    </select>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
      {children}
    </label>
  )
}

export function SedeMinisterioSelector({
  sedes,
  ministerios,
  selectedSedeId,
  selectedMinisterioId,
  onSedeChange,
  onMinisterioChange,
  sedeReadOnly = false,
  ministerioReadOnly = false,
  allowNoMinisterio = false,
  allowGeneral = false,
}: SedeMinisterioSelectorProps) {
  const { rolActual } = useApp()

  const filteredMinisterios = selectedSedeId
    ? ministerios.filter((m) => m.idSede === selectedSedeId)
    : ministerios

  const handleSedeChange = (v: number) => {
    const ministerioStillValid =
      v === 0 ||
      ministerios.find((m) => m.idMinisterio === selectedMinisterioId)?.idSede === v
    onSedeChange(v, !ministerioStillValid)
  }

  const handleMinisterioChange = (v: number) => {
    const selected = ministerios.find((m) => m.idMinisterio === v)
    const autoSedeId = v !== 0 && selected?.idSede ? selected.idSede : selectedSedeId
    onMinisterioChange(v, autoSedeId)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <FieldLabel>
          Sede{' '}
          {!sedeReadOnly && (
            <span className="normal-case tracking-normal font-normal text-muted-foreground/50">
              (opcional)
            </span>
          )}
        </FieldLabel>
        {sedeReadOnly ? (
          <div className="flex h-11 items-center rounded-xl border border-white/5 bg-background/30 px-3 text-sm text-muted-foreground justify-between">
            <span>{sedes.find((s) => s.idSede === selectedSedeId)?.nombre ?? '—'}</span>
            <span className="text-[10px] text-muted-foreground/50">🔒</span>
          </div>
        ) : (
          <GlassSelect value={selectedSedeId} onChange={handleSedeChange}>
            {allowGeneral && <option value={0}>General (toda la iglesia)</option>}
            {!allowGeneral && <option value={0}>Seleccionar sede...</option>}
            {sedes.map((s) => (
              <option key={s.idSede} value={s.idSede}>
                {s.nombre}
              </option>
            ))}
          </GlassSelect>
        )}
      </div>

      <div>
        <FieldLabel>
          Ministerio{' '}
          {allowNoMinisterio && (
            <span className="normal-case tracking-normal font-normal text-muted-foreground/50">
              (opcional)
            </span>
          )}
        </FieldLabel>
        {ministerioReadOnly ? (
          <div className="flex h-11 items-center rounded-xl border border-white/5 bg-background/30 px-3 text-sm text-muted-foreground justify-between">
            <span>
              {ministerios.find((m) => m.idMinisterio === selectedMinisterioId)?.nombre ?? '—'}
            </span>
            <span className="text-[10px] text-muted-foreground/50">🔒</span>
          </div>
        ) : (
          <GlassSelect value={selectedMinisterioId} onChange={handleMinisterioChange}>
            {allowNoMinisterio && <option value={0}>Sin ministerio...</option>}
            {!allowNoMinisterio && <option value={0}>Seleccionar ministerio...</option>}
            {filteredMinisterios.map((m) => (
              <option key={m.idMinisterio} value={m.idMinisterio}>
                {m.nombre}
              </option>
            ))}
          </GlassSelect>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors in `SedeMinisterioSelector.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ui/SedeMinisterioSelector.tsx
git commit -m "feat: add SedeMinisterioSelector reusable component with role-aware readonly/cascade behavior"
```

---

## Task 6: Update EventsPage — Role-Aware Form + Context Buttons

**Files:**
- Modify: `src/app/components/EventsPage.tsx`

The EventsPage already has `handleSedeChange`, `handleMinisterioChange`, and `filteredMinisterios`. This task replaces the inline `EventDialogFields` selects with `SedeMinisterioSelector` and adds role pre-filling.

- [ ] **Step 1: Replace `EventDialogFields` sede/ministerio selects**

In `EventsPage.tsx`, find the `EventDialogFields` function (around line 61). Change the import at the top to add:

```tsx
import { SedeMinisterioSelector } from "./ui/SedeMinisterioSelector";
import { useCanManageMinisterio } from "@/hooks/useMinisterioRole";
```

Then in `EventDialogFields`, replace the entire `grid grid-cols-2` block that has Sede and Ministerio selects (lines ~96–110) with:

```tsx
<SedeMinisterioSelector
  sedes={sedes}
  ministerios={ministerios}
  selectedSedeId={form.idSede}
  selectedMinisterioId={form.idMinisterio}
  onSedeChange={(idSede, clearMinisterio) =>
    setForm((p: any) => ({
      ...p,
      idSede,
      idMinisterio: clearMinisterio ? 0 : p.idMinisterio,
    }))
  }
  onMinisterioChange={(idMinisterio, autoSedeId) =>
    setForm((p: any) => ({ ...p, idMinisterio, idSede: autoSedeId }))
  }
  sedeReadOnly={form._sedeReadOnly ?? false}
  ministerioReadOnly={form._ministerioReadOnly ?? false}
  allowNoMinisterio
  allowGeneral={form._allowGeneral ?? false}
/>
```

- [ ] **Step 2: Pre-fill form based on role**

In the `EventsPage` component function, after the existing `canManageEvents` line, add:

```tsx
const isAdminSede = rolActual === "admin_sede";
const isLider = rolActual === "lider";

// For admin_sede: pre-fill sede. For lider: pre-fill sede + ministerio.
// sedesActuales and ministeriosActuales are computed from RLS-filtered data.
const sedePreFill = isAdminSede || isLider
  ? (sedes.length === 1 ? sedes[0].idSede : 0)
  : 0;
```

In `resetCreateForm`, adjust the initial form to include the metadata flags:

```tsx
const resetCreateForm = () => setCreateForm({
  nombre: "",
  descripcion: "",
  tipoEventoTexto: "",
  fechaInicio: "",
  fechaFin: "",
  idSede: sedePreFill,
  idMinisterio: 0,
  _sedeReadOnly: isAdminSede || isLider,
  _ministerioReadOnly: isLider,
  _allowGeneral: rolActual === "super_admin" || rolActual === "admin_iglesia",
} as any);
```

- [ ] **Step 3: Add contextual "+ Crear evento" button guard**

Find the `canManageEvents` variable and add `useCanManageMinisterio`:

```tsx
// Add at top of EventsPage component, near other hooks:
const [activeMinisterioFilter, setActiveMinisterioFilter] = useState<number>(0);
const canCreateInContext = useCanManageMinisterio(activeMinisterioFilter || null);
const canShowCreateButton = canManageEvents && (activeMinisterioFilter === 0 || canCreateInContext);
```

Replace `canManageEvents` with `canShowCreateButton` on the "+ Crear Evento" button.
Use `setActiveMinisterioFilter` in the ministerio filter dropdown's `onChange`.

- [ ] **Step 4: Start dev server and test manually**

```bash
npm run dev
```

Test:
1. Login as `admin_sede` → open "Crear Evento" → sede should be pre-filled and locked.
2. Login as `lider` → open "Crear Evento" → both sede and ministerio should be pre-filled and locked.
3. Login as `admin_iglesia` → sede selector shows all sedes; ministerio filters when sede is selected.
4. Select a ministerio filter where the lider is a `servidor` → "+ Crear Evento" button should disappear.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/EventsPage.tsx
git commit -m "feat: update EventsPage with SedeMinisterioSelector, role pre-fill, and context-aware create button"
```

---

## Task 7: Update TasksPage — Add Sede Selector

**Files:**
- Modify: `src/app/components/TasksPage.tsx`

TasksPage currently has only a ministerio filter, no sede selector.

- [ ] **Step 1: Add imports and hooks**

At the top of `TasksPage.tsx`, add:

```tsx
import { useSedesEnriquecidas } from "@/hooks/useIglesias";
import { SedeMinisterioSelector } from "./ui/SedeMinisterioSelector";
import { useCanManageMinisterio } from "@/hooks/useMinisterioRole";
```

Inside `TasksPage`, after `const { data: ministerios = [] }` line, add:

```tsx
const { data: sedes = [] } = useSedesEnriquecidas(idIglesiaNum);
const [sedeFilter, setSedeFilter] = useState<number>(0);
const canCreateInContext = useCanManageMinisterio(ministerioFilter || null);
const canShowCreateButton =
  (rolActual === "lider" || rolActual === "admin_iglesia" || rolActual === "admin_sede" || rolActual === "super_admin") &&
  (ministerioFilter === 0 || canCreateInContext);
```

- [ ] **Step 2: Replace ministerio-only filter with SedeMinisterioSelector**

Find the ministerio filter dropdown in the render (search for `ministerioFilter`). Replace it with:

```tsx
<SedeMinisterioSelector
  sedes={sedes}
  ministerios={ministerios}
  selectedSedeId={sedeFilter}
  selectedMinisterioId={ministerioFilter}
  onSedeChange={(idSede, clearMinisterio) => {
    setSedeFilter(idSede);
    if (clearMinisterio) setMinisterioFilter(0);
  }}
  onMinisterioChange={(idMinisterio, autoSedeId) => {
    setMinisterioFilter(idMinisterio);
    setSedeFilter(autoSedeId);
  }}
  allowNoMinisterio
/>
```

- [ ] **Step 3: Add sede selector to create form**

Find `createForm` state initializer. Change:

```tsx
const [createForm, setCreateForm] = useState({
  titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" as "baja" | "media" | "alta" | "urgente", idMinisterio: 0,
});
```

to:

```tsx
const [createForm, setCreateForm] = useState({
  titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" as "baja" | "media" | "alta" | "urgente",
  idSede: 0, idMinisterio: 0,
});
```

In the create task dialog, add `SedeMinisterioSelector` before the título field:

```tsx
<SedeMinisterioSelector
  sedes={sedes}
  ministerios={ministerios}
  selectedSedeId={createForm.idSede}
  selectedMinisterioId={createForm.idMinisterio}
  onSedeChange={(idSede, clearMinisterio) =>
    setCreateForm((p) => ({ ...p, idSede, idMinisterio: clearMinisterio ? 0 : p.idMinisterio }))
  }
  onMinisterioChange={(idMinisterio, autoSedeId) =>
    setCreateForm((p) => ({ ...p, idMinisterio, idSede: autoSedeId }))
  }
  sedeReadOnly={rolActual === "admin_sede" || rolActual === "lider"}
  ministerioReadOnly={rolActual === "lider"}
/>
```

- [ ] **Step 4: Guard the create button**

Find the "+ Nueva Tarea" / "+ Crear" button and replace `canManageEvents` (or the equivalent boolean) with `canShowCreateButton`.

- [ ] **Step 5: Test manually**

```bash
npm run dev
```

Test:
1. Open TasksPage — filter dropdown should show sede + ministerio in cascade.
2. Selecting a sede filters the ministerio dropdown.
3. As `admin_sede`, the sede selector in the create form is pre-filled and locked.
4. Select a ministerio where the user is `servidor` → "+ Nueva Tarea" disappears.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/TasksPage.tsx
git commit -m "feat: add sede selector to TasksPage filters and create form, guard create button by ministerio role"
```

---

## Task 8: Update MinisteriosPage — Context-Aware Member Management

**Files:**
- Modify: `src/app/components/MinisteriosPage.tsx`

`MinisteriosPage` already has `canManageMembers` based on `rolActual`. This task makes it also respect `rol_en_ministerio` in the selected ministerio.

- [ ] **Step 1: Add `useCanManageMinisterio` import**

At the top of `MinisteriosPage.tsx`, add:

```tsx
import { useCanManageMinisterio } from "@/hooks/useMinisterioRole";
```

- [ ] **Step 2: Use hook in `MinisterioDetail`**

In the `MinisterioDetail` function component (around line 34), add after `const { rolActual }`:

```tsx
const canManageInContext = useCanManageMinisterio(min.idMinisterio);
```

Replace the existing `canManageMembers` check:

```tsx
// Before:
const canManageMembers = rolActual === "super_admin" || rolActual === "admin_iglesia" || rolActual === "admin_sede" || rolActual === "lider";

// After:
const canManageMembers = canManageInContext;
```

`useCanManageMinisterio` already handles high-privilege roles returning `true`, so this single line covers all roles correctly.

- [ ] **Step 3: Verify canManageMinisterios for the list view**

In `MinisteriosPage` (the outer component), find `canManageMinisterios`. Add the same logic:

```tsx
// Find the selected ministerio id from activeMinisterio state (already exists in the component)
const canManageInListContext = useCanManageMinisterio(activeMinisterio?.idMinisterio ?? null);
const canManageMinisterios = canManageInListContext;
```

If the variable `activeMinisterio` doesn't exist, use `null` for the outer list (only show "+ Nuevo Ministerio" for admin roles, which `useCanManageMinisterio` handles automatically since they always return true).

- [ ] **Step 4: Test manually**

```bash
npm run dev
```

Test:
1. Login as `lider` with `rol_en_ministerio = 'lider'` in Ministerio A → should see "+ Agregar Miembro".
2. If that same user switches to view Ministerio B where they're `servidor` → "+ Agregar Miembro" should disappear.
3. `admin_sede` should always see management buttons regardless of ministerio.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/MinisteriosPage.tsx
git commit -m "feat: make MinisteriosPage member management respect rol_en_ministerio via useCanManageMinisterio"
```

---

## Task 9: Expose `usuario_sede` in Members View

**Files:**
- Modify: `src/app/components/SedesPage.tsx` (or `MembersPage.tsx`)

This adds a "Feligreses" tab or section within a sede's detail view showing `usuario_sede` members.

- [ ] **Step 1: Read current SedesPage structure**

```bash
head -60 src/app/components/SedesPage.tsx
```

Look for: is there a detail view for a sede? Is there a tab component?

- [ ] **Step 2: Add feligreses section to sede detail**

In the sede detail view, add a new tab or section "Feligreses" that uses `useUsuariosSede`:

```tsx
import { useUsuariosSede, useCreateUsuarioSede, useDeleteUsuarioSede } from "@/hooks/useUsuarioSede";

// Inside the component, when a sede is selected:
const { data: feligreses = [], isLoading: loadingFeligreses } = useUsuariosSede(selectedSede.idSede);
const createUsuarioSedeMutation = useCreateUsuarioSede();
const deleteUsuarioSedeMutation = useDeleteUsuarioSede();
```

Render a simple list:

```tsx
<div className="space-y-2">
  {feligreses.map((f) => (
    <div key={f.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-background/30 px-4 py-3 text-sm">
      <div>
        <p className="font-medium text-foreground">{f.usuarioNombre}</p>
        <p className="text-xs text-muted-foreground">{f.usuarioCorreo}</p>
      </div>
      {canManageSede && (
        <button
          onClick={() => deleteUsuarioSedeMutation.mutate(f.id)}
          className="text-rose-400 hover:text-rose-300 text-xs"
        >
          Quitar
        </button>
      )}
    </div>
  ))}
  {canManageSede && (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setShowAddFeligres(true)}
    >
      + Agregar feligrés
    </Button>
  )}
</div>
```

The "Agregar feligrés" dialog calls `createUsuarioSedeMutation.mutate({ idUsuario, idSede, fechaIngreso })`.

- [ ] **Step 3: Test manually**

```bash
npm run dev
```

Open a sede detail → "Feligreses" section → add a user → verify they appear in the list.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/SedesPage.tsx
git commit -m "feat: add feligreses (usuario_sede) section to sede detail view"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by task |
|-------------|----------------|
| `usuario_sede` table + RLS | Task 1 ✅ |
| `get_my_ministerios_as_lider()` + policy update | Task 2 ✅ |
| `UsuarioSede` type + service CRUD | Task 3 ✅ |
| `useUsuarioSede` hook | Task 4 ✅ |
| `useMinisterioRole` / `useCanManageMinisterio` | Task 4 ✅ |
| `SedeMinisterioSelector` component | Task 5 ✅ |
| EventsPage update | Task 6 ✅ |
| TasksPage update | Task 7 ✅ |
| MinisteriosPage update | Task 8 ✅ |
| Sede members (feligreses) page | Task 9 ✅ |

**Placeholder scan:** No TBDs or "implement later" language detected. All code blocks are complete.

**Type consistency check:**
- `UsuarioSede.id: number` (bigint → number) — consistent across service, hook, and component usage.
- `SedeMinisterioSelector` props use `number` (not `string`) for IDs — consistent with `Ministerio.idSede: number` and `Sede.idSede: number`.
- `useCanManageMinisterio(idMinisterio: number | null | undefined)` — called with `number | null` in all pages — consistent.
- `getMiRolEnMinisterio(idMinisterio, idUsuario)` both `number` — consistent with DB bigint IDs.

**No gaps found.**
