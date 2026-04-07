# Phase 6: Dashboard Real + Estadísticas por Iglesia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded/mock data in the Dashboard with real Supabase queries scoped to `iglesiaActual`. Implement stats: total miembros, ministerios activos, eventos próximos, cursos activos, distribución de roles.

**Architecture:** Create a dedicated `dashboard.service.ts` with aggregation queries that accept `idIglesia`. Add `useDashboard` hook. Replace mock stats in `DashboardPage.tsx` with real data. All queries are scoped to the current iglesia from AppContext.

**Tech Stack:** React 18, Supabase JS v2, TanStack Query v5, Recharts (already installed)

---

## File Structure

| File | Change |
|------|--------|
| `src/services/dashboard.service.ts` | Create — aggregation queries for dashboard stats |
| `src/hooks/useDashboard.ts` | Create — TanStack Query hooks for dashboard data |
| `src/app/components/DashboardPage.tsx` | Modify — replace mock data with real queries |

---

### Task 1: Create dashboard.service.ts

**Files:**
- Create: `src/services/dashboard.service.ts`

- [ ] **Step 1: Create the file**

```typescript
import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  totalMiembros: number
  ministeriosActivos: number
  eventosProximos: number
  cursosActivos: number
}

export interface RoleDistribution {
  nombre: string
  cantidad: number
}

export interface EventoProximo {
  idEvento: number
  titulo: string
  fechaInicio: string
  tipoEvento: string
}

export interface MinisterioStat {
  nombre: string
  cantidadMiembros: number
}

export async function getDashboardStats(idIglesia: number): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0]

  // Run all counts in parallel
  const [miembrosRes, ministeriosRes, eventosRes, cursosRes] = await Promise.all([
    supabase
      .from('usuario_rol')
      .select('id_usuario_rol', { count: 'exact', head: true })
      .eq('id_iglesia', idIglesia)
      .is('fecha_fin', null),
    supabase
      .from('ministerio')
      .select('id_ministerio', { count: 'exact', head: true })
      .eq('estado', 'activo')
      .in('id_sede', supabase.from('sede').select('id_sede').eq('id_iglesia', idIglesia)),
    supabase
      .from('evento')
      .select('id_evento', { count: 'exact', head: true })
      .eq('id_iglesia', idIglesia)
      .gte('fecha_inicio', today),
    supabase
      .from('curso')
      .select('id_curso', { count: 'exact', head: true })
      .eq('estado', 'activo')
      .in('id_sede', supabase.from('sede').select('id_sede').eq('id_iglesia', idIglesia)),
  ])

  return {
    totalMiembros: miembrosRes.count ?? 0,
    ministeriosActivos: ministeriosRes.count ?? 0,
    eventosProximos: eventosRes.count ?? 0,
    cursosActivos: cursosRes.count ?? 0,
  }
}

export async function getRoleDistribution(idIglesia: number): Promise<RoleDistribution[]> {
  const { data, error } = await supabase
    .from('usuario_rol')
    .select('rol(nombre)')
    .eq('id_iglesia', idIglesia)
    .is('fecha_fin', null)
  if (error) throw error

  const counts = new Map<string, number>()
  for (const row of (data as any[])) {
    const nombre = row.rol?.nombre ?? 'Sin rol'
    counts.set(nombre, (counts.get(nombre) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

export async function getEventosProximos(idIglesia: number, limit = 5): Promise<EventoProximo[]> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('evento')
    .select('id_evento, titulo, fecha_inicio, tipo_evento(nombre)')
    .eq('id_iglesia', idIglesia)
    .gte('fecha_inicio', today)
    .order('fecha_inicio')
    .limit(limit)
  if (error) throw error

  return (data as any[]).map(r => ({
    idEvento: r.id_evento,
    titulo: r.titulo,
    fechaInicio: r.fecha_inicio,
    tipoEvento: r.tipo_evento?.nombre ?? '',
  }))
}

export async function getMinisterioStats(idIglesia: number): Promise<MinisterioStat[]> {
  const { data, error } = await supabase
    .from('ministerio')
    .select('nombre, miembro_ministerio(count)')
    .eq('estado', 'activo')
    .in('id_sede', supabase.from('sede').select('id_sede').eq('id_iglesia', idIglesia))
    .order('nombre')
    .limit(6)
  if (error) throw error

  return (data as any[]).map(r => ({
    nombre: r.nombre,
    cantidadMiembros: Array.isArray(r.miembro_ministerio) ? r.miembro_ministerio[0]?.count ?? 0 : 0,
  }))
}
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | head -30
```

Expected: No errors. The subqueries in `.in()` use the PostgREST filter builder — if Supabase JS v2 does not support chained `from()` inside `.in()`, replace with a two-step fetch (first fetch sede IDs, then filter by the array).

**Fallback for `.in()` subquery** — if build or runtime errors occur with the subquery syntax, replace with:

```typescript
async function getSedeIds(idIglesia: number): Promise<number[]> {
  const { data } = await supabase
    .from('sede')
    .select('id_sede')
    .eq('id_iglesia', idIglesia)
  return (data ?? []).map((r: any) => r.id_sede)
}

// Then inside getDashboardStats:
const sedeIds = await getSedeIds(idIglesia)
// Replace .in('id_sede', supabase.from(...)) with:
// .in('id_sede', sedeIds)
```

---

### Task 2: Create useDashboard.ts

**Files:**
- Create: `src/hooks/useDashboard.ts`

- [ ] **Step 1: Create the file**

```typescript
import { useQuery } from '@tanstack/react-query'
import {
  getDashboardStats,
  getRoleDistribution,
  getEventosProximos,
  getMinisterioStats,
} from '@/services/dashboard.service'

export function useDashboardStats(idIglesia: number | undefined) {
  return useQuery({
    queryKey: ['dashboard-stats', idIglesia],
    queryFn: () => getDashboardStats(idIglesia!),
    enabled: !!idIglesia,
    staleTime: 2 * 60 * 1000,
  })
}

export function useRoleDistribution(idIglesia: number | undefined) {
  return useQuery({
    queryKey: ['role-distribution', idIglesia],
    queryFn: () => getRoleDistribution(idIglesia!),
    enabled: !!idIglesia,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEventosProximos(idIglesia: number | undefined) {
  return useQuery({
    queryKey: ['eventos-proximos-dashboard', idIglesia],
    queryFn: () => getEventosProximos(idIglesia!),
    enabled: !!idIglesia,
    staleTime: 2 * 60 * 1000,
  })
}

export function useMinisterioStats(idIglesia: number | undefined) {
  return useQuery({
    queryKey: ['ministerio-stats', idIglesia],
    queryFn: () => getMinisterioStats(idIglesia!),
    enabled: !!idIglesia,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | head -20
```

---

### Task 3: Update DashboardPage with real data

**Files:**
- Modify: `src/app/components/DashboardPage.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/components/DashboardPage.tsx` to understand all current stat cards and chart components.

- [ ] **Step 2: Add real data hooks**

```typescript
import {
  useDashboardStats, useRoleDistribution,
  useEventosProximos, useMinisterioStats,
} from '@/hooks/useDashboard'
import { useApp } from '@/app/store/AppContext'

// Inside component:
const { iglesiaActual } = useApp()
const { data: stats } = useDashboardStats(iglesiaActual?.id)
const { data: roleDistribution = [] } = useRoleDistribution(iglesiaActual?.id)
const { data: eventosProximos = [] } = useEventosProximos(iglesiaActual?.id)
const { data: ministerioStats = [] } = useMinisterioStats(iglesiaActual?.id)
```

- [ ] **Step 3: Replace stat card values**

Find each stat card and replace mock values with real data:
- "Total miembros" → `stats?.totalMiembros ?? 0`
- "Ministerios activos" → `stats?.ministeriosActivos ?? 0`
- "Eventos próximos" → `stats?.eventosProximos ?? 0`
- "Cursos activos" → `stats?.cursosActivos ?? 0`

- [ ] **Step 4: Replace role distribution chart data**

Find the Recharts `PieChart` or `BarChart` for role distribution and replace mock data with `roleDistribution`:

```typescript
// Example Recharts data prop:
data={roleDistribution.map(r => ({ name: r.nombre, value: r.cantidad }))}
```

- [ ] **Step 5: Replace upcoming events list**

Find the upcoming events section and replace mock items with:

```typescript
{eventosProximos.map(ev => (
  <div key={ev.idEvento}>
    <span>{ev.titulo}</span>
    <span>{ev.tipoEvento}</span>
    <span>{new Date(ev.fechaInicio).toLocaleDateString('es-CO')}</span>
  </div>
))}
```

- [ ] **Step 6: Replace ministry bar chart**

Find the ministry member count chart and replace mock data with:

```typescript
data={ministerioStats.map(m => ({ name: m.nombre, miembros: m.cantidadMiembros }))}
```

- [ ] **Step 7: Add no-iglesia guard**

At the top of the rendered JSX, show a message if `iglesiaActual` is null:

```typescript
if (!iglesiaActual) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Selecciona una iglesia para ver el dashboard
    </div>
  )
}
```

- [ ] **Step 8: Build**

```bash
npm run build 2>&1 | head -20
```

---

### Task 4: Add notificaciones RLS + mark-read mutation

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_phase6_rls_notificaciones.sql`

- [ ] **Step 1: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with:
- `project_id`: `heibyjbvfiokmduwwawm`
- `name`: `phase6_rls_notificaciones`
- `query`:

```sql
DO $$ BEGIN
  CREATE POLICY "Authenticated insert notificacion"
    ON public.notificacion FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update notificacion"
    ON public.notificacion FOR UPDATE TO authenticated
    USING (id_usuario = (
      SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid()
    ))
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

- [ ] **Step 2: Create local file with assigned version name**

After MCP returns the version, create `supabase/migrations/<version>_phase6_rls_notificaciones.sql`.

- [ ] **Step 3: Add `markNotificacionLeida` to a notifications service or inline in AppContext**

```typescript
export async function markNotificacionLeida(id: number): Promise<void> {
  const { error } = await supabase
    .from('notificacion')
    .update({ leida: true })
    .eq('id_notificacion', id)
  if (error) throw error
}
```

---

### Task 5: Final production checklist and commit

- [ ] **Step 1: Run full build one last time**

```bash
npm run build 2>&1 | head -40
```

Expected: Zero TypeScript errors, zero missing modules.

- [ ] **Step 2: Verify all pages have real data (no hardcoded IDs)**

Check each page file for `idIglesia: 1` or other hardcoded numeric IDs. Replace any found with `iglesiaActual?.id`.

```bash
grep -rn "idIglesia: 1\|id_iglesia.*=.*1\b" src/
```

- [ ] **Step 3: Verify no console.log in production code**

```bash
grep -rn "console\.log" src/ --include="*.tsx" --include="*.ts"
```

Remove any debug logs found.

- [ ] **Step 4: Commit and push**

```bash
git add src/services/dashboard.service.ts src/hooks/useDashboard.ts \
        src/app/components/DashboardPage.tsx \
        supabase/migrations/
git commit -m "feat: real dashboard stats + role distribution charts scoped to iglesiaActual (phase 6)"
git push origin main
```

After pushing, Vercel will automatically redeploy. Verify the production URL loads with real data from Supabase.
