# SP-3: Migración de Esquema

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar las 4 migraciones de schema necesarias para soporte completo de SaaS: cursos mixtos, id_iglesia en tarea, id_iglesia en pastor, y columnas de soporte.

**Architecture:** Solo migraciones SQL + actualizar tipos TypeScript. Sin cambios de UI.

**Tech Stack:** PostgreSQL migrations, TypeScript interfaces

**Dependencia:** SP-1 debe estar completo.

---

## Archivos

| Acción | Archivo |
|---|---|
| Crear | `supabase/migrations/20260506300000_sp3_m1_aula_curso_iglesia.sql` |
| Crear | `supabase/migrations/20260506300100_sp3_m2_tarea_iglesia.sql` |
| Crear | `supabase/migrations/20260506300200_sp3_m3_pastor_iglesia.sql` |
| Crear | `supabase/migrations/20260506300300_sp3_m4_aula_inscripcion_soft_delete.sql` |
| Modificar | `src/types/app.types.ts` |
| Modificar | `src/types/database.types.ts` |
| Modificar | `src/services/aula.service.ts` |

---

### Task 1: M1 — `aula_curso` soporte cursos de iglesia

**Files:**
- Create: `supabase/migrations/20260506300000_sp3_m1_aula_curso_iglesia.sql`

- [ ] **Step 1: Crear migración M1**

```sql
-- supabase/migrations/20260506300000_sp3_m1_aula_curso_iglesia.sql
-- Permite cursos a nivel de iglesia (para todos los miembros) además de ministerio

-- Agregar columna id_iglesia nullable
ALTER TABLE public.aula_curso
  ADD COLUMN IF NOT EXISTS id_iglesia bigint REFERENCES public.iglesia(id_iglesia) ON DELETE CASCADE;

-- Hacer id_ministerio nullable (los cursos de iglesia no tienen ministerio)
ALTER TABLE public.aula_curso
  ALTER COLUMN id_ministerio DROP NOT NULL;

-- Constraint: exactamente uno de id_ministerio o id_iglesia debe estar presente
ALTER TABLE public.aula_curso
  ADD CONSTRAINT aula_curso_scope_check
  CHECK (
    (id_ministerio IS NOT NULL AND id_iglesia IS NULL)
    OR
    (id_ministerio IS NULL AND id_iglesia IS NOT NULL)
  );

-- Índice para búsquedas por iglesia
CREATE INDEX IF NOT EXISTS idx_aula_curso_iglesia
  ON public.aula_curso(id_iglesia) WHERE id_iglesia IS NOT NULL;

-- Índice para búsquedas por ministerio (ya existía, verificar)
CREATE INDEX IF NOT EXISTS idx_aula_curso_ministerio
  ON public.aula_curso(id_ministerio) WHERE id_ministerio IS NOT NULL;

-- Agregar soft delete a aula_inscripcion para consistencia
ALTER TABLE public.aula_inscripcion
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

- [ ] **Step 2: Aplicar migración**

```bash
supabase db push
```

- [ ] **Step 3: Verificar en SQL Editor**

```sql
-- Verificar constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'aula_curso_scope_check';

-- Verificar que los cursos existentes siguen válidos (todos tienen id_ministerio)
SELECT count(*) FROM aula_curso WHERE id_ministerio IS NULL AND id_iglesia IS NULL;
-- Esperado: 0
```

- [ ] **Step 4: Actualizar interfaz TypeScript**

En `src/types/app.types.ts`, la interfaz del curso del aula (puede estar como `AulaCurso` o similar):

```typescript
// Buscar y actualizar la interfaz existente del curso
// Agregar idIglesia opcional
export interface AulaCurso {
  idAulaCurso: number
  idMinisterio: number | null   // <-- cambiar de number a number | null
  idIglesia: number | null      // <-- agregar
  idUsuarioCreador: number
  titulo: string
  descripcion: string | null
  imagenUrl: string | null
  estado: 'borrador' | 'activo' | 'archivado'
  ordenSecuencial: boolean
  creadoEn: string
  updatedAt: string
  deletedAt: string | null
  // computed
  ministerioNombre?: string
  iglesiaNombre?: string
  tipo?: 'ministerio' | 'iglesia'  // campo derivado para la UI
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260506300000_sp3_m1_aula_curso_iglesia.sql \
        src/types/app.types.ts
git commit -m "feat(schema): aula_curso supports iglesia-level courses (id_ministerio nullable + id_iglesia)"
```

---

### Task 2: M2 — `tarea` con `id_iglesia` para RLS eficiente

Sin `id_iglesia` directo en `tarea`, las políticas RLS requieren un JOIN costoso `tarea → ministerio → sede → iglesia`. Esta migración agrega la columna y hace el backfill.

**Files:**
- Create: `supabase/migrations/20260506300100_sp3_m2_tarea_iglesia.sql`

- [ ] **Step 1: Crear migración M2**

```sql
-- supabase/migrations/20260506300100_sp3_m2_tarea_iglesia.sql

ALTER TABLE public.tarea
  ADD COLUMN IF NOT EXISTS id_iglesia bigint REFERENCES public.iglesia(id_iglesia) ON DELETE SET NULL;

-- Backfill desde ministerio → sede → iglesia
UPDATE public.tarea t
SET id_iglesia = (
  SELECT s.id_iglesia
  FROM public.ministerio m
  JOIN public.sede s ON s.id_sede = m.id_sede
  WHERE m.id_ministerio = t.id_ministerio
  LIMIT 1
)
WHERE t.id_ministerio IS NOT NULL
  AND t.id_iglesia IS NULL;

-- Backfill desde evento → iglesia (para tareas sin ministerio)
UPDATE public.tarea t
SET id_iglesia = (
  SELECT e.id_iglesia
  FROM public.evento e
  WHERE e.id_evento = t.id_evento
  LIMIT 1
)
WHERE t.id_evento IS NOT NULL
  AND t.id_iglesia IS NULL;

-- Índice para RLS performance
CREATE INDEX IF NOT EXISTS idx_tarea_iglesia
  ON public.tarea(id_iglesia) WHERE id_iglesia IS NOT NULL;

-- Índice compuesto para listar tareas de un ministerio en una iglesia
CREATE INDEX IF NOT EXISTS idx_tarea_iglesia_ministerio
  ON public.tarea(id_iglesia, id_ministerio);
```

- [ ] **Step 2: Aplicar migración**

```bash
supabase db push
```

- [ ] **Step 3: Verificar backfill**

```sql
-- Cuántas tareas quedaron sin id_iglesia (aceptable si son muy antiguas sin ministerio)
SELECT count(*) FROM tarea WHERE id_iglesia IS NULL;

-- Muestra las que quedaron sin id_iglesia para diagnóstico
SELECT id_tarea, titulo, id_ministerio, id_evento, id_iglesia
FROM tarea
WHERE id_iglesia IS NULL
LIMIT 10;
```

- [ ] **Step 4: Actualizar interfaz TypeScript `Tarea`**

En `src/types/app.types.ts`:

```typescript
export interface Tarea {
  idTarea: number
  titulo: string
  descripcion: string | null
  fechaLimite: string | null
  estado: 'pendiente' | 'en_progreso' | 'en_revision' | 'completada' | 'cancelada'
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  idEvento: number | null
  idUsuarioCreador: number
  idMinisterio: number | null
  idIglesia: number | null   // <-- agregar
  creadoEn: string
  actualizadoEn: string
  asignados?: TareaAsignada[]
}
```

- [ ] **Step 5: Actualizar mapper en `eventos.service.ts` o `tareas.service.ts`**

Buscar la función `mapTarea` (en `src/services/eventos.service.ts` o similar) y agregar:

```typescript
function mapTarea(r: any): Tarea {
  return {
    // ... campos existentes ...
    idMinisterio: r.id_ministerio ?? null,
    idIglesia: r.id_iglesia ?? null,   // <-- agregar
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260506300100_sp3_m2_tarea_iglesia.sql \
        src/types/app.types.ts
git commit -m "feat(schema): add id_iglesia to tarea for efficient tenant-scoped RLS"
```

---

### Task 3: M3 — `pastor` con `id_iglesia` para RLS sin join

**Files:**
- Create: `supabase/migrations/20260506300200_sp3_m3_pastor_iglesia.sql`

- [ ] **Step 1: Crear migración M3**

```sql
-- supabase/migrations/20260506300200_sp3_m3_pastor_iglesia.sql

ALTER TABLE public.pastor
  ADD COLUMN IF NOT EXISTS id_iglesia bigint REFERENCES public.iglesia(id_iglesia) ON DELETE SET NULL;

-- Backfill desde iglesia_pastor (iglesia principal activa)
UPDATE public.pastor p
SET id_iglesia = (
  SELECT ip.id_iglesia
  FROM public.iglesia_pastor ip
  WHERE ip.id_pastor = p.id_pastor
    AND ip.es_principal = true
    AND ip.fecha_fin IS NULL
  ORDER BY ip.fecha_inicio DESC
  LIMIT 1
)
WHERE p.id_iglesia IS NULL;

-- Si no tiene asignación principal, usar cualquier iglesia activa
UPDATE public.pastor p
SET id_iglesia = (
  SELECT ip.id_iglesia
  FROM public.iglesia_pastor ip
  WHERE ip.id_pastor = p.id_pastor
    AND ip.fecha_fin IS NULL
  ORDER BY ip.fecha_inicio DESC
  LIMIT 1
)
WHERE p.id_iglesia IS NULL;

CREATE INDEX IF NOT EXISTS idx_pastor_iglesia
  ON public.pastor(id_iglesia) WHERE id_iglesia IS NOT NULL;

-- Trigger para mantener id_iglesia sincronizado con iglesia_pastor
CREATE OR REPLACE FUNCTION public.sync_pastor_iglesia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.es_principal AND NEW.fecha_fin IS NULL THEN
    UPDATE public.pastor
    SET id_iglesia = NEW.id_iglesia
    WHERE id_pastor = NEW.id_pastor;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_pastor_iglesia_trigger ON public.iglesia_pastor;
CREATE TRIGGER sync_pastor_iglesia_trigger
  AFTER INSERT OR UPDATE ON public.iglesia_pastor
  FOR EACH ROW EXECUTE FUNCTION public.sync_pastor_iglesia();
```

- [ ] **Step 2: Aplicar migración**

```bash
supabase db push
```

- [ ] **Step 3: Verificar backfill**

```sql
SELECT count(*) FROM pastor WHERE id_iglesia IS NULL;
-- Si hay pastores sin iglesia, son pastores no asignados — OK

SELECT p.id_pastor, p.nombres, p.id_iglesia, i.nombre as iglesia_nombre
FROM pastor p
LEFT JOIN iglesia i ON i.id_iglesia = p.id_iglesia
LIMIT 10;
```

- [ ] **Step 4: Actualizar interfaz TypeScript `Pastor`**

En `src/types/app.types.ts`:

```typescript
export interface Pastor {
  idPastor: number
  nombres: string
  apellidos: string
  correo: string
  telefono: string | null
  idUsuario: number | null
  idIglesia: number | null   // <-- agregar
  creadoEn: string
  actualizadoEn: string
  // computed
  iglesiaNombre?: string
}
```

- [ ] **Step 5: Actualizar mapper en `iglesias.service.ts`**

```typescript
function mapPastor(r: PastorRow): Pastor {
  return {
    idPastor: r.id_pastor,
    nombres: r.nombres,
    apellidos: r.apellidos,
    correo: r.correo,
    telefono: r.telefono,
    idUsuario: r.id_usuario,
    idIglesia: (r as any).id_iglesia ?? null,  // hasta regenerar database.types.ts
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260506300200_sp3_m3_pastor_iglesia.sql \
        src/types/app.types.ts \
        src/services/iglesias.service.ts
git commit -m "feat(schema): add id_iglesia to pastor with auto-sync trigger from iglesia_pastor"
```

---

### Task 4: M4 — Índices FK faltantes para performance

Supabase advisor reporta FKs sin índices. Agregar los críticos para las queries más frecuentes.

**Files:**
- Create: `supabase/migrations/20260506300300_sp3_m4_aula_inscripcion_soft_delete.sql`

- [ ] **Step 1: Crear migración M4**

```sql
-- supabase/migrations/20260506300300_sp3_m4_aula_inscripcion_soft_delete.sql

-- Soft delete en aula_inscripcion (consistencia con el resto del schema)
-- Ya se agrega en M1, verificar que no duplica
ALTER TABLE public.aula_inscripcion
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índices FK faltantes críticos para performance
CREATE INDEX IF NOT EXISTS idx_iglesia_pastor_id_iglesia ON public.iglesia_pastor(id_iglesia);
CREATE INDEX IF NOT EXISTS idx_iglesia_pastor_id_pastor ON public.iglesia_pastor(id_pastor);
CREATE INDEX IF NOT EXISTS idx_sede_pastor_id_sede ON public.sede_pastor(id_sede);
CREATE INDEX IF NOT EXISTS idx_sede_pastor_id_pastor ON public.sede_pastor(id_pastor);
CREATE INDEX IF NOT EXISTS idx_miembro_ministerio_id_usuario ON public.miembro_ministerio(id_usuario);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_id_iglesia ON public.usuario_rol(id_iglesia);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_id_usuario ON public.usuario_rol(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_curso_id_usuario_creador ON public.aula_curso(id_usuario_creador);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_id_usuario ON public.aula_inscripcion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_id_aula_curso ON public.aula_inscripcion(id_aula_curso);
CREATE INDEX IF NOT EXISTS idx_notificacion_id_usuario ON public.notificacion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_tarea_asignada_id_usuario ON public.tarea_asignada(id_usuario);
CREATE INDEX IF NOT EXISTS idx_tarea_id_usuario_creador ON public.tarea(id_usuario_creador);
```

- [ ] **Step 2: Aplicar migración**

```bash
supabase db push
```

- [ ] **Step 3: Verificar índices creados**

```sql
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260506300300_sp3_m4_aula_inscripcion_soft_delete.sql
git commit -m "feat(schema): add missing FK indexes for RLS performance + aula_inscripcion soft delete"
```
