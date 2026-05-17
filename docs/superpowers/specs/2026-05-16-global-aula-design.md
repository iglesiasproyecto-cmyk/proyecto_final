# Global Aula for super_admin — Design Document

**Date**: 2026-05-16  
**Feature**: Global Aula Page — Cross-Church Academic Visibility & Management  
**Scope**: New page for super_admin to view, manage, and edit courses across all churches and ministries  
**Status**: Design Approved

---

## Problem Statement

The super_admin role can manage ministries, events, and tasks globally, but **cannot see or manage courses/certifications globally**. If a church experiences issues with the Aula (academic platform), the super_admin has no visibility without entering the tenant context manually. This limits oversight and creates operational friction when troubleshooting academic issues across the organization.

---

## Solution Overview

Create a **Global Aula page** (`/app/global/aula`) that gives super_admin:
- **Hierarchical visibility** into all courses across all churches and ministries
- **Full management capabilities**: Edit course metadata, manage enrollments
- **Consistent UX** with existing global pages (ministerios, eventos, tareas)

---

## Architecture

### Route & Navigation

**New Route**: `/app/global/aula`  
**Component**: `GlobalAulaPage.tsx`  
**Location**: `src/app/components/GlobalAulaPage.tsx`  
**Navigation Item**: Added to AppLayout sidebar under "Gestión Global" (between "Tareas" and "Usuarios")  
**Access Control**: Only visible to `rolActual === 'super_admin'` (guarded in AppLayout)

### Data Model

Courses in the system belong to one of two scopes:
- **Iglesia-scoped** (`aula_curso.id_iglesia != null`): Created by admin_iglesia, affects the whole church
- **Ministerio-scoped** (`aula_curso.id_ministerio != null`): Created by líderes, within a ministry

**Global Aula visibility**: super_admin sees BOTH types but in a hierarchical structure:
```
Iglesia A
  ├─ Cursos de Iglesia A (id_iglesia != null)
  ├─ Ministerio A1
  │  └─ Cursos de Ministerio A1 (id_ministerio != null)
  └─ Ministerio A2
     └─ Cursos de Ministerio A2 (id_ministerio != null)
Iglesia B
  ├─ Cursos de Iglesia B
  └─ Ministerio B1
     └─ Cursos de Ministerio B1
```

---

## Component Structure

### Main Component: `GlobalAulaPage.tsx`

**Responsibility**: 
- Load all iglesias globally
- Manage UI state (which iglesias/ministerios are expanded, which course is selected)
- Render the hierarchical tree
- Delegate detail operations to detail panel

**State**:
```typescript
const [expandedIglesias, setExpandedIglesias] = useState<Set<number>>(new Set());
const [expandedMinisterios, setExpandedMinisterios] = useState<Set<number>>(new Set());
const [selectedCurso, setSelectedCurso] = useState<AulaCursoEnriquecido | null>(null);
const [detailPanelOpen, setDetailPanelOpen] = useState(false);
```

**Key Methods**:
- `toggleIglesia(idIglesia)`: Expand/collapse iglesia; trigger load of cursos + ministerios
- `toggleMinisterio(idMinisterio)`: Expand/collapse ministerio; trigger load of cursos de ministerio
- `selectCurso(curso)`: Open detail panel with curso details + inscripciones
- `handleCloseCurso()`: Close detail panel, refetch affected data if mutated

### Sub-component: `IglesiaAulaRow.tsx`

**Props**:
```typescript
interface IglesiaAulaRowProps {
  iglesia: Iglesia;
  isExpanded: boolean;
  cursos: AulaCursoEnriquecido[];
  ministerios: MinisterioEnriquecido[];
  onToggle: () => void;
  onCursoSelect: (curso: AulaCursoEnriquecido) => void;
  onMinisterioToggle: (idMinisterio: number) => void;
  expandedMinisterios: Set<number>;
  isLoading?: boolean;
}
```

**Renders**:
- Iglesia header with toggle button
- When expanded:
  - "Cursos de [Iglesia]" subsection (list of iglesia-scoped courses)
  - "Ministerios" subsection (list of ministerios, each collapsible)

**Styling**: Follows GlobalMinisteriosPage pattern — card/row with icons, badges for estado, # inscritos

### Sub-component: `MinisterioRow.tsx`

**Props**:
```typescript
interface MinisterioRowProps {
  ministerio: MinisterioEnriquecido;
  isExpanded: boolean;
  cursos: AulaCursoEnriquecido[];
  onToggle: () => void;
  onCursoSelect: (curso: AulaCursoEnriquecido) => void;
  isLoading?: boolean;
}
```

**Renders**:
- Ministerio header with toggle + icon
- When expanded: list of cursos de ministerio

### Sub-component: `CursoListItem.tsx`

**Props**:
```typescript
interface CursoListItemProps {
  curso: AulaCursoEnriquecido;
  onSelect: (curso: AulaCursoEnriquecido) => void;
}
```

**Renders**:
- Curso name
- Estado badge (borrador/activo/archivado)
- Enrollment count badge
- Click handler opens detail panel

### Sub-component: `GlobalAulaDetailPanel.tsx` (Sheet)

**Props**:
```typescript
interface GlobalAulaDetailPanelProps {
  open: boolean;
  curso: AulaCursoEnriquecido | null;
  onClose: () => void;
  onSave?: () => void;
}
```

**Sections**:

#### 1. Curso Metadata (Editable)
- **Fields** (with react-hook-form):
  - `titulo` (text input, required)
  - `descripcion` (textarea, optional)
  - `estado` (select: borrador/activo/archivado, required)
- **Metadata Display** (read-only):
  - Tipo: "Iglesia" / "Ministerio"
  - Iglesia name
  - Ministerio name (if applicable)
  - Created by: usuario name
  - Created date
- **Actions**:
  - Edit button (toggles form edit mode)
  - Save/Cancel buttons (only in edit mode)

#### 2. Inscripciones (View + Manage)
- **Table**: Usuario, Email, Inscrito en, Botón Remover
- **Remover action**:
  - Confirmation dialog: "¿Seguro que deseas remover a [nombre]?"
  - Mutation: `useManageEnrollments({ action: 'remove', idUsuario })`
  - Toast on success/error
- **Button**: "Agregar Usuarios"
  - Opens dialog with user search + multi-select
  - Filter: only show usuarios from the same iglesia
  - On submit: mutate with `action: 'add'` for each selected user
  - Prevent duplicate enrollments (validate on client + backend)

#### 3. Action Link
- Link: "Ver curso completo" → navigates to `/app/{idIglesia}/aula/curso/{idCurso}`
- Purpose: To edit módulos/actividades (stays in tenant context)

**Error Handling in Panel**:
- If curso not found: Show error message "Curso no encontrado"
- If edit fails: Toast error + keep form open
- If remove fails: Toast error with option to retry
- If add enrollment fails: Toast error, dialog stays open

---

## Data Flow & Hooks

### Data Loading Hierarchy

```
Mount GlobalAulaPage
  ↓
useIglesiasGlobal()
  ↓ (returns array of iglesias)
User expands iglesia A
  ↓
useCursosGlobal(idIglesia: A) 
+ useMinisteriosIglesia(idIglesia: A) [parallel]
  ↓ (returns cursos iglesia + ministerios list)
User expands ministerio A1 inside iglesia A
  ↓
useCursosPorMinisterio(idMinisterio: A1)
  ↓ (returns cursos ministerio)
User clicks curso
  ↓
useCursoDetalle(idCurso) [if not cached]
  ↓ (returns curso + inscripciones)
Detail panel renders
```

### Required Hooks

#### 1. `useIglesiasGlobal()` [Existing or Extended]
- **Source**: Reuse from GlobalMinisteriosPage or extend useIglesias
- **Query**: All iglesias (global context)
- **Returns**: `{ id, nombre, sede_info, ... }[]`
- **Caching**: queryKey: `['iglesias-global']`

#### 2. `useCursosGlobal(idIglesia: number | undefined)` [New]
- **Query**: Supabase `aula_curso` where `id_iglesia = idIglesia` and `id_ministerio is null`
- **Returns**: `AulaCursoEnriquecido[]`
- **Caching**: queryKey: `['cursos-global', idIglesia]`
- **Enabled**: Only when idIglesia is defined (user expands iglesia)

#### 3. `useMinisteriosIglesia(idIglesia: number)` [Existing]
- **Reuse from existing hook in useMinisterios.ts**
- **Returns**: `MinisterioEnriquecido[]` with ministerios from that iglesia

#### 4. `useCursosPorMinisterio(idMinisterio: number | undefined)` [New]
- **Query**: Supabase `aula_curso` where `id_ministerio = idMinisterio`
- **Returns**: `AulaCursoEnriquecido[]`
- **Caching**: queryKey: `['cursos-ministerio', idMinisterio]`
- **Enabled**: Only when idMinisterio is defined (user expands ministerio)

#### 5. `useCursoDetalle(idCurso: number | undefined)` [New]
- **Query**: Single `aula_curso` record + nested `aula_inscripcion` with usuario data
- **Returns**: 
  ```typescript
  {
    ...AulaCursoEnriquecido,
    inscripciones: {
      id_usuario: number,
      nombres: string,
      apellidos: string,
      correo: string,
      inscrito_en: string,
      activo: boolean
    }[]
  }
  ```
- **Caching**: queryKey: `['curso-detalle', idCurso]`
- **Enabled**: Only when idCurso is selected (panel opens)

#### 6. `useEditCurso()` [New - Mutation]
- **Mutation**: Update `aula_curso` where `id_aula_curso = idCurso`
- **Params**: `{ idCurso, titulo, descripcion, estado }`
- **Returns**: Updated curso
- **Invalidates**: `['curso-detalle', idCurso]`, `['cursos-global', idIglesia]`, `['cursos-ministerio', idMinisterio]`
- **Error**: Toast on failure

#### 7. `useManageEnrollments(idCurso: number)` [New - Mutation]
- **Mutation**: Add or remove `aula_inscripcion`
- **Params**: `{ action: 'add' | 'remove', idUsuario }`
- **Returns**: Updated inscriptions list
- **Invalidates**: `['curso-detalle', idCurso]`
- **Validations**:
  - On client: Check user not already enrolled (for 'add')
  - On backend: Unique constraint prevents duplicates

### Query Key Strategy

- Iglesias: `['iglesias-global']`
- Cursos iglesia: `['cursos-global', idIglesia]`
- Ministerios: `['ministerios-iglesia', idIglesia]`
- Cursos ministerio: `['cursos-ministerio', idMinisterio]`
- Curso detalle: `['curso-detalle', idCurso]`

**Invalidation on mutations**:
- `useEditCurso`: Invalidate `['curso-detalle', *]`, `['cursos-global', *]`, `['cursos-ministerio', *]`
- `useManageEnrollments`: Invalidate `['curso-detalle', idCurso]`

---

## UI/UX Details

### Layout

**Header** (similar to GlobalMinisteriosPage):
- Page title: "Aula Virtual Global"
- Badge: "Gestión de Cursos" + icon
- Brief description: "Administra cursos en todas las iglesias y ministerios"

**Main Content**:
- Collapsible iglesias tree (no search/filter at this stage)
- Each iglesia row shows:
  - Iglesia name + toggle arrow
  - When expanded:
    - "Cursos de [Iglesia]" section (small header with count)
    - List of iglesia-scoped cursos
    - "Ministerios" section
    - List of ministerios (each collapsible)

**Detail Panel** (Sheet from right side, same as GlobalMinisteriosPage):
- Close button top-right
- Full curso details
- Edit form (toggleable)
- Inscriptions table + actions
- "Ver curso completo" link at bottom

### Loading States

- **Iglesias load**: Skeleton list on first mount
- **Iglesia expand**: Small spinner in iglesia row while loading cursos + ministerios
- **Ministerio expand**: Small spinner in ministerio row while loading cursos
- **Course detail**: Spinner in detail panel while loading inscripciones

### Empty States

- "No hay iglesias" → Alert on page
- "Iglesia sin cursos de iglesia" → "No hay cursos creados a nivel iglesia"
- "Ministerio sin cursos" → "No hay cursos en este ministerio"
- "No inscripciones" → "Sin usuarios inscritos" in inscriptions section

### Confirmations & Warnings

- **Remove enrollment**: Dialog "¿Seguro que deseas remover a [user]? Perderá acceso al curso."
- **Archive course**: Warning badge "Los inscritos perderán acceso a este curso"

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Iglesias load fails | Alert banner at top; retry button |
| Cursos load for one iglesia fails | Skeleton stays visible in that iglesia; retry on user expand again |
| Curso deleted while detail panel open | Panel shows "Curso no encontrado" + close button |
| Edit mutation fails | Toast error + form stays open for retry |
| Remove enrollment fails | Toast error + option to retry |
| Add enrollment fails (duplicate) | Toast "Usuario ya inscrito"; dialog stays open |
| Add enrollment fails (other) | Toast error; dialog stays open |
| Permission denied | Redirect to home or show error; should not happen if RoleGuard works |

---

## Permissions & Access Control

- **Page-level**: Only accessible if `rolActual === 'super_admin'`
  - RoleGuard in routes.ts or AppLayout navigation checks this
  - Non-super_admin users cannot see nav item or access `/app/global/aula`

- **Curso-level**:
  - super_admin can edit ANY curso (iglesia or ministerio scoped)
  - Decision: No additional row-level permissions; super_admin has global access

- **Enrollment-level**:
  - Can only add users from the same iglesia (filtered in dialog)
  - Can remove any enrolled user

---

## Testing Strategy

### Unit/Component Testing (if test suite is added)

1. **Rendering**:
   - ✓ Iglesias render as collapsible items
   - ✓ Toggle expand/collapse works
   - ✓ Expanded iglesia shows cursos + ministerios

2. **Data Loading**:
   - ✓ `useIglesiasGlobal` called once on mount
   - ✓ `useCursosGlobal` called only on iglesia expand
   - ✓ `useCursosPorMinisterio` called only on ministerio expand
   - ✓ React Query caching works (no duplicate calls)

3. **Detail Panel**:
   - ✓ Opens on curso click
   - ✓ Displays curso data correctly
   - ✓ Edit form toggles
   - ✓ Save persists changes
   - ✓ Enrollments list renders
   - ✓ Remove confirmation dialog works
   - ✓ Add users dialog works

4. **Error States**:
   - ✓ Empty states render when no data
   - ✓ Error toasts show on mutation failures
   - ✓ Permissions block non-super_admin

### Manual/QA Testing

- Smoke test: Can super_admin access `/app/global/aula`?
- Expand iglesia A → cursos + ministerios load?
- Expand ministerio → cursos load?
- Click curso → detail panel opens with correct data?
- Edit curso metadata → saves correctly?
- Add enrolled user → appears in list?
- Remove user → requires confirmation → removes from list?
- Try duplicate enrollment → shows appropriate error?
- Navigate back and forth → data stays in sync?

---

## Implementation Notes

### Existing Patterns to Follow

- **GlobalMinisteriosPage**: Layout, Sheet detail panel, inline dialogs
- **GlobalEventosPage**: Filtering/state management, mutation error handling
- **GlobalTareasPage**: Tree/hierarchical display (reference if present)
- **AulaPage** (tenant-scoped): Course data structures, enrollment queries

### Files to Create

- `src/app/components/GlobalAulaPage.tsx` (main)
- `src/app/components/IglesiaAulaRow.tsx`
- `src/app/components/MinisterioRow.tsx`
- `src/app/components/CursoListItem.tsx`
- `src/app/components/GlobalAulaDetailPanel.tsx`
- `src/hooks/useGlobalAula.ts` (or split into multiple hook files)

### Files to Modify

- `src/app/routes.ts`: Add route `/app/global/aula`
- `src/app/components/AppLayout.tsx`: Add nav item for super_admin
- `src/services/aula.service.ts`: Add/export any new global query functions if needed
- `src/hooks/useCursos.ts`: Add `useCursosPorMinisterio`, `useCursoDetalle` if not already present

### Dependencies

- react-query: Already in use, for data fetching/caching
- react-hook-form: Already in use, for detail panel form
- sonner: Already in use, for toasts
- shadcn/ui: Sheet, Dialog, Button, Input, Select (already available)

---

## Success Criteria

- ✓ super_admin can see all courses across all churches and ministries in one hierarchical view
- ✓ super_admin can edit course metadata and manage enrollments without entering tenant context
- ✓ UI is responsive, follows existing design patterns, uses same components as GlobalMinisteriosPage
- ✓ Data loads efficiently (no N+1 queries, lazy loading of expanded iglesias/ministerios)
- ✓ Error handling is graceful with clear user feedback
- ✓ Feature is accessible only to super_admin role

---

## Future Enhancements (Out of Scope)

- Search/filter cursos across all iglesias
- Bulk actions (e.g., archive multiple cursos)
- Statistics dashboard (completion rates, active enrollments, etc.)
- CSV export of enrollments
- View módulos/actividades structure without navigating to tenant context
