# Phase 2: Ministerios y Miembros — CRUD Completo + Enrichment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete CRUD for ministerios and miembros with enriched data (cantidadMiembros, liderNombre, nombreCompleto del miembro).

**Architecture:** Existing `updateMinisterio` and `useUpdateMinisterio` are already implemented. Add `deleteMinisterio`, `updateMiembroMinisterio`, `deleteMiembroMinisterio`, enriched getters, and wire them in the page components.

**Tech Stack:** React 18, Supabase JS v2, TanStack Query v5, shadcn/ui

---

## File Structure

| File | Change |
|------|--------|
| `src/services/ministerios.service.ts` | Modify — add enriched getters + delete mutations |
| `src/hooks/useMinisterios.ts` | Modify — add hooks for new mutations + enriched queries |
| `src/app/components/DepartmentsPage.tsx` | Modify — use enriched query, add delete |
| `src/app/components/MembersPage.tsx` | Modify — show real member data, add update/delete |
| `src/app/components/MyDepartmentPage.tsx` | Modify — use enriched ministerio data |

---

### Task 1: Add enriched queries and delete/update mutations to ministerios.service.ts

**Files:**
- Modify: `src/services/ministerios.service.ts`

- [ ] **Step 1: Add enriched interfaces after existing imports**

```typescript
// Add after mapMiembro function:

export interface MinisterioEnriquecido extends Ministerio {
  cantidadMiembros: number
  liderNombre: string
}

export interface MiembroEnriquecido extends MiembroMinisterio {
  nombreCompleto: string
  correo: string | null
  telefono: string | null
}
```

- [ ] **Step 2: Add `getMinisteriosEnriquecidos`**

```typescript
export async function getMinisteriosEnriquecidos(idSede?: number): Promise<MinisterioEnriquecido[]> {
  let q = supabase
    .from('ministerio')
    .select('*, miembro_ministerio(count, rol_en_ministerio, usuario(nombres, apellidos))')
    .order('nombre')
  if (idSede !== undefined) q = q.eq('id_sede', idSede)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => {
    const miembros: any[] = r.miembro_ministerio || []
    const lider = miembros.find((m: any) =>
      typeof m.rol_en_ministerio === 'string' &&
      m.rol_en_ministerio.toLowerCase().includes('líder')
    )
    return {
      ...mapMinisterio(r),
      cantidadMiembros: miembros[0]?.count ?? miembros.length,
      liderNombre: lider?.usuario
        ? `${lider.usuario.nombres} ${lider.usuario.apellidos}`
        : '',
    }
  })
}
```

- [ ] **Step 3: Add `getMiembrosEnriquecidos`**

```typescript
export async function getMiembrosEnriquecidos(idMinisterio: number): Promise<MiembroEnriquecido[]> {
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('*, usuario(nombres, apellidos, correo, telefono)')
    .eq('id_ministerio', idMinisterio)
    .is('fecha_salida', null)
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapMiembro(r),
    nombreCompleto: r.usuario
      ? `${r.usuario.nombres} ${r.usuario.apellidos}`
      : '',
    correo: r.usuario?.correo ?? null,
    telefono: r.usuario?.telefono ?? null,
  }))
}
```

- [ ] **Step 4: Add `deleteMinisterio`, `updateMiembroMinisterio`, `deleteMiembroMinisterio`**

```typescript
export async function deleteMinisterio(id: number): Promise<void> {
  const { error } = await supabase.from('ministerio').delete().eq('id_ministerio', id)
  if (error) throw error
}

export async function updateMiembroMinisterio(
  id: number,
  data: { rolEnMinisterio?: string | null; fechaSalida?: string | null }
): Promise<MiembroMinisterio> {
  const patch: Record<string, unknown> = {}
  if (data.rolEnMinisterio !== undefined) patch.rol_en_ministerio = data.rolEnMinisterio
  if (data.fechaSalida !== undefined) patch.fecha_salida = data.fechaSalida
  const { data: result, error } = await supabase
    .from('miembro_ministerio')
    .update(patch)
    .eq('id_miembro_ministerio', id)
    .select()
    .single()
  if (error) throw error
  return mapMiembro(result)
}

export async function deleteMiembroMinisterio(id: number): Promise<void> {
  const { error } = await supabase.from('miembro_ministerio').delete().eq('id_miembro_ministerio', id)
  if (error) throw error
}
```

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | head -30
```

Expected: No errors.

---

### Task 2: Add hooks in useMinisterios.ts

**Files:**
- Modify: `src/hooks/useMinisterios.ts`

- [ ] **Step 1: Update imports**

```typescript
import {
  getMinisterios, getMiembrosMinisterio,
  getMinisteriosEnriquecidos, getMiembrosEnriquecidos,
  createMinisterio, updateMinisterio, toggleMinisterioEstado, deleteMinisterio,
  createMiembroMinisterio, updateMiembroMinisterio, deleteMiembroMinisterio,
} from '@/services/ministerios.service'
```

- [ ] **Step 2: Add enriched query hooks** — add after `useMiembrosMinisterio`:

```typescript
export function useMinisteriosEnriquecidos(idSede?: number) {
  return useQuery({
    queryKey: ['ministerios-enriquecidos', idSede],
    queryFn: () => getMinisteriosEnriquecidos(idSede),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMiembrosEnriquecidos(idMinisterio: number) {
  return useQuery({
    queryKey: ['miembros-enriquecidos', idMinisterio],
    queryFn: () => getMiembrosEnriquecidos(idMinisterio),
    enabled: idMinisterio > 0,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Add delete and update hooks** — add after `useCreateMiembroMinisterio`:

```typescript
export function useDeleteMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteMinisterio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ministerios'] })
      qc.invalidateQueries({ queryKey: ['ministerios-enriquecidos'] })
    },
  })
}

export function useUpdateMiembroMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateMiembroMinisterio>[1] }) =>
      updateMiembroMinisterio(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['miembros-ministerio'] })
      qc.invalidateQueries({ queryKey: ['miembros-enriquecidos'] })
    },
  })
}

export function useDeleteMiembroMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteMiembroMinisterio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['miembros-ministerio'] })
      qc.invalidateQueries({ queryKey: ['miembros-enriquecidos'] })
      qc.invalidateQueries({ queryKey: ['ministerios-enriquecidos'] })
    },
  })
}
```

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | head -20
```

---

### Task 3: Add RLS policies for ministerio mutations

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_phase2_rls_mutations.sql`

- [ ] **Step 1: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with:
- `project_id`: `heibyjbvfiokmduwwawm`
- `name`: `phase2_rls_mutations`
- `query`:

```sql
DO $$ BEGIN
  CREATE POLICY "Authenticated insert ministerio"
    ON public.ministerio FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update ministerio"
    ON public.ministerio FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete ministerio"
    ON public.ministerio FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert miembro_ministerio"
    ON public.miembro_ministerio FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update miembro_ministerio"
    ON public.miembro_ministerio FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete miembro_ministerio"
    ON public.miembro_ministerio FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

- [ ] **Step 2: Create local file with assigned version name**

After MCP returns the version, create the file at `supabase/migrations/<version>_phase2_rls_mutations.sql` with the SQL above.

---

### Task 4: Update DepartmentsPage with enriched data and delete

**Files:**
- Modify: `src/app/components/DepartmentsPage.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/components/DepartmentsPage.tsx` to understand current structure.

- [ ] **Step 2: Replace query and add delete**

```typescript
import { useMinisteriosEnriquecidos, useDeleteMinisterio, useToggleMinisterioEstado, useCreateMinisterio } from '@/hooks/useMinisterios'
import { useApp } from '@/app/store/AppContext'

// Inside component — get sede IDs for current iglesia:
const { iglesiaActual } = useApp()
const { data: ministerios = [], isLoading } = useMinisteriosEnriquecidos()
const deleteMinisterioMutation = useDeleteMinisterio()

function handleDeleteMinisterio(id: number) {
  if (!confirm('¿Eliminar este ministerio?')) return
  deleteMinisterioMutation.mutate(id)
}
```

- [ ] **Step 3: Show enriched fields**

In the ministerio cards/rows, display:
- `ministerio.cantidadMiembros` as badge/stat
- `ministerio.liderNombre` as subtitle

- [ ] **Step 4: Add delete button** with `disabled={deleteMinisterioMutation.isPending}`.

---

### Task 5: Update MembersPage with real member data and update/delete

**Files:**
- Modify: `src/app/components/MembersPage.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/components/MembersPage.tsx`.

- [ ] **Step 2: Replace query**

```typescript
import { useMiembrosEnriquecidos, useDeleteMiembroMinisterio, useUpdateMiembroMinisterio } from '@/hooks/useMinisterios'

const { data: miembros = [], isLoading } = useMiembrosEnriquecidos(selectedMinisterioId)
const deleteMiembroMutation = useDeleteMiembroMinisterio()
const updateMiembroMutation = useUpdateMiembroMinisterio()
```

- [ ] **Step 3: Show real member data**

Replace any placeholder names with `miembro.nombreCompleto`, `miembro.correo`, `miembro.telefono`.

- [ ] **Step 4: Wire delete**

```typescript
function handleDeleteMiembro(id: number) {
  if (!confirm('¿Remover miembro del ministerio?')) return
  deleteMiembroMutation.mutate(id)
}
```

- [ ] **Step 5: Wire update rol** — if there's an edit dialog for `rolEnMinisterio`:

```typescript
updateMiembroMutation.mutate({ id: miembro.idMiembroMinisterio, data: { rolEnMinisterio: newRol } })
```

- [ ] **Step 6: Build and commit**

```bash
npm run build 2>&1 | head -20
git add src/services/ministerios.service.ts src/hooks/useMinisterios.ts \
        src/app/components/DepartmentsPage.tsx src/app/components/MembersPage.tsx \
        src/app/components/MyDepartmentPage.tsx \
        supabase/migrations/
git commit -m "feat: ministerios/miembros enriched queries + delete/update mutations (phase 2)"
git push origin main
```
