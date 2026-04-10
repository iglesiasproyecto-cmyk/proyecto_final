# Phase 3: Eventos y Tareas — CRUD Completo + Asignación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete CRUD for eventos and tareas, add enriched queries (tipoEventoNombre, sedeNombre, asignados), and implement task assignment to users (tarea_asignada).

**Architecture:** Extend `eventos.service.ts` with enriched getters, `updateEvento`, `deleteEvento`, `updateTarea`, `deleteTarea`, `createTareaAsignada`, `updateTareaAsignada`, `deleteT araAsignada`. Expose via `useEventos.ts`. Wire into EventsPage and TasksPage.

**Tech Stack:** React 18, Supabase JS v2, TanStack Query v5, shadcn/ui

**Prerequisite:** Phase 0 complete (`iglesiaActual` in context).

---

## File Structure

| File | Change |
|------|--------|
| `src/services/eventos.service.ts` | Modify — enriched getters + missing mutations |
| `src/hooks/useEventos.ts` | Modify — new hooks |
| `src/app/components/EventsPage.tsx` | Modify — update/delete evento, enriched display |
| `src/app/components/TasksPage.tsx` | Modify — full CRUD + assign to user |

---

### Task 1: Add enriched interfaces and queries to eventos.service.ts

**Files:**
- Modify: `src/services/eventos.service.ts`

- [ ] **Step 1: Add enriched interfaces after existing mappers**

```typescript
// Add after mapTareaAsignada function:

export interface EventoEnriquecido extends Evento {
  tipoEventoNombre: string
  sedeNombre: string | null
  ministerioNombre: string | null
}

export interface TareaEnriquecida extends Tarea {
  asignados: { idTareaAsignada: number; idUsuario: number; nombreCompleto: string }[]
}
```

- [ ] **Step 2: Add `getEventosEnriquecidos`**

```typescript
export async function getEventosEnriquecidos(idIglesia?: number): Promise<EventoEnriquecido[]> {
  let q = supabase
    .from('evento')
    .select('*, tipo_evento(nombre), sede(nombre), ministerio(nombre)')
    .order('fecha_inicio', { ascending: false })
  if (idIglesia !== undefined) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapEvento(r),
    tipoEventoNombre: r.tipo_evento?.nombre ?? '',
    sedeNombre: r.sede?.nombre ?? null,
    ministerioNombre: r.ministerio?.nombre ?? null,
  }))
}
```

- [ ] **Step 3: Add `getTareasEnriquecidas`**

```typescript
export async function getTareasEnriquecidas(idEvento?: number): Promise<TareaEnriquecida[]> {
  let q = supabase
    .from('tarea')
    .select('*, tarea_asignada(id_tarea_asignada, id_usuario, usuario(nombres, apellidos))')
    .order('fecha_limite', { ascending: true })
  if (idEvento !== undefined) q = q.eq('id_evento', idEvento)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapTarea(r),
    asignados: ((r.tarea_asignada as any[]) || []).map((ta: any) => ({
      idTareaAsignada: ta.id_tarea_asignada,
      idUsuario: ta.id_usuario,
      nombreCompleto: ta.usuario
        ? `${ta.usuario.nombres} ${ta.usuario.apellidos}`
        : '',
    })),
  }))
}
```

- [ ] **Step 4: Add `updateEvento` and `deleteEvento`**

```typescript
export async function updateEvento(
  id: number,
  data: {
    nombre?: string
    descripcion?: string | null
    idTipoEvento?: number
    fechaInicio?: string
    fechaFin?: string
    estado?: Evento['estado']
    idSede?: number | null
    idMinisterio?: number | null
  }
): Promise<Evento> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.idTipoEvento !== undefined) patch.id_tipo_evento = data.idTipoEvento
  if (data.fechaInicio !== undefined) patch.fecha_inicio = data.fechaInicio
  if (data.fechaFin !== undefined) patch.fecha_fin = data.fechaFin
  if (data.estado !== undefined) patch.estado = data.estado
  if (data.idSede !== undefined) patch.id_sede = data.idSede
  if (data.idMinisterio !== undefined) patch.id_ministerio = data.idMinisterio
  const { data: result, error } = await supabase
    .from('evento').update(patch).eq('id_evento', id).select().single()
  if (error) throw error
  return mapEvento(result)
}

export async function deleteEvento(id: number): Promise<void> {
  const { error } = await supabase.from('evento').delete().eq('id_evento', id)
  if (error) throw error
}
```

- [ ] **Step 5: Add `updateTarea`, `deleteTarea`, `createTareaAsignada`, `updateTareaAsignada`, `deleteTareaAsignada`**

```typescript
export async function updateTarea(
  id: number,
  data: {
    titulo?: string
    descripcion?: string | null
    fechaLimite?: string | null
    estado?: Tarea['estado']
    prioridad?: Tarea['prioridad']
    idEvento?: number | null
  }
): Promise<Tarea> {
  const patch: Record<string, unknown> = {}
  if (data.titulo !== undefined) patch.titulo = data.titulo
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.fechaLimite !== undefined) patch.fecha_limite = data.fechaLimite
  if (data.estado !== undefined) patch.estado = data.estado
  if (data.prioridad !== undefined) patch.prioridad = data.prioridad
  if (data.idEvento !== undefined) patch.id_evento = data.idEvento
  const { data: result, error } = await supabase
    .from('tarea').update(patch).eq('id_tarea', id).select().single()
  if (error) throw error
  return mapTarea(result)
}

export async function deleteTarea(id: number): Promise<void> {
  const { error } = await supabase.from('tarea').delete().eq('id_tarea', id)
  if (error) throw error
}

export async function createTareaAsignada(
  data: { idTarea: number; idUsuario: number; observaciones?: string | null }
): Promise<TareaAsignada> {
  const { data: result, error } = await supabase
    .from('tarea_asignada')
    .insert([{
      id_tarea: data.idTarea,
      id_usuario: data.idUsuario,
      fecha_asignacion: new Date().toISOString(),
      observaciones: data.observaciones ?? null,
    }])
    .select()
    .single()
  if (error) throw error
  return mapTareaAsignada(result)
}

export async function updateTareaAsignada(
  id: number,
  data: { fechaCompletado?: string | null; observaciones?: string | null }
): Promise<TareaAsignada> {
  const patch: Record<string, unknown> = {}
  if (data.fechaCompletado !== undefined) patch.fecha_completado = data.fechaCompletado
  if (data.observaciones !== undefined) patch.observaciones = data.observaciones
  const { data: result, error } = await supabase
    .from('tarea_asignada').update(patch).eq('id_tarea_asignada', id).select().single()
  if (error) throw error
  return mapTareaAsignada(result)
}

export async function deleteTareaAsignada(id: number): Promise<void> {
  const { error } = await supabase.from('tarea_asignada').delete().eq('id_tarea_asignada', id)
  if (error) throw error
}
```

- [ ] **Step 6: Build**

```bash
npm run build 2>&1 | head -30
```

---

### Task 2: Add hooks in useEventos.ts

**Files:**
- Modify: `src/hooks/useEventos.ts`

- [ ] **Step 1: Read the file**

Read `src/hooks/useEventos.ts` to check existing imports and hooks.

- [ ] **Step 2: Update imports to include all new functions**

```typescript
import {
  getTiposEvento, getEventos, getTareas, getTareasAsignadas,
  getEventosEnriquecidos, getTareasEnriquecidas,
  createTipoEvento, updateTipoEvento, deleteTipoEvento,
  createEvento, updateEvento, deleteEvento,
  createTarea, updateTarea, deleteTarea, updateTareaEstado,
  createTareaAsignada, updateTareaAsignada, deleteTareaAsignada,
} from '@/services/eventos.service'
```

- [ ] **Step 3: Add enriched query hooks**

```typescript
export function useEventosEnriquecidos(idIglesia?: number) {
  return useQuery({
    queryKey: ['eventos-enriquecidos', idIglesia],
    queryFn: () => getEventosEnriquecidos(idIglesia),
    enabled: idIglesia !== undefined,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTareasEnriquecidas(idEvento?: number) {
  return useQuery({
    queryKey: ['tareas-enriquecidas', idEvento],
    queryFn: () => getTareasEnriquecidas(idEvento),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 4: Add mutation hooks**

```typescript
export function useUpdateEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateEvento>[1] }) =>
      updateEvento(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.invalidateQueries({ queryKey: ['eventos-enriquecidos'] })
    },
  })
}

export function useDeleteEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEvento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.invalidateQueries({ queryKey: ['eventos-enriquecidos'] })
    },
  })
}

export function useUpdateTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTarea>[1] }) =>
      updateTarea(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}

export function useDeleteTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTarea(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}

export function useCreateTareaAsignada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTareaAsignada,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] }),
  })
}

export function useUpdateTareaAsignada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTareaAsignada>[1] }) =>
      updateTareaAsignada(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] }),
  })
}

export function useDeleteTareaAsignada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTareaAsignada(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] }),
  })
}
```

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | head -20
```

---

### Task 3: Apply RLS mutations migration

- [ ] **Step 1: Apply via Supabase MCP** with `name`: `phase3_rls_mutations`:

```sql
DO $$ BEGIN
  CREATE POLICY "Authenticated insert evento"
    ON public.evento FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update evento"
    ON public.evento FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete evento"
    ON public.evento FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert tarea"
    ON public.tarea FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update tarea"
    ON public.tarea FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete tarea"
    ON public.tarea FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert tarea_asignada"
    ON public.tarea_asignada FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update tarea_asignada"
    ON public.tarea_asignada FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete tarea_asignada"
    ON public.tarea_asignada FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

- [ ] **Step 2: Save file with assigned version name** in `supabase/migrations/`.

---

### Task 4: Update EventsPage

**Files:**
- Modify: `src/app/components/EventsPage.tsx`

- [ ] **Step 1: Read the file** — understand dialog structure and current query usage.

- [ ] **Step 2: Replace `useEventos` with `useEventosEnriquecidos`**

```typescript
import { useEventosEnriquecidos, useCreateEvento, useUpdateEvento, useDeleteEvento } from '@/hooks/useEventos'
import { useApp } from '@/app/store/AppContext'

const { iglesiaActual } = useApp()
const { data: eventos = [], isLoading } = useEventosEnriquecidos(iglesiaActual?.id)
const updateEventoMutation = useUpdateEvento()
const deleteEventoMutation = useDeleteEvento()
```

- [ ] **Step 3: Add edit dialog state and handler**

```typescript
const [editingEvento, setEditingEvento] = useState<EventoEnriquecido | null>(null)

function handleUpdateEvento(data: { nombre: string; descripcion: string | null; estado: Evento['estado'] }) {
  if (!editingEvento) return
  updateEventoMutation.mutate(
    { id: editingEvento.idEvento, data },
    { onSuccess: () => setEditingEvento(null) }
  )
}
```

- [ ] **Step 4: Add delete handler**

```typescript
function handleDeleteEvento(id: number) {
  if (!confirm('¿Eliminar este evento?')) return
  deleteEventoMutation.mutate(id)
}
```

- [ ] **Step 5: Show enriched fields** — display `tipoEventoNombre`, `sedeNombre`, `ministerioNombre` in event cards/rows.

- [ ] **Step 6: Build**

```bash
npm run build 2>&1 | head -20
```

---

### Task 5: Update TasksPage with full CRUD + assignment

**Files:**
- Modify: `src/app/components/TasksPage.tsx`

- [ ] **Step 1: Read the file**.

- [ ] **Step 2: Replace query with enriched version and add all mutation hooks**

```typescript
import {
  useTareasEnriquecidas, useCreateTarea, useUpdateTarea, useDeleteTarea,
  useCreateTareaAsignada, useDeleteTareaAsignada,
} from '@/hooks/useEventos'
import { useUsuarios } from '@/hooks/useUsuarios'

const { data: tareas = [], isLoading } = useTareasEnriquecidas()
const { data: usuarios = [] } = useUsuarios()
const updateTareaMutation = useUpdateTarea()
const deleteTareaMutation = useDeleteTarea()
const createAsignadaMutation = useCreateTareaAsignada()
const deleteAsignadaMutation = useDeleteTareaAsignada()
```

- [ ] **Step 3: Add assign-user dialog** with a `<Select>` populated from `usuarios`, on confirm:

```typescript
createAsignadaMutation.mutate(
  { idTarea: selectedTareaId, idUsuario: selectedUsuarioId },
  { onSuccess: () => setAssignDialogOpen(false) }
)
```

- [ ] **Step 4: Show asignados** in each task row:

```typescript
tarea.asignados.map(a => a.nombreCompleto).join(', ')
```

- [ ] **Step 5: Add delete task handler**

```typescript
function handleDeleteTarea(id: number) {
  if (!confirm('¿Eliminar esta tarea?')) return
  deleteTareaMutation.mutate(id)
}
```

- [ ] **Step 6: Build and commit**

```bash
npm run build 2>&1 | head -20
git add src/services/eventos.service.ts src/hooks/useEventos.ts \
        src/app/components/EventsPage.tsx src/app/components/TasksPage.tsx \
        supabase/migrations/
git commit -m "feat: eventos/tareas enriched queries + update/delete/assign mutations (phase 3)"
git push origin main
```
