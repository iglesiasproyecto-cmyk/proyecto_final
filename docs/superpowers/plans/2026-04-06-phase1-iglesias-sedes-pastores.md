# Phase 1: Iglesias, Sedes, Pastores — CRUD Completo + Enrichment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete CRUD for iglesias, sedes, and pastores with enriched query data (cantidadSedes, iglesiasActivas, cantidadMinisterios).

**Architecture:** Add enrichment queries and missing mutations (`deleteIglesia`, `deleteSede`, `deletePastor`, `createSedePastor`, `deleteIglesiaPastor` soft-delete already exists as `closeIglesiaPastor`) to `iglesias.service.ts`, expose them in `useIglesias.ts`, and wire dialogs in the page components. All service functions follow the existing sparse-patch pattern.

**Tech Stack:** React 18, Supabase JS v2, TanStack Query v5, shadcn/ui

**Prerequisite:** Phase 0 must be complete (`iglesiaActual` available in AppContext).

---

## File Structure

| File | Change |
|------|--------|
| `src/services/iglesias.service.ts` | Modify — add enriched getters + delete functions |
| `src/hooks/useIglesias.ts` | Modify — add hooks for new mutations + enriched queries |
| `src/app/components/ChurchesPage.tsx` | Modify — wire delete iglesia, show cantidadSedes |
| `src/app/components/SedesPage.tsx` | Modify — wire delete sede, show cantidadMinisterios |
| `src/app/components/PastoresPage.tsx` | Modify — wire delete pastor, show iglesiasActivas |

---

### Task 1: Add enriched queries and delete mutations to iglesias.service.ts

**Files:**
- Modify: `src/services/iglesias.service.ts`

- [ ] **Step 1: Add enriched interfaces after existing imports**

```typescript
// Add after the mapSede function (after line 60):

export interface IglesiaEnriquecida extends Iglesia {
  cantidadSedes: number
  ciudadNombre: string
  departamentoNombre: string
}

export interface PastorEnriquecido extends Pastor {
  iglesiasActivas: string[]
}

export interface SedeEnriquecida extends Sede {
  cantidadMinisterios: number
  ciudadNombre: string
}
```

- [ ] **Step 2: Add `getIglesiasEnriquecidas`**

```typescript
export async function getIglesiasEnriquecidas(): Promise<IglesiaEnriquecida[]> {
  const { data, error } = await supabase
    .from('iglesia')
    .select('*, sede(count), ciudad(nombre, departamento(nombre))')
    .order('nombre')
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapIglesia(r),
    cantidadSedes: Array.isArray(r.sede) ? r.sede[0]?.count ?? 0 : 0,
    ciudadNombre: r.ciudad?.nombre ?? '',
    departamentoNombre: r.ciudad?.departamento?.nombre ?? '',
  }))
}
```

- [ ] **Step 3: Add `getPastoresEnriquecidos`**

```typescript
export async function getPastoresEnriquecidos(): Promise<PastorEnriquecido[]> {
  const { data, error } = await supabase
    .from('pastor')
    .select('*, iglesia_pastor(fecha_fin, iglesia(nombre))')
    .order('apellidos')
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapPastor(r),
    iglesiasActivas: ((r.iglesia_pastor as any[]) || [])
      .filter((ip: any) => ip.fecha_fin === null)
      .map((ip: any) => ip.iglesia?.nombre ?? ''),
  }))
}
```

- [ ] **Step 4: Add `getSedesEnriquecidas`**

```typescript
export async function getSedesEnriquecidas(idIglesia?: number): Promise<SedeEnriquecida[]> {
  let q = supabase
    .from('sede')
    .select('*, ministerio(count), ciudad(nombre)')
    .order('nombre')
  if (idIglesia !== undefined) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapSede(r),
    cantidadMinisterios: Array.isArray(r.ministerio) ? r.ministerio[0]?.count ?? 0 : 0,
    ciudadNombre: r.ciudad?.nombre ?? '',
  }))
}
```

- [ ] **Step 5: Add `deleteIglesia`, `deleteSede`, `deletePastor`**

```typescript
export async function deleteIglesia(id: number): Promise<void> {
  const { error } = await supabase.from('iglesia').delete().eq('id_iglesia', id)
  if (error) throw error
}

export async function deleteSede(id: number): Promise<void> {
  const { error } = await supabase.from('sede').delete().eq('id_sede', id)
  if (error) throw error
}

export async function deletePastor(id: number): Promise<void> {
  const { error } = await supabase.from('pastor').delete().eq('id_pastor', id)
  if (error) throw error
}
```

- [ ] **Step 6: Build to check types**

```bash
npm run build 2>&1 | head -30
```

Expected: No errors in `iglesias.service.ts`.

---

### Task 2: Add hooks for enriched queries and delete mutations

**Files:**
- Modify: `src/hooks/useIglesias.ts`

- [ ] **Step 1: Update imports at top of file**

```typescript
import {
  getIglesias, getPastores, getIglesiaPastores, getSedes,
  getIglesiasEnriquecidas, getPastoresEnriquecidos, getSedesEnriquecidas,
  createIglesia, updateIglesia, toggleIglesiaEstado, deleteIglesia,
  createSede, updateSede, toggleSedeEstado, deleteSede,
  createPastor, updatePastor, deletePastor,
  createIglesiaPastor, closeIglesiaPastor,
} from '@/services/iglesias.service'
```

- [ ] **Step 2: Add enriched query hooks** — add after `useSedes`:

```typescript
export function useIglesiasEnriquecidas() {
  return useQuery({ queryKey: ['iglesias-enriquecidas'], queryFn: getIglesiasEnriquecidas, staleTime: 5 * 60 * 1000 })
}

export function usePastoresEnriquecidos() {
  return useQuery({ queryKey: ['pastores-enriquecidos'], queryFn: getPastoresEnriquecidos, staleTime: 5 * 60 * 1000 })
}

export function useSedesEnriquecidas(idIglesia?: number) {
  return useQuery({
    queryKey: ['sedes-enriquecidas', idIglesia],
    queryFn: () => getSedesEnriquecidas(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Add delete mutation hooks** — add after `useCloseIglesiaPastor`:

```typescript
export function useDeleteIglesia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteIglesia(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iglesias'] })
      qc.invalidateQueries({ queryKey: ['iglesias-enriquecidas'] })
    },
  })
}

export function useDeleteSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteSede(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes'] })
      qc.invalidateQueries({ queryKey: ['sedes-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['iglesias-enriquecidas'] })
    },
  })
}

export function useDeletePastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePastor(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pastores'] })
      qc.invalidateQueries({ queryKey: ['pastores-enriquecidos'] })
    },
  })
}
```

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | head -30
```

Expected: No errors.

---

### Task 3: Add RLS policies for mutations

**Files:**
- Create: `supabase/migrations/20260407_phase1_rls_mutations.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Phase 1: Allow authenticated users to INSERT/UPDATE/DELETE iglesia domain
-- Super admin operations — in production scope to specific role check via JWT

DO $$ BEGIN
  CREATE POLICY "Authenticated insert iglesia"
    ON public.iglesia FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update iglesia"
    ON public.iglesia FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete iglesia"
    ON public.iglesia FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert sede"
    ON public.sede FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update sede"
    ON public.sede FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete sede"
    ON public.sede FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert pastor"
    ON public.pastor FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update pastor"
    ON public.pastor FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete pastor"
    ON public.pastor FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert iglesia_pastor"
    ON public.iglesia_pastor FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update iglesia_pastor"
    ON public.iglesia_pastor FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with:
- `project_id`: `heibyjbvfiokmduwwawm`
- `name`: `phase1_rls_mutations`
- `query`: contents of the file above

- [ ] **Step 3: Rename file to match assigned version**

After MCP returns the version (e.g., `20260407HHMMSS`), rename:
```bash
mv supabase/migrations/20260407_phase1_rls_mutations.sql supabase/migrations/20260407HHMMSS_phase1_rls_mutations.sql
```

---

### Task 4: Wire delete + enrichment in ChurchesPage

**Files:**
- Modify: `src/app/components/ChurchesPage.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/components/ChurchesPage.tsx` to understand current structure before modifying.

- [ ] **Step 2: Add `useDeleteIglesia` and `useIglesiasEnriquecidas`**

Replace `useIglesias()` call with `useIglesiasEnriquecidas()` and add the delete hook:

```typescript
import { useIglesiasEnriquecidas, useDeleteIglesia, /* existing imports */ } from '@/hooks/useIglesias'

// In component:
const { data: iglesias = [], isLoading } = useIglesiasEnriquecidas()
const deleteIglesiaMutation = useDeleteIglesia()
```

- [ ] **Step 3: Add delete handler**

```typescript
function handleDeleteIglesia(id: number) {
  if (!confirm('¿Eliminar esta iglesia? Esta acción no se puede deshacer.')) return
  deleteIglesiaMutation.mutate(id)
}
```

- [ ] **Step 4: Add delete button to each row/card**

Add a delete button next to the existing edit button for each iglesia, `disabled={deleteIglesiaMutation.isPending}`.

- [ ] **Step 5: Show enriched data**

Where iglesia cards/rows are rendered, display `iglesia.cantidadSedes` and `iglesia.ciudadNombre + ', ' + iglesia.departamentoNombre`.

- [ ] **Step 6: Build and verify**

```bash
npm run build 2>&1 | head -20
```

---

### Task 5: Wire delete + enrichment in SedesPage and PastoresPage

**Files:**
- Modify: `src/app/components/SedesPage.tsx`
- Modify: `src/app/components/PastoresPage.tsx`

- [ ] **Step 1: Read both files**

Read `src/app/components/SedesPage.tsx` and `src/app/components/PastoresPage.tsx`.

- [ ] **Step 2: Update SedesPage**

```typescript
import { useSedesEnriquecidas, useDeleteSede, /* existing */ } from '@/hooks/useIglesias'

const { data: sedes = [], isLoading } = useSedesEnriquecidas(iglesiaActual?.id)
const deleteSedeMutation = useDeleteSede()

function handleDeleteSede(id: number) {
  if (!confirm('¿Eliminar esta sede?')) return
  deleteSedeMutation.mutate(id)
}
```

Display `sede.cantidadMinisterios` and `sede.ciudadNombre` in the table/card.

- [ ] **Step 3: Update PastoresPage**

```typescript
import { usePastoresEnriquecidos, useDeletePastor, /* existing */ } from '@/hooks/useIglesias'

const { data: pastores = [], isLoading } = usePastoresEnriquecidos()
const deletePastorMutation = useDeletePastor()

function handleDeletePastor(id: number) {
  if (!confirm('¿Eliminar este pastor?')) return
  deletePastorMutation.mutate(id)
}
```

Display `pastor.iglesiasActivas.join(', ')` where pastor's church is shown.

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | head -20
```

- [ ] **Step 5: Commit all Phase 1 work**

```bash
git add src/services/iglesias.service.ts src/hooks/useIglesias.ts \
        src/app/components/ChurchesPage.tsx src/app/components/SedesPage.tsx \
        src/app/components/PastoresPage.tsx \
        supabase/migrations/
git commit -m "feat: iglesias/sedes/pastores enriched queries + delete mutations (phase 1)"
git push origin main
```
