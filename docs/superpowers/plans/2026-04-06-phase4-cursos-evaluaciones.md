# Phase 4: Cursos, Módulos, Evaluaciones y Recursos — CRUD Completo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete CRUD for cursos, módulos, evaluaciones, and recursos with enriched query data (cantidadModulos, cantidadEvaluaciones, progresoPromedio).

**Architecture:** Existing `cursos.service.ts` has read functions + `createCurso`, `createModulo`, `deleteEvaluacion`, `deleteProcesoAsignadoCurso`. Add `updateModulo`, `deleteModulo`, `createEvaluacion`, `updateEvaluacion`, `updateCurso`, `deleteCurso`, enriched evaluaciones query, `createRecurso`, `updateRecurso`, `deleteRecurso`, `updateProcesoAsignadoCurso`. Wire in page components.

**Tech Stack:** React 18, Supabase JS v2, TanStack Query v5, shadcn/ui

---

## File Structure

| File | Change |
|------|--------|
| `src/services/cursos.service.ts` | Modify — add enriched getters + missing mutations |
| `src/hooks/useCursos.ts` | Modify — add hooks for new mutations + enriched queries |
| `src/app/components/CoursesPage.tsx` | Modify — use enriched data, add update/delete |
| `src/app/components/EvaluationsPage.tsx` | Modify — show real data, add create/update/delete |

---

### Task 1: Add enriched queries and missing mutations to cursos.service.ts

**Files:**
- Modify: `src/services/cursos.service.ts`

- [ ] **Step 1: Read the file**

Read `src/services/cursos.service.ts` to understand existing structure before modifying.

- [ ] **Step 2: Add enriched interfaces after existing interfaces**

```typescript
export interface CursoEnriquecido extends Curso {
  cantidadModulos: number
  cantidadEvaluaciones: number
  cantidadInscritos: number
}

export interface EvaluacionEnriquecida extends Evaluacion {
  moduloNombre: string
  cursoNombre: string
}

export interface ProcesoEnriquecido extends ProcesoAsignadoCurso {
  usuarioNombre: string
  cursoNombre: string
}
```

- [ ] **Step 3: Add `getCursosEnriquecidos`**

```typescript
export async function getCursosEnriquecidos(idSede?: number): Promise<CursoEnriquecido[]> {
  let q = supabase
    .from('curso')
    .select('*, modulo(count), proceso_asignado_curso(count)')
    .order('titulo')
  if (idSede !== undefined) q = q.eq('id_sede', idSede)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapCurso(r),
    cantidadModulos: Array.isArray(r.modulo) ? r.modulo[0]?.count ?? 0 : 0,
    cantidadEvaluaciones: 0,
    cantidadInscritos: Array.isArray(r.proceso_asignado_curso) ? r.proceso_asignado_curso[0]?.count ?? 0 : 0,
  }))
}
```

- [ ] **Step 4: Add `getEvaluacionesEnriquecidas`**

```typescript
export async function getEvaluacionesEnriquecidas(idModulo?: number): Promise<EvaluacionEnriquecida[]> {
  let q = supabase
    .from('evaluacion')
    .select('*, modulo(titulo, curso(titulo))')
    .order('created_at', { ascending: false })
  if (idModulo !== undefined) q = q.eq('id_modulo', idModulo)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapEvaluacion(r),
    moduloNombre: r.modulo?.titulo ?? '',
    cursoNombre: r.modulo?.curso?.titulo ?? '',
  }))
}
```

- [ ] **Step 5: Add `updateCurso`, `deleteCurso`**

```typescript
export async function updateCurso(
  id: number,
  data: { titulo?: string; descripcion?: string | null; estado?: string }
): Promise<Curso> {
  const patch: Record<string, unknown> = {}
  if (data.titulo !== undefined) patch.titulo = data.titulo
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.estado !== undefined) patch.estado = data.estado
  const { data: result, error } = await supabase
    .from('curso')
    .update(patch)
    .eq('id_curso', id)
    .select()
    .single()
  if (error) throw error
  return mapCurso(result)
}

export async function deleteCurso(id: number): Promise<void> {
  const { error } = await supabase.from('curso').delete().eq('id_curso', id)
  if (error) throw error
}
```

- [ ] **Step 6: Add `updateModulo`, `deleteModulo`**

```typescript
export async function updateModulo(
  id: number,
  data: { titulo?: string; descripcion?: string | null; orden?: number }
): Promise<Modulo> {
  const patch: Record<string, unknown> = {}
  if (data.titulo !== undefined) patch.titulo = data.titulo
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.orden !== undefined) patch.orden = data.orden
  const { data: result, error } = await supabase
    .from('modulo')
    .update(patch)
    .eq('id_modulo', id)
    .select()
    .single()
  if (error) throw error
  return mapModulo(result)
}

export async function deleteModulo(id: number): Promise<void> {
  const { error } = await supabase.from('modulo').delete().eq('id_modulo', id)
  if (error) throw error
}
```

- [ ] **Step 7: Add `createEvaluacion`, `updateEvaluacion`**

```typescript
export async function createEvaluacion(data: {
  idModulo: number
  pregunta: string
  opcionA: string
  opcionB: string
  opcionC: string
  opcionD: string
  respuestaCorrecta: string
}): Promise<Evaluacion> {
  const { data: result, error } = await supabase
    .from('evaluacion')
    .insert({
      id_modulo: data.idModulo,
      pregunta: data.pregunta,
      opcion_a: data.opcionA,
      opcion_b: data.opcionB,
      opcion_c: data.opcionC,
      opcion_d: data.opcionD,
      respuesta_correcta: data.respuestaCorrecta,
    })
    .select()
    .single()
  if (error) throw error
  return mapEvaluacion(result)
}

export async function updateEvaluacion(
  id: number,
  data: {
    pregunta?: string
    opcionA?: string
    opcionB?: string
    opcionC?: string
    opcionD?: string
    respuestaCorrecta?: string
  }
): Promise<Evaluacion> {
  const patch: Record<string, unknown> = {}
  if (data.pregunta !== undefined) patch.pregunta = data.pregunta
  if (data.opcionA !== undefined) patch.opcion_a = data.opcionA
  if (data.opcionB !== undefined) patch.opcion_b = data.opcionB
  if (data.opcionC !== undefined) patch.opcion_c = data.opcionC
  if (data.opcionD !== undefined) patch.opcion_d = data.opcionD
  if (data.respuestaCorrecta !== undefined) patch.respuesta_correcta = data.respuestaCorrecta
  const { data: result, error } = await supabase
    .from('evaluacion')
    .update(patch)
    .eq('id_evaluacion', id)
    .select()
    .single()
  if (error) throw error
  return mapEvaluacion(result)
}
```

- [ ] **Step 8: Add `createRecurso`, `updateRecurso`, `deleteRecurso`**

```typescript
export async function createRecurso(data: {
  idModulo: number
  titulo: string
  tipo: string
  url: string
}): Promise<Recurso> {
  const { data: result, error } = await supabase
    .from('recurso')
    .insert({
      id_modulo: data.idModulo,
      titulo: data.titulo,
      tipo: data.tipo,
      url: data.url,
    })
    .select()
    .single()
  if (error) throw error
  return mapRecurso(result)
}

export async function updateRecurso(
  id: number,
  data: { titulo?: string; tipo?: string; url?: string }
): Promise<Recurso> {
  const patch: Record<string, unknown> = {}
  if (data.titulo !== undefined) patch.titulo = data.titulo
  if (data.tipo !== undefined) patch.tipo = data.tipo
  if (data.url !== undefined) patch.url = data.url
  const { data: result, error } = await supabase
    .from('recurso')
    .update(patch)
    .eq('id_recurso', id)
    .select()
    .single()
  if (error) throw error
  return mapRecurso(result)
}

export async function deleteRecurso(id: number): Promise<void> {
  const { error } = await supabase.from('recurso').delete().eq('id_recurso', id)
  if (error) throw error
}
```

- [ ] **Step 9: Add `updateProcesoAsignadoCurso`**

```typescript
export async function updateProcesoAsignadoCurso(
  id: number,
  data: { estado?: string; progreso?: number; fechaFin?: string | null }
): Promise<ProcesoAsignadoCurso> {
  const patch: Record<string, unknown> = {}
  if (data.estado !== undefined) patch.estado = data.estado
  if (data.progreso !== undefined) patch.progreso = data.progreso
  if (data.fechaFin !== undefined) patch.fecha_fin = data.fechaFin
  const { data: result, error } = await supabase
    .from('proceso_asignado_curso')
    .update(patch)
    .eq('id_proceso', id)
    .select()
    .single()
  if (error) throw error
  return mapProceso(result)
}
```

- [ ] **Step 10: Build**

```bash
npm run build 2>&1 | head -30
```

Expected: No errors.

---

### Task 2: Add hooks in useCursos.ts

**Files:**
- Modify: `src/hooks/useCursos.ts`

- [ ] **Step 1: Read the file**

Read `src/hooks/useCursos.ts` to understand current exports.

- [ ] **Step 2: Update imports**

```typescript
import {
  getCursos, getModulos, getRecursos, getEvaluaciones, getProcesosAsignadoCurso,
  getCursosEnriquecidos, getEvaluacionesEnriquecidas,
  createCurso, updateCurso, deleteCurso,
  createModulo, updateModulo, deleteModulo,
  createEvaluacion, updateEvaluacion, deleteEvaluacion,
  createRecurso, updateRecurso, deleteRecurso,
  updateProcesoAsignadoCurso, deleteProcesoAsignadoCurso,
} from '@/services/cursos.service'
```

- [ ] **Step 3: Add enriched query hooks** — add after existing query hooks:

```typescript
export function useCursosEnriquecidos(idSede?: number) {
  return useQuery({
    queryKey: ['cursos-enriquecidos', idSede],
    queryFn: () => getCursosEnriquecidos(idSede),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEvaluacionesEnriquecidas(idModulo?: number) {
  return useQuery({
    queryKey: ['evaluaciones-enriquecidas', idModulo],
    queryFn: () => getEvaluacionesEnriquecidas(idModulo),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 4: Add mutation hooks** — add after existing mutation hooks:

```typescript
export function useUpdateCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateCurso>[1] }) =>
      updateCurso(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cursos'] })
      qc.invalidateQueries({ queryKey: ['cursos-enriquecidos'] })
    },
  })
}

export function useDeleteCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCurso(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cursos'] })
      qc.invalidateQueries({ queryKey: ['cursos-enriquecidos'] })
    },
  })
}

export function useUpdateModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateModulo>[1] }) =>
      updateModulo(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modulos'] })
    },
  })
}

export function useDeleteModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteModulo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modulos'] })
      qc.invalidateQueries({ queryKey: ['cursos-enriquecidos'] })
    },
  })
}

export function useCreateEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createEvaluacion>[0]) => createEvaluacion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluaciones'] })
      qc.invalidateQueries({ queryKey: ['evaluaciones-enriquecidas'] })
    },
  })
}

export function useUpdateEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateEvaluacion>[1] }) =>
      updateEvaluacion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluaciones'] })
      qc.invalidateQueries({ queryKey: ['evaluaciones-enriquecidas'] })
    },
  })
}

export function useCreateRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createRecurso>[0]) => createRecurso(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recursos'] })
    },
  })
}

export function useUpdateRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateRecurso>[1] }) =>
      updateRecurso(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recursos'] })
    },
  })
}

export function useDeleteRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteRecurso(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recursos'] })
    },
  })
}

export function useUpdateProcesoAsignadoCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateProcesoAsignadoCurso>[1] }) =>
      updateProcesoAsignadoCurso(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procesos-curso'] })
    },
  })
}
```

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | head -20
```

---

### Task 3: Add RLS policies for cursos domain

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_phase4_rls_cursos.sql`

- [ ] **Step 1: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with:
- `project_id`: `heibyjbvfiokmduwwawm`
- `name`: `phase4_rls_cursos`
- `query`:

```sql
DO $$ BEGIN
  CREATE POLICY "Authenticated insert curso"
    ON public.curso FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update curso"
    ON public.curso FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete curso"
    ON public.curso FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert modulo"
    ON public.modulo FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update modulo"
    ON public.modulo FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete modulo"
    ON public.modulo FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert evaluacion"
    ON public.evaluacion FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update evaluacion"
    ON public.evaluacion FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete evaluacion"
    ON public.evaluacion FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert recurso"
    ON public.recurso FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update recurso"
    ON public.recurso FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete recurso"
    ON public.recurso FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update proceso_asignado_curso"
    ON public.proceso_asignado_curso FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

- [ ] **Step 2: Create local file with assigned version name**

After MCP returns the version, create the file at `supabase/migrations/<version>_phase4_rls_cursos.sql` with the SQL above.

---

### Task 4: Update CoursesPage with enriched data and full CRUD

**Files:**
- Modify: `src/app/components/CoursesPage.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/components/CoursesPage.tsx` to understand current structure.

- [ ] **Step 2: Replace query and add mutations**

```typescript
import {
  useCursosEnriquecidos, useUpdateCurso, useDeleteCurso,
  useCreateModulo, useUpdateModulo, useDeleteModulo,
} from '@/hooks/useCursos'
import { useApp } from '@/app/store/AppContext'

const { iglesiaActual } = useApp()
const { data: cursos = [], isLoading } = useCursosEnriquecidos()
const updateCursoMutation = useUpdateCurso()
const deleteCursoMutation = useDeleteCurso()
const createModuloMutation = useCreateModulo()
const updateModuloMutation = useUpdateModulo()
const deleteModuloMutation = useDeleteModulo()
```

- [ ] **Step 3: Show enriched fields**

In course cards/rows, display:
- `curso.cantidadModulos` as badge
- `curso.cantidadInscritos` as stat

- [ ] **Step 4: Wire update/delete handlers**

```typescript
function handleUpdateCurso(id: number, data: Parameters<typeof updateCurso>[1]) {
  updateCursoMutation.mutate({ id, data })
}

function handleDeleteCurso(id: number) {
  if (!confirm('¿Eliminar este curso? Se eliminarán todos los módulos y evaluaciones.')) return
  deleteCursoMutation.mutate(id)
}
```

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | head -20
```

---

### Task 5: Update EvaluationsPage with real data and CRUD

**Files:**
- Modify: `src/app/components/EvaluationsPage.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/components/EvaluationsPage.tsx`.

- [ ] **Step 2: Replace query and add mutations**

```typescript
import {
  useEvaluacionesEnriquecidas, useCreateEvaluacion, useUpdateEvaluacion, useDeleteEvaluacion,
} from '@/hooks/useCursos'

const { data: evaluaciones = [], isLoading } = useEvaluacionesEnriquecidas()
const createEvaluacionMutation = useCreateEvaluacion()
const updateEvaluacionMutation = useUpdateEvaluacion()
const deleteEvaluacionMutation = useDeleteEvaluacion()
```

- [ ] **Step 3: Show real data**

Replace placeholder text with `evaluacion.pregunta`, `evaluacion.moduloNombre`, `evaluacion.cursoNombre`.

- [ ] **Step 4: Wire create/update/delete**

```typescript
function handleCreateEvaluacion(data: Parameters<typeof createEvaluacion>[0]) {
  createEvaluacionMutation.mutate(data)
}

function handleUpdateEvaluacion(id: number, data: Parameters<typeof updateEvaluacion>[1]) {
  updateEvaluacionMutation.mutate({ id, data })
}

function handleDeleteEvaluacion(id: number) {
  if (!confirm('¿Eliminar esta evaluación?')) return
  deleteEvaluacionMutation.mutate(id)
}
```

- [ ] **Step 5: Build and commit**

```bash
npm run build 2>&1 | head -20
git add src/services/cursos.service.ts src/hooks/useCursos.ts \
        src/app/components/CoursesPage.tsx src/app/components/EvaluationsPage.tsx \
        supabase/migrations/
git commit -m "feat: cursos/módulos/evaluaciones/recursos enriched queries + CRUD (phase 4)"
git push origin main
```
