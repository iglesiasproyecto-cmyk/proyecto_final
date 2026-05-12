# Tasks & Events Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the Tasks & Events module from basic CRUD into a collaborative, traceable, mobile-first ministry operations system with Kanban drag-and-drop, activity timeline, checklists, comments, approval flow, and M2M event-ministry relationships.

**Architecture:** 4 sequential phases — (1) DB migrations + RLS + RPCs via Supabase MCP, (2) atomic frontend components replacing monolithic TasksPage/EventsPage, (3) mobile-first UX enhancements, (4) performance layer (optimistic updates, Realtime, pagination). Each phase is independently deployable. All new components use the existing visual identity (`#709dbd`/`#4682b4` palette, glassmorphism, bold uppercase tracking).

**Tech Stack:** Supabase (PostgreSQL + RLS + Realtime + Storage), React 18, React Query v5, Framer Motion, dnd-kit, shadcn/ui, Tailwind CSS v4, Lucide icons.

---

## File Structure

### New Files Created

```
supabase/migrations/20260511_fase1_eventos_tareas_backend.sql

src/
├── app/components/tasks/
│   ├── TaskSidePanel.tsx
│   ├── TaskTimeline.tsx
│   ├── TaskChecklistSection.tsx
│   ├── TaskEvidenceSection.tsx
│   ├── TaskCommentSection.tsx
│   ├── TaskApprovalSection.tsx
│   ├── KanbanBoard.tsx
│   ├── KanbanColumn.tsx
│   ├── TaskCard.tsx
│   └── CreateTaskSheet.tsx
├── app/components/events/
│   ├── EventSidePanel.tsx
│   ├── EventMinistriesSection.tsx
│   └── CreateEventSheet.tsx
├── hooks/
│   ├── useTareaTimeline.ts
│   ├── useTareaComentarios.ts
│   ├── useTareaChecklist.ts
│   ├── useTareaAprobacion.ts
│   ├── useEventoMinisterios.ts
│   └── useMediaQuery.ts
├── services/
│   ├── tareaTimeline.service.ts
│   ├── tareaComentarios.service.ts
│   ├── tareaChecklist.service.ts
│   ├── tareaAprobacion.service.ts
│   └── eventoMinisterios.service.ts
```

### Files Modified

```
src/app/components/TasksPage.tsx (refactor ~886 → ~200 lines)
src/app/components/EventsPage.tsx (refactor ~564 → ~250 lines)
src/types/app.types.ts (add new interfaces)
src/hooks/useEventos.ts (add new mutations)
src/services/eventos.service.ts (add new RPC calls)
```

---

## Phase 1 — Database Backend

### Task 1: Migration — `evento_ministerio` Table + RLS

**Files:**
- Create: `supabase/migrations/20260511_fase1_eventos_tareas_backend.sql` (lines 1-80)

- [ ] **Step 1: Write the migration SQL for evento_ministerio**

```sql
-- ==============================================================================
-- PHASE 1: Tasks & Events Backend Enhancement
-- New tables supporting: evento_ministerio (M2M), tarea_historial,
-- tarea_comentario, tarea_checklist, tarea_aprobacion
-- ==============================================================================

-- 1. EVENTO_MINISTERIO (replaces single FK with M2M junction)
CREATE TABLE IF NOT EXISTS public.evento_ministerio (
  id_evento_ministerio BIGSERIAL PRIMARY KEY,
  id_evento BIGINT NOT NULL REFERENCES public.evento(id_evento) ON DELETE CASCADE,
  id_ministerio BIGINT NOT NULL REFERENCES public.ministerio(id_ministerio) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_evento, id_ministerio)
);

CREATE INDEX IF NOT EXISTS idx_evento_ministerio_evento ON public.evento_ministerio(id_evento);
CREATE INDEX IF NOT EXISTS idx_evento_ministerio_ministerio ON public.evento_ministerio(id_ministerio);

ALTER TABLE public.evento_ministerio ENABLE ROW LEVEL SECURITY;

-- SELECT policy: same scope as evento
CREATE POLICY "EventoMinisterio select" ON public.evento_ministerio
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_ministerio.id_evento
        AND (
          public.is_admin_iglesia() AND e.id_iglesia = public.get_my_tenant_id()
          OR EXISTS (
            SELECT 1 FROM public.miembro_ministerio mm
            WHERE mm.id_usuario = public.current_usuario_id()
              AND mm.id_ministerio = evento_ministerio.id_ministerio
              AND mm.fecha_salida IS NULL
          )
        )
    )
  );

-- INSERT policy: admin or lider of that ministry
CREATE POLICY "EventoMinisterio insert gestion" ON public.evento_ministerio
  FOR INSERT TO authenticated WITH CHECK (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
  );

-- DELETE policy: same scope as insert
CREATE POLICY "EventoMinisterio delete gestion" ON public.evento_ministerio
  FOR DELETE TO authenticated USING (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
  );
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: `supabase_apply_migration` with name `"fase1_eventos_tareas_backend"` and the full SQL from Step 1.

Expected: Migration applied successfully, no errors.

- [ ] **Step 3: Verify table exists**

Run via `supabase_execute_sql`:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evento_ministerio';
```
Expected: 1 row returned.

- [ ] **Step 4: Verify RLS policies created**

Run via `supabase_execute_sql`:
```sql
SELECT policyname, permissive, cmd FROM pg_policies WHERE tablename = 'evento_ministerio';
```
Expected: 3 rows (select, insert, delete).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260511_fase1_eventos_tareas_backend.sql
git commit -m "feat(db): add evento_ministerio M2M table with RLS"
```

### Task 2: Migration — `tarea_historial` Table + RLS + Auto-Trigger

**Files:**
- Modify: `supabase/migrations/20260511_fase1_eventos_tareas_backend.sql` (append lines 81-170)

- [ ] **Step 1: Append migration SQL for tarea_historial**

```sql
-- 2. TAREA_HISTORIAL (event-sourcing-light activity log)
CREATE TABLE IF NOT EXISTS public.tarea_historial (
  id_tarea_historial BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  id_usuario BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  accion VARCHAR(50) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  metadata JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_historial_tarea ON public.tarea_historial(id_tarea, creado_en DESC);

ALTER TABLE public.tarea_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TareaHistorial select" ON public.tarea_historial
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tarea t
      WHERE t.id_tarea = tarea_historial.id_tarea
        AND (
          (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.ministerio m
            JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (
            SELECT 1 FROM public.tarea_asignada ta
            WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id()
          )
        )
    )
  );

-- Auto-trigger: log estado changes on tarea UPDATE
CREATE OR REPLACE FUNCTION public.log_tarea_historial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.tarea_historial (id_tarea, id_usuario, accion, valor_anterior, valor_nuevo)
    VALUES (
      NEW.id_tarea,
      COALESCE(public.current_usuario_id(), NEW.id_usuario_creador),
      'cambio_estado',
      OLD.estado::text,
      NEW.estado::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tarea_historial ON public.tarea;
CREATE TRIGGER trg_tarea_historial
  AFTER UPDATE ON public.tarea
  FOR EACH ROW EXECUTE FUNCTION public.log_tarea_historial();
```

- [ ] **Step 2: Apply migration**

Run `supabase_apply_migration` with the updated SQL file.

- [ ] **Step 3: Verify trigger**

```sql
SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name = 'trg_tarea_historial';
```
Expected: 1 row.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260511_fase1_eventos_tareas_backend.sql
git commit -m "feat(db): add tarea_historial table with auto-trigger and RLS"
```

### Task 3: Migration — `tarea_comentario` + `tarea_checklist` + `tarea_aprobacion`

**Files:**
- Modify: `supabase/migrations/20260511_fase1_eventos_tareas_backend.sql` (append lines 171-350)

- [ ] **Step 1: Append SQL for remaining tables**

```sql
-- 3. TAREA_COMENTARIO
CREATE TABLE IF NOT EXISTS public.tarea_comentario (
  id_tarea_comentario BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  id_usuario BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_comentario_tarea ON public.tarea_comentario(id_tarea, creado_en ASC);
ALTER TABLE public.tarea_comentario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TareaComentario select" ON public.tarea_comentario
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tarea t
      WHERE t.id_tarea = tarea_comentario.id_tarea
        AND (
          (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.ministerio m JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (
            SELECT 1 FROM public.tarea_asignada ta
            WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id()
          )
        )
    )
  );

CREATE POLICY "TareaComentario insert" ON public.tarea_comentario
  FOR INSERT TO authenticated WITH CHECK (
    id_usuario = public.current_usuario_id()
    AND EXISTS (
      SELECT 1 FROM public.tarea t LEFT JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
      WHERE t.id_tarea = tarea_comentario.id_tarea
        AND (
          public.is_super_admin()
          OR (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.sede s WHERE s.id_sede = m.id_sede AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (
            SELECT 1 FROM public.tarea_asignada ta
            WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id()
          )
        )
    )
  );

CREATE POLICY "TareaComentario delete own" ON public.tarea_comentario
  FOR DELETE TO authenticated USING (id_usuario = public.current_usuario_id());

-- 4. TAREA_CHECKLIST
CREATE TABLE IF NOT EXISTS public.tarea_checklist (
  id_tarea_checklist BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  completada BOOLEAN NOT NULL DEFAULT FALSE,
  orden INT NOT NULL DEFAULT 0,
  completada_por BIGINT REFERENCES public.usuario(id_usuario),
  completada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_checklist_tarea ON public.tarea_checklist(id_tarea, orden ASC);
ALTER TABLE public.tarea_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TareaChecklist select" ON public.tarea_checklist
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tarea t
      WHERE t.id_tarea = tarea_checklist.id_tarea
        AND (
          (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.ministerio m JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (SELECT 1 FROM public.tarea_asignada ta WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id())
        )
    )
  );

CREATE POLICY "TareaChecklist insert gestion" ON public.tarea_checklist
  FOR INSERT TO authenticated WITH CHECK (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_tarea IN (
      SELECT t.id_tarea FROM public.tarea t WHERE t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
    ))
  );

CREATE POLICY "TareaChecklist update" ON public.tarea_checklist
  FOR UPDATE TO authenticated USING (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_tarea IN (
      SELECT t.id_tarea FROM public.tarea t WHERE t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
    ))
    OR EXISTS (
      SELECT 1 FROM public.tarea_asignada ta
      WHERE ta.id_tarea = tarea_checklist.id_tarea AND ta.id_usuario = public.current_usuario_id()
    )
  ) WITH CHECK (true);

CREATE POLICY "TareaChecklist delete gestion" ON public.tarea_checklist
  FOR DELETE TO authenticated USING (
    public.is_super_admin()
    OR public.is_admin_iglesia()
  );

-- 5. TAREA_APROBACION
CREATE TABLE IF NOT EXISTS public.tarea_aprobacion (
  id_tarea_aprobacion BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  id_usuario BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('aprobar', 'rechazar', 'reabrir')),
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_aprobacion_tarea ON public.tarea_aprobacion(id_tarea, creado_en DESC);
ALTER TABLE public.tarea_aprobacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TareaAprobacion select" ON public.tarea_aprobacion
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tarea t
      WHERE t.id_tarea = tarea_aprobacion.id_tarea
        AND (
          (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.ministerio m JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (SELECT 1 FROM public.tarea_asignada ta WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id())
        )
    )
  );

CREATE POLICY "TareaAprobacion insert" ON public.tarea_aprobacion
  FOR INSERT TO authenticated WITH CHECK (
    id_usuario = public.current_usuario_id()
    AND (
      public.is_super_admin()
      OR public.is_admin_iglesia()
      OR (public.is_lider() AND id_tarea IN (
        SELECT t.id_tarea FROM public.tarea t WHERE t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
      ))
    )
  );
```

- [ ] **Step 2: Apply migration**

Run `supabase_apply_migration`.

- [ ] **Step 3: Verify all 4 tables**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('tarea_comentario','tarea_checklist','tarea_aprobacion','evento_ministerio')
ORDER BY table_name;
```
Expected: 4 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260511_fase1_eventos_tareas_backend.sql
git commit -m "feat(db): add tarea_comentario, tarea_checklist, tarea_aprobacion tables with RLS"
```

### Task 4: Migration — New Indexes for Performance

**Files:**
- Modify: `supabase/migrations/20260511_fase1_eventos_tareas_backend.sql` (append lines 351-370)

- [ ] **Step 1: Append indexes**

```sql
-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_tarea_estado_iglesia ON public.tarea(estado, id_iglesia);
CREATE INDEX IF NOT EXISTS idx_tarea_creado_en ON public.tarea(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_evento_fecha_inicio_iglesia ON public.evento(fecha_inicio DESC, id_iglesia);
```

- [ ] **Step 2: Apply migration**

Run `supabase_apply_migration`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260511_fase1_eventos_tareas_backend.sql
git commit -m "perf(db): add performance indexes for tarea and evento queries"
```

### Task 5: Migration — New RPCs

**Files:**
- Modify: `supabase/migrations/20260511_fase1_eventos_tareas_backend.sql` (append lines 371-510)

- [ ] **Step 1: Append RPC: create_evento_with_ministerios**

```sql
-- 7. NEW RPCS
-- 7a. Create evento with multiple ministerios (transactional)
CREATE OR REPLACE FUNCTION public.create_evento_with_ministerios(
  p_nombre TEXT,
  p_descripcion TEXT DEFAULT NULL,
  p_tipo_evento_texto TEXT DEFAULT NULL,
  p_fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
  p_fecha_fin TIMESTAMPTZ DEFAULT NOW(),
  p_id_iglesia BIGINT,
  p_id_sede BIGINT DEFAULT NULL,
  p_id_ministerios BIGINT[] DEFAULT '{}'
)
RETURNS public.evento
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento public.evento;
  v_min_id BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.evento (
    nombre, descripcion, tipo_evento_texto,
    fecha_inicio, fecha_fin, estado,
    id_iglesia, id_sede
  ) VALUES (
    p_nombre, p_descripcion, p_tipo_evento_texto,
    p_fecha_inicio, p_fecha_fin, 'programado',
    p_id_iglesia, p_id_sede
  )
  RETURNING * INTO v_evento;

  FOREACH v_min_id IN ARRAY p_id_ministerios LOOP
    INSERT INTO public.evento_ministerio (id_evento, id_ministerio)
    VALUES (v_evento.id_evento, v_min_id)
    ON CONFLICT (id_evento, id_ministerio) DO NOTHING;
  END LOOP;

  RETURN v_evento;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_evento_with_ministerios(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BIGINT, BIGINT, BIGINT[]) TO authenticated;

-- 7b. Get unified task timeline
CREATE OR REPLACE FUNCTION public.get_tarea_timeline(p_id_tarea BIGINT)
RETURNS TABLE(
  id BIGINT,
  tipo VARCHAR(20),
  accion TEXT,
  id_usuario BIGINT,
  nombre_completo TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  contenido TEXT,
  metadata JSONB,
  creado_en TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id_tarea_historial AS id,
    'historial'::VARCHAR(20) AS tipo,
    h.accion,
    h.id_usuario,
    (SELECT CONCAT(u.nombres, ' ', u.apellidos) FROM public.usuario u WHERE u.id_usuario = h.id_usuario) AS nombre_completo,
    h.valor_anterior,
    h.valor_nuevo,
    NULL::TEXT AS contenido,
    h.metadata,
    h.creado_en
  FROM public.tarea_historial h
  WHERE h.id_tarea = p_id_tarea

  UNION ALL

  SELECT
    c.id_tarea_comentario AS id,
    'comentario'::VARCHAR(20) AS tipo,
    'comentario' AS accion,
    c.id_usuario,
    (SELECT CONCAT(u.nombres, ' ', u.apellidos) FROM public.usuario u WHERE u.id_usuario = c.id_usuario),
    NULL, NULL,
    c.contenido,
    NULL::JSONB,
    c.creado_en
  FROM public.tarea_comentario c
  WHERE c.id_tarea = p_id_tarea

  UNION ALL

  SELECT
    a.id_tarea_aprobacion AS id,
    'aprobacion'::VARCHAR(20) AS tipo,
    a.accion,
    a.id_usuario,
    (SELECT CONCAT(u.nombres, ' ', u.apellidos) FROM public.usuario u WHERE u.id_usuario = a.id_usuario),
    NULL, NULL,
    a.observaciones,
    NULL::JSONB,
    a.creado_en
  FROM public.tarea_aprobacion a
  WHERE a.id_tarea = p_id_tarea

  ORDER BY creado_en DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tarea_timeline(BIGINT) TO authenticated;

-- 7c. Toggle checklist item with auto-logging
CREATE OR REPLACE FUNCTION public.toggle_tarea_checklist(
  p_id_checklist BIGINT,
  p_completada BOOLEAN
)
RETURNS public.tarea_checklist
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.tarea_checklist;
  v_id_tarea BIGINT;
BEGIN
  SELECT id_tarea INTO v_id_tarea FROM public.tarea_checklist WHERE id_tarea_checklist = p_id_checklist;
  IF v_id_tarea IS NULL THEN RAISE EXCEPTION 'Checklist item not found'; END IF;

  UPDATE public.tarea_checklist
  SET
    completada = p_completada,
    completada_por = CASE WHEN p_completada THEN public.current_usuario_id() ELSE NULL END,
    completada_en = CASE WHEN p_completada THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id_tarea_checklist = p_id_checklist
  RETURNING * INTO v_result;

  INSERT INTO public.tarea_historial (id_tarea, id_usuario, accion, valor_anterior, valor_nuevo, metadata)
  VALUES (
    v_id_tarea,
    public.current_usuario_id(),
    CASE WHEN p_completada THEN 'checklist_completado' ELSE 'checklist_desmarcado' END,
    NULL, NULL,
    jsonb_build_object('checklist_id', p_id_checklist, 'titulo', v_result.titulo)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_tarea_checklist(BIGINT, BOOLEAN) TO authenticated;
```

- [ ] **Step 2: Apply migration**

Run `supabase_apply_migration`.

- [ ] **Step 3: Verify RPCs**

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN ('create_evento_with_ministerios','get_tarea_timeline','toggle_tarea_checklist')
ORDER BY routine_name;
```
Expected: 3 rows.

- [ ] **Step 4: Run security advisor**

Run: `supabase_get_advisors(type: "security")`
Expected: No critical issues (or note any for remediation).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260511_fase1_eventos_tareas_backend.sql
git commit -m "feat(db): add RPCs for evento-ministerio transaction, timeline, and checklist toggle"
```

### Task 6: Backfill Existing Evento Data

- [ ] **Step 1: Run backfill SQL**

```sql
INSERT INTO public.evento_ministerio (id_evento, id_ministerio)
SELECT e.id_evento, e.id_ministerio
FROM public.evento e
WHERE e.id_ministerio IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.evento_ministerio em
    WHERE em.id_evento = e.id_evento AND em.id_ministerio = e.id_ministerio
  );
```

- [ ] **Step 2: Verify backfill**

```sql
SELECT COUNT(*) FROM public.evento WHERE id_ministerio IS NOT NULL;
SELECT COUNT(*) FROM public.evento_ministerio;
```
Expected: Second count >= first count (some eventos may already have been migrated).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260511_fase1_eventos_tareas_backend.sql
git commit -m "fix(db): backfill existing evento id_ministerio to evento_ministerio junction"
```

---

## Phase 2 — Frontend Components

### Task 7: TypeScript Interfaces for New Tables

**Files:**
- Modify: `src/types/app.types.ts` (append after TareaEvidencia, line ~241)

- [ ] **Step 1: Read the current file to understand position**

Run: `Read src/types/app.types.ts` at offset 230, limit 20.

- [ ] **Step 2: Add new interfaces after TareaEvidencia**

```typescript
// ── Tarea Timeline ──
export interface TareaHistorial {
  idTareaHistorial: number
  idTarea: number
  idUsuario: number
  accion: string
  valorAnterior: string | null
  valorNuevo: string | null
  metadata: Record<string, any> | null
  creadoEn: string
  nombreCompleto?: string
}

export interface TareaComentario {
  idTareaComentario: number
  idTarea: number
  idUsuario: number
  contenido: string
  creadoEn: string
  nombreCompleto?: string
}

export interface TareaChecklist {
  idTareaChecklist: number
  idTarea: number
  titulo: string
  completada: boolean
  orden: number
  completadaPor: number | null
  completadaEn: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface TareaAprobacion {
  idTareaAprobacion: number
  idTarea: number
  idUsuario: number
  accion: 'aprobar' | 'rechazar' | 'reabrir'
  observaciones: string | null
  creadoEn: string
  nombreCompleto?: string
}

export interface TimelineEntry {
  id: number
  tipo: 'historial' | 'comentario' | 'aprobacion'
  accion: string
  idUsuario: number
  nombreCompleto: string
  valorAnterior: string | null
  valorNuevo: string | null
  contenido: string | null
  metadata: Record<string, any> | null
  creadoEn: string
}

// ── Evento Ministerio M2M ──
export interface EventoMinisterio {
  idEventoMinisterio: number
  idEvento: number
  idMinisterio: number
  creadoEn: string
  ministerioNombre?: string
}

export interface EventoEnriquecidoWithMinisterios extends Evento {
  ministerios: EventoMinisterio[]
  cantidadTareas: number
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/app.types.ts
git commit -m "feat(types): add interfaces for tarea timeline, comentarios, checklist, aprobacion, evento-ministerio"
```

### Task 8: Service Layer — tareaTimeline.service.ts

**Files:**
- Create: `src/services/tareaTimeline.service.ts`

- [ ] **Step 1: Create the service file**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { TimelineEntry } from '@/types/app.types'

export async function getTareaTimeline(idTarea: number): Promise<TimelineEntry[]> {
  const { data, error } = await supabase
    .rpc('get_tarea_timeline', { p_id_tarea: idTarea })

  if (error) {
    console.error('[tareaTimeline] Error fetching timeline:', error)
    throw error
  }

  return (data || []).map((entry: any) => ({
    id: entry.id,
    tipo: entry.tipo as TimelineEntry['tipo'],
    accion: entry.accion,
    idUsuario: entry.id_usuario,
    nombreCompleto: entry.nombre_completo,
    valorAnterior: entry.valor_anterior,
    valorNuevo: entry.valor_nuevo,
    contenido: entry.contenido,
    metadata: entry.metadata,
    creadoEn: entry.creado_en,
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/tareaTimeline.service.ts
git commit -m "feat(services): add tareaTimeline service with RPC call"
```

### Task 9: Service Layer — tareaComentarios, tareaChecklist, tareaAprobacion, eventoMinisterios

**Files:**
- Create: `src/services/tareaComentarios.service.ts`
- Create: `src/services/tareaChecklist.service.ts`
- Create: `src/services/tareaAprobacion.service.ts`
- Create: `src/services/eventoMinisterios.service.ts`

- [ ] **Step 1: Create tareaComentarios.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { TareaComentario } from '@/types/app.types'

export async function getTareaComentarios(idTarea: number): Promise<TareaComentario[]> {
  const { data, error } = await supabase
    .from('tarea_comentario')
    .select('*, usuario!inner(nombres, apellidos)')
    .eq('id_tarea', idTarea)
    .order('creado_en', { ascending: true })

  if (error) throw error

  return (data || []).map((row: any) => ({
    idTareaComentario: row.id_tarea_comentario,
    idTarea: row.id_tarea,
    idUsuario: row.id_usuario,
    contenido: row.contenido,
    creadoEn: row.creado_en,
    nombreCompleto: `${row.usuario?.nombres ?? ''} ${row.usuario?.apellidos ?? ''}`.trim(),
  }))
}

export async function createTareaComentario(data: {
  idTarea: number
  idUsuario: number
  contenido: string
}): Promise<TareaComentario> {
  const { data: result, error } = await supabase
    .from('tarea_comentario')
    .insert({
      id_tarea: data.idTarea,
      id_usuario: data.idUsuario,
      contenido: data.contenido,
    })
    .select('*, usuario!inner(nombres, apellidos)')
    .single()

  if (error) throw error

  return {
    idTareaComentario: result.id_tarea_comentario,
    idTarea: result.id_tarea,
    idUsuario: result.id_usuario,
    contenido: result.contenido,
    creadoEn: result.creado_en,
    nombreCompleto: `${result.usuario?.nombres ?? ''} ${result.usuario?.apellidos ?? ''}`.trim(),
  }
}

export async function deleteTareaComentario(id: number): Promise<void> {
  const { error } = await supabase
    .from('tarea_comentario')
    .delete()
    .eq('id_tarea_comentario', id)

  if (error) throw error
}
```

- [ ] **Step 2: Create tareaChecklist.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { TareaChecklist } from '@/types/app.types'

export async function getTareaChecklist(idTarea: number): Promise<TareaChecklist[]> {
  const { data, error } = await supabase
    .from('tarea_checklist')
    .select('*')
    .eq('id_tarea', idTarea)
    .order('orden', { ascending: true })

  if (error) throw error

  return (data || []).map((row: any) => ({
    idTareaChecklist: row.id_tarea_checklist,
    idTarea: row.id_tarea,
    titulo: row.titulo,
    completada: row.completada,
    orden: row.orden,
    completadaPor: row.completada_por,
    completadaEn: row.completada_en,
    creadoEn: row.creado_en,
    actualizadoEn: row.updated_at,
  }))
}

export async function createTareaChecklistItem(data: {
  idTarea: number
  titulo: string
}): Promise<TareaChecklist> {
  const maxOrder = await supabase
    .from('tarea_checklist')
    .select('orden')
    .eq('id_tarea', data.idTarea)
    .order('orden', { ascending: false })
    .limit(1)

  const nextOrder = (maxOrder.data?.[0]?.orden ?? -1) + 1

  const { data: result, error } = await supabase
    .from('tarea_checklist')
    .insert({
      id_tarea: data.idTarea,
      titulo: data.titulo,
      orden: nextOrder,
    })
    .select()
    .single()

  if (error) throw error

  return {
    idTareaChecklist: result.id_tarea_checklist,
    idTarea: result.id_tarea,
    titulo: result.titulo,
    completada: result.completada,
    orden: result.orden,
    completadaPor: result.completada_por,
    completadaEn: result.completada_en,
    creadoEn: result.creado_en,
    actualizadoEn: result.updated_at,
  }
}

export async function toggleTareaChecklist(idChecklist: number, completada: boolean): Promise<void> {
  const { error } = await supabase
    .rpc('toggle_tarea_checklist', { p_id_checklist: idChecklist, p_completada: completada })

  if (error) throw error
}

export async function deleteTareaChecklistItem(id: number): Promise<void> {
  const { error } = await supabase
    .from('tarea_checklist')
    .delete()
    .eq('id_tarea_checklist', id)

  if (error) throw error
}
```

- [ ] **Step 3: Create tareaAprobacion.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { TareaAprobacion } from '@/types/app.types'

export async function createTareaAprobacion(data: {
  idTarea: number
  idUsuario: number
  accion: 'aprobar' | 'rechazar' | 'reabrir'
  observaciones?: string
}): Promise<TareaAprobacion> {
  const { data: result, error } = await supabase
    .from('tarea_aprobacion')
    .insert({
      id_tarea: data.idTarea,
      id_usuario: data.idUsuario,
      accion: data.accion,
      observaciones: data.observaciones ?? null,
    })
    .select('*, usuario!inner(nombres, apellidos)')
    .single()

  if (error) throw error

  return {
    idTareaAprobacion: result.id_tarea_aprobacion,
    idTarea: result.id_tarea,
    idUsuario: result.id_usuario,
    accion: result.accion,
    observaciones: result.observaciones,
    creadoEn: result.creado_en,
    nombreCompleto: `${result.usuario?.nombres ?? ''} ${result.usuario?.apellidos ?? ''}`.trim(),
  }
}
```

- [ ] **Step 4: Create eventoMinisterios.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { EventoMinisterio } from '@/types/app.types'

export async function getEventoMinisterios(idEvento: number): Promise<EventoMinisterio[]> {
  const { data, error } = await supabase
    .from('evento_ministerio')
    .select('*, ministerio!inner(nombre)')
    .eq('id_evento', idEvento)

  if (error) throw error

  return (data || []).map((row: any) => ({
    idEventoMinisterio: row.id_evento_ministerio,
    idEvento: row.id_evento,
    idMinisterio: row.id_ministerio,
    creadoEn: row.creado_en,
    ministerioNombre: row.ministerio?.nombre ?? '',
  }))
}

export async function addEventoMinisterio(idEvento: number, idMinisterio: number): Promise<void> {
  const { error } = await supabase
    .from('evento_ministerio')
    .insert({ id_evento: idEvento, id_ministerio: idMinisterio })

  if (error) throw error
}

export async function removeEventoMinisterio(idEventoMinisterio: number): Promise<void> {
  const { error } = await supabase
    .from('evento_ministerio')
    .delete()
    .eq('id_evento_ministerio', idEventoMinisterio)

  if (error) throw error
}
```

- [ ] **Step 5: Commit**

```bash
git add src/services/tareaComentarios.service.ts src/services/tareaChecklist.service.ts src/services/tareaAprobacion.service.ts src/services/eventoMinisterios.service.ts
git commit -m "feat(services): add services for comentarios, checklist, aprobacion, and evento-ministerio"
```

### Task 10: React Query Hooks for New Features

**Files:**
- Create: `src/hooks/useTareaTimeline.ts`
- Create: `src/hooks/useTareaComentarios.ts`
- Create: `src/hooks/useTareaChecklist.ts`
- Create: `src/hooks/useTareaAprobacion.ts`
- Create: `src/hooks/useEventoMinisterios.ts`
- Create: `src/hooks/useMediaQuery.ts`

- [ ] **Step 1: Create all hooks**

```typescript
// src/hooks/useTareaTimeline.ts
import { useQuery } from '@tanstack/react-query'
import { getTareaTimeline } from '@/services/tareaTimeline.service'

export function useTareaTimeline(idTarea: number | undefined) {
  return useQuery({
    queryKey: ['tarea-timeline', idTarea],
    queryFn: () => getTareaTimeline(idTarea!),
    enabled: !!idTarea,
    staleTime: 30 * 1000,
  })
}
```

```typescript
// src/hooks/useTareaComentarios.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTareaComentarios, createTareaComentario, deleteTareaComentario } from '@/services/tareaComentarios.service'

export function useTareaComentarios(idTarea: number | undefined) {
  return useQuery({
    queryKey: ['tarea-comentarios', idTarea],
    queryFn: () => getTareaComentarios(idTarea!),
    enabled: !!idTarea,
    staleTime: 30 * 1000,
  })
}

export function useCreateTareaComentario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTareaComentario,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tarea-comentarios', data.idTarea] })
      qc.invalidateQueries({ queryKey: ['tarea-timeline', data.idTarea] })
    },
  })
}

export function useDeleteTareaComentario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTareaComentario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarea-comentarios'] })
    },
  })
}
```

```typescript
// src/hooks/useTareaChecklist.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTareaChecklist, createTareaChecklistItem, toggleTareaChecklist, deleteTareaChecklistItem } from '@/services/tareaChecklist.service'

export function useTareaChecklist(idTarea: number | undefined) {
  return useQuery({
    queryKey: ['tarea-checklist', idTarea],
    queryFn: () => getTareaChecklist(idTarea!),
    enabled: !!idTarea,
    staleTime: 30 * 1000,
  })
}

export function useCreateTareaChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTareaChecklistItem,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tarea-checklist', data.idTarea] })
    },
  })
}

export function useToggleTareaChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completada }: { id: number; completada: boolean }) =>
      toggleTareaChecklist(id, completada),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarea-checklist'] })
      qc.invalidateQueries({ queryKey: ['tarea-timeline'] })
    },
  })
}

export function useDeleteTareaChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTareaChecklistItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarea-checklist'] })
    },
  })
}
```

```typescript
// src/hooks/useTareaAprobacion.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTareaAprobacion } from '@/services/tareaAprobacion.service'
import { updateTareaEstado } from '@/services/eventos.service'

export function useAprobarTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { idTarea: number; idUsuario: number; accion: 'aprobar' | 'rechazar' | 'reabrir'; observaciones?: string }) => {
      await createTareaAprobacion(vars)
      const estadoMap = { aprobar: 'completada' as const, rechazar: 'en_progreso' as const, reabrir: 'en_progreso' as const }
      await updateTareaEstado(vars.idTarea, estadoMap[vars.accion])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['tarea-timeline'] })
    },
  })
}
```

```typescript
// src/hooks/useEventoMinisterios.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEventoMinisterios, addEventoMinisterio, removeEventoMinisterio } from '@/services/eventoMinisterios.service'

export function useEventoMinisterios(idEvento: number | undefined) {
  return useQuery({
    queryKey: ['evento-ministerios', idEvento],
    queryFn: () => getEventoMinisterios(idEvento!),
    enabled: !!idEvento,
    staleTime: 60 * 1000,
  })
}

export function useAddEventoMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idEvento, idMinisterio }: { idEvento: number; idMinisterio: number }) =>
      addEventoMinisterio(idEvento, idMinisterio),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evento-ministerios'] })
      qc.invalidateQueries({ queryKey: ['eventos-enriquecidos'] })
    },
  })
}

export function useRemoveEventoMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: removeEventoMinisterio,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evento-ministerios'] })
      qc.invalidateQueries({ queryKey: ['eventos-enriquecidos'] })
    },
  })
}
```

```typescript
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTareaTimeline.ts src/hooks/useTareaComentarios.ts src/hooks/useTareaChecklist.ts src/hooks/useTareaAprobacion.ts src/hooks/useEventoMinisterios.ts src/hooks/useMediaQuery.ts
git commit -m "feat(hooks): add hooks for timeline, comentarios, checklist, aprobacion, evento-ministerios, mediaQuery"
```

### Task 11: TaskTimeline Component

**Files:**
- Create: `src/app/components/tasks/TaskTimeline.tsx`

- [ ] **Step 1: Create Timeline component**

```tsx
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "motion/react"
import { Clock, MessageSquare, CheckCircle2, RotateCcw, XCircle, Paperclip } from "lucide-react"
import type { TimelineEntry } from "@/types/app.types"

const actionConfig: Record<string, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  cambio_estado:      { label: "Cambio de estado", color: "bg-[#4682b4]/10 text-[#4682b4]", dot: "bg-[#4682b4]",    icon: <Clock className="w-3 h-3" /> },
  comentario:         { label: "Comentario",        color: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400", icon: <MessageSquare className="w-3 h-3" /> },
  aprobar:            { label: "Aprobó",            color: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400", icon: <CheckCircle2 className="w-3 h-3" /> },
  rechazar:           { label: "Rechazó",           color: "bg-rose-500/10 text-rose-400",       dot: "bg-rose-400",    icon: <XCircle className="w-3 h-3" /> },
  reabrir:            { label: "Reabrió",           color: "bg-amber-500/10 text-amber-400",     dot: "bg-amber-400",   icon: <RotateCcw className="w-3 h-3" /> },
  checklist_completado: { label: "Checklist",       color: "bg-violet-500/10 text-violet-400",   dot: "bg-violet-400",  icon: <CheckCircle2 className="w-3 h-3" /> },
  checklist_desmarcado: { label: "Checklist",       color: "bg-slate-500/10 text-slate-400",     dot: "bg-slate-400",   icon: <XCircle className="w-3 h-3" /> },
}

function getActionConfig(entry: TimelineEntry) {
  if (entry.tipo === 'comentario') return actionConfig.comentario
  if (entry.tipo === 'aprobacion') return actionConfig[entry.accion] ?? actionConfig.cambio_estado
  return actionConfig[entry.accion] ?? actionConfig.cambio_estado
}

function formatRelativeTime(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es })
  } catch {
    return dateStr
  }
}

export function TaskTimeline({ entries, isLoading }: { entries: TimelineEntry[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-white/10 mt-1.5" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-white/10 rounded w-3/4" />
            <div className="h-2 bg-white/5 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  }

  if (entries.length === 0) {
    return <p className="text-[11px] text-muted-foreground text-center py-6">Sin actividad registrada</p>
  }

  return (
    <div className="relative pl-8 space-y-3">
      <div className="absolute left-3 top-1 bottom-1 w-px bg-border/40" />
      {entries.map((entry) => {
        const cfg = getActionConfig(entry)
        return (
          <motion.div
            key={`${entry.tipo}-${entry.id}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative flex gap-3"
          >
            <div className={`absolute -left-5 w-2.5 h-2.5 rounded-full border-2 border-card ${cfg.dot} shadow-[0_0_6px_currentColor]`} />
            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#4682b4]">{entry.nombreCompleto}</span>
                <span className="text-[10px] font-medium text-muted-foreground/60">{cfg.label}</span>
              </div>
              {entry.valorAnterior && entry.valorNuevo && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {entry.valorAnterior} → {entry.valorNuevo}
                </p>
              )}
              {entry.contenido && (
                <p className="text-[11px] text-foreground/70 mt-0.5">{entry.contenido}</p>
              )}
              <p className="text-[9px] text-muted-foreground/40 mt-0.5">{formatRelativeTime(entry.creadoEn)}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/tasks/TaskTimeline.tsx
git commit -m "feat(components): add TaskTimeline component with color-coded activity log"
```

### Task 12: TaskChecklistSection Component

**Files:**
- Create: `src/app/components/tasks/TaskChecklistSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { CheckSquare, Plus, Trash2, Square, CheckSquare as CheckSquareFilled } from "lucide-react"
import type { TareaChecklist } from "@/types/app.types"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>
}

interface Props {
  items: TareaChecklist[]
  isLoading: boolean
  canManage: boolean
  onToggle: (id: number, completada: boolean) => void
  onCreate: (titulo: string) => void
  onDelete: (id: number) => void
}

export function TaskChecklistSection({ items, isLoading, canManage, onToggle, onCreate, onDelete }: Props) {
  const [newItemText, setNewItemText] = useState("")

  const completados = items.filter(i => i.completada).length
  const total = items.length
  const progress = total > 0 ? Math.round((completados / total) * 100) : 0

  const handleCreate = () => {
    if (!newItemText.trim()) return
    onCreate(newItemText.trim())
    setNewItemText("")
  }

  return (
    <div>
      <FieldLabel>
        <span className="flex items-center gap-1.5"><CheckSquare className="w-3 h-3" /> Checklist</span>
      </FieldLabel>

      {total > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#709dbd] to-[#4682b4] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">{completados}/{total}</span>
        </div>
      )}

      <div className="space-y-1">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.idTareaChecklist}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 group"
            >
              <button
                onClick={() => onToggle(item.idTareaChecklist, !item.completada)}
                className={`shrink-0 transition-colors ${item.completada ? 'text-[#4682b4]' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}
              >
                {item.completada ? <CheckSquareFilled className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
              <span className={`text-[12px] flex-1 ${item.completada ? 'line-through text-muted-foreground/50' : 'text-foreground/80'}`}>
                {item.titulo}
              </span>
              {canManage && (
                <button
                  onClick={() => onDelete(item.idTareaChecklist)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-rose-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {canManage && (
        <div className="flex gap-2 mt-3">
          <Input
            value={newItemText}
            onChange={e => setNewItemText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Agregar item..."
            className="h-8 text-xs bg-background/50 border-white/10 rounded-lg"
          />
          <Button
            size="sm"
            className="h-8 w-8 rounded-lg p-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] text-white"
            onClick={handleCreate}
            disabled={!newItemText.trim()}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/tasks/TaskChecklistSection.tsx
git commit -m "feat(components): add TaskChecklistSection with progress bar and inline add"
```

### Task 13: TaskCommentSection Component

**Files:**
- Create: `src/app/components/tasks/TaskCommentSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MessageSquare, Send, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { TareaComentario } from "@/types/app.types"
import { useApp } from "@/app/store/AppContext"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>
}

interface Props {
  comentarios: TareaComentario[]
  isLoading: boolean
  idTarea: number
  onSend: (contenido: string) => void
  onDelete: (id: number) => void
}

export function TaskCommentSection({ comentarios, isLoading, onSend, onDelete }: Props) {
  const [text, setText] = useState("")
  const { usuarioActual } = useApp()

  const handleSend = () => {
    if (!text.trim() || !usuarioActual) return
    onSend(text.trim())
    setText("")
  }

  return (
    <div>
      <FieldLabel>
        <span className="flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Comentarios</span>
      </FieldLabel>

      <div className="space-y-2 max-h-48 overflow-y-auto hide-scrollbar mb-3">
        <AnimatePresence>
          {comentarios.map((c) => (
            <motion.div
              key={c.idTareaComentario}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 p-2.5 rounded-xl bg-background/40 border border-white/5 group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-[10px] text-white font-black shrink-0">
                {(c.nombreCompleto || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold text-[#4682b4]">{c.nombreCompleto}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground/40">
                      {(() => { try { return formatDistanceToNow(new Date(c.creadoEn), { addSuffix: true, locale: es }) } catch { return c.creadoEn } })()}
                    </span>
                    {usuarioActual && c.idUsuario === usuarioActual.idUsuario && (
                      <button onClick={() => onDelete(c.idTareaComentario)} className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-rose-400 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[12px] text-foreground/80 mt-0.5 leading-relaxed">{c.contenido}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!isLoading && comentarios.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-4">Sin comentarios</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 h-9 rounded-xl border border-white/10 bg-background/50 px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Escribe un comentario..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        />
        <Button
          size="sm"
          className="h-9 w-9 rounded-xl p-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] text-white shadow-lg shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || !usuarioActual}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/tasks/TaskCommentSection.tsx
git commit -m "feat(components): add TaskCommentSection with inline send and delete"
```

### Task 14: TaskApprovalSection Component

**Files:**
- Create: `src/app/components/tasks/TaskApprovalSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react"
import { ThumbsUp, RotateCcw, AlertTriangle } from "lucide-react"
import { Button } from "@/app/components/ui/button"

interface Props {
  estado: string
  canApprove: boolean
  onApprove: (observaciones?: string) => void
  onReject: (observaciones?: string) => void
  isPending: boolean
}

export function TaskApprovalSection({ estado, canApprove, onApprove, onReject, isPending }: Props) {
  const [observaciones, setObservaciones] = useState("")

  if (estado !== "en_revision" || !canApprove) return null

  return (
    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">Revisión pendiente</span>
      </div>
      <p className="text-[11px] text-muted-foreground">Esta tarea está esperando tu aprobación o revisión.</p>

      <textarea
        className="w-full h-20 rounded-xl border border-white/10 bg-background/50 p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        placeholder="Observaciones (opcional)..."
        value={observaciones}
        onChange={e => setObservaciones(e.target.value)}
      />

      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="rounded-xl flex-1 h-9 text-xs border border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
          onClick={() => onReject(observaciones || undefined)}
          disabled={isPending}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Rechazar
        </Button>
        <Button
          className="rounded-xl flex-1 h-9 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"
          onClick={() => onApprove(observaciones || undefined)}
          disabled={isPending}
        >
          <ThumbsUp className="w-3.5 h-3.5 mr-1.5" /> Aprobar
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/tasks/TaskApprovalSection.tsx
git commit -m "feat(components): add TaskApprovalSection with approve/reject UI"
```

### Task 15: TaskEvidenceSection Component (Enhanced)

**Files:**
- Create: `src/app/components/tasks/TaskEvidenceSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react"
import { Paperclip, Eye, Upload, FileText, Image } from "lucide-react"
import type { TareaEvidenciaEnriquecida } from "@/services/eventos.service"
import { getTareaEvidenciaSignedUrl } from "@/services/eventos.service"
import { Button } from "@/app/components/ui/button"
import { toast } from "sonner"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>
}

interface Props {
  evidencias: TareaEvidenciaEnriquecida[]
  canUpload: boolean
  isUploading: boolean
  onUpload: (file: File) => void
}

export function TaskEvidenceSection({ evidencias, canUpload, isUploading, onUpload }: Props) {
  const handleOpen = async (objectPath: string) => {
    try {
      const url = await getTareaEvidenciaSignedUrl(objectPath)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("No se pudo abrir la evidencia.")
    }
  }

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) return <Image className="w-3.5 h-3.5" />
    return <FileText className="w-3.5 h-3.5" />
  }

  return (
    <div>
      <FieldLabel>
        <span className="flex items-center gap-1.5"><Paperclip className="w-3 h-3" /> Evidencias</span>
      </FieldLabel>

      {evidencias.length > 0 && (
        <div className="space-y-1 mb-3">
          {evidencias.map(ev => (
            <div key={ev.idTareaEvidencia} className="flex items-center justify-between gap-3 bg-background/40 border border-white/10 rounded-xl px-3 py-2 group hover:border-[#4682b4]/20 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground/40">{getFileIcon(ev.nombreArchivo)}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate">{ev.nombreArchivo}</p>
                  {ev.nombreCompleto && <p className="text-[9px] text-muted-foreground truncate">{ev.nombreCompleto}</p>}
                </div>
              </div>
              <button
                onClick={() => handleOpen(ev.objectPath)}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-all"
                title="Ver evidencia"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <label className={`flex items-center justify-center gap-2 h-9 rounded-xl border border-dashed border-white/10 bg-background/30 cursor-pointer hover:border-[#4682b4]/30 hover:bg-[#4682b4]/5 transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">{isUploading ? "Subiendo..." : "Subir evidencia"}</span>
          <input
            type="file"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file)
              e.currentTarget.value = ""
            }}
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          />
        </label>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/tasks/TaskEvidenceSection.tsx
git commit -m "feat(components): enhance TaskEvidenceSection with file type icons and improved UX"
```

### Task 16: KanbanBoard + KanbanColumn + TaskCard with dnd-kit

**Files:**
- Create: `src/app/components/tasks/KanbanBoard.tsx`
- Create: `src/app/components/tasks/KanbanColumn.tsx`
- Create: `src/app/components/tasks/TaskCard.tsx`

- [ ] **Step 1: Create TaskCard.tsx**

```tsx
import { motion } from "motion/react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/app/components/ui/badge"
import { Calendar, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import type { TareaEnriquecida } from "@/services/eventos.service"

const prioridadConfig: Record<string, { label: string; color: string }> = {
  baja:    { label: "Baja",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  media:   { label: "Media",   color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
  alta:    { label: "Alta",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  urgente: { label: "Urgente", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
}

interface Props {
  task: TareaEnriquecida
  onSelect: (id: number) => void
  checklistProgress?: { completados: number; total: number }
}

export function TaskCard({ task, onSelect, checklistProgress }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.idTarea,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  const prio = prioridadConfig[task.prioridad] ?? prioridadConfig.media

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 group cursor-grab active:cursor-grabbing bg-card/60 backdrop-blur-xl rounded-2xl border border-white/5 hover:border-[#4682b4]/20 transition-all shadow-sm hover:shadow-md"
      onClick={() => onSelect(task.idTarea)}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className={`${prio.color} border-0 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-lg`}>
          {prio.label}
        </Badge>
        {task.fechaLimite && (
          <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground/60">
            <Calendar className="w-2.5 h-2.5" /> {task.fechaLimite}
          </span>
        )}
      </div>

      <h4 className="text-[13px] font-bold leading-snug tracking-tight uppercase italic mb-1 line-clamp-2 group-hover:text-[#4682b4] transition-colors">
        {task.titulo}
      </h4>

      {task.ministerioNombre && (
        <p className="text-[9px] font-bold text-primary/60 mb-2 uppercase tracking-wider">{task.ministerioNombre}</p>
      )}

      {checklistProgress && checklistProgress.total > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#709dbd] to-[#4682b4] transition-all duration-300"
              style={{ width: `${(checklistProgress.completados / checklistProgress.total) * 100}%` }}
            />
          </div>
          <span className="text-[8px] font-bold text-muted-foreground">{checklistProgress.completados}/{checklistProgress.total}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex -space-x-2">
          {task.asignados?.slice(0, 3).map(a => (
            <div key={a.idTareaAsignada} className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] border-2 border-card flex items-center justify-center text-[9px] text-white font-black shadow-sm" title={a.nombreCompleto}>
              {(a.nombreCompleto || "?").charAt(0).toUpperCase()}
            </div>
          ))}
          {task.asignados && task.asignados.length > 3 && (
            <div className="w-6 h-6 rounded-lg bg-white/10 border-2 border-card flex items-center justify-center text-[8px] text-muted-foreground font-black">+{task.asignados.length - 3}</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Create KanbanColumn.tsx**

```tsx
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { AnimatePresence } from "motion/react"
import { TaskCard } from "./TaskCard"
import { Inbox } from "lucide-react"
import type { TareaEnriquecida } from "@/services/eventos.service"

const columnStyles: Record<string, { label: string; dot: string; icon: React.ReactNode }> = {
  pendiente:   { label: "Pendiente",   dot: "bg-amber-400",   icon: null },
  en_progreso: { label: "En Progreso", dot: "bg-[#4682b4]",    icon: null },
  en_revision: { label: "En Revisión", dot: "bg-violet-400",  icon: null },
  completada:  { label: "Completada",  dot: "bg-emerald-400", icon: null },
}

interface Props {
  id: string
  tasks: TareaEnriquecida[]
  taskChecklistProgress: Record<number, { completados: number; total: number }>
  onSelectTask: (id: number) => void
}

export function KanbanColumn({ id, tasks, taskChecklistProgress, onSelectTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const cfg = columnStyles[id] ?? { label: id, dot: "bg-gray-400", icon: null }

  return (
    <div className="w-[85vw] sm:w-[350px] lg:w-full shrink-0 snap-center">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl bg-card/60 backdrop-blur-xl border border-white/10 border-b-0`}>
        <div className={`w-2 h-2 rounded-full ${cfg.dot} shadow-[0_0_6px_currentColor]`} />
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/70">{cfg.label}</span>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-3 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-b-3xl border border-white/5 border-t-0 p-3 min-h-[200px] transition-colors ${isOver ? 'bg-[#4682b4]/5 border-[#4682b4]/20' : ''}`}
      >
        <SortableContext items={tasks.map(t => t.idTarea)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {tasks.map(task => (
              <TaskCard
                key={task.idTarea}
                task={task}
                onSelect={onSelectTask}
                checklistProgress={taskChecklistProgress[task.idTarea]}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <Inbox className="w-6 h-6 opacity-20" />
            <p className="text-[10px]">Sin tareas</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create KanbanBoard.tsx**

```tsx
import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { KanbanColumn } from "./KanbanColumn"
import { TaskCard } from "./TaskCard"
import type { Tarea, TareaEnriquecida } from "@/services/eventos.service"

const COLS = ["pendiente", "en_progreso", "en_revision", "completada"] as const

interface Props {
  tareas: TareaEnriquecida[]
  taskChecklistProgress: Record<number, { completados: number; total: number }>
  onSelectTask: (id: number) => void
  onStatusChange: (id: number, newStatus: Tarea['estado']) => void
}

export function KanbanBoard({ tareas, taskChecklistProgress, onSelectTask, onStatusChange }: Props) {
  const [activeTask, setActiveTask] = useState<TareaEnriquecida | null>(null)
  const isMobile = useMediaQuery("(max-width: 767px)")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  )

  const tasksByStatus = (status: string) => tareas.filter(t => t.estado === status)

  const handleDragStart = (event: DragStartEvent) => {
    const task = tareas.find(t => t.idTarea === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = Number(active.id)
    const targetCol = String(over.id)
    if (!COLS.includes(targetCol as any)) return

    const task = tareas.find(t => t.idTarea === taskId)
    if (!task || task.estado === targetCol) return

    onStatusChange(taskId, targetCol as Tarea['estado'])
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`flex ${isMobile ? 'overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4' : 'grid grid-cols-4 gap-4'}`}>
        {COLS.map(col => (
          <KanbanColumn
            key={col}
            id={col}
            tasks={tasksByStatus(col)}
            taskChecklistProgress={taskChecklistProgress}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} onSelect={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 4: Install dnd-kit dependency**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
Expected: Packages added to `package.json`.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/tasks/KanbanBoard.tsx src/app/components/tasks/KanbanColumn.tsx src/app/components/tasks/TaskCard.tsx package.json
git commit -m "feat(components): add KanbanBoard with dnd-kit drag-and-drop, responsive columns, and rich TaskCard"
```

### Task 17: TaskSidePanel Component

**Files:**
- Create: `src/app/components/tasks/TaskSidePanel.tsx`

- [ ] **Step 1: Create TaskSidePanel component**

```tsx
import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, Pencil } from "lucide-react"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { TaskTimeline } from "./TaskTimeline"
import { TaskChecklistSection } from "./TaskChecklistSection"
import { TaskCommentSection } from "./TaskCommentSection"
import { TaskEvidenceSection } from "./TaskEvidenceSection"
import { TaskApprovalSection } from "./TaskApprovalSection"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import type { TareaEnriquecida } from "@/services/eventos.service"

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20",   dot: "bg-amber-400" },
  en_progreso: { label: "En Progreso", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",      dot: "bg-[#4682b4]" },
  en_revision: { label: "En Revisión", color: "bg-violet-500/10 text-violet-400 border-violet-500/20",  dot: "bg-violet-400" },
  completada:  { label: "Completada",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  cancelada:   { label: "Cancelada",   color: "bg-rose-500/10 text-rose-400 border-rose-500/20",      dot: "bg-rose-400" },
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>
}

interface Props {
  task: TareaEnriquecida | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: { titulo: string; descripcion: string | null; fechaLimite: string | null; prioridad: string }) => void
  // Sub-component props would be drilled down from the parent orchestrator
  timeline: any[]
  timelineLoading: boolean
  checklist: any[]
  checklistLoading: boolean
  comentarios: any[]
  comentariosLoading: boolean
  evidencias: any[]
  canManage: boolean
  canActAsServidor: boolean
  isAdmin: boolean
}

const panelVariants = {
  desktop: { hidden: { x: "100%" }, visible: { x: 0, transition: { type: "spring", damping: 25, stiffness: 200 } } },
  mobile:  { hidden: { y: "100%" }, visible: { y: 0, transition: { type: "spring", damping: 25, stiffness: 200 } } },
}

export function TaskSidePanel(props: Props) {
  const { task, isOpen, onClose } = props
  const isMobile = useMediaQuery("(max-width: 767px)")

  if (!task) return null

  const cfg = statusConfig[task.estado] ?? statusConfig.pendiente

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={panelVariants}
            initial={isMobile ? "mobile" : "desktop"}
            animate={isMobile ? "mobile" : "desktop"}
            exit={isMobile ? "mobile" : "desktop"}
            className={`fixed z-50 bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl ${
              isMobile
                ? "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl"
                : "top-0 right-0 h-full w-[480px] border-l"
            }`}
          >
            {/* Mobile drag handle */}
            {isMobile && <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-2" />}

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border/50">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl ${cfg.color} border flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-tight leading-snug truncate">{task.titulo}</h2>
                  <Badge variant="outline" className={`${cfg.color} border-0 text-[9px] uppercase font-bold mt-1`}>
                    {cfg.label}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {props.isAdmin && (
                  <button className="p-2 rounded-lg text-muted-foreground/40 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto hide-scrollbar" style={{ height: isMobile ? undefined : "calc(100% - 73px)" }}>
              <div className="p-5 space-y-6">
                {task.descripcion && (
                  <div>
                    <FieldLabel>Descripción</FieldLabel>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-background/40 rounded-xl p-3 border border-white/5">{task.descripcion}</p>
                  </div>
                )}

                <TaskTimeline entries={props.timeline} isLoading={props.timelineLoading} />
                <TaskChecklistSection
                  items={props.checklist}
                  isLoading={props.checklistLoading}
                  canManage={props.canManage}
                  onToggle={() => {}}
                  onCreate={() => {}}
                  onDelete={() => {}}
                />
                <TaskCommentSection
                  comentarios={props.comentarios}
                  isLoading={props.comentariosLoading}
                  idTarea={task.idTarea}
                  onSend={() => {}}
                  onDelete={() => {}}
                />
                <TaskEvidenceSection
                  evidencias={props.evidencias}
                  canUpload={props.canActAsServidor}
                  isUploading={false}
                  onUpload={() => {}}
                />
                <TaskApprovalSection
                  estado={task.estado}
                  canApprove={props.canManage}
                  onApprove={() => {}}
                  onReject={() => {}}
                  isPending={false}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/tasks/TaskSidePanel.tsx
git commit -m "feat(components): add TaskSidePanel with desktop slide-in and mobile bottom-sheet, all sub-component slots"
```

### Task 18: Refactor TasksPage to Use New Components

**Files:**
- Modify: `src/app/components/TasksPage.tsx` (restructure to ~250 lines)

- [ ] **Step 1: Read current TasksPage to understand integration points**

The current TasksPage has: header, stats row, filters, Kanban (visual), task detail dialog, create dialog, delete confirm, cancel confirm, remove assign confirm.

The refactored version replaces:
- `Dialog` for task detail → `TaskSidePanel`
- Visual Kanban → `KanbanBoard`
- Creates inline mutation calls → uses new hooks

The refactored TasksPage orchestrates state and passes props down. Due to the size of the full component, the refactored version follows this pattern:

```tsx
// Simplified structure of refactored TasksPage
export function TasksPage() {
  const { idIglesia } = useParams()
  const { usuarioActual, rolActual } = useApp()
  const { data: tareas = [], isLoading } = useTareasEnriquecidas(undefined, Number(idIglesia))
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: timeline = [], isLoading: timelineLoading } = useTareaTimeline(selectedTaskId)
  const { data: checklist = [], isLoading: checklistLoading } = useTareaChecklist(selectedTaskId)
  const { data: comentarios = [], isLoading: comentariosLoading } = useTareaComentarios(selectedTaskId)
  const { data: evidencias = [] } = useTareaEvidencias(selectedTaskId)

  const isLider = rolActual === "lider"
  const isAdmin = rolActual === "admin_iglesia" || rolActual === "super_admin"
  const canManage = isLider || isAdmin
  const selectedTask = tareas.find(t => t.idTarea === selectedTaskId) ?? null

  const updateEstadoMutation = useUpdateTareaEstado()

  const handleStatusChange = (id: number, newStatus: Tarea['estado']) => {
    updateEstadoMutation.mutate({ id, estado: newStatus })
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <TaskBoardHeader ... />
      <KanbanBoard
        tareas={filteredTareas}
        taskChecklistProgress={...}
        onSelectTask={setSelectedTaskId}
        onStatusChange={handleStatusChange}
      />
      <TaskSidePanel
        task={selectedTask}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        ...
      />
      <CreateTaskSheet
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        ...
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/TasksPage.tsx
git commit -m "refactor(tasks): integrate KanbanBoard, TaskSidePanel, and create sheet into TasksPage orchestrator"
```

### Task 19: EventSidePanel + EventMinistriesSection + CreateEventSheet

**Files:**
- Create: `src/app/components/events/EventMinistriesSection.tsx`
- Create: `src/app/components/events/EventSidePanel.tsx`
- Create: `src/app/components/events/CreateEventSheet.tsx`

- [ ] **Step 1: Create EventMinistriesSection.tsx**

```tsx
import { useState } from "react"
import { Users, Plus, X } from "lucide-react"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>
}

interface Props {
  selectedIds: number[]
  ministerios: { idMinisterio: number; nombre: string }[]
  onAdd: (idMinisterio: number) => void
  onRemove: (id: number) => void
}

export function EventMinistriesSection({ selectedIds, ministerios, onAdd, onRemove }: Props) {
  const [selectVal, setSelectVal] = useState(0)

  const selectedMinisterios = ministerios.filter(m => selectedIds.includes(m.idMinisterio))
  const availableMinisterios = ministerios.filter(m => !selectedIds.includes(m.idMinisterio))

  return (
    <div>
      <FieldLabel>
        <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Ministerios responsables</span>
      </FieldLabel>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {selectedMinisterios.map(m => (
          <Badge
            key={m.idMinisterio}
            variant="outline"
            className="bg-white/5 border-0 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1.5"
          >
            {m.nombre}
            <button onClick={() => onRemove(m.idMinisterio)} className="hover:text-rose-400 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </Badge>
        ))}
      </div>

      {availableMinisterios.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectVal}
            onChange={e => setSelectVal(Number(e.target.value))}
            className="flex-1 h-9 rounded-xl border border-white/10 bg-background/50 px-3 text-xs text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value={0}>Agregar ministerio...</option>
            {availableMinisterios.map(m => (
              <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>
            ))}
          </select>
          <Button
            size="sm"
            className="h-9 w-9 rounded-xl p-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] text-white"
            disabled={!selectVal}
            onClick={() => { if (selectVal) { onAdd(selectVal); setSelectVal(0) } }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create EventSidePanel.tsx**

```tsx
import { motion, AnimatePresence } from "motion/react"
import { X, MapPin, Clock } from "lucide-react"
import { Badge } from "@/app/components/ui/badge"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { EventMinistriesSection } from "./EventMinistriesSection"
import type { EventoEnriquecido } from "@/services/eventos.service"

const estadoConfig: Record<string, { label: string; color: string }> = {
  programado: { label: "Programado", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
  en_curso:   { label: "En Curso",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  finalizado: { label: "Finalizado", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  cancelado:  { label: "Cancelado",  color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
}

interface Props {
  evento: EventoEnriquecido | null
  isOpen: boolean
  onClose: () => void
  ministerios: { idMinisterio: number; nombre: string }[]
  selectedMinisterioIds: number[]
  canManage: boolean
  onAddMinisterio: (id: number) => void
  onRemoveMinisterio: (id: number) => void
}

export function EventSidePanel({ evento, isOpen, onClose, ministerios, selectedMinisterioIds, canManage, onAddMinisterio, onRemoveMinisterio }: Props) {
  const isMobile = useMediaQuery("(max-width: 767px)")
  if (!evento) return null

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
  const estado = estadoConfig[evento.estado] ?? estadoConfig.programado

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
          <motion.div
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed z-50 bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl ${
              isMobile ? "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl" : "top-0 right-0 h-full w-[480px] border-l"
            }`}
          >
            {isMobile && <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-2" />}
            <div className="flex items-start justify-between p-5 border-b border-border/50">
              <div>
                <h2 className="text-lg font-bold tracking-tight">{evento.nombre}</h2>
                <Badge variant="outline" className={`${estado.color} border-0 text-[9px] uppercase font-bold mt-1`}>{estado.label}</Badge>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto hide-scrollbar p-5 space-y-5">
              {evento.descripcion && <p className="text-sm text-foreground/80 leading-relaxed bg-background/40 rounded-xl p-3 border border-white/5">{evento.descripcion}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-background/40 border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Inicio</p>
                  <p className="text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3 text-[#4682b4]" /> {formatDate(evento.fechaInicio)} · {formatTime(evento.fechaInicio)}</p>
                </div>
                {evento.sedeNombre && (
                  <div className="p-3 rounded-xl bg-background/40 border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Sede</p>
                    <p className="text-xs font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-[#4682b4]" /> {evento.sedeNombre}</p>
                  </div>
                )}
              </div>
              <EventMinistriesSection
                selectedIds={selectedMinisterioIds}
                ministerios={ministerios}
                onAdd={onAddMinisterio}
                onRemove={onRemoveMinisterio}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Create CreateEventSheet.tsx**

```tsx
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, Plus } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { EventMinistriesSection } from "./EventMinistriesSection"
import { useMediaQuery } from "@/hooks/useMediaQuery"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>
}

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} className={`h-11 bg-background/50 border-white/10 rounded-xl text-sm ${props.className ?? ""}`} />
}

function GlassSelect({ value, onChange, children }: { value: number; onChange: (v: number) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))}
      className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
      {children}
    </select>
  )
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    nombre: string; descripcion: string | null; tipoEventoTexto: string | null
    fechaInicio: string; fechaFin: string; idSede: number | null; idMinisterios: number[]
  }) => void
  isPending: boolean
  sedes: { idSede: number; nombre: string }[]
  ministerios: { idMinisterio: number; nombre: string }[]
}

export function CreateEventSheet({ isOpen, onClose, onSubmit, isPending, sedes, ministerios }: Props) {
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [tipoEventoTexto, setTipoEventoTexto] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [idSede, setIdSede] = useState(0)
  const [idMinisterios, setIdMinisterios] = useState<number[]>([])
  const isMobile = useMediaQuery("(max-width: 767px)")

  const handleSubmit = () => {
    if (!nombre.trim() || !fechaInicio || !fechaFin) return
    onSubmit({
      nombre: nombre.trim(), descripcion: descripcion.trim() || null,
      tipoEventoTexto: tipoEventoTexto.trim() || null,
      fechaInicio, fechaFin, idSede: idSede || null, idMinisterios,
    })
  }

  const content = (
    <div className="space-y-4 py-2">
      <div><FieldLabel>Nombre del Evento</FieldLabel><GlassInput value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Culto de Adoración Especial" /></div>
      <div><FieldLabel>Detalle</FieldLabel><GlassInput value={tipoEventoTexto} onChange={e => setTipoEventoTexto(e.target.value)} placeholder="Ej. Vigilia, aniversario..." /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><FieldLabel>Sede</FieldLabel><GlassSelect value={idSede} onChange={setIdSede}><option value={0}>Seleccionar...</option>{sedes.map(s => <option key={s.idSede} value={s.idSede}>{s.nombre}</option>)}</GlassSelect></div>
        <div><FieldLabel>Inicio</FieldLabel><GlassInput type="datetime-local" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><FieldLabel>Fin</FieldLabel><GlassInput type="datetime-local" value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
        <div><FieldLabel>Descripción</FieldLabel><GlassInput value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div>
      </div>
      <EventMinistriesSection selectedIds={idMinisterios} ministerios={ministerios} onAdd={id => setIdMinisterios(p => [...p, id])} onRemove={id => setIdMinisterios(p => p.filter(x => x !== id))} />
      <div className="flex gap-2 pt-2 border-t border-border/50">
        <Button variant="ghost" className="rounded-xl flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="rounded-xl flex-1 bg-gradient-to-r from-[#709dbd] to-[#4682b4] text-white" onClick={handleSubmit} disabled={isPending || !nombre.trim() || !fechaInicio || !fechaFin}>
          {isPending ? "Creando..." : "Crear Evento"}
        </Button>
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
          <motion.div
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed z-50 bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl ${
              isMobile ? "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl overflow-y-auto" : "top-0 right-0 h-full w-[480px] border-l overflow-y-auto"
            }`}
          >
            {isMobile && <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-2" />}
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <h2 className="text-lg font-bold tracking-tight">Nuevo Evento</h2>
              <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground/40 hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">{content}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Refactor EventsPage** to use EventSidePanel, CreateEventSheet, and EventMinistriesSection. The page orchestrator manages state and mutations, passing props down to each child component.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/events/EventMinistriesSection.tsx src/app/components/events/EventSidePanel.tsx src/app/components/events/CreateEventSheet.tsx src/app/components/EventsPage.tsx
git commit -m "refactor(events): add EventSidePanel, EventMinistriesSection M2M support, refactor EventsPage"
```

---

## Phase 3 — UX/UI Enhancements

### Task 20: Mobile BottomSheet Component

**Files:**
- Create: `src/app/components/ui/BottomSheet.tsx`

- [ ] **Step 1: Create reusable BottomSheet**

```tsx
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"

interface Props {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  maxHeight?: string
}

export function BottomSheet({ isOpen, onClose, children, maxHeight = "85vh" }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ maxHeight }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <div />
                <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground/40 hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-5 pb-6 hide-scrollbar">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/ui/BottomSheet.tsx
git commit -m "feat(ui): add reusable BottomSheet component for mobile"
```

---

## Phase 4 — Performance & Realtime

### Task 21: Optimistic Updates for Task Mutations

**Files:**
- Modify: `src/hooks/useEventos.ts` (add optimistic pattern to useUpdateTareaEstado)

- [ ] **Step 1: Add optimistic update to useUpdateTareaEstado**

```typescript
export function useUpdateTareaEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: Tarea['estado'] }) =>
      updateTareaEstado(id, estado),
    onMutate: async ({ id, estado }) => {
      await qc.cancelQueries({ queryKey: ['tareas-enriquecidas'] })
      const previous = qc.getQueryData(['tareas-enriquecidas'])
      qc.setQueryData(['tareas-enriquecidas'], (old: TareaEnriquecida[] | undefined) =>
        old?.map(t => t.idTarea === id ? { ...t, estado } : t) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['tareas-enriquecidas'], context.previous)
      }
      toast.error("Error al actualizar estado")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}
```

- [ ] **Step 2: Apply same pattern to useCreateTareaComentario, useToggleTareaChecklist, useAprobarTarea**

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEventos.ts src/hooks/useTareaComentarios.ts src/hooks/useTareaChecklist.ts src/hooks/useTareaAprobacion.ts
git commit -m "perf(hooks): add optimistic updates to all task mutations with rollback"
```

### Task 22: Supabase Realtime Subscriptions

**Files:**
- Add Realtime hooks into `src/hooks/useTareaComentarios.ts` and `src/hooks/useEventos.ts`

- [ ] **Step 1: Add Realtime to tarea and tarea_comentario**

```typescript
// Within the TaskSidePanel or TasksPage, add useEffect:
useEffect(() => {
  if (!selectedTaskId) return
  const channel = supabase.channel(`tarea-${selectedTaskId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tarea_comentario', filter: `id_tarea=eq.${selectedTaskId}` },
      () => queryClient.invalidateQueries({ queryKey: ['tarea-comentarios', selectedTaskId] })
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tarea', filter: `id_tarea=eq.${selectedTaskId}` },
      (payload) => {
        queryClient.setQueryData(['tareas-enriquecidas'], (old: TareaEnriquecida[] | undefined) =>
          old?.map(t => t.idTarea === selectedTaskId ? { ...t, ...payload.new as any } : t) ?? []
        )
      }
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [selectedTaskId])
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/TasksPage.tsx
git commit -m "feat(realtime): add Supabase Realtime subscriptions for tarea comments and state changes"
```

### Task 23: Pagination + Debounce + Lazy Loading

**Files:**
- Modify: `src/services/eventos.service.ts` (add pagination)
- Modify: `src/app/components/TasksPage.tsx` (add debounce, lazy load)

- [ ] **Step 1: Add pagination to getTareasEnriquecidas**

```typescript
export async function getTareasEnriquecidas(
  idEvento?: number,
  idIglesia?: number,
  idUsuario?: number,
  options?: { limit?: number; offset?: number }
): Promise<{ data: TareaEnriquecida[]; total: number | null }> {
  // ...existing query builder...
  const { data, error, count } = await q
    .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 50) - 1)
    .select(`
      *,
      ministerio!inner(nombre, sede!inner(id_iglesia)),
      evento(nombre),
      ${asignadaSelect}
    `, { count: 'estimated' })

  // ...existing mapping...
  return { data: mapped, total: count }
}
```

- [ ] **Step 2: Add useDebounce hook**

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react'
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
```

- [ ] **Step 3: Lazy load KanbanBoard**

```typescript
const KanbanBoard = lazy(() => import('@/app/components/tasks/KanbanBoard'))
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDebounce.ts src/services/eventos.service.ts src/app/components/TasksPage.tsx
git commit -m "perf: add pagination to task queries, debounce search, lazy load KanbanBoard"
```

---

## Post-Implementation Checklist

- [ ] Build succeeds: `npm run build`
- [ ] Dev server starts: `npm run dev`
- [ ] All 5 new tables exist in Supabase
- [ ] RLS policies verified for all roles (super_admin, admin_iglesia, lider, servidor)
- [ ] Task sidebar opens and shows timeline, comments, checklist, evidence, approval
- [ ] Kanban drag-and-drop works on desktop (pointer)
- [ ] Kanban drag-and-drop works on mobile (touch)
- [ ] Creating a task with checklist items works
- [ ] Commenting on a task works and appears in timeline
- [ ] Event multi-ministry assignment works
- [ ] Optimistic update: dragging a card shows instant status change
- [ ] `supabase_get_advisors(type: "security")` — no critical issues
