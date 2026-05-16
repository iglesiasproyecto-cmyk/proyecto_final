# Task Assignment Scope and Notification Deep-Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement role-scoped task assignment (admin_iglesia, admin_sede, lider), multi-user assignment (1, varios, todos), and in-app notification deep-link that opens the assigned task detail directly.

**Architecture:** Keep current React + service-layer structure. Add scoped data fetchers and UI state for hierarchical selectors (iglesia/sede/ministerio/usuarios), enforce assignment authorization in service/RPC boundary, and persist task notification payload for navigation. Use existing `TasksPage` and `NotificationsPage` flows with minimal invasive changes.

**Tech Stack:** React 18, TypeScript, React Query, Supabase JS client, Vite.

---

## File Structure (planned changes)

- Modify: `src/app/components/TasksPage.tsx`
  - Add role-aware hierarchical assignment UI and multi-select behavior.
- Modify: `src/services/ministerios.service.ts`
  - Add filtered fetchers for ministerios by sede and usuarios by ministerio.
- Modify: `src/hooks/useMinisterios.ts`
  - Expose new React Query hooks for new service fetchers.
- Modify: `src/services/eventos.service.ts`
  - Add secure, scoped assignment path with notification creation and summary result.
- Modify: `src/hooks/useEventos.ts`
  - Add/adjust mutation hook for batch assignment and return summary.
- Modify: `src/services/notificaciones.service.ts`
  - Add parser/helper for task deep-link payload in notification text (phase 1).
- Modify: `src/app/components/NotificationsPage.tsx`
  - Navigate to task board and open task detail when notification type is `tarea`.
- (Optional migration in phase 2): `supabase/migrations/<timestamp>_add_notificacion_meta.sql`
  - Add `meta jsonb` to `notificacion` to replace message parsing.

---

### Task 1: Add scoped fetchers for assignment hierarchy

**Files:**
- Modify: `src/services/ministerios.service.ts`
- Modify: `src/hooks/useMinisterios.ts`

- [ ] **Step 1: Write failing service-level tests (or compile-time contract checks if no test runner exists)**

```ts
// Pseudotest contract to add in future test suite (document in code comments near functions)
// getMinisteriosPorSede(idSede) returns only ministerios with ministerio.id_sede === idSede
// getUsuariosActivosPorMinisterio(idMinisterio) returns unique users with fecha_salida IS NULL
```

- [ ] **Step 2: Run baseline build before changes**

Run: `npm run build`
Expected: existing build succeeds.

- [ ] **Step 3: Implement minimal service functions**

```ts
export interface UsuarioMinisterioAsignable {
  idUsuario: number
  nombres: string
  apellidos: string
  nombreCompleto: string
}

export async function getMinisteriosPorSede(idSede: number): Promise<MinisterioEnriquecido[]> {
  const { data, error } = await supabase
    .from('ministerio')
    .select('*, sede(nombre), miembro_ministerio(rol_en_ministerio, fecha_salida, usuario(nombres, apellidos))')
    .eq('id_sede', idSede)
    .eq('estado', 'activo')
    .order('nombre')
  if (error) throw error
  return (data as any[]).map(/* reuse current mapper pattern */)
}

export async function getUsuariosActivosPorMinisterio(idMinisterio: number): Promise<UsuarioMinisterioAsignable[]> {
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('id_usuario, usuario(nombres, apellidos)')
    .eq('id_ministerio', idMinisterio)
    .is('fecha_salida', null)

  if (error) throw error

  const seen = new Set<number>()
  return (data as any[])
    .filter((r) => {
      if (seen.has(r.id_usuario)) return false
      seen.add(r.id_usuario)
      return true
    })
    .map((r) => {
      const nombres = r.usuario?.nombres ?? ''
      const apellidos = r.usuario?.apellidos ?? ''
      return {
        idUsuario: r.id_usuario,
        nombres,
        apellidos,
        nombreCompleto: `${nombres} ${apellidos}`.trim(),
      }
    })
}
```

- [ ] **Step 4: Add hooks for new fetchers**

```ts
export function useMinisteriosPorSede(idSede?: number) {
  return useQuery({
    queryKey: ['ministerios-por-sede', idSede],
    queryFn: () => getMinisteriosPorSede(idSede as number),
    enabled: !!idSede && idSede > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUsuariosActivosPorMinisterio(idMinisterio?: number) {
  return useQuery({
    queryKey: ['usuarios-activos-ministerio', idMinisterio],
    queryFn: () => getUsuariosActivosPorMinisterio(idMinisterio as number),
    enabled: !!idMinisterio && idMinisterio > 0,
    staleTime: 60 * 1000,
  })
}
```

- [ ] **Step 5: Re-run build verification**

Run: `npm run build`
Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/ministerios.service.ts src/hooks/useMinisterios.ts
git commit -m "feat(tasks): add scoped assignment data fetchers"
```

---

### Task 2: Implement role-aware hierarchical assignment UI in TasksPage

**Files:**
- Modify: `src/app/components/TasksPage.tsx`

- [ ] **Step 1: Add failing behavior notes (manual checks) before coding**

```txt
Current failure to reproduce:
1) Open task detail as admin_iglesia
2) "Asignar usuario" shows full iglesia users without sede/ministerio hierarchy
Expected: Iglesia preselected, then sede -> ministerio -> usuarios
```

- [ ] **Step 2: Add state shape for scoped selectors and multi-select**

```ts
const [assignScope, setAssignScope] = useState({
  idSede: 0,
  idMinisterio: 0,
  selectedUserIds: [] as number[],
  assignAll: false,
})
```

- [ ] **Step 3: Wire role defaults from AppContext and task context**

```ts
const isAdminIglesia = rolActual === 'admin_iglesia' || rolActual === 'super_admin'
const isAdminSede = rolActual === 'admin_sede'
const isLider = rolActual === 'lider'

// Default preselection behavior:
// admin_iglesia: iglesia fixed from iglesiaActual, sede pending selection
// admin_sede: sede fixed from sedesDelUsuario[0]
// lider: ministerio fixed from task.idMinisterio or led ministerio when unique
```

- [ ] **Step 4: Replace single-select user dropdown with hierarchical controls**

```tsx
{/* Sede selector shown for admin_iglesia only */}
{/* Ministerio selector shown once sede context exists */}
{/* User multiselect list + "Seleccionar todos" checkbox */}
```

- [ ] **Step 5: Add guard rails and clear dependent selections**

```ts
useEffect(() => {
  setAssignScope((prev) => ({ ...prev, idMinisterio: 0, selectedUserIds: [], assignAll: false }))
}, [assignScope.idSede])

useEffect(() => {
  setAssignScope((prev) => ({ ...prev, selectedUserIds: [], assignAll: false }))
}, [assignScope.idMinisterio])
```

- [ ] **Step 6: Hook assign button to batch payload**

```ts
const idsToAssign = assignScope.assignAll
  ? usuariosFiltrados.map((u) => u.idUsuario)
  : assignScope.selectedUserIds

if (!idsToAssign.length) {
  toast.error('Selecciona al menos un usuario')
  return
}

assignBatchMutation.mutate({ idTarea: task.idTarea, idMinisterioContexto: assignScope.idMinisterio, idsUsuarios: idsToAssign })
```

- [ ] **Step 7: Run build and manual UI checks**

Run: `npm run build`
Expected: PASS.

Manual expected:
- admin_iglesia sees iglesia fixed + sede selector.
- admin_sede sees iglesia/sede fixed.
- lider sees ministerio-only scope.
- multi-select and "todos" work.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/TasksPage.tsx
git commit -m "feat(tasks): add role-scoped hierarchical assignee selector"
```

---

### Task 3: Add secure batch assignment service with permission validation

**Files:**
- Modify: `src/services/eventos.service.ts`
- Modify: `src/hooks/useEventos.ts`

- [ ] **Step 1: Add failing validation scenario (manual/API)**

```txt
Scenario: admin_sede attempts assignment to user from another sede via crafted request.
Expected: service rejects with 403 and does not create assignment.
```

- [ ] **Step 2: Implement batch function contract**

```ts
export interface AssignBatchInput {
  idTarea: number
  idMinisterioContexto: number
  idsUsuarios: number[]
}

export interface AssignBatchResult {
  assigned: number
  duplicated: number
  rejected: number
}
```

- [ ] **Step 3: Implement secure assignment path with per-user validation**

```ts
export async function assignUsuariosATarea(input: AssignBatchInput): Promise<AssignBatchResult> {
  // 1) Resolve current user role/scope
  // 2) Validate each target user is in permitted scope
  // 3) Upsert assignment (or skip duplicate)
  // 4) Create in-app notification for successful assignments
  // 5) Return summary counters
}
```

- [ ] **Step 4: Add React Query mutation hook and cache invalidation**

```ts
export function useAssignUsuariosATarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assignUsuariosATarea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas-asignadas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['notificaciones'] })
    },
  })
}
```

- [ ] **Step 5: Run build verification**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/eventos.service.ts src/hooks/useEventos.ts
git commit -m "feat(tasks): secure batch assignment with scope validation"
```

---

### Task 4: Add notification payload format and task deep-link parsing

**Files:**
- Modify: `src/services/eventos.service.ts`
- Modify: `src/services/notificaciones.service.ts`

- [ ] **Step 1: Define deterministic deep-link token format**

```ts
// message example:
// "Se te asigno la tarea: Preparar sonido [TASK_ID:123]"
```

- [ ] **Step 2: Add helper parser in notification service**

```ts
export function extractTaskIdFromNotificationMessage(message: string): number | null {
  const match = message.match(/\[TASK_ID:(\d+)\]/)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}
```

- [ ] **Step 3: Ensure assignment flow writes token in notification message**

```ts
await supabase.from('notificacion').insert({
  id_usuario: targetUserId,
  tipo: 'tarea',
  titulo: 'Nueva tarea asignada',
  mensaje: `Se te asigno la tarea: ${taskTitle} [TASK_ID:${idTarea}]`,
  leida: false,
})
```

- [ ] **Step 4: Run build verification**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/eventos.service.ts src/services/notificaciones.service.ts
git commit -m "feat(notifications): add task deep-link payload parsing"
```

---

### Task 5: Navigate from NotificationsPage directly to task detail

**Files:**
- Modify: `src/app/components/NotificationsPage.tsx`
- Modify: `src/app/components/TasksPage.tsx`

- [ ] **Step 1: Add failing manual flow**

```txt
Current: clicking task notification opens generic modal only.
Expected: navigate to /app/:iglesiaId/tareas and open specific task detail.
```

- [ ] **Step 2: Add navigate handler in NotificationsPage**

```ts
const navigate = useNavigate()

const handleOpenNotification = (n: NotificacionUi) => {
  if (!n.leida) markReadMutation.mutate(n.idNotificacion)
  if (n.tipo !== 'tarea') {
    setSelectedNotification(n)
    return
  }
  const taskId = extractTaskIdFromNotificationMessage(n.mensaje)
  if (!taskId) {
    setSelectedNotification(n)
    return
  }
  const base = iglesiaActual?.id ? `/app/${iglesiaActual.id}/tareas` : '/app/tareas'
  navigate(`${base}?openTask=${taskId}`)
}
```

- [ ] **Step 3: Read query param in TasksPage and auto-open detail**

```ts
const [searchParams, setSearchParams] = useSearchParams()
useEffect(() => {
  const openTask = Number(searchParams.get('openTask') || 0)
  if (!openTask) return
  setSelectedTask(openTask)
  searchParams.delete('openTask')
  setSearchParams(searchParams, { replace: true })
}, [searchParams, setSearchParams])
```

- [ ] **Step 4: Add fallback toast if task not found/unauthorized**

```ts
if (openTask && !tareas.some((t) => t.idTarea === openTask)) {
  toast.error('La tarea ya no esta disponible')
}
```

- [ ] **Step 5: Run build and manual end-to-end check**

Run: `npm run build`
Expected: PASS.

Manual expected:
1) Asignar tarea
2) Entrar con usuario asignado
3) Click notificacion de tarea
4) Redirecciona y abre detalle de esa tarea

- [ ] **Step 6: Commit**

```bash
git add src/app/components/NotificationsPage.tsx src/app/components/TasksPage.tsx
git commit -m "feat(tasks): open task detail from notification click"
```

---

### Task 6: Hardening, QA matrix, and final cleanup

**Files:**
- Modify: `src/app/components/TasksPage.tsx`
- Modify: `src/services/eventos.service.ts`
- Modify: `docs/superpowers/specs/2026-05-16-task-assignment-scope-and-notification-design.md` (only if behavior adjustments are needed)

- [ ] **Step 1: Add explicit empty states and disabled button states**

```tsx
// Examples in assignment UI:
// "No hay ministerios para esta sede"
// "No hay usuarios en este ministerio"
// Disabled assign button until valid selection
```

- [ ] **Step 2: Add clear summary toasts from batch result**

```ts
toast.success(`${result.assigned} asignados, ${result.duplicated} ya asignados, ${result.rejected} rechazados`)
```

- [ ] **Step 3: Run full verification**

Run: `npm run build`
Expected: PASS.

Manual role QA matrix:
- admin_iglesia cannot assign outside selected sede/ministerio
- admin_sede cannot assign outside own sede
- lider cannot assign outside own ministerio
- 1/varios/todos assignment works

- [ ] **Step 4: Commit**

```bash
git add src/app/components/TasksPage.tsx src/services/eventos.service.ts
git commit -m "fix(tasks): enforce scoped assignment UX and result messaging"
```

---

## Spec Coverage Check

- Role-scoped hierarchical assignment: covered by Task 2 + Task 3.
- Multi-selection (1, varios, todos): covered by Task 2.
- In-app notification creation at assignment time: covered by Task 3 + Task 4.
- Notification click opens exact task detail: covered by Task 5.
- Error handling and edge cases: covered by Task 6.
- Security validation in backend/service boundary: covered by Task 3.

## Placeholder Scan

- No TODO/TBD markers left.
- All tasks include concrete files and command checks.

## Type Consistency Check

- Assignment payload uses consistent identifiers: `idTarea`, `idMinisterioContexto`, `idsUsuarios`.
- Summary result consistently uses: `assigned`, `duplicated`, `rejected`.
- Notification parser consistently uses token: `[TASK_ID:<number>]`.
