# Phase 3 — Remaining Stubs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 13 remaining `/* Phase 3 */` stubs across GeographyPage, NotificationsPage, DepartmentsPage, EvaluationsPage, and CiclosLectivosPage into real Supabase mutations.

**Architecture:** Same pattern established in Phase 3: append mutation functions to existing service files, add `useMutation` hooks to existing hook files, replace stub functions in pages with real mutation calls. Dialog close in `onSuccess`, hooks before early returns, sparse-patch for updates.

**Tech Stack:** @supabase/supabase-js v2, @tanstack/react-query v5 (`useMutation` + `useQueryClient`), React 18 + Vite + TypeScript, project `/home/juanda/Proyectofinal`

---

## File Map

| Action | Path | What changes |
|--------|------|--------------|
| Modify | `src/services/geografia.service.ts` | +9 mutation functions |
| Modify | `src/hooks/useGeografia.ts` | +9 mutation hooks |
| Modify | `src/app/components/GeographyPage.tsx` | replace 9 stubs |
| Modify | `src/services/notificaciones.service.ts` | +2 mutation functions |
| Modify | `src/hooks/useNotificaciones.ts` | +2 mutation hooks |
| Modify | `src/app/components/NotificationsPage.tsx` | replace 2 stubs |
| Modify | `src/app/components/DepartmentsPage.tsx` | wire create ministerio dialog |
| Modify | `src/services/cursos.service.ts` | +2 mutation functions |
| Modify | `src/hooks/useCursos.ts` | +2 mutation hooks |
| Modify | `src/app/components/EvaluationsPage.tsx` | replace 1 stub |
| Modify | `src/app/components/CiclosLectivosPage.tsx` | replace 1 stub |

---

## Task 1: Geografía domain mutations

**Files:**
- Modify: `src/services/geografia.service.ts`
- Modify: `src/hooks/useGeografia.ts`
- Modify: `src/app/components/GeographyPage.tsx`

### Context

The service already has mappers `mapPais`, `mapDepto`, `mapCiudad` and read functions `getPaises`, `getDepartamentos`, `getCiudades`. The page uses a unified `handleSubmit` + `confirmDelete` pattern: one dialog for add/edit, one AlertDialog for delete — driven by a `dialog` state object `{ type: "pais"|"dep"|"ciudad", mode: "add"|"edit", id?, parentId? }`. The DB table for departamentos is `departamento` (not `departamento_geo`), column `id_departamento`.

- [ ] **Step 1: Append mutation functions to `src/services/geografia.service.ts`**

Read the file first. Append after `getCiudades`:

```typescript
// ── Pais mutations ──

export async function createPais(nombre: string): Promise<Pais> {
  const { data: result, error } = await supabase
    .from('pais').insert([{ nombre }]).select().single()
  if (error) throw error
  return mapPais(result)
}

export async function updatePais(id: number, nombre: string): Promise<Pais> {
  const { data: result, error } = await supabase
    .from('pais').update({ nombre }).eq('id_pais', id).select().single()
  if (error) throw error
  return mapPais(result)
}

export async function deletePais(id: number): Promise<void> {
  const { error } = await supabase.from('pais').delete().eq('id_pais', id)
  if (error) throw error
}

// ── Departamento mutations ──

export async function createDepartamento(nombre: string, idPais: number): Promise<DepartamentoGeo> {
  const { data: result, error } = await supabase
    .from('departamento').insert([{ nombre, id_pais: idPais }]).select().single()
  if (error) throw error
  return mapDepto(result)
}

export async function updateDepartamento(id: number, nombre: string): Promise<DepartamentoGeo> {
  const { data: result, error } = await supabase
    .from('departamento').update({ nombre }).eq('id_departamento', id).select().single()
  if (error) throw error
  return mapDepto(result)
}

export async function deleteDepartamento(id: number): Promise<void> {
  const { error } = await supabase.from('departamento').delete().eq('id_departamento', id)
  if (error) throw error
}

// ── Ciudad mutations ──

export async function createCiudad(nombre: string, idDepartamento: number): Promise<Ciudad> {
  const { data: result, error } = await supabase
    .from('ciudad').insert([{ nombre, id_departamento: idDepartamento }]).select().single()
  if (error) throw error
  return mapCiudad(result)
}

export async function updateCiudad(id: number, nombre: string): Promise<Ciudad> {
  const { data: result, error } = await supabase
    .from('ciudad').update({ nombre }).eq('id_ciudad', id).select().single()
  if (error) throw error
  return mapCiudad(result)
}

export async function deleteCiudad(id: number): Promise<void> {
  const { error } = await supabase.from('ciudad').delete().eq('id_ciudad', id)
  if (error) throw error
}
```

- [ ] **Step 2: Replace `src/hooks/useGeografia.ts` entirely**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPaises, getDepartamentos, getCiudades,
  createPais, updatePais, deletePais,
  createDepartamento, updateDepartamento, deleteDepartamento,
  createCiudad, updateCiudad, deleteCiudad,
} from '@/services/geografia.service'

export function usePaises() {
  return useQuery({ queryKey: ['paises'], queryFn: getPaises, staleTime: 30 * 60 * 1000 })
}

export function useDepartamentos(idPais?: number) {
  return useQuery({
    queryKey: ['departamentos', idPais],
    queryFn: () => getDepartamentos(idPais),
    staleTime: 30 * 60 * 1000,
  })
}

export function useCiudades(idDepartamento?: number) {
  return useQuery({
    queryKey: ['ciudades', idDepartamento],
    queryFn: () => getCiudades(idDepartamento),
    staleTime: 30 * 60 * 1000,
  })
}

export function useCreatePais() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => createPais(nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paises'] }),
  })
}

export function useUpdatePais() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => updatePais(id, nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paises'] }),
  })
}

export function useDeletePais() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePais(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paises'] }),
  })
}

export function useCreateDepartamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, idPais }: { nombre: string; idPais: number }) =>
      createDepartamento(nombre, idPais),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departamentos'] }),
  })
}

export function useUpdateDepartamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => updateDepartamento(id, nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departamentos'] }),
  })
}

export function useDeleteDepartamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDepartamento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departamentos'] }),
  })
}

export function useCreateCiudad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, idDepartamento }: { nombre: string; idDepartamento: number }) =>
      createCiudad(nombre, idDepartamento),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciudades'] }),
  })
}

export function useUpdateCiudad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => updateCiudad(id, nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciudades'] }),
  })
}

export function useDeleteCiudad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCiudad(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciudades'] }),
  })
}
```

- [ ] **Step 3: Wire `src/app/components/GeographyPage.tsx`**

Read the file fully first.

3a. Update imports — add mutation hooks:
```typescript
import {
  usePaises, useDepartamentos, useCiudades,
  useCreatePais, useUpdatePais, useDeletePais,
  useCreateDepartamento, useUpdateDepartamento, useDeleteDepartamento,
  useCreateCiudad, useUpdateCiudad, useDeleteCiudad,
} from "@/hooks/useGeografia";
```

3b. Replace the 9 stub lines (they are between the `isLoading` state declarations and the `if (isLoading)` guard). Place mutation hooks BEFORE the `if (isLoading) return` guard:

```typescript
  const createPaisMutation = useCreatePais();
  const updatePaisMutation = useUpdatePais();
  const deletePaisMutation = useDeletePais();
  const createDeptoMutation = useCreateDepartamento();
  const updateDeptoMutation = useUpdateDepartamento();
  const deleteDeptoMutation = useDeleteDepartamento();
  const createCiudadMutation = useCreateCiudad();
  const updateCiudadMutation = useUpdateCiudad();
  const deleteCiudadMutation = useDeleteCiudad();
```

3c. Find `handleSubmit`. It currently calls the stub functions. Replace the body:

```typescript
  const handleSubmit = () => {
    if (!formNombre.trim() || !dialog) return;
    const { type, mode, id, parentId } = dialog;
    if (type === "pais") {
      if (mode === "add") createPaisMutation.mutate(formNombre.trim(), { onSuccess: () => setDialog(null) });
      else updatePaisMutation.mutate({ id: id!, nombre: formNombre.trim() }, { onSuccess: () => setDialog(null) });
    }
    if (type === "dep") {
      if (mode === "add") createDeptoMutation.mutate({ nombre: formNombre.trim(), idPais: parentId! }, { onSuccess: () => setDialog(null) });
      else updateDeptoMutation.mutate({ id: id!, nombre: formNombre.trim() }, { onSuccess: () => setDialog(null) });
    }
    if (type === "ciudad") {
      if (mode === "add") createCiudadMutation.mutate({ nombre: formNombre.trim(), idDepartamento: parentId! }, { onSuccess: () => setDialog(null) });
      else updateCiudadMutation.mutate({ id: id!, nombre: formNombre.trim() }, { onSuccess: () => setDialog(null) });
    }
  };
```

3d. Find the `AlertDialogAction` onClick that calls `confirmDelete`. Read the file to find the exact confirm-delete handler. It should be calling `deletePais`, `deleteDepartamentoGeo`, or `deleteCiudad` via a `confirmDelete` state. Replace those calls with the real mutations:

```typescript
  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    const opts = { onSuccess: () => setConfirmDelete(null) };
    if (type === "pais") deletePaisMutation.mutate(id, opts);
    if (type === "dep") deleteDeptoMutation.mutate(id, opts);
    if (type === "ciudad") deleteCiudadMutation.mutate(id, opts);
  };
```

Then find where `handleConfirmDelete` is called in JSX (the `AlertDialogAction` onClick) and make sure it calls this function.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | grep -E "error TS|GeographyPage|geografia" | head -20
```

Expected: no errors in the 3 modified files.

- [ ] **Step 5: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/geografia.service.ts src/hooks/useGeografia.ts \
  src/app/components/GeographyPage.tsx
git commit -m "feat: geografia domain mutations (pais, departamento, ciudad)"
```

---

## Task 2: Notificaciones mutations + DepartmentsPage create ministerio

**Files:**
- Modify: `src/services/notificaciones.service.ts`
- Modify: `src/hooks/useNotificaciones.ts`
- Modify: `src/app/components/NotificationsPage.tsx`
- Modify: `src/app/components/DepartmentsPage.tsx`

### Context

**NotificationsPage** has two stubs: `markNotificationRead(id)` sets `leida=true` on one row, and `markAllNotificationsRead()` sets `leida=true` on all rows for the current user. The page gets `idUsuario` from `useApp().usuarioActual?.idUsuario`.

**DepartmentsPage** has a "Nuevo Ministerio" dialog with 3 uncontrolled inputs (nombre, descripcion, líder). `useCreateMinisterio` already exists in `src/hooks/useMinisterios.ts` (added in Phase 3 Task 2). The `ministerio` table requires `id_sede` — use `idSede: 1` as MVP default (same pattern as `idIglesia: 1` in EventsPage).

- [ ] **Step 1: Append mutation functions to `src/services/notificaciones.service.ts`**

Read the file first. Append after `getNotificaciones`:

```typescript
export async function markNotificacionRead(id: number): Promise<void> {
  const { error } = await supabase
    .from('notificacion')
    .update({ leida: true, fecha_lectura: new Date().toISOString() })
    .eq('id_notificacion', id)
  if (error) throw error
}

export async function markAllNotificacionesRead(idUsuario: number): Promise<void> {
  const { error } = await supabase
    .from('notificacion')
    .update({ leida: true, fecha_lectura: new Date().toISOString() })
    .eq('id_usuario', idUsuario)
    .eq('leida', false)
  if (error) throw error
}
```

- [ ] **Step 2: Replace `src/hooks/useNotificaciones.ts` entirely**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotificaciones, markNotificacionRead, markAllNotificacionesRead,
} from '@/services/notificaciones.service'

export function useNotificaciones(idUsuario: number) {
  return useQuery({
    queryKey: ['notificaciones', idUsuario],
    queryFn: () => getNotificaciones(idUsuario),
    enabled: !!idUsuario,
    staleTime: 30 * 1000,
  })
}

export function useMarkNotificacionRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => markNotificacionRead(id),
    onSuccess: (_data, _id, context) =>
      qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })
}

export function useMarkAllNotificacionesRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idUsuario: number) => markAllNotificacionesRead(idUsuario),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })
}
```

- [ ] **Step 3: Wire `src/app/components/NotificationsPage.tsx`**

Read the file fully first.

3a. Update imports:
```typescript
import {
  useNotificaciones, useMarkNotificacionRead, useMarkAllNotificacionesRead,
} from "@/hooks/useNotificaciones";
```

3b. Add mutation hooks BEFORE the `if (isLoading)` guard (they must come after `useApp` and `useNotificaciones` but before the early return):

```typescript
  const markReadMutation = useMarkNotificacionRead();
  const markAllReadMutation = useMarkAllNotificacionesRead();
```

3c. Replace the 2 stub lines:
```typescript
  // Stub mutations — Phase 3
  const markNotificationRead = (_id: number) => { /* Phase 3 */ };
  const markAllNotificationsRead = () => { /* Phase 3 */ };
```
Delete them entirely (the stubs are now replaced by the mutation hooks above).

3d. Find the `onClick` that calls `markAllNotificationsRead()` (on the "Marcar todas" button). Replace:
```typescript
onClick={() => usuarioActual && markAllReadMutation.mutate(usuarioActual.idUsuario)}
```

3e. Find the `onClick` that calls `markNotificationRead(n.idNotificacion)` (on each notification card). Replace:
```typescript
onClick={() => !n.leida && markReadMutation.mutate(n.idNotificacion)}
```

- [ ] **Step 4: Wire create ministerio dialog in `src/app/components/DepartmentsPage.tsx`**

Read the file fully first.

4a. Update imports — add `useCreateMinisterio` (already exists in the hook file from Phase 3):
```typescript
import {
  useMinisterios, useToggleMinisterioEstado, useCreateMinisterio,
} from "@/hooks/useMinisterios";
```

4b. Add form state and mutation hook. Place BEFORE the `if (isLoading)` guard at line ~83:
```typescript
  const createMinisterioMutation = useCreateMinisterio();
  const [createForm, setCreateForm] = useState({ nombre: "", descripcion: "" });
```

4c. Add `handleCreateMinisterio` function before the `return`:
```typescript
  const handleCreateMinisterio = () => {
    if (!createForm.nombre.trim()) return;
    createMinisterioMutation.mutate(
      {
        nombre: createForm.nombre.trim(),
        descripcion: createForm.descripcion.trim() || null,
        idSede: 1, // MVP: single-sede demo; Phase 4 will derive from session
        estado: 'activo',
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setCreateForm({ nombre: "", descripcion: "" });
        },
      }
    );
  };
```

4d. Replace the dialog body. The current dialog has uncontrolled inputs and a no-op submit button. Replace the `<DialogContent>` with:

```tsx
<DialogContent className="sm:max-w-md">
  <DialogHeader><DialogTitle>Nuevo Ministerio</DialogTitle></DialogHeader>
  <div className="space-y-3">
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Nombre *</label>
      <Input
        value={createForm.nombre}
        onChange={(e) => setCreateForm(p => ({ ...p, nombre: e.target.value }))}
        placeholder="Nombre del ministerio"
        className="mt-1 bg-input-background"
      />
    </div>
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
      <Input
        value={createForm.descripcion}
        onChange={(e) => setCreateForm(p => ({ ...p, descripcion: e.target.value }))}
        placeholder="Descripción breve"
        className="mt-1 bg-input-background"
      />
    </div>
  </div>
  <DialogFooter>
    <Button variant="outline" onClick={() => { setShowCreate(false); setCreateForm({ nombre: "", descripcion: "" }); }}>
      Cancelar
    </Button>
    <Button onClick={handleCreateMinisterio} disabled={createMinisterioMutation.isPending}>
      {createMinisterioMutation.isPending ? "Creando..." : "Crear"}
    </Button>
  </DialogFooter>
</DialogContent>
```

(Remove the "Líder Asignado" uncontrolled input — leaders are assigned via MembersPage, not here.)

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | grep -E "error TS|NotificationsPage|DepartmentsPage|notificaciones" | head -20
```

Expected: no errors in the 4 modified files.

- [ ] **Step 6: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/notificaciones.service.ts src/hooks/useNotificaciones.ts \
  src/app/components/NotificationsPage.tsx src/app/components/DepartmentsPage.tsx
git commit -m "feat: notificaciones mutations + wire DepartmentsPage create ministerio"
```

---

## Task 3: Evaluaciones + CiclosLectivos delete mutations

**Files:**
- Modify: `src/services/cursos.service.ts`
- Modify: `src/hooks/useCursos.ts`
- Modify: `src/app/components/EvaluationsPage.tsx`
- Modify: `src/app/components/CiclosLectivosPage.tsx`

### Context

Both pages use an `AlertDialog` confirm-before-delete pattern. **EvaluationsPage** stores the target id in `deleteTarget: number | null` state; `handleDelete` calls `deleteEvaluacion(deleteTarget)` then closes. **CiclosLectivosPage** stores it in `showConfirmDelete: number | null`; `handleDelete` calls `deleteProcesoAsignadoCurso(showConfirmDelete)` then closes.

Both service functions already have the table name available: `evaluacion` (column `id_evaluacion`) and `proceso_asignado_curso` (column `id_proceso_asignado_curso`).

- [ ] **Step 1: Append mutation functions to `src/services/cursos.service.ts`**

Read the file first. Append after `createModulo`:

```typescript
export async function deleteEvaluacion(id: number): Promise<void> {
  const { error } = await supabase
    .from('evaluacion').delete().eq('id_evaluacion', id)
  if (error) throw error
}

export async function deleteProcesoAsignadoCurso(id: number): Promise<void> {
  const { error } = await supabase
    .from('proceso_asignado_curso').delete().eq('id_proceso_asignado_curso', id)
  if (error) throw error
}
```

- [ ] **Step 2: Add mutation hooks to `src/hooks/useCursos.ts`**

Read the file first. Add `deleteEvaluacion`, `deleteProcesoAsignadoCurso` to the service import. Append at the end:

```typescript
export function useDeleteEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEvaluacion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluaciones'] }),
  })
}

export function useDeleteProcesoAsignadoCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProcesoAsignadoCurso(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procesos-asignado-curso'] }),
  })
}
```

Note: verify the exact query key used by the read hook in `useCursos.ts` for `getProcesosAsignadoCurso` and use the same string. Read the file to confirm.

- [ ] **Step 3: Wire `src/app/components/EvaluationsPage.tsx`**

Read the file fully first.

3a. Update imports — add the delete hook:
```typescript
import { useEvaluaciones, useDeleteEvaluacion } from "@/hooks/useCursos";
```
(Keep existing imports, add `useDeleteEvaluacion`.)

3b. Add mutation hook BEFORE the `if (isLoading)` guard:
```typescript
  const deleteEvaluacionMutation = useDeleteEvaluacion();
```

3c. Replace the stub:
```typescript
  // Stub mutations — Phase 3
  const deleteEvaluacion = (_id: number) => { /* Phase 3 */ };
```
Delete those lines entirely.

3d. Find `handleDelete`. It currently calls `deleteEvaluacion(deleteTarget)` then does something to clear state. Replace with:
```typescript
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteEvaluacionMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  };
```

3e. Find the `AlertDialogAction` that calls `handleDelete`. Add `disabled` to prevent double-click:
```typescript
<AlertDialogAction
  onClick={handleDelete}
  disabled={deleteEvaluacionMutation.isPending}
  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
>
  Eliminar
</AlertDialogAction>
```

- [ ] **Step 4: Wire `src/app/components/CiclosLectivosPage.tsx`**

Read the file fully first.

4a. Update imports — add the delete hook:
```typescript
import { useProcesosAsignadoCurso, useDeleteProcesoAsignadoCurso } from "@/hooks/useCursos";
```
(Keep existing imports, add `useDeleteProcesoAsignadoCurso`.)

4b. Add mutation hook BEFORE the `if (isLoading)` guard (or before whichever early return comes first in the component):
```typescript
  const deleteProcesaMutation = useDeleteProcesoAsignadoCurso();
```

4c. Replace the stub:
```typescript
  // Stub mutations — Phase 3
  const deleteProcesoAsignadoCurso = (_id: number) => { /* Phase 3 */ };
```
Delete those lines entirely.

4d. Find `handleDelete`. It currently calls `deleteProcesoAsignadoCurso(showConfirmDelete)` then clears state. Replace with:
```typescript
  const handleDelete = () => {
    if (!showConfirmDelete) return;
    deleteProcesaMutation.mutate(showConfirmDelete, {
      onSuccess: () => setShowConfirmDelete(null),
    });
  };
```

4e. Find the `AlertDialogAction` that calls `handleDelete`. Add `disabled`:
```typescript
<AlertDialogAction
  onClick={handleDelete}
  disabled={deleteProcesaMutation.isPending}
  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
>
  Eliminar
</AlertDialogAction>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | grep -E "error TS|EvaluationsPage|CiclosLectivosPage|cursos" | head -20
```

Expected: no errors in the 4 modified files.

- [ ] **Step 6: Verify full build**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -8
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/cursos.service.ts src/hooks/useCursos.ts \
  src/app/components/EvaluationsPage.tsx src/app/components/CiclosLectivosPage.tsx
git commit -m "feat: evaluaciones + ciclos lectivos delete mutations"
```
