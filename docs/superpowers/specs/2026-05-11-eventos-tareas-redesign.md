# Tasks & Events Module Redesign — Design Spec

**Date:** 2026-05-11
**Project:** IGLESIABD (Church Management SaaS)
**Author:** System Audit Agent

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Architecture Overview](#3-architecture-overview)
4. [Phase 1: Database Backend](#4-phase-1-database-backend)
5. [Phase 2: Frontend Components](#5-phase-2-frontend-components)
6. [Phase 3: UX/UI](#6-phase-3-uxui)
7. [Phase 4: Performance & Realtime](#7-phase-4-performance--realtime)
8. [Design Tokens & Visual Identity](#8-design-tokens--visual-identity)
9. [Risk Assessment](#9-risk-assessment)
10. [Roadmap](#10-roadmap)

---

## 1. Executive Summary

This spec defines a 4-phase refactor of the Tasks & Events module in IGLESIABD. The goal is to evolve from a basic CRUD module into a collaborative, traceable, scalable ministry operations system — while preserving the existing visual identity (`#709dbd`/`#4682b4` palette, glassmorphism, bold uppercase typography).

**Key deliverables:**
- 5 new database tables with RLS
- Atomic frontend component tree (15+ components)
- Drag-and-drop Kanban with `dnd-kit`
- Side panel replacing modals
- Activity timeline, checklists, comments, approval tracking
- M2M event-ministry relationships
- Mobile-first bottom sheets
- Optimistic updates + Supabase Realtime

---

## 2. Current State Audit

### 2.1 Tables Involved

| Table | Status | Notes |
|---|---|---|
| `evento` | ✅ Existing | Single `id_ministerio` FK — 1:1 only |
| `tarea` | ✅ Existing | Has `id_ministerio`, `id_iglesia`, `id_evento` |
| `tarea_asignada` | ✅ Existing | UNIQUE on `(id_tarea, id_usuario)` |
| `tarea_evidencia` | ✅ Existing | Storage bucket `tarea-evidencias` |
| `ministerio` | ✅ Existing | FK target |
| `sede` | ✅ Existing | FK target |
| `iglesia` | ✅ Existing | FK target |

### 2.2 Current Task States

```
pendiente → en_progreso → en_revision → completada
                                              ↓
                                         cancelada
```

### 2.3 Known Issues

1. **Hard delete** — eventos, tareas, tarea_asignada all use DELETE
2. **No activity history** — no `tarea_historial` table
3. **No comments** — no `tarea_comentario` table
4. **No checklists** — no `tarea_checklist` table
5. **No approval audit** — no `tarea_aprobacion` table
6. **Event-ministry 1:1** — should be M2M
7. **Monolithic components** — TasksPage (886 lines), EventsPage (564 lines)
8. **Modals instead of side panels** — disrupts workflow
9. **No drag-and-drop** — Kanban is visual only
10. **No pagination** — all tasks fetched at once
11. **No optimistic updates** — mutations invalidate cache but don't update locally
12. **No Realtime** — no live subscriptions
13. **RLS fragility** — 5+ migrations to fix task/event RLS recursion and scope

---

## 3. Architecture Overview

### 3.1 Approach: Progressive Refactoring by Layers (Approach A)

Chosen over Big Bang (high risk) and Minimal Viable (leaves tech debt). Rationale:
- Each phase is independently deployable
- No single point of failure
- Easier QA per phase
- Enables course correction between phases

### 3.2 Component Tree (Target State)

```
TasksPage (orchestrator, ~150 lines)
├── TaskBoardHeader (stats + filters)
├── TaskKanbanBoard
│   ├── KanbanColumn (×4)
│   └── TaskCard
├── TaskSidePanel
│   ├── TaskTimeline
│   ├── TaskEvidenceSection
│   ├── TaskChecklistSection
│   ├── TaskApprovalSection
│   └── TaskCommentSection
└── CreateTaskSheet
```

## 4. Phase 1: Database Backend

### 4.1 New Table: `evento_ministerio`

Replaces `evento.id_ministerio` single FK with M2M junction table.

```sql
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
```

**RLS policies:** 3 policies — SELECT (same scope as `evento`), INSERT (admin + lider), DELETE (admin + lider). All use existing RPCs: `is_super_admin()`, `is_admin_iglesia()`, `is_lider()`, `get_user_ministerios()`, `current_usuario_id()`.

### 4.2 New Table: `tarea_historial`

Event-sourcing-light for all task activity.

```sql
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
```

**Auto-logging trigger:** Captures `cambio_estado` on every tarea UPDATE.
Manual logging actions: `creacion`, `asignacion`, `comentario`, `evidencia`, `aprobacion`, `rechazo`.

### 4.3 New Table: `tarea_comentario`

```sql
CREATE TABLE IF NOT EXISTS public.tarea_comentario (
  id_tarea_comentario BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  id_usuario BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.4 New Table: `tarea_checklist`

```sql
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
```

### 4.5 New Table: `tarea_aprobacion`

```sql
CREATE TABLE IF NOT EXISTS public.tarea_aprobacion (
  id_tarea_aprobacion BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  id_usuario BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('aprobar', 'rechazar', 'reabrir')),
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.6 New Indexes for Performance

```sql
CREATE INDEX IF NOT EXISTS idx_tarea_estado_iglesia ON public.tarea(estado, id_iglesia);
CREATE INDEX IF NOT EXISTS idx_tarea_creado_en ON public.tarea(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_evento_fecha_inicio_iglesia ON public.evento(fecha_inicio DESC, id_iglesia);
```

### 4.7 New RPCs

1. `create_evento_with_ministerios()` — transactional insert into `evento` + `evento_ministerio`
2. `get_tarea_timeline(p_id_tarea)` — unified timeline query joining `tarea_historial`, `tarea_comentario`, `tarea_evidencia`, `tarea_aprobacion`
3. `create_tarea_checklist_item()` — insert with auto-logging to historial
4. `toggle_tarea_checklist()` — toggle complete/incomplete with auto-logging

### 4.8 Migration Strategy

Single migration file: `20260511_fase1_eventos_tareas_backend.sql`
Followed by backfill: existing eventos with `id_ministerio` → `evento_ministerio`

---

## 5. Phase 2: Frontend Components

### 5.1 Directory Structure

```
src/app/components/tasks/
├── TaskSidePanel.tsx
├── TaskTimeline.tsx
├── TaskChecklistSection.tsx
├── TaskEvidenceSection.tsx
├── TaskCommentSection.tsx
├── TaskApprovalSection.tsx
├── KanbanBoard.tsx
├── KanbanColumn.tsx
├── TaskCard.tsx
└── CreateTaskSheet.tsx

src/app/components/events/
├── EventSidePanel.tsx
├── EventMinistriesSection.tsx
└── CreateEventSheet.tsx
```

### 5.2 Side Panel (replaces Dialog)

| Aspect | Desktop | Mobile |
|---|---|---|
| Width | 480px, fixed right | Full width, max 85vh |
| Animation | `slideInRight` | `slideUp` |
| Overlay | Semi-transparent backdrop | Semi-transparent backdrop |
| Close | Click outside, ESC, X button | Drag down, tap backdrop, X button |
| Scroll | Internal, `hide-scrollbar` | Internal, `hide-scrollbar` |

Styled with existing tokens: `bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl`

### 5.3 Kanban Drag-and-Drop

**Library:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**Sensors:**
- `pointerSensor` with activation constraint 8px distance (prevents accidental drag while scrolling)
- `touchSensor` with same constraint (mobile support)

**DragEnd Handler:**
1. Detect source column + target column
2. Optimistic update: mutate React Query cache immediately
3. Execute `updateTareaEstado` mutation
4. Rollback cache on error + toast

**Accessibility:**
- `aria-roledescription="sortable"` on draggable cards
- Keyboard: Space/Enter to pick up, arrow keys to move, Space/Enter to drop

### 5.4 Rich Task Cards

Cards display inline:
- Priority badge + due date
- Title (2-line clamp)
- Checklist progress bar (if items exist)
- Assignee avatars (stacked, max 3 with +N overflow)
- Evidence + comments count
- Hover: subtle scale + border highlight (`border-[#4682b4]/20`)

### 5.5 Event Multi-Ministry Display

Event detail shows ministerios as tag badges, same style as existing `scopeConfig` badges:
```
bg-white/5 border-0 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg
```

### 5.6 Hooks

New hooks that mirror existing patterns (React Query):
- `useTareaComentarios(idTarea)`
- `useCreateTareaComentario()`
- `useTareaChecklist(idTarea)`
- `useCreateTareaChecklistItem()`
- `useToggleTareaChecklist()`
- `useTareaHistorial(idTarea)`
- `useCreateTareaAprobacion()`
- `useEventoMinisterios(idEvento)`
- `useCreateEventoWithMinisterios()`
- `useTareaTimeline(idTarea)`

---

## 6. Phase 3: UX/UI

### 6.1 Mobile Adaptations

| Component | Desktop | Mobile (<768px) |
|---|---|---|
| Side Panel | Right panel 480px | Bottom sheet, 85vh |
| Kanban | 4-column grid | Horizontal scroll, snap, 1 visible column |
| Create Task | Side panel | Bottom sheet |
| Filters row | Full row, visible | Collapsible + search icon |
| Task Card | Full info | Same, touch-friendly (44px touch targets) |
| Comments | Inline in side panel | Inline, scrollable |

### 6.2 Empty States

Each Kanban column has a contextual empty state:
```tsx
{isEmpty && (
  <div class="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
    <Inbox className="w-7 h-7 opacity-20" />
    <p class="text-xs">Sin tareas aquí</p>
    {canCreate && <Button variant="ghost" size="sm" onClick={openCreate}>Crear primera tarea</Button>}
  </div>
)}
```

### 6.3 Timeline Visual Design

Vertical line with dots per event, color-coded by action type:
- `#4682b4` = status changes
- `#10b981` (emerald) = comments
- `#f59e0b` (amber) = evidence uploads
- `#8b5cf6` (violet) = approvals/rejections

Timestamps shown as relative time ("hace 2 min", "hace 3 horas", "ayer") via `date-fns` `formatDistanceToNow`.

---

## 7. Phase 4: Performance & Realtime

### 7.1 React Query Optimistic Updates

Applied to ALL state-changing mutations:
- `useUpdateTareaEstado`
- `useCreateTareaComentario`
- `useToggleTareaChecklist`
- `useCreateTareaAprobacion`

Pattern: `onMutate` → cache set → return rollback context → `onError` → rollback → `onSettled` → invalidate

### 7.2 Supabase Realtime Channels

- **Per-task channel:** `tarea-{idTarea}` subscribes to `tarea_comentario` INSERT and `tarea` UPDATE
- **Dashboard channel:** `tablero-{idIglesia}` subscribes to `tarea` UPDATE for live Kanban updates
- Channels cleaned up on unmount via `useEffect` return

### 7.3 Pagination

`getTareasEnriquecidas()` accepts `{ limit, offset }`. Default limit: 50. UI adds "Load more" or infinite scroll at bottom of column.

### 7.4 Debounce

Search input debounced at 300ms via `useDebounce` hook.

### 7.5 Lazy Loading

`KanbanBoard` lazy-loaded via `React.lazy()` — only loaded when user navigates to `/tareas`.

---

## 8. Design Tokens & Visual Identity

All new components MUST use existing project tokens. No new colors, fonts, or spacing values.

### 8.1 Colors

```
Primary gradient: from-[#709dbd] to-[#4682b4]
Background card: bg-card/40 backdrop-blur-xl border-white/10
Text primary: text-primary (varies with theme)
Text muted: text-muted-foreground
Border: border-border/50 or border-white/10
Status pendiente: amber-500
Status en_progreso: [#4682b4]
Status en_revision: violet-500
Status completada: emerald-500 / primary
Status cancelada: rose-500
Priority urgente: rose-500
Priority alta: amber-500
Priority media: [#4682b4]
Priority baja: slate-400
```

### 8.2 Typography

```
Card titles: text-[13px] font-bold uppercase italic tracking-tight
Labels: text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground
Badges: text-[10px] uppercase font-black tracking-widest
Stats: text-4xl font-light tracking-tight
Section headers: text-[10px] font-black uppercase tracking-[0.25em]
```

### 8.3 Components to Preserve

- `<AnimatedCard>` — still used for stats, event cards
- `<Badge>` — for status, priority, ministry tags
- `<Button>` — gradient primary, ghost variants
- `<FieldLabel>` — inline helper component
- GlassInput, GlassSelect patterns

---

## 9. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| RLS recursion with new tables | High | Medium | Use existing helper RPCs, test policies in branch DB before prod |
| Migration conflicts with existing data | Medium | Low | Backfill script, test with seed data first |
| `dnd-kit` bundle size | Low | Medium | Lazy load KanbanBoard, tree-shake unused exports |
| Breaking existing task/event UI | High | Low | Phase 1 only touches DB; Phase 2 adds NEW components without modifying old ones until verified |
| Mobile UX regression | Medium | Low | Responsive wrapper preserves desktop behavior, only enhances mobile |
| Realtime channel leaks | Low | Low | Cleanup in `useEffect` return, `removeChannel` on unmount |
| Bug in `evento_ministerio` backfill | Medium | Low | Wrap in transaction, verify counts match before/after |

---

## 10. Roadmap

### Phase 1 — Database Backend (Day 1-2)

- [ ] Migration: `evento_ministerio` table + RLS
- [ ] Migration: `tarea_historial` table + RLS + auto-trigger
- [ ] Migration: `tarea_comentario` table + RLS
- [ ] Migration: `tarea_checklist` table + RLS
- [ ] Migration: `tarea_aprobacion` table + RLS
- [ ] Migration: new indexes
- [ ] Migration: new RPCs
- [ ] Backfill: existing `evento.id_ministerio` → `evento_ministerio`
- [ ] RPC: `create_evento_with_ministerios()`
- [ ] RPC: `get_tarea_timeline()`
- [ ] Verify: `supabase_get_advisors(type: "security")` passes

### Phase 2 — Frontend Components (Day 3-5)

- [ ] Extract `TaskSidePanel` component
- [ ] Create `TaskTimeline` component + hook
- [ ] Create `TaskChecklistSection` + hook
- [ ] Create `TaskCommentSection` + hook
- [ ] Create `TaskEvidenceSection` (enhanced from existing)
- [ ] Create `TaskApprovalSection` + hook
- [ ] Create `KanbanBoard` + `KanbanColumn` + `TaskCard` with `dnd-kit`
- [ ] Integrate into TasksPage (refactor, not rewrite)
- [ ] Create `EventSidePanel` + `EventMinistriesSection`
- [ ] Create `CreateTaskSheet` and `CreateEventSheet`
- [ ] Refactor EventsPage to use new components

### Phase 3 — UX/UI Enhancements (Day 5-6)

- [ ] Add `useMediaQuery` hook for responsive breakpoints
- [ ] Mobile: BottomSheet variant for TaskSidePanel
- [ ] Mobile: Kanban horizontal snap scroll
- [ ] Mobile: touch-friendly targets (44px min)
- [ ] Desktop: smooth scroll within columns
- [ ] Empty states per column
- [ ] Timeline color-coded dots
- [ ] All new components pass same design tokens audit

### Phase 4 — Performance & Realtime (Day 6-7)

- [ ] Optimistic updates on all task mutations
- [ ] Supabase Realtime channel per task
- [ ] Supabase Realtime channel per dashboard
- [ ] Pagination in `getTareasEnriquecidas`
- [ ] Debounce on search input
- [ ] Lazy load KanbanBoard
- [ ] Verify bundle size impact of `dnd-kit`
- [ ] Run `supabase_get_advisors(type: "performance")`

### Post-Rollout

- [ ] QA: test all role flows (admin_iglesia, lider, servidor)
- [ ] QA: mobile testing on real devices
- [ ] QA: verify no regression on existing event/task functionality
- [ ] Monitor: Supabase logs for any RLS errors
- [ ] Document: update CLAUDE.md with new component tree and hooks
