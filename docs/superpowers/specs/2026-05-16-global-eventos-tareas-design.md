# Global Eventos & Tareas Management — Design Spec

**Date:** 2026-05-16  
**Scope:** Super admin can view and manage all eventos and tareas across all churches from two dedicated global pages.

---

## 1. Goal

Add two routes under `/app/global/`:
- `/app/global/eventos` — all events across all iglesias, grouped by iglesia, full CRUD
- `/app/global/tareas` — all tasks across all iglesias, grouped by iglesia, list view, full CRUD

Existing tenant routes (`/app/:idIglesia/eventos`, `/app/:idIglesia/tareas`) are NOT modified.

---

## 2. Architecture

### New files
| File | Purpose |
|---|---|
| `src/app/components/GlobalEventosPage.tsx` | Global events page component |
| `src/app/components/GlobalTareasPage.tsx` | Global tasks page component |

### Modified files
| File | Change |
|---|---|
| `src/services/eventos.service.ts` | Add `iglesiaNombre?` to `EventoEnriquecido`; add `iglesiaId?`/`iglesiaNombre?`/`sedeNombre?` to `TareaEnriquecida`; extend SELECT queries to JOIN iglesia |
| `src/hooks/useEventos.ts` | Add `useEventosGlobal()` and `useTareasGlobal()` hooks |
| `src/app/routes.ts` | Add two routes under `/app/global/` |
| `src/app/components/AppLayout.tsx` | Add two nav items for `super_admin` |

---

## 3. Data Layer

### 3.1 EventoEnriquecido extension

```typescript
export interface EventoEnriquecido extends Evento {
  tipoEventoTexto: string | null
  cantidadTareas: number
  iglesiaNombre?: string   // new
}
```

**Query change in `getEventosEnriquecidos`:**

Replace select:
```typescript
.select('*, tarea(count)')
```
With:
```typescript
.select('*, tarea(count), iglesia(nombre)')
```

Map the new field:
```typescript
iglesiaNombre: r.iglesia?.nombre ?? undefined,
```

When called without `idIglesia`, returns all events across all churches with their iglesia name populated.

### 3.2 TareaEnriquecida extension

```typescript
export interface TareaEnriquecida extends Tarea {
  eventoNombre: string
  ministerioNombre: string
  asignadosCount: number
  asignados: (TareaAsignada & { nombreCompleto: string })[]
  iglesiaId?: number       // new
  iglesiaNombre?: string   // new
  sedeNombre?: string      // new
}
```

**Query change in `getTareasEnriquecidas`:**

Replace inner select clause:
```typescript
ministerio!inner(nombre, sede!inner(id_iglesia)),
```
With:
```typescript
ministerio!inner(nombre, sede!inner(id_iglesia, nombre, iglesia(id_iglesia, nombre))),
```

Map the new fields:
```typescript
iglesiaId: r.ministerio?.sede?.iglesia?.id_iglesia ?? undefined,
iglesiaNombre: r.ministerio?.sede?.iglesia?.nombre ?? undefined,
sedeNombre: r.ministerio?.sede?.nombre ?? undefined,
```

When called without `idIglesia`, returns all tasks across all churches.

### 3.3 New hooks

```typescript
// useEventos.ts
export function useEventosGlobal() {
  return useQuery({
    queryKey: ['eventos-enriquecidos', 'global'],
    queryFn: () => getEventosEnriquecidos(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTareasGlobal() {
  return useQuery({
    queryKey: ['tareas-enriquecidas', 'global'],
    queryFn: () => getTareasEnriquecidas(),
    staleTime: 5 * 60 * 1000,
  })
}
```

---

## 4. GlobalEventosPage UI

**Route:** `/app/global/eventos`

### Layout

```
┌─ Eventos ──────────────────────────── [+ Nuevo Evento] ─┐
│  🔍 Buscar evento...    [Todos] [Programado] [En Curso]  │
│                         [Finalizado]  [Global][Ministerial]│
├──────────────────────────────────────────────────────────┤
│  ▼  Iglesia Central  · 5 eventos                         │
│   [Card] Conferencia Anual  Global · Mar 20  Programado  │
│   [Card] Retiro Jóvenes  Ministerial · Abr 5  En Curso   │
│                                                          │
│  ▼  Iglesia El Shaddai  · 3 eventos                      │
│   [Card] Vigilia  Global · May 1  Programado             │
└──────────────────────────────────────────────────────────┘
```

### Cards
Same visual style as ministerios. Each card shows:
- Nombre del evento
- Badge: `Global` (sin sede/ministerio) or `Ministerial` (con ministerio)
- Badge de estado con color: programado=blue, en_curso=amber, finalizado=green, cancelado=red
- Fecha inicio (formatted)
- Contador de tareas asociadas
- Sede (if ministerial)
- Actions on hover: edit icon, delete icon

Click on card → **Sheet** (right panel) with full event detail:
- All event fields (nombre, descripcion, fechas, tipo, sede, ministerio, estado)
- Edit button opens inline edit dialog
- List of associated tareas (read-only, with their estados)

### Filters
- Search: by nombre
- Estado chips: Todos / Programado / En Curso / Finalizado / Cancelado
- Scope chips: Todos / Global / Ministerial
- Groups with 0 results hidden; collapsible by iglesia

### Create Dialog (2 steps)
- **Step 1:** Select iglesia
- **Step 2:** nombre (req), descripcion, fecha_inicio (req), fecha_fin (req), tipo_evento_texto, sede (optional, filtered by iglesia), id_ministerio (optional, filtered by sede)

Uses existing `useCreateEvento()` mutation.

### Edit Dialog
Same fields as create, pre-filled, opened from Sheet or card hover action.

---

## 5. GlobalTareasPage UI

**Route:** `/app/global/tareas`

### Layout

```
┌─ Tareas ─────────────────────────── [+ Nueva Tarea] ─────┐
│  🔍 Buscar tarea...   [Todos] [Pendiente] [En Progreso]   │
│                       [En Revisión] [Completada]           │
│                       Prioridad: [Todas][Alta][Urgente]    │
├───────────────────────────────────────────────────────────┤
│  ▼  Iglesia Central  · 8 tareas                           │
│  ● [alta]   Diseñar volante     Alabanza · Sede Norte  [pendiente]  vence 20/05  👥2  │
│  ● [media]  Reunión líderes     Jóvenes · Sede Sur     [en_progreso] vence 22/05  👥1  │
│                                                           │
│  ▼  Iglesia El Shaddai  · 3 tareas                        │
│  ● [urgente] Preparar presupuesto  Admin · Sede B   [en_revision]  vence hoy    👥3  │
└───────────────────────────────────────────────────────────┘
```

### List Rows
Each row in the list shows:
- Colored dot for prioridad (baja=gray, media=blue, alta=orange, urgente=red)
- Título de la tarea
- Ministerio · Sede (context)
- Badge de estado
- Fecha límite (formatted, highlighted red if overdue)
- Assignee count icon (👥N)
- Row hover: edit icon, delete icon

Click on row → **Sheet** (right panel) with task detail:
- All task fields (título, descripcion, estado, prioridad, fechaLimite, ministerio, evento asociado)
- Estado selector (dropdown to change estado)
- List of asignados with their names
- Delete button

### Filters
- Search: by título
- Estado chips: Todos / Pendiente / En Progreso / En Revisión / Completada
- Prioridad chips: Todas / Alta / Urgente
- Groups with 0 results hidden; collapsible by iglesia

### Create Dialog (3 steps)
- **Step 1:** Select iglesia
- **Step 2:** Select sede (filtered by iglesia) → select ministerio (filtered by sede)
- **Step 3:** título (req), descripcion, prioridad (req, default=media), fecha_limite

Uses existing `useCreateTarea()` mutation.

---

## 6. Navigation

### Routes (routes.ts)
Under `/app/global/` children:
```typescript
{ path: "eventos", Component: GlobalEventosPage, ErrorBoundary: ErrorPage },
{ path: "tareas", Component: GlobalTareasPage, ErrorBoundary: ErrorPage },
```

### Nav items (AppLayout.tsx) — super_admin section "Gestión Global"
```typescript
{ label: "Eventos", path: "/app/global/eventos", icon: <CalendarDays className="w-5 h-5" />, section: "Gestión Global" },
{ label: "Tareas", path: "/app/global/tareas", icon: <ListTodo className="w-5 h-5" />, section: "Gestión Global" },
```

Both icons are already imported in AppLayout.

---

## 7. Permissions

All actions on both global pages are `super_admin` only. GlobalLayout already enforces this guard — no additional permission checks needed in the components.

---

## 8. Out of Scope

- Drag-and-drop kanban for tareas (global view uses list only)
- Tarea evidence upload in global view
- Bulk operations on tareas
- Tarea assignment management in global view (Sheet shows asignados read-only)
- Changes to tenant routes or their components
