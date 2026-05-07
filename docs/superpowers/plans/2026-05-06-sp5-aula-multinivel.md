# SP-5: Aula de Formación Multi-Nivel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaptar el módulo Aula para soportar cursos a nivel de iglesia (visibles para todos los miembros) y cursos a nivel de ministerio (solo para ese ministerio), con RLS y UI diferenciada.

**Architecture:** `aula_curso` ya tiene `id_iglesia` nullable (SP-3 M1). La distinción es: `tipo = 'iglesia'` cuando `id_iglesia IS NOT NULL`, `tipo = 'ministerio'` cuando `id_ministerio IS NOT NULL`. La UI muestra ambos tipos con badges diferenciadores.

**Tech Stack:** React 18, TypeScript, Supabase RLS, `aula.service.ts`

**Dependencia:** SP-3 (M1: `aula_curso.id_iglesia`) y SP-4 (rutas tenant) deben estar completos.

---

## Archivos

| Acción | Archivo |
|---|---|
| Crear | `supabase/migrations/20260506400000_sp5_aula_rls_multinivel.sql` |
| Modificar | `src/services/aula.service.ts` |
| Modificar | `src/hooks/useCursos.ts` |
| Modificar | `src/app/components/AulaPage.tsx` |
| Modificar | `src/app/components/AdminAulaPage.tsx` |
| Modificar | `src/app/components/LiderAulaPage.tsx` |
| Modificar | `src/app/components/CrearCursoDialog.tsx` |

---

### Task 1: RLS para `aula_curso` multi-nivel

**Files:**
- Create: `supabase/migrations/20260506400000_sp5_aula_rls_multinivel.sql`

- [x] **Step 1: Crear migración**

```sql
-- supabase/migrations/20260506400000_sp5_aula_rls_multinivel.sql

-- Eliminar política permisiva existente
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.aula_curso;
-- La política de super_admin ya existe (20260506021606)

-- SELECT: ver cursos de tu iglesia (nivel iglesia) o de tus ministerios (nivel ministerio)
CREATE POLICY "aula_curso_select_tenant" ON public.aula_curso
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    -- Curso de iglesia: si eres miembro de esa iglesia
    OR (
      id_iglesia IS NOT NULL
      AND id_iglesia = get_my_tenant_id()
    )
    -- Curso de ministerio: si perteneces a ese ministerio
    OR (
      id_ministerio IS NOT NULL
      AND id_ministerio IN (SELECT id FROM get_my_ministerios())
    )
    -- Admin ve todos los cursos de su iglesia (tanto nivel iglesia como ministerio)
    OR (
      is_admin_iglesia()
      AND (
        id_iglesia = get_my_tenant_id()
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE s.id_iglesia = get_my_tenant_id()
        )
      )
    )
  );

-- INSERT: admin crea cursos de iglesia, lider crea cursos de ministerio
CREATE POLICY "aula_curso_insert" ON public.aula_curso
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND (
        -- Curso de iglesia propio
        (id_iglesia IS NOT NULL AND id_iglesia = get_my_tenant_id())
        -- Curso de ministerio en su iglesia
        OR (
          id_ministerio IS NOT NULL
          AND id_ministerio IN (
            SELECT m.id_ministerio FROM public.ministerio m
            JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE s.id_iglesia = get_my_tenant_id()
          )
        )
      )
    )
    -- Lider crea cursos solo de sus ministerios
    OR (
      get_my_role() = 'lider'
      AND id_ministerio IS NOT NULL
      AND id_ministerio IN (SELECT id FROM get_my_ministerios())
    )
  );

-- UPDATE/DELETE: mismo scope que INSERT
CREATE POLICY "aula_curso_update" ON public.aula_curso
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND (
      id_iglesia = get_my_tenant_id()
      OR id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE s.id_iglesia = get_my_tenant_id()
      )
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  )
  WITH CHECK (
    is_super_admin()
    OR is_admin_iglesia()
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

-- aula_inscripcion: usuario puede inscribirse si tiene acceso al curso
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.aula_inscripcion;

CREATE POLICY "aula_inscripcion_select" ON public.aula_inscripcion
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_iglesia = get_my_tenant_id()
         OR ac.id_ministerio IN (
           SELECT m.id_ministerio FROM public.ministerio m
           JOIN public.sede s ON s.id_sede = m.id_sede
           WHERE s.id_iglesia = get_my_tenant_id()
         )
    ))
    OR (get_my_role() = 'lider' AND id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_ministerio IN (SELECT id FROM get_my_ministerios())
    ))
  );

CREATE POLICY "aula_inscripcion_insert" ON public.aula_inscripcion
  FOR INSERT TO authenticated
  WITH CHECK (
    id_usuario = get_my_usuario_id()
    OR is_super_admin()
    OR is_admin_iglesia()
    OR (get_my_role() = 'lider' AND id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_ministerio IN (SELECT id FROM get_my_ministerios())
    ))
  );
```

- [x] **Step 2: Aplicar migración**

```bash
supabase db push
```

- [x] **Step 3: Verificar en SQL Editor**

```sql
-- Como lider autenticado, no debe ver cursos de otro ministerio
SELECT id_aula_curso, titulo, id_ministerio, id_iglesia
FROM aula_curso
LIMIT 20;
```

- [x] **Step 4: Commit**

```bash
git add supabase/migrations/20260506400000_sp5_aula_rls_multinivel.sql
git commit -m "feat(rls): scope aula_curso to iglesia-level and ministerio-level access"
```

---

### Task 2: Actualizar `aula.service.ts` para cursos mixtos

**Files:**
- Modify: `src/services/aula.service.ts`

- [x] **Step 1: Actualizar función `getCursos`**

En `src/services/aula.service.ts`, buscar la función que obtiene cursos y actualizarla para soportar ambos tipos:

```typescript
export type TipoCurso = 'ministerio' | 'iglesia'

export interface AulaCursoEnriquecido {
  idAulaCurso: number
  titulo: string
  descripcion: string | null
  imagenUrl: string | null
  estado: 'borrador' | 'activo' | 'archivado'
  ordenSecuencial: boolean
  idMinisterio: number | null
  idIglesia: number | null
  idUsuarioCreador: number
  tipo: TipoCurso
  ministerioNombre?: string
  iglesiaNombre?: string
  creadoEn: string
  updatedAt: string
}

export async function getCursosParaUsuario(params: {
  idIglesia?: number
  idMinisterios?: number[]
}): Promise<AulaCursoEnriquecido[]> {
  let query = supabase
    .from('aula_curso')
    .select(`
      *,
      ministerio:id_ministerio(nombre),
      iglesia:id_iglesia(nombre)
    `)
    .is('deleted_at', null)
    .eq('estado', 'activo')
    .order('creado_en', { ascending: false })

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((r: any) => ({
    idAulaCurso: r.id_aula_curso,
    titulo: r.titulo,
    descripcion: r.descripcion,
    imagenUrl: r.imagen_url,
    estado: r.estado,
    ordenSecuencial: r.orden_secuencial,
    idMinisterio: r.id_ministerio,
    idIglesia: r.id_iglesia,
    idUsuarioCreador: r.id_usuario_creador,
    tipo: r.id_iglesia ? 'iglesia' : 'ministerio',
    ministerioNombre: r.ministerio?.nombre ?? null,
    iglesiaNombre: r.iglesia?.nombre ?? null,
    creadoEn: r.creado_en,
    updatedAt: r.updated_at,
  }))
}

export async function crearCurso(params: {
  titulo: string
  descripcion?: string
  idMinisterio?: number | null
  idIglesia?: number | null
  idUsuarioCreador: number
  ordenSecuencial?: boolean
}): Promise<AulaCursoEnriquecido> {
  if (!params.idMinisterio && !params.idIglesia) {
    throw new Error('Un curso debe pertenecer a un ministerio o a una iglesia')
  }
  if (params.idMinisterio && params.idIglesia) {
    throw new Error('Un curso no puede pertenecer a un ministerio y a una iglesia al mismo tiempo')
  }

  const { data, error } = await supabase
    .from('aula_curso')
    .insert({
      titulo: params.titulo,
      descripcion: params.descripcion ?? null,
      id_ministerio: params.idMinisterio ?? null,
      id_iglesia: params.idIglesia ?? null,
      id_usuario_creador: params.idUsuarioCreador,
      orden_secuencial: params.ordenSecuencial ?? true,
      estado: 'borrador',
    })
    .select(`*, ministerio:id_ministerio(nombre), iglesia:id_iglesia(nombre)`)
    .single()

  if (error) throw error

  return {
    idAulaCurso: data.id_aula_curso,
    titulo: data.titulo,
    descripcion: data.descripcion,
    imagenUrl: data.imagen_url,
    estado: data.estado,
    ordenSecuencial: data.orden_secuencial,
    idMinisterio: data.id_ministerio,
    idIglesia: data.id_iglesia,
    idUsuarioCreador: data.id_usuario_creador,
    tipo: data.id_iglesia ? 'iglesia' : 'ministerio',
    ministerioNombre: (data as any).ministerio?.nombre ?? null,
    iglesiaNombre: (data as any).iglesia?.nombre ?? null,
    creadoEn: data.creado_en,
    updatedAt: data.updated_at,
  }
}
```

- [x] **Step 2: Commit**

```bash
git add src/services/aula.service.ts
git commit -m "feat(aula): update service to support iglesia-level and ministerio-level courses"
```

---

### Task 3: Actualizar `CrearCursoDialog.tsx` para elegir tipo de curso

**Files:**
- Modify: `src/app/components/CrearCursoDialog.tsx`

- [x] **Step 1: Agregar selector de tipo de curso**

En el dialog de creación, agregar campo "Nivel del curso":

```typescript
// En el formulario del dialog, agregar:
const [tipoCurso, setTipoCurso] = useState<'ministerio' | 'iglesia'>('ministerio')

// UI selector (solo visible para admin_iglesia, lider solo ve 'ministerio')
{rolActual === 'admin_iglesia' && (
  <div className="space-y-2">
    <label className="text-sm font-medium">Nivel del curso</label>
    <div className="flex gap-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          value="ministerio"
          checked={tipoCurso === 'ministerio'}
          onChange={() => setTipoCurso('ministerio')}
        />
        <span className="text-sm">Ministerio</span>
        <span className="text-xs text-muted-foreground">(solo para el ministerio seleccionado)</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          value="iglesia"
          checked={tipoCurso === 'iglesia'}
          onChange={() => setTipoCurso('iglesia')}
        />
        <span className="text-sm">Iglesia</span>
        <span className="text-xs text-muted-foreground">(para todos los miembros de la iglesia)</span>
      </label>
    </div>
  </div>
)}

{/* Selector de ministerio solo si tipo = 'ministerio' */}
{tipoCurso === 'ministerio' && (
  <MinisterioSelector ... />
)}
```

Al guardar, pasar el campo correcto:
```typescript
await crearCurso({
  titulo: form.titulo,
  descripcion: form.descripcion,
  idMinisterio: tipoCurso === 'ministerio' ? selectedMinisterio : null,
  idIglesia: tipoCurso === 'iglesia' ? idIglesiaActual : null,
  idUsuarioCreador: usuarioActual.idUsuario,
})
```

- [x] **Step 2: Commit**

```bash
git add src/app/components/CrearCursoDialog.tsx
git commit -m "feat(aula): add course type selector (iglesia vs ministerio) in create dialog"
```

---

### Task 4: Actualizar `AulaPage.tsx` — mostrar cursos con badge de tipo

**Files:**
- Modify: `src/app/components/AulaPage.tsx`

- [x] **Step 1: Agregar badge de tipo en las tarjetas de curso**

En la renderización de cada curso, agregar un badge visual:

```typescript
import { Badge } from "@/app/components/ui/badge";

// En la tarjeta de cada curso:
<div className="flex items-center gap-2 mb-2">
  <Badge
    variant={curso.tipo === 'iglesia' ? 'default' : 'secondary'}
    className={curso.tipo === 'iglesia'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-amber-100 text-amber-700 border-amber-200'
    }
  >
    {curso.tipo === 'iglesia' ? '🏛️ Iglesia' : '⛪ Ministerio'}
  </Badge>
  {curso.tipo === 'ministerio' && curso.ministerioNombre && (
    <span className="text-xs text-muted-foreground">{curso.ministerioNombre}</span>
  )}
</div>
```

- [x] **Step 2: Agregar filtro por tipo en la UI**

```typescript
// Botones de filtro sobre la lista de cursos
const [filtroTipo, setFiltroTipo] = useState<'todos' | 'iglesia' | 'ministerio'>('todos')

const cursosFiltrados = cursos.filter(c =>
  filtroTipo === 'todos' ? true : c.tipo === filtroTipo
)

// UI:
<div className="flex gap-2 mb-4">
  {(['todos', 'iglesia', 'ministerio'] as const).map(tipo => (
    <button
      key={tipo}
      onClick={() => setFiltroTipo(tipo)}
      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
        filtroTipo === tipo
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background border-border text-muted-foreground hover:bg-muted'
      }`}
    >
      {tipo === 'todos' ? 'Todos' : tipo === 'iglesia' ? '🏛️ Iglesia' : '⛪ Ministerio'}
    </button>
  ))}
</div>
```

- [x] **Step 3: Commit**

```bash
git add src/app/components/AulaPage.tsx
git commit -m "feat(aula): show course type badge and filter by iglesia/ministerio"
```

---

### Task 5: Verificación end-to-end del Aula multi-nivel

- [x] **Step 1: Como admin_iglesia**
  - Ir a `/app/:idIglesia/aula`
  - Crear un curso de tipo "Iglesia" — debe guardarse con `id_iglesia` e `id_ministerio = null`
  - Crear un curso de tipo "Ministerio" — debe guardar con `id_ministerio` y `id_iglesia = null`
  - Verificar que ambos aparecen con sus badges respectivos

- [x] **Step 2: Como lider**
  - Solo debe ver: cursos de su ministerio + cursos de iglesia
  - Solo puede crear cursos de tipo "Ministerio"
  - No debe ver cursos de otros ministerios

- [x] **Step 3: Como servidor**
  - Solo puede ver cursos: de su ministerio + de iglesia
  - No puede crear cursos

- [x] **Step 4: Commit final**

```bash
git add .
git commit -m "feat(sp5): complete aula multi-level (iglesia + ministerio courses) with RLS and UI"
```
