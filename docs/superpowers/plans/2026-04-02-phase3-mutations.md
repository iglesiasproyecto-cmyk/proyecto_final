# Phase 3 — Mutations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all create/update/delete operations from the UI stubs into real Supabase mutations using TanStack Query `useMutation` hooks, one domain at a time.

**Architecture:** Each task follows the same pattern: add mutation functions to the existing service file (snake_case ↔ camelCase mapping), add `useMutation` hooks to the existing hooks file, then replace `/* Phase 3 */` stub functions in page components with the real mutation hooks. No new files created — all changes go into existing service/hook/page files.

**Tech Stack:** @supabase/supabase-js v2, @tanstack/react-query v5 (`useMutation` + `useQueryClient`), React 18 + Vite + TypeScript, project `/home/juanda/Proyectofinal`

---

## File Map

| Action | Path | What changes |
|--------|------|--------------|
| Modify | `src/services/iglesias.service.ts` | +10 mutation functions |
| Modify | `src/hooks/useIglesias.ts` | +8 mutation hooks |
| Modify | `src/app/components/ChurchesPage.tsx` | replace 3 stubs |
| Modify | `src/app/components/SedesPage.tsx` | replace 3 stubs |
| Modify | `src/app/components/PastoresPage.tsx` | replace 4 stubs |
| Modify | `src/services/ministerios.service.ts` | +4 mutation functions |
| Modify | `src/hooks/useMinisterios.ts` | +4 mutation hooks |
| Modify | `src/app/components/DepartmentsPage.tsx` | replace 1 stub |
| Modify | `src/app/components/MembersPage.tsx` | wire invite dialog |
| Modify | `src/services/eventos.service.ts` | +8 mutation functions |
| Modify | `src/hooks/useEventos.ts` | +5 mutation hooks |
| Modify | `src/app/components/CatalogosPage.tsx` | replace 3 stubs |
| Modify | `src/app/components/EventsPage.tsx` | wire create dialog |
| Modify | `src/app/components/TasksPage.tsx` | replace 1 stub + wire create |
| Modify | `src/services/usuarios.service.ts` | +1 mutation function |
| Modify | `src/hooks/useUsuarios.ts` | +1 mutation hook |
| Modify | `src/app/components/UsuariosPage.tsx` | replace 1 stub |
| Modify | `src/services/cursos.service.ts` | +2 mutation functions |
| Modify | `src/hooks/useCursos.ts` | +2 mutation hooks |
| Modify | `src/app/components/ClassroomPage.tsx` | wire 2 create dialogs |

---

## Task 1: Iglesias domain mutations

**Files:**
- Modify: `src/services/iglesias.service.ts`
- Modify: `src/hooks/useIglesias.ts`
- Modify: `src/app/components/ChurchesPage.tsx`
- Modify: `src/app/components/SedesPage.tsx`
- Modify: `src/app/components/PastoresPage.tsx`

- [ ] **Step 1: Add mutation functions to `src/services/iglesias.service.ts`**

Append these functions at the end of the file (after `getSedes`). The mappers (`mapIglesia`, `mapPastor`, `mapIglesiaPastor`, `mapSede`) already exist — reuse them.

```typescript
// ── Iglesia mutations ──

export async function createIglesia(
  data: { nombre: string; fechaFundacion: string | null; idCiudad: number; estado: Iglesia['estado'] }
): Promise<Iglesia> {
  const { data: result, error } = await supabase
    .from('iglesia')
    .insert([{ nombre: data.nombre, fecha_fundacion: data.fechaFundacion, id_ciudad: data.idCiudad, estado: data.estado }])
    .select()
    .single()
  if (error) throw error
  return mapIglesia(result)
}

export async function updateIglesia(
  id: number,
  data: { nombre?: string; fechaFundacion?: string | null }
): Promise<Iglesia> {
  const { data: result, error } = await supabase
    .from('iglesia')
    .update({ nombre: data.nombre, fecha_fundacion: data.fechaFundacion })
    .eq('id_iglesia', id)
    .select()
    .single()
  if (error) throw error
  return mapIglesia(result)
}

export async function toggleIglesiaEstado(id: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('iglesia').select('estado').eq('id_iglesia', id).single()
  if (fetchError) throw fetchError
  const next = current.estado === 'activa' ? 'inactiva' : 'activa'
  const { error } = await supabase.from('iglesia').update({ estado: next }).eq('id_iglesia', id)
  if (error) throw error
}

// ── Sede mutations ──

export async function createSede(
  data: { nombre: string; direccion: string | null; idCiudad: number; idIglesia: number; estado: Sede['estado'] }
): Promise<Sede> {
  const { data: result, error } = await supabase
    .from('sede')
    .insert([{ nombre: data.nombre, direccion: data.direccion, id_ciudad: data.idCiudad, id_iglesia: data.idIglesia, estado: data.estado }])
    .select()
    .single()
  if (error) throw error
  return mapSede(result)
}

export async function updateSede(
  id: number,
  data: { nombre?: string; direccion?: string | null; idCiudad?: number; idIglesia?: number; estado?: Sede['estado'] }
): Promise<Sede> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.direccion !== undefined) patch.direccion = data.direccion
  if (data.idCiudad !== undefined) patch.id_ciudad = data.idCiudad
  if (data.idIglesia !== undefined) patch.id_iglesia = data.idIglesia
  if (data.estado !== undefined) patch.estado = data.estado
  const { data: result, error } = await supabase
    .from('sede').update(patch).eq('id_sede', id).select().single()
  if (error) throw error
  return mapSede(result)
}

export async function toggleSedeEstado(id: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('sede').select('estado').eq('id_sede', id).single()
  if (fetchError) throw fetchError
  const next = current.estado === 'activa' ? 'inactiva' : 'activa'
  const { error } = await supabase.from('sede').update({ estado: next }).eq('id_sede', id)
  if (error) throw error
}

// ── Pastor mutations ──

export async function createPastor(
  data: { nombres: string; apellidos: string; correo: string; telefono: string | null; idUsuario: number | null }
): Promise<Pastor> {
  const { data: result, error } = await supabase
    .from('pastor')
    .insert([{ nombres: data.nombres, apellidos: data.apellidos, correo: data.correo, telefono: data.telefono, id_usuario: data.idUsuario }])
    .select()
    .single()
  if (error) throw error
  return mapPastor(result)
}

export async function updatePastor(
  id: number,
  data: { nombres?: string; apellidos?: string; correo?: string; telefono?: string | null; idUsuario?: number | null }
): Promise<Pastor> {
  const patch: Record<string, unknown> = {}
  if (data.nombres !== undefined) patch.nombres = data.nombres
  if (data.apellidos !== undefined) patch.apellidos = data.apellidos
  if (data.correo !== undefined) patch.correo = data.correo
  if (data.telefono !== undefined) patch.telefono = data.telefono
  if (data.idUsuario !== undefined) patch.id_usuario = data.idUsuario
  const { data: result, error } = await supabase
    .from('pastor').update(patch).eq('id_pastor', id).select().single()
  if (error) throw error
  return mapPastor(result)
}

// ── IglesiaPastor mutations ──

export async function createIglesiaPastor(
  data: { idIglesia: number; idPastor: number; esPrincipal: boolean; fechaInicio: string; fechaFin: string | null; observaciones: string | null }
): Promise<IglesiaPastor> {
  const { data: result, error } = await supabase
    .from('iglesia_pastor')
    .insert([{ id_iglesia: data.idIglesia, id_pastor: data.idPastor, es_principal: data.esPrincipal, fecha_inicio: data.fechaInicio, fecha_fin: data.fechaFin, observaciones: data.observaciones }])
    .select()
    .single()
  if (error) throw error
  return mapIglesiaPastor(result)
}

export async function closeIglesiaPastor(id: number): Promise<void> {
  const { error } = await supabase
    .from('iglesia_pastor')
    .update({ fecha_fin: new Date().toISOString().split('T')[0] })
    .eq('id_iglesia_pastor', id)
  if (error) throw error
}
```

- [ ] **Step 2: Add mutation hooks to `src/hooks/useIglesias.ts`**

Replace the entire file content with:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getIglesias, getPastores, getIglesiaPastores, getSedes,
  createIglesia, updateIglesia, toggleIglesiaEstado,
  createSede, updateSede, toggleSedeEstado,
  createPastor, updatePastor,
  createIglesiaPastor, closeIglesiaPastor,
} from '@/services/iglesias.service'
import type { Iglesia, Sede } from '@/types/app.types'

export function useIglesias() {
  return useQuery({ queryKey: ['iglesias'], queryFn: getIglesias, staleTime: 5 * 60 * 1000 })
}

export function usePastores() {
  return useQuery({ queryKey: ['pastores'], queryFn: getPastores, staleTime: 5 * 60 * 1000 })
}

export function useIglesiaPastores() {
  return useQuery({ queryKey: ['iglesia-pastores'], queryFn: getIglesiaPastores, staleTime: 5 * 60 * 1000 })
}

export function useSedes(idIglesia?: number) {
  return useQuery({
    queryKey: ['sedes', idIglesia],
    queryFn: () => getSedes(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateIglesia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createIglesia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iglesias'] }),
  })
}

export function useUpdateIglesia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateIglesia>[1] }) =>
      updateIglesia(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iglesias'] }),
  })
}

export function useToggleIglesiaEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleIglesiaEstado(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iglesias'] }),
  })
}

export function useCreateSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSede,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sedes'] }),
  })
}

export function useUpdateSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateSede>[1] }) =>
      updateSede(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sedes'] }),
  })
}

export function useToggleSedeEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleSedeEstado(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sedes'] }),
  })
}

export function useCreatePastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPastor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pastores'] }),
  })
}

export function useUpdatePastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePastor>[1] }) =>
      updatePastor(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pastores'] }),
  })
}

export function useCreateIglesiaPastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createIglesiaPastor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iglesia-pastores'] }),
  })
}

export function useCloseIglesiaPastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => closeIglesiaPastor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iglesia-pastores'] }),
  })
}
```

- [ ] **Step 3: Wire `ChurchesPage.tsx`**

In `src/app/components/ChurchesPage.tsx`:

3a. Update imports line at top — add the new mutation hooks:
```typescript
import { useIglesias, useCreateIglesia, useUpdateIglesia, useToggleIglesiaEstado } from "@/hooks/useIglesias";
```

3b. Replace the three stub lines (lines ~36-39):
```typescript
  // Stub mutations — Phase 3
  const toggleIglesiaEstado = (_id: number) => { /* Phase 3 */ };
  const updateIglesia = (_id: number, _data: Partial<Iglesia>) => { /* Phase 3 */ };
  const createIglesia = (_data: Omit<Iglesia, "idIglesia">) => { /* Phase 3 */ };
```
with:
```typescript
  const createIglesiaMutation = useCreateIglesia()
  const updateIglesiaMutation = useUpdateIglesia()
  const toggleEstadoMutation = useToggleIglesiaEstado()
```

3c. Update `handleSaveEdit` to use the mutation (replace the `updateIglesia(...)` call inside):
```typescript
  const handleSaveEdit = () => {
    if (!editingIglesia || !validateForm()) return;
    updateIglesiaMutation.mutate({
      id: editingIglesia.idIglesia,
      data: { nombre: form.nombre.trim(), fechaFundacion: form.fechaFundacion || null },
    });
    setEditingIglesia(null);
  };
```

3d. Update `handleCreate` to use the mutation:
```typescript
  const handleCreate = () => {
    if (!validateForm()) return;
    createIglesiaMutation.mutate({
      nombre: form.nombre.trim(),
      fechaFundacion: form.fechaFundacion || null,
      estado: "activa",
      idCiudad: Number(form.idCiudad),
    });
    setShowCreate(false);
  };
```

3e. Find where `toggleIglesiaEstado` is called in the JSX (the Power/PowerOff button onClick) and replace with:
```typescript
onClick={() => toggleEstadoMutation.mutate(ig.idIglesia)}
```

- [ ] **Step 4: Wire `SedesPage.tsx`**

In `src/app/components/SedesPage.tsx`:

4a. Update imports:
```typescript
import { useSedes, useCreateSede, useUpdateSede, useToggleSedeEstado } from "@/hooks/useIglesias";
```

4b. Replace the three stub lines (~lines 23-26):
```typescript
  // Stub mutations — Phase 3
  const addSede = (_data: Omit<Sede, "idSede" | "creadoEn" | "actualizadoEn">) => { /* Phase 3 */ };
  const updateSede = (_id: number, _data: Partial<Sede>) => { /* Phase 3 */ };
  const toggleSedeEstado = (_id: number) => { /* Phase 3 */ };
```
with:
```typescript
  const createSedeMutation = useCreateSede()
  const updateSedeMutation = useUpdateSede()
  const toggleSedeMutation = useToggleSedeEstado()
```

4c. Find the `handleSubmit` function (around line 36) which calls `addSede` or `updateSede`. Replace those two calls:
- `updateSede(editing, { ... })` → `updateSedeMutation.mutate({ id: editing, data: { nombre: form.nombre, direccion: form.direccion || null, idCiudad: form.idCiudad, idIglesia: form.idIglesia, estado: form.estado } })`
- `addSede({ ... })` → `createSedeMutation.mutate({ nombre: form.nombre, direccion: form.direccion || null, idCiudad: form.idCiudad, idIglesia: form.idIglesia, estado: form.estado })`

4d. Replace `toggleSedeEstado(s.idSede)` in JSX with `toggleSedeMutation.mutate(s.idSede)`.

- [ ] **Step 5: Wire `PastoresPage.tsx`**

In `src/app/components/PastoresPage.tsx`:

5a. Update imports:
```typescript
import {
  usePastores, useIglesiaPastores,
  useCreatePastor, useUpdatePastor,
  useCreateIglesiaPastor, useCloseIglesiaPastor,
} from "@/hooks/useIglesias";
```

5b. Replace the four stub lines (~lines 33-37):
```typescript
  // Stub mutations — Phase 3
  const addPastor = (_data: Omit<Pastor, "idPastor" | "creadoEn" | "actualizadoEn">) => { /* Phase 3 */ };
  const updatePastor = (_id: number, _data: Partial<Pastor>) => { /* Phase 3 */ };
  const addIglesiaPastor = (_data: Omit<IglesiaPastor, "idIglesiaPastor" | "creadoEn" | "actualizadoEn">) => { /* Phase 3 */ };
  const removeIglesiaPastor = (_id: number) => { /* Phase 3 */ };
```
with:
```typescript
  const createPastorMutation = useCreatePastor()
  const updatePastorMutation = useUpdatePastor()
  const createAsignMutation = useCreateIglesiaPastor()
  const closeAsignMutation = useCloseIglesiaPastor()
```

5c. Find `handleSavePastor` (~line 47). Replace the `addPastor`/`updatePastor` calls:
```typescript
  const handleSavePastor = () => {
    if (!formP.nombres.trim() || !formP.apellidos.trim() || !formP.correo.trim()) return;
    if (editingPastor) {
      updatePastorMutation.mutate({
        id: editingPastor,
        data: { nombres: formP.nombres, apellidos: formP.apellidos, correo: formP.correo, telefono: formP.telefono || null, idUsuario: formP.idUsuario || null },
      });
    } else {
      createPastorMutation.mutate({ nombres: formP.nombres, apellidos: formP.apellidos, correo: formP.correo, telefono: formP.telefono || null, idUsuario: formP.idUsuario || null });
    }
    setDialogPastor(false);
  };
```

5d. Find `handleSaveAsign` (~line 55). Replace the `addIglesiaPastor` call:
```typescript
  const handleSaveAsign = () => {
    if (!formA.idIglesia || !formA.idPastor || !formA.fechaInicio) return;
    createAsignMutation.mutate({ idIglesia: formA.idIglesia, idPastor: formA.idPastor, esPrincipal: formA.esPrincipal, fechaInicio: formA.fechaInicio, fechaFin: null, observaciones: formA.observaciones || null });
    setDialogAsign(false);
  };
```

5e. Find the delete confirm handler (~line 247). Replace `removeIglesiaPastor(...)`:
```typescript
onClick={() => { if (confirmDeleteAsign) { closeAsignMutation.mutate(confirmDeleteAsign.id); setConfirmDeleteAsign(null); } }}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the 5 modified files.

- [ ] **Step 7: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/iglesias.service.ts src/hooks/useIglesias.ts \
  src/app/components/ChurchesPage.tsx src/app/components/SedesPage.tsx \
  src/app/components/PastoresPage.tsx
git commit -m "feat: iglesias domain mutations (iglesia, sede, pastor, iglesia_pastor)"
```

---

## Task 2: Ministerios domain mutations

**Files:**
- Modify: `src/services/ministerios.service.ts`
- Modify: `src/hooks/useMinisterios.ts`
- Modify: `src/app/components/DepartmentsPage.tsx`
- Modify: `src/app/components/MembersPage.tsx`

- [ ] **Step 1: Add mutation functions to `src/services/ministerios.service.ts`**

Append after `getMiembrosMinisterio`:

```typescript
// ── Ministerio mutations ──

export async function createMinisterio(
  data: { nombre: string; descripcion: string | null; idSede: number; estado: Ministerio['estado'] }
): Promise<Ministerio> {
  const { data: result, error } = await supabase
    .from('ministerio')
    .insert([{ nombre: data.nombre, descripcion: data.descripcion, id_sede: data.idSede, estado: data.estado }])
    .select()
    .single()
  if (error) throw error
  return mapMinisterio(result)
}

export async function updateMinisterio(
  id: number,
  data: { nombre?: string; descripcion?: string | null; estado?: Ministerio['estado'] }
): Promise<Ministerio> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.estado !== undefined) patch.estado = data.estado
  const { data: result, error } = await supabase
    .from('ministerio').update(patch).eq('id_ministerio', id).select().single()
  if (error) throw error
  return mapMinisterio(result)
}

export async function toggleMinisterioEstado(id: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('ministerio').select('estado').eq('id_ministerio', id).single()
  if (fetchError) throw fetchError
  const next = current.estado === 'activo' ? 'inactivo' : 'activo'
  const { error } = await supabase.from('ministerio').update({ estado: next }).eq('id_ministerio', id)
  if (error) throw error
}

// ── MiembroMinisterio mutations ──

export async function createMiembroMinisterio(
  data: { idUsuario: number; idMinisterio: number; rolEnMinisterio: string | null; fechaIngreso: string }
): Promise<MiembroMinisterio> {
  const { data: result, error } = await supabase
    .from('miembro_ministerio')
    .insert([{ id_usuario: data.idUsuario, id_ministerio: data.idMinisterio, rol_en_ministerio: data.rolEnMinisterio, fecha_ingreso: data.fechaIngreso }])
    .select()
    .single()
  if (error) throw error
  return mapMiembro(result)
}
```

- [ ] **Step 2: Add mutation hooks to `src/hooks/useMinisterios.ts`**

Replace the entire file content with:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMinisterios, getMiembrosMinisterio,
  createMinisterio, updateMinisterio, toggleMinisterioEstado,
  createMiembroMinisterio,
} from '@/services/ministerios.service'
import type { Ministerio } from '@/types/app.types'

export function useMinisterios(idSede?: number) {
  return useQuery({
    queryKey: ['ministerios', idSede],
    queryFn: () => getMinisterios(idSede),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMiembrosMinisterio(idMinisterio: number) {
  return useQuery({
    queryKey: ['miembros-ministerio', idMinisterio],
    queryFn: () => getMiembrosMinisterio(idMinisterio),
    enabled: idMinisterio > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMinisterio,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ministerios'] }),
  })
}

export function useUpdateMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateMinisterio>[1] }) =>
      updateMinisterio(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ministerios'] }),
  })
}

export function useToggleMinisterioEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleMinisterioEstado(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ministerios'] }),
  })
}

export function useCreateMiembroMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMiembroMinisterio,
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['miembros-ministerio', variables.idMinisterio] }),
  })
}
```

- [ ] **Step 3: Wire `DepartmentsPage.tsx`**

In `src/app/components/DepartmentsPage.tsx`:

3a. Update imports — add mutation hooks:
```typescript
import { useMinisterios, useToggleMinisterioEstado } from "@/hooks/useMinisterios";
```

3b. Replace the one stub (~line 81-82):
```typescript
  // Stub mutations — Phase 3
  const toggleMinisterioEstado = (_id: number) => { /* Phase 3 */ };
```
with:
```typescript
  const toggleEstadoMutation = useToggleMinisterioEstado()
```

3c. Find the `onClick` that calls `toggleMinisterioEstado(m.idMinisterio)` in the JSX (~line 124) and replace:
```typescript
onClick={(e) => { e.stopPropagation(); toggleEstadoMutation.mutate(m.idMinisterio); }}
```

- [ ] **Step 4: Wire `MembersPage.tsx`**

In `src/app/components/MembersPage.tsx`:

4a. Update imports — add mutation hook:
```typescript
import { useMinisterios, useMiembrosMinisterio, useCreateMiembroMinisterio } from "@/hooks/useMinisterios";
```

4b. After `const { data: miembros = [], isLoading: miembrosLoading } = useMiembrosMinisterio(selectedMinisterioId);`, add:
```typescript
  const createMiembroMutation = useCreateMiembroMinisterio()
  const [inviteForm, setInviteForm] = useState({ idUsuario: 0, rolEnMinisterio: "servidor" })
```

4c. Add a `handleInvite` function before the `return`:
```typescript
  const handleInvite = () => {
    if (!inviteForm.idUsuario || !selectedMinisterioId) return;
    createMiembroMutation.mutate({
      idUsuario: inviteForm.idUsuario,
      idMinisterio: selectedMinisterioId,
      rolEnMinisterio: inviteForm.rolEnMinisterio || null,
      fechaIngreso: new Date().toISOString().split('T')[0],
    });
    setShowInvite(false);
    setInviteForm({ idUsuario: 0, rolEnMinisterio: "servidor" });
  };
```

4d. Find the invite Dialog (`showInvite` controlled). Inside its `DialogFooter`, find the submit/confirm button and wire it:
```typescript
<Button onClick={handleInvite} disabled={createMiembroMutation.isPending}>
  {createMiembroMutation.isPending ? "Agregando..." : "Agregar"}
</Button>
```

Also add a basic input for `idUsuario` inside the dialog body (replace or augment existing placeholder content):
```typescript
<div className="space-y-4 py-2">
  <div>
    <label className="text-sm text-muted-foreground mb-1 block">ID de Usuario</label>
    <Input
      type="number"
      value={inviteForm.idUsuario || ""}
      onChange={(e) => setInviteForm(prev => ({ ...prev, idUsuario: Number(e.target.value) }))}
      placeholder="ID del usuario a agregar"
      className="bg-input-background"
    />
  </div>
  <div>
    <label className="text-sm text-muted-foreground mb-1 block">Rol en Ministerio</label>
    <Input
      value={inviteForm.rolEnMinisterio}
      onChange={(e) => setInviteForm(prev => ({ ...prev, rolEnMinisterio: e.target.value }))}
      placeholder="servidor, lider, etc."
      className="bg-input-background"
    />
  </div>
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the 4 modified files.

- [ ] **Step 6: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/ministerios.service.ts src/hooks/useMinisterios.ts \
  src/app/components/DepartmentsPage.tsx src/app/components/MembersPage.tsx
git commit -m "feat: ministerios domain mutations (ministerio, miembro_ministerio)"
```

---

## Task 3: Eventos / Catálogos domain mutations

**Files:**
- Modify: `src/services/eventos.service.ts`
- Modify: `src/hooks/useEventos.ts`
- Modify: `src/app/components/CatalogosPage.tsx`
- Modify: `src/app/components/EventsPage.tsx`
- Modify: `src/app/components/TasksPage.tsx`

- [ ] **Step 1: Add mutation functions to `src/services/eventos.service.ts`**

Append after `getTareasAsignadas`:

```typescript
// ── TipoEvento mutations ──

export async function createTipoEvento(
  nombre: string,
  descripcion: string | null
): Promise<TipoEvento> {
  const { data: result, error } = await supabase
    .from('tipo_evento')
    .insert([{ nombre, descripcion }])
    .select()
    .single()
  if (error) throw error
  return mapTipoEvento(result)
}

export async function updateTipoEvento(
  id: number,
  nombre: string,
  descripcion: string | null
): Promise<TipoEvento> {
  const { data: result, error } = await supabase
    .from('tipo_evento')
    .update({ nombre, descripcion })
    .eq('id_tipo_evento', id)
    .select()
    .single()
  if (error) throw error
  return mapTipoEvento(result)
}

export async function deleteTipoEvento(id: number): Promise<void> {
  const { error } = await supabase.from('tipo_evento').delete().eq('id_tipo_evento', id)
  if (error) throw error
}

// ── Evento mutations ──

export async function createEvento(
  data: {
    nombre: string
    descripcion: string | null
    idTipoEvento: number
    fechaInicio: string
    fechaFin: string
    idIglesia: number
    idSede: number | null
    idMinisterio: number | null
  }
): Promise<Evento> {
  const { data: result, error } = await supabase
    .from('evento')
    .insert([{
      nombre: data.nombre,
      descripcion: data.descripcion,
      id_tipo_evento: data.idTipoEvento,
      fecha_inicio: data.fechaInicio,
      fecha_fin: data.fechaFin,
      estado: 'programado',
      id_iglesia: data.idIglesia,
      id_sede: data.idSede,
      id_ministerio: data.idMinisterio,
    }])
    .select()
    .single()
  if (error) throw error
  return mapEvento(result)
}

// ── Tarea mutations ──

export async function createTarea(
  data: {
    titulo: string
    descripcion: string | null
    fechaLimite: string | null
    prioridad: Tarea['prioridad']
    idUsuarioCreador: number
  }
): Promise<Tarea> {
  const { data: result, error } = await supabase
    .from('tarea')
    .insert([{
      titulo: data.titulo,
      descripcion: data.descripcion,
      fecha_limite: data.fechaLimite,
      estado: 'pendiente',
      prioridad: data.prioridad,
      id_usuario_creador: data.idUsuarioCreador,
    }])
    .select()
    .single()
  if (error) throw error
  return mapTarea(result)
}

export async function updateTareaEstado(id: number, estado: Tarea['estado']): Promise<Tarea> {
  const { data: result, error } = await supabase
    .from('tarea')
    .update({ estado })
    .eq('id_tarea', id)
    .select()
    .single()
  if (error) throw error
  return mapTarea(result)
}
```

- [ ] **Step 2: Add mutation hooks to `src/hooks/useEventos.ts`**

Replace the entire file content with:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTiposEvento, getEventos, getTareas, getTareasAsignadas,
  createTipoEvento, updateTipoEvento, deleteTipoEvento,
  createEvento, createTarea, updateTareaEstado,
} from '@/services/eventos.service'
import type { Tarea } from '@/types/app.types'

export function useTiposEvento() {
  return useQuery({ queryKey: ['tipos-evento'], queryFn: getTiposEvento, staleTime: 30 * 60 * 1000 })
}

export function useEventos(idIglesia?: number) {
  return useQuery({
    queryKey: ['eventos', idIglesia],
    queryFn: () => getEventos(idIglesia),
    staleTime: 60 * 1000,
  })
}

export function useTareas() {
  return useQuery({ queryKey: ['tareas'], queryFn: getTareas, staleTime: 60 * 1000 })
}

export function useTareasAsignadas(idUsuario: number) {
  return useQuery({
    queryKey: ['tareas-asignadas', idUsuario],
    queryFn: () => getTareasAsignadas(idUsuario),
    enabled: !!idUsuario,
    staleTime: 60 * 1000,
  })
}

export function useCreateTipoEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, descripcion }: { nombre: string; descripcion: string | null }) =>
      createTipoEvento(nombre, descripcion),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-evento'] }),
  })
}

export function useUpdateTipoEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre, descripcion }: { id: number; nombre: string; descripcion: string | null }) =>
      updateTipoEvento(id, nombre, descripcion),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-evento'] }),
  })
}

export function useDeleteTipoEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTipoEvento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-evento'] }),
  })
}

export function useCreateEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEvento,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventos'] }),
  })
}

export function useCreateTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTarea,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas'] }),
  })
}

export function useUpdateTareaEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: Tarea['estado'] }) =>
      updateTareaEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas'] }),
  })
}
```

- [ ] **Step 3: Wire `CatalogosPage.tsx`**

In `src/app/components/CatalogosPage.tsx`:

3a. Update imports:
```typescript
import { useRoles } from "@/hooks/useUsuarios";
import { useTiposEvento, useCreateTipoEvento, useUpdateTipoEvento, useDeleteTipoEvento } from "@/hooks/useEventos";
```

3b. Replace the three stub lines (~lines 28-31):
```typescript
  // Stub mutations — Phase 3
  const addTipoEvento = (_nombre: string, _descripcion: string) => { /* Phase 3 */ };
  const updateTipoEvento = (_id: number, _nombre: string, _descripcion: string) => { /* Phase 3 */ };
  const deleteTipoEvento = (_id: number) => { /* Phase 3 */ };
```
with:
```typescript
  const createTEMutation = useCreateTipoEvento()
  const updateTEMutation = useUpdateTipoEvento()
  const deleteTEMutation = useDeleteTipoEvento()
```

3c. Update `handleSubmitTE` — replace the `addTipoEvento`/`updateTipoEvento` calls:
```typescript
  const handleSubmitTE = () => {
    if (!formTE.nombre.trim()) return;
    if (editingTE) {
      updateTEMutation.mutate({ id: editingTE, nombre: formTE.nombre.trim(), descripcion: formTE.descripcion.trim() || null });
    } else {
      createTEMutation.mutate({ nombre: formTE.nombre.trim(), descripcion: formTE.descripcion.trim() || null });
    }
    setDialogTE(false);
  };
```

3d. Find the delete confirm handler (the `AlertDialogAction` onClick that calls `deleteTipoEvento`). Replace that call:
```typescript
onClick={() => { if (confirmDeleteTE) { deleteTEMutation.mutate(confirmDeleteTE.id); setConfirmDeleteTE(null); } }}
```

- [ ] **Step 4: Wire `EventsPage.tsx`**

In `src/app/components/EventsPage.tsx`:

4a. Update imports — add `useApp` and mutation hook:
```typescript
import { useEventos, useTiposEvento, useCreateEvento } from "@/hooks/useEventos";
import { useApp } from "../store/AppContext";
```

4b. Inside `EventsPage`, after the existing hooks, add:
```typescript
  const { usuarioActual } = useApp()
  const createEventoMutation = useCreateEvento()
  const [createForm, setCreateForm] = useState({
    nombre: "",
    descripcion: "",
    idTipoEvento: 0,
    fechaInicio: "",
    fechaFin: "",
  })
```

4c. Add a `handleCreateEvento` function before the `return`:
```typescript
  const handleCreateEvento = () => {
    if (!createForm.nombre.trim() || !createForm.idTipoEvento || !createForm.fechaInicio || !createForm.fechaFin) return;
    createEventoMutation.mutate({
      nombre: createForm.nombre.trim(),
      descripcion: createForm.descripcion.trim() || null,
      idTipoEvento: createForm.idTipoEvento,
      fechaInicio: createForm.fechaInicio,
      fechaFin: createForm.fechaFin,
      idIglesia: 1, // MVP: hardcoded to iglesia 1; Phase 4 will derive from session
      idSede: null,
      idMinisterio: null,
    });
    setShowCreate(false);
    setCreateForm({ nombre: "", descripcion: "", idTipoEvento: 0, fechaInicio: "", fechaFin: "" });
  };
```

4d. Find the create Dialog (controlled by `showCreate`). Replace its body with a real form and wire the submit button:

Find the Dialog content and replace/add inside it:
```typescript
<DialogContent className="sm:max-w-md">
  <DialogHeader>
    <DialogTitle>Nuevo Evento</DialogTitle>
  </DialogHeader>
  <div className="space-y-4 py-2">
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Nombre *</label>
      <Input value={createForm.nombre} onChange={(e) => setCreateForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del evento" className="bg-input-background" />
    </div>
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Tipo de Evento *</label>
      <select className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm" value={createForm.idTipoEvento} onChange={(e) => setCreateForm(p => ({ ...p, idTipoEvento: Number(e.target.value) }))}>
        <option value={0}>Seleccionar...</option>
        {tiposEvento.map(te => <option key={te.idTipoEvento} value={te.idTipoEvento}>{te.nombre}</option>)}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Inicio *</label>
        <Input type="datetime-local" value={createForm.fechaInicio} onChange={(e) => setCreateForm(p => ({ ...p, fechaInicio: e.target.value }))} className="bg-input-background" />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Fin *</label>
        <Input type="datetime-local" value={createForm.fechaFin} onChange={(e) => setCreateForm(p => ({ ...p, fechaFin: e.target.value }))} className="bg-input-background" />
      </div>
    </div>
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
      <Input value={createForm.descripcion} onChange={(e) => setCreateForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción opcional" className="bg-input-background" />
    </div>
  </div>
  <DialogFooter>
    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
    <Button onClick={handleCreateEvento} disabled={createEventoMutation.isPending}>
      {createEventoMutation.isPending ? "Creando..." : "Crear Evento"}
    </Button>
  </DialogFooter>
</DialogContent>
```

- [ ] **Step 5: Wire `TasksPage.tsx`**

In `src/app/components/TasksPage.tsx`:

5a. Update imports:
```typescript
import { useTareas, useCreateTarea, useUpdateTareaEstado } from "@/hooks/useEventos";
import { useApp } from "../store/AppContext";
```

5b. Inside `TasksPage`, after `useTareas()`, add:
```typescript
  const { usuarioActual } = useApp()
  const createTareaMutation = useCreateTarea()
  const updateEstadoMutation = useUpdateTareaEstado()
  const [createForm, setCreateForm] = useState({ titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" as const })
```

5c. Replace the one stub (~line 31):
```typescript
  // Stub mutations — Phase 3
  const updateTareaEstado = (_id: number, _estado: string) => { /* Phase 3 */ };
```
with nothing — it's now covered by `updateEstadoMutation`.

5d. Find `nextStatus` helper and the kanban card button that calls `updateTareaEstado`. Replace that call:
```typescript
onClick={() => { const next = nextStatus(task.estado); if (next) updateEstadoMutation.mutate({ id: task.idTarea, estado: next }); }}
```

5e. Add `handleCreateTarea` function before `return`:
```typescript
  const handleCreateTarea = () => {
    if (!createForm.titulo.trim() || !usuarioActual) return;
    createTareaMutation.mutate({
      titulo: createForm.titulo.trim(),
      descripcion: createForm.descripcion.trim() || null,
      fechaLimite: createForm.fechaLimite || null,
      prioridad: createForm.prioridad,
      idUsuarioCreador: usuarioActual.idUsuario,
    });
    setShowCreate(false);
    setCreateForm({ titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" });
  };
```

5f. Find the create Dialog (controlled by `showCreate`). Wire its form inputs and submit button. Replace the dialog body with:
```typescript
<DialogContent className="sm:max-w-md">
  <DialogHeader>
    <DialogTitle>Nueva Tarea</DialogTitle>
  </DialogHeader>
  <div className="space-y-4 py-2">
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
      <Input value={createForm.titulo} onChange={(e) => setCreateForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Título de la tarea" className="bg-input-background" />
    </div>
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
      <Input value={createForm.descripcion} onChange={(e) => setCreateForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción opcional" className="bg-input-background" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Fecha Límite</label>
        <Input type="date" value={createForm.fechaLimite} onChange={(e) => setCreateForm(p => ({ ...p, fechaLimite: e.target.value }))} className="bg-input-background" />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Prioridad</label>
        <select className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm" value={createForm.prioridad} onChange={(e) => setCreateForm(p => ({ ...p, prioridad: e.target.value as typeof createForm.prioridad }))}>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>
      </div>
    </div>
  </div>
  <DialogFooter>
    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
    <Button onClick={handleCreateTarea} disabled={createTareaMutation.isPending}>
      {createTareaMutation.isPending ? "Creando..." : "Crear Tarea"}
    </Button>
  </DialogFooter>
</DialogContent>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the 5 modified files.

- [ ] **Step 7: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/eventos.service.ts src/hooks/useEventos.ts \
  src/app/components/CatalogosPage.tsx src/app/components/EventsPage.tsx \
  src/app/components/TasksPage.tsx
git commit -m "feat: eventos/catalogos domain mutations (tipo_evento, evento, tarea)"
```

---

## Task 4: Usuarios + Cursos domain mutations

**Files:**
- Modify: `src/services/usuarios.service.ts`
- Modify: `src/hooks/useUsuarios.ts`
- Modify: `src/app/components/UsuariosPage.tsx`
- Modify: `src/services/cursos.service.ts`
- Modify: `src/hooks/useCursos.ts`
- Modify: `src/app/components/ClassroomPage.tsx`

- [ ] **Step 1: Add mutation to `src/services/usuarios.service.ts`**

Read the file first. Append after the last function:

```typescript
// ── Usuario mutations ──

export async function toggleUsuarioActivo(id: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('usuario').select('activo').eq('id_usuario', id).single()
  if (fetchError) throw fetchError
  const { error } = await supabase
    .from('usuario').update({ activo: !current.activo }).eq('id_usuario', id)
  if (error) throw error
}
```

- [ ] **Step 2: Add mutation hook to `src/hooks/useUsuarios.ts`**

Read the file. Add at the top: import `useMutation, useQueryClient` from `@tanstack/react-query` and `toggleUsuarioActivo` from the service. Then append:

```typescript
export function useToggleUsuarioActivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleUsuarioActivo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}
```

- [ ] **Step 3: Wire `UsuariosPage.tsx`**

3a. Update imports — add the mutation hook:
```typescript
import { useUsuarios, useRoles, useUsuarioRoles, useToggleUsuarioActivo } from "@/hooks/useUsuarios";
```

3b. Replace the stub (~lines 20-21):
```typescript
  // Stub mutations — Phase 3
  const toggleUsuarioActivo = (_id: number) => { /* Phase 3 */ };
```
with:
```typescript
  const toggleActivoMutation = useToggleUsuarioActivo()
```

3c. Find the `onClick` that calls `toggleUsuarioActivo(u.idUsuario)` in JSX (~line 142) and replace:
```typescript
onClick={() => toggleActivoMutation.mutate(u.idUsuario)}
```

- [ ] **Step 4: Add mutations to `src/services/cursos.service.ts`**

Append after `getDetallesProcesoCurso`:

```typescript
// ── Curso mutations ──

export async function createCurso(
  data: { nombre: string; descripcion: string | null; duracionHoras: number | null; idUsuarioCreador: number }
): Promise<Curso> {
  const { data: result, error } = await supabase
    .from('curso')
    .insert([{ nombre: data.nombre, descripcion: data.descripcion, duracion_horas: data.duracionHoras, estado: 'activo', id_usuario_creador: data.idUsuarioCreador }])
    .select()
    .single()
  if (error) throw error
  return mapCurso(result)
}

export async function createModulo(
  data: { titulo: string; descripcion: string | null; orden: number; idCurso: number }
): Promise<Modulo> {
  const { data: result, error } = await supabase
    .from('modulo')
    .insert([{ titulo: data.titulo, descripcion: data.descripcion, orden: data.orden, estado: 'activo', id_curso: data.idCurso }])
    .select()
    .single()
  if (error) throw error
  return mapModulo(result)
}
```

- [ ] **Step 5: Add mutation hooks to `src/hooks/useCursos.ts`**

Read the file. Add `useMutation, useQueryClient` to the tanstack import. Add `createCurso, createModulo` to the service import. Append:

```typescript
export function useCreateCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCurso,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cursos'] }),
  })
}

export function useCreateModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createModulo,
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['modulos', variables.idCurso] }),
  })
}
```

- [ ] **Step 6: Wire `ClassroomPage.tsx`**

6a. Update imports:
```typescript
import { useCursos, useModulos, useCreateCurso, useCreateModulo } from "@/hooks/useCursos";
import { useApp } from "../store/AppContext";
```

6b. Inside `ClassroomPage`, add after existing hooks:
```typescript
  const { usuarioActual } = useApp()
  const createCursoMutation = useCreateCurso()
  const createModuloMutation = useCreateModulo()
  const [cursoForm, setCursoForm] = useState({ nombre: "", descripcion: "", duracionHoras: "" })
  const [moduloForm, setModuloForm] = useState({ titulo: "", descripcion: "", idCurso: 0 })
```

6c. Add handler functions before `return`:
```typescript
  const handleCreateCurso = () => {
    if (!cursoForm.nombre.trim() || !usuarioActual) return;
    createCursoMutation.mutate({
      nombre: cursoForm.nombre.trim(),
      descripcion: cursoForm.descripcion.trim() || null,
      duracionHoras: cursoForm.duracionHoras ? Number(cursoForm.duracionHoras) : null,
      idUsuarioCreador: usuarioActual.idUsuario,
    });
    setCursoForm({ nombre: "", descripcion: "", duracionHoras: "" });
  };

  const handleCreateModulo = (idCurso: number) => {
    if (!moduloForm.titulo.trim()) return;
    createModuloMutation.mutate({
      titulo: moduloForm.titulo.trim(),
      descripcion: moduloForm.descripcion.trim() || null,
      orden: 1,
      idCurso,
    });
    setModuloForm({ titulo: "", descripcion: "", idCurso: 0 });
  };
```

6d. Find the create curso Dialog. Wire its form inputs and submit button:
```typescript
<DialogContent className="sm:max-w-md">
  <DialogHeader><DialogTitle>Nuevo Curso</DialogTitle></DialogHeader>
  <div className="space-y-4 py-2">
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Nombre *</label>
      <Input value={cursoForm.nombre} onChange={(e) => setCursoForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del curso" className="bg-input-background" />
    </div>
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
      <Input value={cursoForm.descripcion} onChange={(e) => setCursoForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción opcional" className="bg-input-background" />
    </div>
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Duración (horas)</label>
      <Input type="number" value={cursoForm.duracionHoras} onChange={(e) => setCursoForm(p => ({ ...p, duracionHoras: e.target.value }))} placeholder="Ej: 40" className="bg-input-background" />
    </div>
  </div>
  <DialogFooter>
    <Button variant="outline" onClick={() => { /* close dialog */ }}>Cancelar</Button>
    <Button onClick={handleCreateCurso} disabled={createCursoMutation.isPending}>
      {createCursoMutation.isPending ? "Creando..." : "Crear Curso"}
    </Button>
  </DialogFooter>
</DialogContent>
```

6e. Find the create módulo Dialog. Wire its form and submit:
```typescript
<DialogContent className="sm:max-w-md">
  <DialogHeader><DialogTitle>Nuevo Módulo</DialogTitle></DialogHeader>
  <div className="space-y-4 py-2">
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
      <Input value={moduloForm.titulo} onChange={(e) => setModuloForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Título del módulo" className="bg-input-background" />
    </div>
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
      <Input value={moduloForm.descripcion} onChange={(e) => setModuloForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción opcional" className="bg-input-background" />
    </div>
  </div>
  <DialogFooter>
    <Button variant="outline" onClick={() => { /* close dialog */ }}>Cancelar</Button>
    <Button onClick={() => handleCreateModulo(moduloForm.idCurso || /* selected course id */0)} disabled={createModuloMutation.isPending}>
      {createModuloMutation.isPending ? "Creando..." : "Crear Módulo"}
    </Button>
  </DialogFooter>
</DialogContent>
```

Note: You will need to read ClassroomPage carefully to determine what state holds the selected curso id and use it when calling `handleCreateModulo`.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the 6 modified files.

- [ ] **Step 8: Verify full build**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -10
```

Expected: build succeeds, no errors.

- [ ] **Step 9: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/usuarios.service.ts src/hooks/useUsuarios.ts \
  src/app/components/UsuariosPage.tsx \
  src/services/cursos.service.ts src/hooks/useCursos.ts \
  src/app/components/ClassroomPage.tsx
git commit -m "feat: usuarios + cursos domain mutations (toggle activo, create curso/modulo)"
```
