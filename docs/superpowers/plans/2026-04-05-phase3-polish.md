# Phase 3 Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three remaining rough edges from Phase 3 — (1) ciudad dropdowns in SedesPage/ChurchesPage, (2) ClassroomPage shows 0 modules because getCursos doesn't join the modulo table, and (3) UsuariosPage shows empty roles/ministerios because enrichment was deferred.

**Architecture:** Task 1 adds `useCiudades()` dropdowns to two forms (no new service code needed). Task 2 changes `getCursos` to include a PostgREST `modulo(*)` join so the `Curso.modulos` field is populated. Task 3 adds `getUsuariosEnriquecidos` with a PostgREST join query, a new hook, and rewires UsuariosPage.

**Tech Stack:** @supabase/supabase-js v2 (PostgREST join syntax), @tanstack/react-query v5, React 18 + TypeScript, project `/home/juanda/Proyectofinal`

---

## File Map

| Action | Path | What changes |
|--------|------|--------------|
| Modify | `src/app/components/SedesPage.tsx` | Replace raw number input with `<Select>` from `useCiudades()` |
| Modify | `src/app/components/ChurchesPage.tsx` | Add ciudad `<Select>` to `renderFormFields()` using `useCiudades()` |
| Modify | `src/services/cursos.service.ts` | `getCursos` uses `select('*, modulo(*)')` |
| Modify | `src/app/components/ClassroomPage.tsx` | Remove `?.length ?? 0` workaround comment (no-op if modulos is populated) |
| Modify | `src/services/usuarios.service.ts` | Add `getUsuariosEnriquecidos` |
| Modify | `src/hooks/useUsuarios.ts` | Add `useUsuariosEnriquecidos` hook |
| Modify | `src/app/components/UsuariosPage.tsx` | Replace mock enrichment with real hook |

---

## Task 1: Ciudad dropdowns in SedesPage and ChurchesPage

**Files:**
- Modify: `src/app/components/SedesPage.tsx`
- Modify: `src/app/components/ChurchesPage.tsx`

### Context

`useCiudades()` (no argument) already exists in `@/hooks/useGeografia` — it fetches all cities. Both forms currently use a raw `<Input type="number">` (SedesPage) or render no ciudad field at all (ChurchesPage). The Select component is already imported in SedesPage but missing in ChurchesPage.

The `iglesia` table requires `id_ciudad` (NOT NULL). The `sede` table also requires `id_ciudad`. Without a proper picker the field stays 0 and validation blocks the form.

- [ ] **Step 1: Wire SedesPage ciudad Select**

Read `src/app/components/SedesPage.tsx` first.

1a. Add `useCiudades` to the existing import from `@/hooks/useGeografia`:
```typescript
import { useCiudades } from "@/hooks/useGeografia";
```
(SedesPage currently has no geography imports — add this new import line.)

1b. After `const { data: iglesias = [] } = useIglesias();` (line 14), add:
```typescript
const { data: ciudades = [] } = useCiudades();
```

1c. Replace lines 136–138 (the raw number input):
```tsx
<div><label className="text-sm">Ciudad * (Phase 3: populated via useCiudades)</label>
  <Input type="number" value={form.idCiudad || ""} onChange={e => setForm(f => ({ ...f, idCiudad: Number(e.target.value) }))} className="mt-1" placeholder="ID de ciudad" />
</div>
```
With:
```tsx
<div>
  <label className="text-sm">Ciudad *</label>
  <Select
    value={form.idCiudad ? String(form.idCiudad) : ""}
    onValueChange={v => setForm(f => ({ ...f, idCiudad: Number(v) }))}
  >
    <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar ciudad" /></SelectTrigger>
    <SelectContent>
      {ciudades.map(c => (
        <SelectItem key={c.idCiudad} value={String(c.idCiudad)}>{c.nombre}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 2: Wire ChurchesPage ciudad Select**

Read `src/app/components/ChurchesPage.tsx` first.

2a. Add imports:
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useCiudades } from "@/hooks/useGeografia";
```

2b. Add ciudad data after `const { data: iglesias = [], isLoading } = useIglesias();` — actually ChurchesPage only calls `useIglesias`. Add:
```typescript
const { data: ciudades = [] } = useCiudades();
```
Place this after the mutation hooks, before `if (isLoading)`.

2c. In `renderFormFields()`, add a ciudad Select after the `fechaFundacion` field:
```tsx
<div>
  <label className="text-sm text-muted-foreground mb-1 block">Ciudad <span className="text-destructive">*</span></label>
  <Select
    value={form.idCiudad ? String(form.idCiudad) : ""}
    onValueChange={v => setForm(prev => ({ ...prev, idCiudad: Number(v) }))}
  >
    <SelectTrigger className={`bg-input-background ${formErrors.idCiudad ? "border-destructive" : ""}`}>
      <SelectValue placeholder="Seleccionar ciudad" />
    </SelectTrigger>
    <SelectContent>
      {ciudades.map(c => (
        <SelectItem key={c.idCiudad} value={String(c.idCiudad)}>{c.nombre}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  {formErrors.idCiudad && <p className="text-destructive text-xs mt-1">{formErrors.idCiudad}</p>}
</div>
```

Note: `renderFormFields` is defined inside the component and closes over `form`, `setForm`, `formErrors`, and now `ciudades` — all of which are declared before `renderFormFields` is defined, so this is safe.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | grep -E "error TS|SedesPage|ChurchesPage" | head -20
```

Expected: no errors in the 2 modified files.

- [ ] **Step 4: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/components/SedesPage.tsx src/app/components/ChurchesPage.tsx
git commit -m "feat: replace raw ciudad ID inputs with useCiudades() dropdowns"
```

---

## Task 2: ClassroomPage — getCursos joins modulo table

**Files:**
- Modify: `src/services/cursos.service.ts`

### Context

`getCursos` currently does `select('*')`, so the returned `Curso` objects have `modulos: undefined`. ClassroomPage already renders `curso.modulos?.length || 0` and `curso.modulos?.sort(...)` — it just gets 0/nothing because the join is missing. The `Curso` type already has `modulos?: Modulo[]`.

The fix is one line in the service: add a PostgREST nested select. No page or hook changes needed.

- [ ] **Step 1: Update getCursos to join modulo**

Read `src/services/cursos.service.ts` first (lines 91–97).

Replace the `getCursos` function:

```typescript
export async function getCursos(idMinisterio?: number): Promise<Curso[]> {
  let q = supabase
    .from('curso')
    .select('*, modulo(*)')
    .order('nombre')
  if (idMinisterio !== undefined) q = q.eq('id_ministerio', idMinisterio)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapCurso(r),
    modulos: Array.isArray(r.modulo)
      ? (r.modulo as any[]).map(mapModulo)
      : [],
  }))
}
```

Note: `(data as any[])` is needed because the TypeScript generated type for `curso` row doesn't include the joined `modulo` array. The `mapModulo` function already exists in the same file.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | grep -E "error TS|cursos" | head -20
```

Expected: no errors.

- [ ] **Step 3: Verify build**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`

- [ ] **Step 4: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/cursos.service.ts
git commit -m "fix: getCursos joins modulo table so ClassroomPage shows modules"
```

---

## Task 3: UsuariosPage role/ministry enrichment

**Files:**
- Modify: `src/services/usuarios.service.ts`
- Modify: `src/hooks/useUsuarios.ts`
- Modify: `src/app/components/UsuariosPage.tsx`

### Context

`UsuariosPage` currently does:
```typescript
const enriched = usuarios.map(u => ({
  ...u,
  roleNames: [] as { rolNombre: string; iglesiaNombre: string }[],
  minNames: [] as { nombre: string; rol: string }[],
}));
```
All roleNames and minNames are empty arrays, so the Roles and Ministerios columns always show "—".

The plan: add `getUsuariosEnriquecidos` that uses a PostgREST join to fetch `usuario_rol` (with nested `rol` and `iglesia`) and `miembro_ministerio` (with nested `ministerio`) in a single query.

DB relationships:
- `usuario` 1:N `usuario_rol` (FK: `id_usuario`) → N:1 `rol` (FK: `id_rol`), N:1 `iglesia` (FK: `id_iglesia`)
- `usuario` 1:N `miembro_ministerio` (FK: `id_usuario`) → N:1 `ministerio` (FK: `id_ministerio`)

Active-only filters: `usuario_rol.fecha_fin IS NULL` (active roles), `miembro_ministerio.activo = true`.

- [ ] **Step 1: Add getUsuariosEnriquecidos to `src/services/usuarios.service.ts`**

Read the file first.

Add this type definition before the export functions, after the existing mapper functions:

```typescript
export interface UsuarioEnriquecido extends Usuario {
  roleNames: { rolNombre: string; iglesiaNombre: string }[]
  minNames: { nombre: string; rol: string }[]
}
```

Append `getUsuariosEnriquecidos` after `getUsuarioRoles`:

```typescript
export async function getUsuariosEnriquecidos(): Promise<UsuarioEnriquecido[]> {
  const { data, error } = await supabase
    .from('usuario')
    .select(`
      *,
      usuario_rol ( id_usuario_rol, fecha_fin, rol ( nombre ), iglesia ( nombre ) ),
      miembro_ministerio ( id_miembro_ministerio, activo, rol_en_ministerio, ministerio ( nombre ) )
    `)
    .order('apellidos')
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapUsuario(r),
    roleNames: ((r.usuario_rol as any[]) || [])
      .filter((ur: any) => ur.fecha_fin === null)
      .map((ur: any) => ({
        rolNombre: ur.rol?.nombre ?? '',
        iglesiaNombre: ur.iglesia?.nombre ?? '',
      })),
    minNames: ((r.miembro_ministerio as any[]) || [])
      .filter((mm: any) => mm.activo)
      .map((mm: any) => ({
        nombre: mm.ministerio?.nombre ?? '',
        rol: mm.rol_en_ministerio ?? '',
      })),
  }))
}
```

- [ ] **Step 2: Add useUsuariosEnriquecidos hook to `src/hooks/useUsuarios.ts`**

Read the file first to see existing hooks. Add `getUsuariosEnriquecidos` to the service import and append the new hook:

```typescript
import {
  getRoles, getUsuarios, getUsuarioRoles, toggleUsuarioActivo, getUsuariosEnriquecidos,
} from '@/services/usuarios.service'
import type { UsuarioEnriquecido } from '@/services/usuarios.service'

// ... existing hooks unchanged ...

export function useUsuariosEnriquecidos() {
  return useQuery({
    queryKey: ['usuarios-enriquecidos'],
    queryFn: getUsuariosEnriquecidos,
    staleTime: 60 * 1000,
  })
}
```

- [ ] **Step 3: Wire UsuariosPage to use real enriched data**

Read `src/app/components/UsuariosPage.tsx` first.

3a. Update imports — add `useUsuariosEnriquecidos` and `UsuarioEnriquecido`:
```typescript
import { useUsuariosEnriquecidos, useRoles, useToggleUsuarioActivo } from "@/hooks/useUsuarios";
import type { UsuarioEnriquecido } from "@/services/usuarios.service";
```
(Remove `useUsuarios` from import since it's replaced.)

3b. Replace the `useUsuarios` call and the mock `enriched` array:

Remove:
```typescript
const { data: usuarios = [], isLoading } = useUsuarios();
```
And the `enriched` block:
```typescript
// Role/ministry enrichment deferred to Phase 3 (requires per-user queries)
const enriched = usuarios.map(u => ({
  ...u,
  roleNames: [] as { rolNombre: string; iglesiaNombre: string }[],
  minNames: [] as { nombre: string; rol: string }[],
}));
```

Replace with:
```typescript
const { data: enriched = [], isLoading } = useUsuariosEnriquecidos();
```

3c. The `filtered` variable references `enriched` with the same shape — no changes needed there.

3d. Stats cards reference `usuarios` — update to use `enriched`:
- Find `usuarios.length` → `enriched.length`
- Find `usuarios.filter(u => u.activo)` → `enriched.filter(u => u.activo)`
- Find `usuarios.filter(u => !u.activo)` → `enriched.filter(u => !u.activo)`
- Find `usuarios.filter(u => u.ultimoAcceso)` → `enriched.filter(u => u.ultimoAcceso)`

3e. The `detailUser` type is now inferred as `UsuarioEnriquecido` — no explicit type annotation needed.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | grep -E "error TS|UsuariosPage|usuarios" | head -20
```

Expected: no errors.

- [ ] **Step 5: Verify full build**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`

- [ ] **Step 6: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/usuarios.service.ts src/hooks/useUsuarios.ts \
  src/app/components/UsuariosPage.tsx
git commit -m "feat: UsuariosPage enriches with real roles and ministerios from Supabase"
```
