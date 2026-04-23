# Classroom B1 — Contenido enriquecido del módulo · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que admin/líder escriba contenido Markdown rico en cada módulo, y que el estudiante inscrito lo vea renderizado en una pantalla dedicada con breadcrumb y navegación prev/next entre módulos del mismo curso.

**Architecture:** Columna nueva `contenido_md TEXT NULL` en tabla `modulo`. Una sola ruta compartida `/app/aula/curso/:idCurso/modulo/:idModulo`; la página detecta rol + permiso y renderiza editor (WYSIWYG sobre Markdown con `@uiw/react-md-editor`) o vista de lectura (`react-markdown` + `remark-gfm` + `rehype-sanitize`). Permisos por RLS existente (Fase B) más, si hace falta, una policy SELECT específica para servidor inscrito.

**Tech Stack:** React 18 + Vite, TypeScript, Supabase (PostgreSQL + RLS), TanStack Query v5, react-router v7, `@uiw/react-md-editor`, `react-markdown`, `remark-gfm`, `rehype-sanitize`, sonner (toast).

---

## Nota operativa sobre Supabase

Las migraciones se aplican con el MCP `mcp__claude_ai_Supabase__apply_migration`. Tras cada migración se regeneran tipos con `mcp__claude_ai_Supabase__generate_typescript_types` y se escribe el resultado a `src/types/database.types.ts`.

## Nota sobre testing

El proyecto no tiene framework de tests. La verificación se hace con:

- **SQL con `ASSERT` + `ROLLBACK`** (Task 17) — ejecutable vía MCP `execute_sql`.
- **`npm run build`** — tipado estricto después de regenerar tipos.
- **Checklist manual por rol** (Task 18) — en navegador, al final.

## File Structure

### Archivos nuevos
- `supabase/migrations/20260418100000_modulo_add_contenido_md.sql` — añade columna `contenido_md`.
- `supabase/migrations/20260418100100_rls_modulo_student_read.sql` — **sólo si** auditoría (Task 1) determina que falta. Helper `can_read_modulo_as_student` + policy SELECT para servidor inscrito.
- `scripts/test-modulo-contenido.sql` — verificación SQL con `ASSERT`.
- `src/hooks/useModulo.ts` — `useModulo(id)`, `useUpdateModuloContenido()`.
- `src/app/components/classroom/ModuloDetailPage.tsx` — página completa (orquestador).
- `src/app/components/classroom/ModuloBreadcrumb.tsx` — breadcrumb Aula → Curso → Módulo.
- `src/app/components/classroom/ModuloNavegacion.tsx` — botones Anterior/Siguiente.
- `src/app/components/classroom/ModuloContenidoEditor.tsx` — editor md + guardar.
- `src/app/components/classroom/ModuloContenidoView.tsx` — render md seguro.

### Archivos modificados
- `src/types/app.types.ts` — añadir `contenido_md` a `Modulo`.
- `src/types/database.types.ts` — regenerado tras migración 1.
- `src/services/cursos.service.ts` — actualizar `mapModulo`, añadir `getModulo`, añadir `updateModuloContenido`.
- `src/app/routes.ts` — registrar nueva ruta.
- `src/app/components/ClassroomPage.tsx` — botón "Abrir" en card de módulo para admin.
- `src/app/components/MisCursosPage.tsx` — expandir cards con lista de módulos publicados + enlace.
- `package.json` — añadir 4 librerías.

---

## Task 1: Auditar policies SELECT vigentes de `modulo`

**Files:**
- Read only: consulta a `pg_policies` vía MCP `execute_sql`.

**Objetivo:** decidir binariamente si se crea o no la migración 2 (`20260418100100_rls_modulo_student_read.sql`).

- [ ] **Step 1: Ejecutar la consulta de auditoría**

Ejecutar vía MCP `mcp__claude_ai_Supabase__execute_sql`:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'modulo'
ORDER BY cmd, policyname;
```

- [ ] **Step 2: Analizar el resultado**

Leer cada policy con `cmd = 'SELECT'` (o `cmd = 'ALL'`). La pregunta es: **¿alguna policy vigente permite que un usuario con rol `servidor` y con `detalle_proceso_curso.estado IN ('inscrito','en_progreso')` en un ciclo del `modulo.id_curso` pueda leer la fila si `modulo.estado = 'publicado'` y `curso.estado = 'activo'`?**

Criterios:
- Si alguna `qual` referencia `detalle_proceso_curso` (o función helper que la consulte), y cubre los tres filtros → **cobertura existe**. Migración 2 NO se crea. Marca en TodoWrite: "Migración 2 no aplica".
- Si todas las policies de SELECT son sólo para admin/líder (usando `can_manage_curso_scope` o equivalentes) y no hay policy específica para estudiante → **falta cobertura**. Migración 2 SÍ se crea. Continuar con Task 3.
- Caso borde (policy existe pero con filtro incorrecto, ej. no chequea `estado`): crear migración 2 igual, añade la policy correcta (PostgreSQL permite múltiples policies permisivas sumando; si la existente es estricta de escritura, la nueva cubre el SELECT).

- [ ] **Step 3: Registrar decisión**

Crea el archivo `/tmp/modulo_rls_audit.txt` con el texto exacto: `MIGRATION_2_NEEDED=yes` o `MIGRATION_2_NEEDED=no`. Esto no se commitea — es un estado de trabajo para que las tareas 3-4 lean la decisión.

```bash
# Ejemplo si faltó cobertura:
echo "MIGRATION_2_NEEDED=yes" > /tmp/modulo_rls_audit.txt
```

No hay commit aquí.

---

## Task 2: Migración 1 — añadir columna `contenido_md`

**Files:**
- Create: `supabase/migrations/20260418100000_modulo_add_contenido_md.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Añade columna para contenido enriquecido (Markdown) en cada módulo.
-- No reemplaza `descripcion` — ésta sigue siendo el resumen corto para cards/listados.

ALTER TABLE public.modulo
  ADD COLUMN IF NOT EXISTS contenido_md TEXT NULL;

COMMENT ON COLUMN public.modulo.contenido_md IS
  'Contenido de aprendizaje del módulo en formato Markdown (GFM). NULL si aún no se ha editado.';
```

- [ ] **Step 2: Aplicar la migración vía MCP**

Usar `mcp__claude_ai_Supabase__apply_migration` con `name = "modulo_add_contenido_md"` y `query` igual al contenido del archivo.

Expected: respuesta del MCP con éxito (sin error).

- [ ] **Step 3: Verificar que la columna existe**

Ejecutar vía MCP `execute_sql`:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'modulo' AND column_name = 'contenido_md';
```

Expected: una fila con `data_type = 'text'`, `is_nullable = 'YES'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260418100000_modulo_add_contenido_md.sql
git commit -m "feat(db): add contenido_md column to modulo for rich content"
```

---

## Task 3: Migración 2 — RLS SELECT para servidor inscrito *(condicional)*

**Files:**
- Create (sólo si `MIGRATION_2_NEEDED=yes`): `supabase/migrations/20260418100100_rls_modulo_student_read.sql`

Si `/tmp/modulo_rls_audit.txt` dice `MIGRATION_2_NEEDED=no`, **salta esta tarea completa** y marca como hecha en TodoWrite con nota "Cobertura preexistente verificada en Task 1".

- [ ] **Step 1: Escribir la migración**

```sql
-- Helper: ¿puede este usuario (identificado vía auth) leer este módulo como estudiante inscrito?
-- Devuelve true sólo si:
--   · módulo.estado = 'publicado'
--   · curso.estado = 'activo'
--   · existe detalle_proceso_curso del usuario en algún ciclo del curso con estado inscrito|en_progreso

CREATE OR REPLACE FUNCTION public.can_read_modulo_as_student(p_id_modulo bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.modulo m
    JOIN public.curso c ON c.id_curso = m.id_curso
    JOIN public.proceso_asignado_curso p ON p.id_curso = c.id_curso
    JOIN public.detalle_proceso_curso d ON d.id_proceso_asignado_curso = p.id_proceso_asignado_curso
    WHERE m.id_modulo = p_id_modulo
      AND m.estado = 'publicado'
      AND c.estado = 'activo'
      AND d.id_usuario = public.current_usuario_id()
      AND d.estado IN ('inscrito', 'en_progreso')
  );
$$;

-- Policy: permite SELECT del módulo al estudiante inscrito (suma permisiva a las existentes).
CREATE POLICY "Servidor inscrito puede leer módulos publicados"
  ON public.modulo FOR SELECT
  TO authenticated
  USING (public.can_read_modulo_as_student(id_modulo));
```

- [ ] **Step 2: Aplicar la migración vía MCP**

Usar `mcp__claude_ai_Supabase__apply_migration` con `name = "rls_modulo_student_read"`.

Expected: éxito sin errores. La función `public.current_usuario_id()` ya existe (creada en Sub-proyecto A, migración `20260417120000_enrollment_helpers_and_constraints.sql`).

- [ ] **Step 3: Verificar que la policy y la función existen**

```sql
SELECT proname FROM pg_proc WHERE proname = 'can_read_modulo_as_student';
SELECT policyname FROM pg_policies
  WHERE tablename = 'modulo' AND policyname = 'Servidor inscrito puede leer módulos publicados';
```

Expected: una fila en cada consulta.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260418100100_rls_modulo_student_read.sql
git commit -m "feat(rls): allow enrolled students to read published modules"
```

---

## Task 4: Regenerar tipos TypeScript

**Files:**
- Modify: `src/types/database.types.ts` (regenerado)

- [ ] **Step 1: Regenerar tipos vía MCP**

Usar `mcp__claude_ai_Supabase__generate_typescript_types`. Copiar el resultado completo a `src/types/database.types.ts` (sobrescribir el archivo).

- [ ] **Step 2: Verificar que `contenido_md` aparece en el tipo de `modulo`**

```bash
grep -n "contenido_md" src/types/database.types.ts | head -5
```

Expected: al menos 3 ocurrencias (Row, Insert, Update).

- [ ] **Step 3: Compilar**

```bash
npm run build
```

Expected: build sin errores. Es normal que de momento `mapModulo` no lea la columna — se arregla en Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regenerate database types after contenido_md migration"
```

---

## Task 5: Añadir `contenido_md` a `Modulo` + actualizar `mapModulo`

**Files:**
- Modify: `src/types/app.types.ts:218-228`
- Modify: `src/services/cursos.service.ts:29-40`

- [ ] **Step 1: Añadir campo a la interfaz `Modulo`**

En `src/types/app.types.ts`, localizar la interfaz `Modulo` (alrededor de la línea 218) y añadir `contenido_md`:

```typescript
export interface Modulo {
  idModulo: number
  titulo: string
  descripcion: string | null
  contenidoMd: string | null
  orden: number
  estado: 'borrador' | 'publicado' | 'archivado'
  idCurso: number
  creadoEn: string
  actualizadoEn: string
  recursos?: Recurso[]
}
```

- [ ] **Step 2: Actualizar `mapModulo` en el servicio**

En `src/services/cursos.service.ts`, localizar `mapModulo` (alrededor de la línea 29) y añadir la propiedad `contenidoMd`:

```typescript
function mapModulo(r: ModuloRow): Modulo {
  return {
    idModulo: r.id_modulo,
    titulo: r.titulo,
    descripcion: r.descripcion,
    contenidoMd: r.contenido_md,
    orden: r.orden,
    estado: r.estado as Modulo['estado'],
    idCurso: r.id_curso,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}
```

- [ ] **Step 3: Compilar**

```bash
npm run build
```

Expected: build pasa. Cualquier lugar que construya un `Modulo` "a mano" tendrá error de tipo; hoy no hay ninguno (todo pasa por `mapModulo`), así que debe pasar limpio.

- [ ] **Step 4: Commit**

```bash
git add src/types/app.types.ts src/services/cursos.service.ts
git commit -m "feat(types): expose contenidoMd on Modulo"
```

---

## Task 6: Instalar dependencias NPM

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Instalar las cuatro librerías**

```bash
npm install @uiw/react-md-editor react-markdown remark-gfm rehype-sanitize
```

Expected: instalación sin errores. Versiones resueltas aparecen en `package.json`.

- [ ] **Step 2: Verificar que las cuatro aparecen en dependencies**

```bash
grep -E "\"(@uiw/react-md-editor|react-markdown|remark-gfm|rehype-sanitize)\"" package.json
```

Expected: 4 líneas.

- [ ] **Step 3: Compilar para asegurar que nada se rompió**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add md editor and markdown rendering libs for module content"
```

---

## Task 7: Añadir `getModulo` y `updateModuloContenido` al service

**Files:**
- Modify: `src/services/cursos.service.ts` (dos funciones nuevas, cerca de `getModulos` y `updateModulo`).

- [ ] **Step 1: Añadir `getModulo(id)` tras `getModulos`**

En `src/services/cursos.service.ts`, después de la función `getModulos` (aprox. línea 155), añadir:

```typescript
export async function getModulo(idModulo: number): Promise<Modulo> {
  const { data, error } = await supabase
    .from('modulo')
    .select('*')
    .eq('id_modulo', idModulo)
    .single()
  if (error) throw error
  return mapModulo(data)
}
```

- [ ] **Step 2: Añadir `updateModuloContenido` tras `updateModulo`**

En `src/services/cursos.service.ts`, después de la función `updateModulo` (aprox. línea 270), añadir:

```typescript
export async function updateModuloContenido(
  idModulo: number,
  contenidoMd: string | null
): Promise<Modulo> {
  const { data, error } = await supabase
    .from('modulo')
    .update({ contenido_md: contenidoMd })
    .eq('id_modulo', idModulo)
    .select()
    .single()
  if (error) throw error
  return mapModulo(data)
}
```

- [ ] **Step 3: Compilar**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 4: Commit**

```bash
git add src/services/cursos.service.ts
git commit -m "feat(services): add getModulo and updateModuloContenido"
```

---

## Task 8: Crear hook `useModulo`

**Files:**
- Create: `src/hooks/useModulo.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getModulo, updateModuloContenido } from '@/services/cursos.service'

export function useModulo(idModulo: number | null | undefined) {
  return useQuery({
    queryKey: ['modulo', idModulo],
    queryFn: () => getModulo(idModulo as number),
    enabled: !!idModulo,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUpdateModuloContenido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { idModulo: number; idCurso: number; contenidoMd: string | null }) =>
      updateModuloContenido(vars.idModulo, vars.contenidoMd),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['modulo', vars.idModulo] }),
        qc.invalidateQueries({ queryKey: ['modulos', vars.idCurso] }),
      ])
    },
  })
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useModulo.ts
git commit -m "feat(hooks): add useModulo and useUpdateModuloContenido"
```

---

## Task 9: Crear `ModuloContenidoView`

**Files:**
- Create: `src/app/components/classroom/ModuloContenidoView.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { FileText } from 'lucide-react'

interface Props {
  contenidoMd: string | null
}

export function ModuloContenidoView({ contenidoMd }: Props) {
  if (!contenidoMd || contenidoMd.trim() === '') {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/40 flex items-center justify-center">
          <FileText className="w-6 h-6 opacity-40" />
        </div>
        <p className="text-sm font-medium">Este módulo aún no tiene contenido publicado.</p>
      </div>
    )
  }

  return (
    <article className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {contenidoMd}
      </ReactMarkdown>
    </article>
  )
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

Expected: build pasa.

Nota: la clase `prose` requiere el plugin `@tailwindcss/typography`. Si el build da warning por no encontrarla, basta con que las clases queden como no-ops — el contenido se verá sin estilos refinados pero funcional. No instalar el plugin en este plan (no es bloqueante; queda como mejora futura si el diseño lo pide).

- [ ] **Step 3: Commit**

```bash
git add src/app/components/classroom/ModuloContenidoView.tsx
git commit -m "feat(classroom): add ModuloContenidoView for safe markdown rendering"
```

---

## Task 10: Crear `ModuloContenidoEditor`

**Files:**
- Create: `src/app/components/classroom/ModuloContenidoEditor.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import { useState, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { Button } from '../ui/button'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateModuloContenido } from '@/hooks/useModulo'

const MAX_CHARS = 100_000

interface Props {
  idModulo: number
  idCurso: number
  contenidoInicial: string | null
}

export function ModuloContenidoEditor({ idModulo, idCurso, contenidoInicial }: Props) {
  const [valor, setValor] = useState<string>(contenidoInicial ?? '')
  const [dirty, setDirty] = useState(false)
  const mutation = useUpdateModuloContenido()

  useEffect(() => {
    setValor(contenidoInicial ?? '')
    setDirty(false)
  }, [contenidoInicial, idModulo])

  const onChange = (v: string | undefined) => {
    setValor(v ?? '')
    setDirty(true)
  }

  const onGuardar = async () => {
    if (valor.length > MAX_CHARS) {
      toast.error(`El contenido excede ${MAX_CHARS.toLocaleString()} caracteres. Recórtalo antes de guardar.`)
      return
    }
    try {
      await mutation.mutateAsync({
        idModulo,
        idCurso,
        contenidoMd: valor.trim() === '' ? null : valor,
      })
      setDirty(false)
      toast.success('Contenido guardado')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      toast.error(`No se pudo guardar: ${msg}`)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-card/40" data-color-mode="auto">
        <MDEditor
          value={valor}
          onChange={onChange}
          height={480}
          preview="live"
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {valor.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} caracteres
          {dirty && <span className="ml-2 text-amber-500">· sin guardar</span>}
        </span>
        <Button
          onClick={onGuardar}
          disabled={!dirty || mutation.isPending}
          className="rounded-xl"
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Guardando…</>
          ) : (
            <><Save className="w-4 h-4 mr-1" /> Guardar</>
          )}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/classroom/ModuloContenidoEditor.tsx
git commit -m "feat(classroom): add ModuloContenidoEditor with markdown WYSIWYG"
```

---

## Task 11: Crear `ModuloBreadcrumb`

**Files:**
- Create: `src/app/components/classroom/ModuloBreadcrumb.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import { Link } from 'react-router'
import { ChevronRight, GraduationCap } from 'lucide-react'

interface Props {
  cursoNombre: string
  idCurso: number
  moduloOrden: number
  moduloTitulo: string
  backHref?: string // default "/app/aula"
}

export function ModuloBreadcrumb({ cursoNombre, idCurso, moduloOrden, moduloTitulo, backHref = '/app/aula' }: Props) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
      <Link to={backHref} className="flex items-center gap-1 hover:text-foreground transition-colors">
        <GraduationCap className="w-3.5 h-3.5" />
        Aula
      </Link>
      <ChevronRight className="w-3 h-3 shrink-0" />
      <Link to={`${backHref}?curso=${idCurso}`} className="truncate hover:text-foreground transition-colors">
        {cursoNombre}
      </Link>
      <ChevronRight className="w-3 h-3 shrink-0" />
      <span className="truncate font-semibold text-foreground">
        Módulo {moduloOrden}: {moduloTitulo}
      </span>
    </nav>
  )
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/classroom/ModuloBreadcrumb.tsx
git commit -m "feat(classroom): add ModuloBreadcrumb"
```

---

## Task 12: Crear `ModuloNavegacion`

**Files:**
- Create: `src/app/components/classroom/ModuloNavegacion.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import type { Modulo } from '@/types/app.types'

interface Props {
  modulos: Modulo[]
  idModuloActual: number
  idCurso: number
  /** si true (servidor), salta módulos que no estén publicado */
  soloPublicados: boolean
}

export function ModuloNavegacion({ modulos, idModuloActual, idCurso, soloPublicados }: Props) {
  const visibles = [...modulos]
    .filter((m) => !soloPublicados || m.estado === 'publicado')
    .sort((a, b) => a.orden - b.orden)

  const idx = visibles.findIndex((m) => m.idModulo === idModuloActual)
  const anterior = idx > 0 ? visibles[idx - 1] : null
  const siguiente = idx >= 0 && idx < visibles.length - 1 ? visibles[idx + 1] : null

  const hrefFor = (idModulo: number) => `/app/aula/curso/${idCurso}/modulo/${idModulo}`

  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="rounded-xl"
        disabled={!anterior}
      >
        {anterior ? (
          <Link to={hrefFor(anterior.idModulo)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Link>
        ) : (
          <span className="opacity-40 pointer-events-none">
            <ChevronLeft className="w-4 h-4 mr-1 inline" />
            Anterior
          </span>
        )}
      </Button>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="rounded-xl"
        disabled={!siguiente}
      >
        {siguiente ? (
          <Link to={hrefFor(siguiente.idModulo)}>
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        ) : (
          <span className="opacity-40 pointer-events-none">
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1 inline" />
          </span>
        )}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/classroom/ModuloNavegacion.tsx
git commit -m "feat(classroom): add ModuloNavegacion with prev/next skipping drafts for students"
```

---

## Task 13: Crear `ModuloDetailPage` (orquestador)

**Files:**
- Create: `src/app/components/classroom/ModuloDetailPage.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useApp } from '../../store/AppContext'
import { useModulo } from '@/hooks/useModulo'
import { useModulos, useCursos } from '@/hooks/useCursos'
import { useMisInscripciones } from '@/hooks/useInscripciones'
import { useMinisteriosIdsDeUsuario } from '@/hooks/useMinisterios'
import { ModuloBreadcrumb } from './ModuloBreadcrumb'
import { ModuloNavegacion } from './ModuloNavegacion'
import { ModuloContenidoEditor } from './ModuloContenidoEditor'
import { ModuloContenidoView } from './ModuloContenidoView'
import { Card } from '../ui/card'

export function ModuloDetailPage() {
  const { idCurso: idCursoStr, idModulo: idModuloStr } = useParams()
  const idCurso = Number(idCursoStr)
  const idModulo = Number(idModuloStr)
  const navigate = useNavigate()
  const { rolActual, usuarioActual } = useApp()

  const { data: modulo, isLoading: loadingModulo, error: errorModulo } = useModulo(idModulo)
  const { data: modulos = [] } = useModulos(idCurso)
  const { data: cursos = [] } = useCursos()
  const curso = cursos.find((c) => c.idCurso === idCurso)

  const { data: misInscripciones = [] } = useMisInscripciones(usuarioActual?.idUsuario)
  const { data: ministeriosIds = [] } = useMinisteriosIdsDeUsuario(usuarioActual?.idUsuario)

  const canEdit = useMemo(() => {
    if (rolActual === 'super_admin') return true
    if (!curso) return false
    if (rolActual === 'admin_iglesia') {
      // admin_iglesia: scope por iglesia. Aquí asumimos que el curso cae dentro del scope si aparece en useCursos
      // (useCursos filtra por RLS; si el curso no es accesible, ni siquiera aparece).
      return true
    }
    if (rolActual === 'lider') {
      return ministeriosIds.includes(curso.idMinisterio)
    }
    return false
  }, [rolActual, curso, ministeriosIds])

  const canReadAsStudent = useMemo(() => {
    if (canEdit) return true
    // servidor: requiere inscripción activa en algún ciclo del curso
    return misInscripciones.some(
      (i) => i.idCurso === idCurso && (i.estado === 'inscrito' || i.estado === 'en_progreso')
    )
  }, [canEdit, misInscripciones, idCurso])

  useEffect(() => {
    if (errorModulo || (modulo && !canReadAsStudent) || (modulo && !canEdit && modulo.estado !== 'publicado')) {
      toast.error('No tienes acceso a este módulo.')
      navigate('/app/mis-cursos')
    }
  }, [errorModulo, modulo, canReadAsStudent, canEdit, navigate])

  if (loadingModulo || !modulo || !curso) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Cargando módulo…
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <ModuloBreadcrumb
        cursoNombre={curso.nombre}
        idCurso={idCurso}
        moduloOrden={modulo.orden}
        moduloTitulo={modulo.titulo}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold leading-tight">{modulo.titulo}</h1>
            {modulo.descripcion && (
              <p className="text-xs text-muted-foreground mt-1">{modulo.descripcion}</p>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg bg-accent/40 shrink-0">
            {modulo.estado}
          </span>
        </div>
      </motion.div>

      <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-3xl p-5">
        {canEdit ? (
          <ModuloContenidoEditor
            idModulo={modulo.idModulo}
            idCurso={idCurso}
            contenidoInicial={modulo.contenidoMd}
          />
        ) : (
          <ModuloContenidoView contenidoMd={modulo.contenidoMd} />
        )}
      </Card>

      <ModuloNavegacion
        modulos={modulos}
        idModuloActual={modulo.idModulo}
        idCurso={idCurso}
        soloPublicados={!canEdit}
      />
    </div>
  )
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/classroom/ModuloDetailPage.tsx
git commit -m "feat(classroom): add ModuloDetailPage with role-based edit/read modes"
```

---

## Task 14: Registrar la ruta

**Files:**
- Modify: `src/app/routes.ts`

- [ ] **Step 1: Importar el componente**

En la parte superior de `src/app/routes.ts`, añadir junto con los otros imports de components:

```typescript
import { ModuloDetailPage } from "./components/classroom/ModuloDetailPage";
```

- [ ] **Step 2: Añadir la ruta dentro del bloque `/app`**

Añadir **después** de la línea con `{ path: "aula", Component: ClassroomPage, ErrorBoundary: ErrorPage }`:

```typescript
          { path: "aula/curso/:idCurso/modulo/:idModulo", Component: ModuloDetailPage, ErrorBoundary: ErrorPage },
```

- [ ] **Step 3: Compilar**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes.ts
git commit -m "feat(routes): add module detail route"
```

---

## Task 15: Botón "Abrir" en `ClassroomPage` (admin/líder)

**Files:**
- Modify: `src/app/components/ClassroomPage.tsx`

El objetivo es añadir un enlace en cada card de módulo (dentro del detalle de curso) que navega a la nueva ruta. No se toca lógica ni estilo global.

- [ ] **Step 1: Importar `Link` de react-router**

En los imports de `ClassroomPage.tsx`, si no está presente ya, añadir:

```typescript
import { Link } from "react-router";
```

- [ ] **Step 2: Localizar el render de cada módulo**

Buscar el bloque donde se mapea `modulos.map(...)` o similar en el detalle del curso (el que muestra título del módulo y acciones Editar/Eliminar). Dentro de la fila de acciones por módulo, **añadir** un enlace "Abrir" **antes** de Editar:

```tsx
<Link
  to={`/app/aula/curso/${cursoDetalle.idCurso}/modulo/${modulo.idModulo}`}
  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2 py-1 rounded-md"
>
  Abrir →
</Link>
```

Ajustar el nombre de la variable del curso (`cursoDetalle` en el ejemplo) a la que usa ese componente en esa zona.

- [ ] **Step 3: Compilar**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/ClassroomPage.tsx
git commit -m "feat(classroom): add Open link on module cards to navigate to detail"
```

---

## Task 16: Expandir `MisCursosPage` — lista de módulos + enlace (estudiante)

**Files:**
- Modify: `src/app/components/MisCursosPage.tsx`

Hoy cada tarjeta de curso inscrito no muestra los módulos. Añadimos una lista colapsable (o simple) de módulos `publicado` con enlace a la vista de detalle.

- [ ] **Step 1: Importar hooks y `Link`**

Al inicio de `MisCursosPage.tsx`, asegurar estos imports (añadir los que falten):

```typescript
import { Link } from 'react-router'
import { useModulos } from '@/hooks/useCursos'
```

- [ ] **Step 2: Crear un sub-componente `ModulosDeCurso` en el mismo archivo**

Añadir, antes de `export function MisCursosPage` (o al final del archivo, según estilo del proyecto), el sub-componente:

```tsx
function ModulosDeCurso({ idCurso }: { idCurso: number }) {
  const { data: modulos = [], isLoading } = useModulos(idCurso)
  const publicados = modulos
    .filter((m) => m.estado === 'publicado')
    .sort((a, b) => a.orden - b.orden)

  if (isLoading) {
    return <p className="text-[11px] text-muted-foreground">Cargando módulos…</p>
  }
  if (publicados.length === 0) {
    return <p className="text-[11px] text-muted-foreground italic">Aún no hay módulos publicados.</p>
  }

  return (
    <ul className="space-y-1">
      {publicados.map((m) => (
        <li key={m.idModulo}>
          <Link
            to={`/app/aula/curso/${idCurso}/modulo/${m.idModulo}`}
            className="flex items-center justify-between gap-2 text-[11px] px-2 py-1 rounded-md hover:bg-accent/40 transition-colors"
          >
            <span className="truncate">
              <span className="font-semibold">{m.orden}.</span> {m.titulo}
            </span>
            <span className="text-primary shrink-0">Abrir →</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: Mostrar la lista dentro de cada card de curso**

Localizar el bloque `<Card>` que muestra cada inscripción (dentro del `map` de `visibles`). Entre el `<Progress>` y la fila de botones (`flex items-center gap-2 pt-1`), **insertar**:

```tsx
<div className="pt-2 border-t border-white/10">
  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Módulos</p>
  <ModulosDeCurso idCurso={i.idCurso} />
</div>
```

- [ ] **Step 4: Compilar**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/MisCursosPage.tsx
git commit -m "feat(miscursos): list published modules with link to module detail"
```

---

## Task 17: Script SQL de verificación

**Files:**
- Create: `scripts/test-modulo-contenido.sql`

- [ ] **Step 1: Escribir el script**

```sql
-- Verificación de B1: contenido_md + RLS de modulo.
-- Ejecutar dentro de una transacción y finalizar con ROLLBACK: no deja estado.
-- Requiere que la DB tenga al menos 1 curso con 1 módulo publicado, 1 admin_iglesia,
-- 1 líder de otro ministerio, 1 servidor inscrito y 1 servidor NO inscrito.
-- Reemplazar los IDs marcados con <<...>> con datos reales de la DB antes de correr.

BEGIN;

-- Variables de contexto
\set id_modulo <<ID_MODULO_PUBLICADO>>
\set id_modulo_otra_iglesia <<ID_MODULO_OTRA_IGLESIA>>
\set auth_admin_iglesia '<<UUID_ADMIN_IGLESIA>>'
\set auth_lider_otro_min '<<UUID_LIDER_OTRO_MIN>>'
\set auth_servidor_inscrito '<<UUID_SERVIDOR_INSCRITO>>'
\set auth_servidor_no_inscrito '<<UUID_SERVIDOR_NO_INSCRITO>>'

-- Caso 1: admin_iglesia UPDATE contenido_md en módulo de su scope (debe afectar 1)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = :'auth_admin_iglesia';
WITH upd AS (
  UPDATE public.modulo SET contenido_md = '# test admin' WHERE id_modulo = :id_modulo RETURNING 1
)
SELECT count(*) AS rows_afectadas_admin FROM upd \gset
DO $$ BEGIN ASSERT :'rows_afectadas_admin'::int = 1, 'admin_iglesia debió actualizar 1 fila'; END $$;

-- Caso 2: líder de OTRO ministerio intenta UPDATE — debe afectar 0
SET LOCAL request.jwt.claim.sub = :'auth_lider_otro_min';
WITH upd AS (
  UPDATE public.modulo SET contenido_md = '# hack' WHERE id_modulo = :id_modulo RETURNING 1
)
SELECT count(*) AS rows_afectadas_lider_otro FROM upd \gset
DO $$ BEGIN ASSERT :'rows_afectadas_lider_otro'::int = 0, 'líder de otro ministerio NO debió actualizar'; END $$;

-- Caso 3: servidor inscrito SELECT del módulo publicado — debe devolver 1
SET LOCAL request.jwt.claim.sub = :'auth_servidor_inscrito';
SELECT count(*) AS rows_select_inscrito FROM public.modulo WHERE id_modulo = :id_modulo \gset
DO $$ BEGIN ASSERT :'rows_select_inscrito'::int = 1, 'servidor inscrito debió leer el módulo'; END $$;

-- Caso 4: servidor sin inscripción SELECT del módulo — debe devolver 0
SET LOCAL request.jwt.claim.sub = :'auth_servidor_no_inscrito';
SELECT count(*) AS rows_select_no_inscrito FROM public.modulo WHERE id_modulo = :id_modulo \gset
DO $$ BEGIN ASSERT :'rows_select_no_inscrito'::int = 0, 'servidor NO inscrito no debió leer el módulo'; END $$;

-- Caso 5: servidor inscrito intenta UPDATE contenido_md — debe afectar 0
SET LOCAL request.jwt.claim.sub = :'auth_servidor_inscrito';
WITH upd AS (
  UPDATE public.modulo SET contenido_md = 'servidor mete mano' WHERE id_modulo = :id_modulo RETURNING 1
)
SELECT count(*) AS rows_upd_servidor FROM upd \gset
DO $$ BEGIN ASSERT :'rows_upd_servidor'::int = 0, 'servidor NO debió actualizar'; END $$;

-- Caso 6: admin_iglesia NO ve módulo de otra iglesia — debe devolver 0
SET LOCAL request.jwt.claim.sub = :'auth_admin_iglesia';
SELECT count(*) AS rows_cruzado FROM public.modulo WHERE id_modulo = :id_modulo_otra_iglesia \gset
DO $$ BEGIN ASSERT :'rows_cruzado'::int = 0, 'admin_iglesia no debió ver módulo de otra iglesia'; END $$;

ROLLBACK;
```

- [ ] **Step 2: Ejecutar reemplazando IDs reales**

Obtener IDs con consultas al entorno (vía MCP `execute_sql`), sustituir los marcadores `<<...>>` en una copia temporal del script, y ejecutar. No committear la copia con datos reales.

Expected: las 6 aserciones pasan, el `ROLLBACK` deja la DB sin cambios.

Si alguna falla, investigar: policies mal, helper mal, o schema de `miembro_ministerio`/`detalle_proceso_curso` distinto del esperado.

- [ ] **Step 3: Commit el script (con placeholders)**

```bash
git add scripts/test-modulo-contenido.sql
git commit -m "test(db): SQL verification script for modulo content RLS"
```

---

## Task 18: Checklist manual de verificación por rol

Esta tarea no edita código. Es una guía para ejecutar en navegador y reportar resultados antes de cerrar la implementación.

- [ ] **Step 1: Arrancar el dev server**

```bash
npm run dev
```

Esperar a que Vite reporte la URL local.

- [ ] **Step 2: super_admin**
  - Login como `super_admin`.
  - `/app/aula` → abrir un curso → módulo → clic "Abrir" → llega a la nueva ruta.
  - Editor visible: escribir contenido con título `#`, lista `- a\n- b`, tabla GFM, enlace y `![alt](https://example.com/x.png)`.
  - Clic "Guardar" → toast "Contenido guardado".
  - Recargar la página: el contenido persiste.
  - Clic "Siguiente" → navega al módulo siguiente del curso (si existe).

- [ ] **Step 3: admin_iglesia**
  - Login como `admin_iglesia` de una iglesia específica.
  - Repite: edita contenido de un módulo de su iglesia → guarda OK.
  - URL directa a un módulo de otra iglesia → redirect a `/app/mis-cursos` + toast "No tienes acceso".

- [ ] **Step 4: lider**
  - Login como `lider` de un ministerio.
  - Edita contenido de un módulo de curso de su ministerio → OK.
  - URL directa a módulo de curso de otro ministerio → redirect.

- [ ] **Step 5: servidor inscrito**
  - Login como `servidor` con inscripción activa en un ciclo.
  - `/app/mis-cursos` → ve card del curso con la lista de módulos publicados y enlace "Abrir".
  - Clic "Abrir" → ve contenido renderizado (no editor).
  - No hay botón "Guardar".
  - Nav "Anterior/Siguiente" salta módulos en `borrador`.
  - URL directa a módulo en `borrador` → redirect.

- [ ] **Step 6: servidor NO inscrito**
  - Login como `servidor` sin ninguna inscripción.
  - URL directa a cualquier módulo → redirect + toast.

- [ ] **Step 7: Markdown con HTML crudo malicioso**
  - Como admin, editar contenido con `<script>alert('x')</script>` y también `[x](javascript:alert('y'))`.
  - Guardar y ver en modo lectura: el `<script>` no se ejecuta (queda como texto o se elimina) y el link con `javascript:` no se clickea.

- [ ] **Step 8: Reporte**

Si todos los pasos anteriores pasan, marcar B1 como cerrado. Si alguno falla, abrir issue con detalle (rol, paso, URL, toast/error visto, qué se esperaba vs qué se vio) y decidir si es fix dentro de B1 o tarea separada.

No hay commit en esta tarea.

---

## Plan Self-Review

**1. Spec coverage:**

| Spec sección / requisito | Task(s) que lo cubren |
|---|---|
| 3.1 — ADD COLUMN `contenido_md` | Task 2 |
| 3.2 — sin cambios en otras tablas | implícito (ninguna otra migración toca `curso`, `recurso`, etc.) |
| 4.1 — matriz de permisos | Task 13 (guardas UI) + Tasks 2/3 (RLS DB) |
| 4.2 — helper + policy SELECT condicional | Task 1 (auditoría) + Task 3 (migración si aplica) |
| 4.3 — guardas UI no sustituyen RLS | Task 13 (canEdit/canReadAsStudent + redirect) + Task 10 (toast on RLS error) |
| 5.1 — ruta nueva | Task 14 |
| 5.2 — estructura de página | Task 13 |
| 5.3 — sub-componentes | Tasks 9, 10, 11, 12 |
| 5.4 — hooks | Tasks 7, 8 |
| 5.5 — entradas desde ClassroomPage y MisCursosPage | Tasks 15, 16 |
| 6 — librerías nuevas | Task 6 |
| 7 — edge cases | Task 13 (redirects, nav prev/next), Task 9 (placeholder md vacío), Task 10 (soft validation 100k, toast on error), Task 12 (soloPublicados para servidor), Task 18 (markdown malicioso) |
| 8.1 — script SQL con 6 asserts | Task 17 |
| 8.2 — `npm run build` en cada paso | Tasks 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 |
| 8.3 — checklist manual por rol | Task 18 |
| 10 — plan de migraciones | Tasks 1, 2, 3 |
| 11 — dependencias con A | Task 13 usa `useMisInscripciones` (sub-proyecto A) — cubierto |

Sin gaps detectados.

**2. Placeholder scan:** el plan no contiene "TBD", "TODO", "implement later", "similar to Task N", "add error handling" sin código, ni referencias a tipos/funciones no definidos. Los marcadores `<<ID_MODULO_PUBLICADO>>` etc. en el script SQL de Task 17 son placeholders de datos de entorno (no de código), explícitos y documentados.

**3. Type consistency:**

- `Modulo.contenidoMd: string | null` — declarado en Task 5, usado en Tasks 8 (`contenidoMd` en mutation vars), 9 (`contenidoMd` prop), 10 (`contenidoInicial: string | null`, guarda con `contenidoMd`), 13 (`modulo.contenidoMd`).
- `useUpdateModuloContenido` firma con `{ idModulo, idCurso, contenidoMd }` — declarada en Task 8, usada en Task 10.
- `updateModuloContenido(idModulo, contenidoMd)` — en Task 7, consumida por Task 8.
- `can_read_modulo_as_student(p_id_modulo bigint)` — declarada en Task 3, usada por la policy del mismo archivo. No se consume en TS (es DB-only).
- `ModuloNavegacion` prop `soloPublicados: boolean` — declarada en Task 12, pasada desde Task 13 como `!canEdit`.

Sin inconsistencias.
