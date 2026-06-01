# Presupuesto de Eventos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un módulo de ingresos/egresos por evento con comparación planeado vs. real, y una pestaña "Finanzas" en EventsPage con KPIs globales y lista de eventos con sus balances.

**Architecture:** Nueva tabla `evento_presupuesto_item` en Supabase con RLS scoped por iglesia/rol; servicio + hook de React Query para CRUD y consulta agregada; `EventoPresupuestoDrawer` (Sheet) para gestionar ítems por evento; pestaña "Finanzas" añadida sobre las pestañas existentes de EventsPage.

**Tech Stack:** React 18, TypeScript, Supabase (PostgREST), TanStack Query v5, shadcn/ui (Sheet, Tabs, Dialog, Select), Tailwind CSS v4, sonner (toasts).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260601120000_evento_presupuesto.sql` | Create | Tabla, índices, RLS |
| `src/types/app.types.ts` | Modify | Añadir `PresupuestoItem` interface |
| `src/services/evento-presupuesto.service.ts` | Create | CRUD + resumen query |
| `src/hooks/useEventoPresupuesto.ts` | Create | React Query hooks |
| `src/app/components/EventoPresupuestoDrawer.tsx` | Create | Sheet drawer con ítems por evento |
| `src/app/components/EventsPage.tsx` | Modify | Pestaña Finanzas + integrar drawer |

---

## Task 1: DB Migration — tabla `evento_presupuesto_item` + RLS

**Files:**
- Create: `supabase/migrations/20260601120000_evento_presupuesto.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260601120000_evento_presupuesto.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.evento_presupuesto_item (
  id                bigserial PRIMARY KEY,
  id_evento         bigint NOT NULL REFERENCES public.evento(id_evento) ON DELETE CASCADE,
  tipo              text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria         text NOT NULL,
  descripcion       text,
  monto_planeado    numeric(12,2) NOT NULL DEFAULT 0,
  monto_real        numeric(12,2),
  created_by        bigint REFERENCES public.usuario(id_usuario) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_epi_evento ON public.evento_presupuesto_item(id_evento);
CREATE INDEX IF NOT EXISTS idx_epi_tipo   ON public.evento_presupuesto_item(tipo);

ALTER TABLE public.evento_presupuesto_item ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at — reutiliza la función genérica que ya existe en el proyecto
CREATE TRIGGER trg_epi_updated_at
  BEFORE UPDATE ON public.evento_presupuesto_item
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- SELECT: todos los roles excepto servidor (is_super_admin, is_admin_iglesia,
-- is_admin_sede, is_lider ya excluyen servidor por definición)
CREATE POLICY epi_select ON public.evento_presupuesto_item
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_presupuesto_item.id_evento
        AND (
          is_super_admin()
          OR (is_admin_iglesia() AND e.id_iglesia = get_my_tenant_id())
          OR (is_admin_sede()    AND e.id_iglesia = get_my_tenant_id())
          OR (is_lider()         AND e.id_iglesia = get_my_tenant_id())
        )
    )
  );

-- INSERT: mismos roles
CREATE POLICY epi_insert ON public.evento_presupuesto_item
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_presupuesto_item.id_evento
        AND (
          is_super_admin()
          OR (is_admin_iglesia() AND e.id_iglesia = get_my_tenant_id())
          OR (is_admin_sede()    AND e.id_iglesia = get_my_tenant_id())
          OR (is_lider()         AND e.id_iglesia = get_my_tenant_id())
        )
    )
  );

-- UPDATE
CREATE POLICY epi_update ON public.evento_presupuesto_item
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_presupuesto_item.id_evento
        AND (
          is_super_admin()
          OR (is_admin_iglesia() AND e.id_iglesia = get_my_tenant_id())
          OR (is_admin_sede()    AND e.id_iglesia = get_my_tenant_id())
          OR (is_lider()         AND e.id_iglesia = get_my_tenant_id())
        )
    )
  );

-- DELETE
CREATE POLICY epi_delete ON public.evento_presupuesto_item
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_presupuesto_item.id_evento
        AND (
          is_super_admin()
          OR (is_admin_iglesia() AND e.id_iglesia = get_my_tenant_id())
          OR (is_admin_sede()    AND e.id_iglesia = get_my_tenant_id())
          OR (is_lider()         AND e.id_iglesia = get_my_tenant_id())
        )
    )
  );

COMMIT;
```

- [ ] **Step 2: Aplicar la migración en Supabase**

```bash
supabase db push
```

Expected: migración aplicada sin errores.

- [ ] **Step 3: Verificar la tabla en el dashboard de Supabase**

En Table Editor → `evento_presupuesto_item` debe aparecer con las columnas y las 4 políticas RLS activas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601120000_evento_presupuesto.sql
git commit -m "feat: add evento_presupuesto_item table with RLS"
```

---

## Task 2: TypeScript types — interfaz `PresupuestoItem`

**Files:**
- Modify: `src/types/app.types.ts` (al final del archivo, antes de `RolClave`)

- [ ] **Step 1: Añadir la interfaz al final del bloque de interfaces (antes de la línea `export type RolClave`)**

Buscar en `src/types/app.types.ts` la línea:
```ts
export type RolClave = 'super_admin' | 'admin_iglesia' | 'admin_sede' | 'lider' | 'servidor'
```

Insertar justo antes de esa línea:

```ts
export interface PresupuestoItem {
  id: number
  idEvento: number
  tipo: 'ingreso' | 'egreso'
  categoria: string
  descripcion: string | null
  montoPlaneado: number
  montoReal: number | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
}

export interface PresupuestoResumenEvento {
  idEvento: number
  nombreEvento: string
  fechaInicio: string
  idMinisterio: number | null
  idSede: number | null
  items: PresupuestoItem[]
  ingresosPlaneados: number
  ingresosReales: number
  egresosPlaneados: number
  egresosReales: number
  balanceNeto: number
}
```

- [ ] **Step 2: Verificar que no hay errores de TS**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/types/app.types.ts
git commit -m "feat: add PresupuestoItem and PresupuestoResumenEvento types"
```

---

## Task 3: Servicio `evento-presupuesto.service.ts`

**Files:**
- Create: `src/services/evento-presupuesto.service.ts`

- [ ] **Step 1: Crear el servicio**

```ts
// src/services/evento-presupuesto.service.ts
import { supabase } from '@/lib/supabaseClient'
import type { PresupuestoItem, PresupuestoResumenEvento } from '@/types/app.types'

type RawItem = {
  id: number
  id_evento: number
  tipo: string
  categoria: string
  descripcion: string | null
  monto_planeado: number
  monto_real: number | null
  created_by: number | null
  created_at: string
  updated_at: string
}

function mapItem(r: RawItem): PresupuestoItem {
  return {
    id: r.id,
    idEvento: r.id_evento,
    tipo: r.tipo as 'ingreso' | 'egreso',
    categoria: r.categoria,
    descripcion: r.descripcion,
    montoPlaneado: Number(r.monto_planeado),
    montoReal: r.monto_real !== null ? Number(r.monto_real) : null,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function getItemsByEvento(idEvento: number): Promise<PresupuestoItem[]> {
  const { data, error } = await supabase
    .from('evento_presupuesto_item')
    .select('*')
    .eq('id_evento', idEvento)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as RawItem[]).map(mapItem)
}

export type CreateItemPayload = {
  idEvento: number
  tipo: 'ingreso' | 'egreso'
  categoria: string
  descripcion?: string | null
  montoPlaneado: number
  montoReal?: number | null
  createdBy?: number | null
}

export async function createItem(payload: CreateItemPayload): Promise<PresupuestoItem> {
  const { data, error } = await supabase
    .from('evento_presupuesto_item')
    .insert({
      id_evento: payload.idEvento,
      tipo: payload.tipo,
      categoria: payload.categoria,
      descripcion: payload.descripcion ?? null,
      monto_planeado: payload.montoPlaneado,
      monto_real: payload.montoReal ?? null,
      created_by: payload.createdBy ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return mapItem(data as RawItem)
}

export type UpdateItemPayload = {
  categoria?: string
  descripcion?: string | null
  montoPlaneado?: number
  montoReal?: number | null
}

export async function updateItem(id: number, payload: UpdateItemPayload): Promise<PresupuestoItem> {
  const update: Record<string, unknown> = {}
  if (payload.categoria !== undefined)    update.categoria      = payload.categoria
  if (payload.descripcion !== undefined)  update.descripcion    = payload.descripcion
  if (payload.montoPlaneado !== undefined) update.monto_planeado = payload.montoPlaneado
  if (payload.montoReal !== undefined)    update.monto_real     = payload.montoReal

  const { data, error } = await supabase
    .from('evento_presupuesto_item')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapItem(data as RawItem)
}

export async function deleteItem(id: number): Promise<void> {
  const { error } = await supabase
    .from('evento_presupuesto_item')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export type ResumenFilters = {
  idMinisterio?: number | null
  mes?: number | null   // 1–12
  anio?: number | null
}

export async function getItemsByIglesia(
  idIglesia: number,
  filters?: ResumenFilters
): Promise<PresupuestoItem[]> {
  // Fetch event IDs for this church (optionally filtered by ministerio/month)
  let evQ = supabase
    .from('evento')
    .select('id_evento')
    .eq('id_iglesia', idIglesia)

  if (filters?.idMinisterio) evQ = evQ.eq('id_ministerio', filters.idMinisterio)
  if (filters?.mes && filters?.anio) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const start = `${filters.anio}-${pad(filters.mes)}-01`
    const endMonth = filters.mes === 12 ? 1 : filters.mes + 1
    const endYear  = filters.mes === 12 ? filters.anio + 1 : filters.anio
    const end = `${endYear}-${pad(endMonth)}-01`
    evQ = evQ.gte('fecha_inicio', start).lt('fecha_inicio', end)
  }

  const { data: eventRows, error: evErr } = await evQ
  if (evErr) throw evErr
  const ids = (eventRows ?? []).map((r: { id_evento: number }) => r.id_evento)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('evento_presupuesto_item')
    .select('*')
    .in('id_evento', ids)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as RawItem[]).map(mapItem)
}

export function buildResumen(
  eventos: { idEvento: number; nombre: string; fechaInicio: string; idMinisterio: number | null; idSede: number | null }[],
  items: PresupuestoItem[]
): PresupuestoResumenEvento[] {
  const byEvento = new Map<number, PresupuestoItem[]>()
  for (const item of items) {
    const list = byEvento.get(item.idEvento) ?? []
    list.push(item)
    byEvento.set(item.idEvento, list)
  }

  return eventos.map(ev => {
    const evItems = byEvento.get(ev.idEvento) ?? []
    const ingresos = evItems.filter(i => i.tipo === 'ingreso')
    const egresos  = evItems.filter(i => i.tipo === 'egreso')
    const ingresosPlaneados = ingresos.reduce((s, i) => s + i.montoPlaneado, 0)
    const ingresosReales    = ingresos.reduce((s, i) => s + (i.montoReal ?? 0), 0)
    const egresosPlaneados  = egresos.reduce((s, i) => s + i.montoPlaneado, 0)
    const egresosReales     = egresos.reduce((s, i) => s + (i.montoReal ?? 0), 0)
    return {
      idEvento:          ev.idEvento,
      nombreEvento:      ev.nombre,
      fechaInicio:       ev.fechaInicio,
      idMinisterio:      ev.idMinisterio,
      idSede:            ev.idSede,
      items:             evItems,
      ingresosPlaneados,
      ingresosReales,
      egresosPlaneados,
      egresosReales,
      balanceNeto:       ingresosReales - egresosReales,
    }
  })
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/services/evento-presupuesto.service.ts
git commit -m "feat: add evento-presupuesto service"
```

---

## Task 4: Hook `useEventoPresupuesto.ts`

**Files:**
- Create: `src/hooks/useEventoPresupuesto.ts`

- [ ] **Step 1: Crear el hook**

```ts
// src/hooks/useEventoPresupuesto.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getItemsByEvento,
  getItemsByIglesia,
  createItem,
  updateItem,
  deleteItem,
  type CreateItemPayload,
  type UpdateItemPayload,
  type ResumenFilters,
} from '@/services/evento-presupuesto.service'
import { toast } from 'sonner'

export function useEventoPresupuestoItems(idEvento?: number) {
  return useQuery({
    queryKey: ['presupuesto-items', idEvento],
    queryFn: () => getItemsByEvento(idEvento!),
    enabled: !!idEvento,
    staleTime: 60 * 1000,
  })
}

export function usePresupuestoResumenIglesia(idIglesia?: number, filters?: ResumenFilters) {
  return useQuery({
    queryKey: ['presupuesto-iglesia', idIglesia, filters],
    queryFn: () => getItemsByIglesia(idIglesia!, filters),
    enabled: !!idIglesia,
    staleTime: 60 * 1000,
  })
}

export function useCreatePresupuestoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateItemPayload) => createItem(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['presupuesto-items', variables.idEvento] })
      qc.invalidateQueries({ queryKey: ['presupuesto-iglesia'] })
      toast.success('Ítem agregado')
    },
    onError: () => toast.error('Error al agregar el ítem'),
  })
}

export function useUpdatePresupuestoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; idEvento: number; payload: UpdateItemPayload }) =>
      updateItem(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['presupuesto-items', variables.idEvento] })
      qc.invalidateQueries({ queryKey: ['presupuesto-iglesia'] })
      toast.success('Ítem actualizado')
    },
    onError: () => toast.error('Error al actualizar el ítem'),
  })
}

export function useDeletePresupuestoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: number; idEvento: number }) => deleteItem(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['presupuesto-items', variables.idEvento] })
      qc.invalidateQueries({ queryKey: ['presupuesto-iglesia'] })
      toast.success('Ítem eliminado')
    },
    onError: () => toast.error('Error al eliminar el ítem'),
  })
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEventoPresupuesto.ts
git commit -m "feat: add useEventoPresupuesto hooks"
```

---

## Task 5: Componente `EventoPresupuestoDrawer`

**Files:**
- Create: `src/app/components/EventoPresupuestoDrawer.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// src/app/components/EventoPresupuestoDrawer.tsx
import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { ConfirmDialog } from "./ui/ConfirmDialog"
import { Skeleton } from "./ui/skeleton"
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import type { EventoEnriquecido } from "@/services/eventos.service"
import type { PresupuestoItem, CreateItemPayload, UpdateItemPayload } from "@/types/app.types"
import {
  useEventoPresupuestoItems,
  useCreatePresupuestoItem,
  useUpdatePresupuestoItem,
  useDeletePresupuestoItem,
} from "@/hooks/useEventoPresupuesto"
import { useApp } from "@/app/store/AppContext"

const CATEGORIAS: Record<'ingreso' | 'egreso', string[]> = {
  ingreso: ['Ofrenda', 'Aporte voluntario', 'Venta de entradas', 'Patrocinio', 'Otro (especificar)'],
  egreso:  ['Sonido', 'Decoración', 'Comida/Refrigerio', 'Transporte', 'Material', 'Publicidad', 'Otro (especificar)'],
}

const EMPTY_FORM = { categoriaSelect: '', categoriaCustom: '', descripcion: '', montoPlaneado: '', montoReal: '' }

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function ItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: PresupuestoItem
  onEdit: (item: PresupuestoItem) => void
  onDelete: (item: PresupuestoItem) => void
}) {
  const diff = item.montoReal !== null ? item.montoReal - item.montoPlaneado : null
  return (
    <div className="bg-card/40 border border-border/50 rounded-xl p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold">{item.categoria}</p>
          {item.descripcion && <p className="text-xs text-muted-foreground">{item.descripcion}</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(item)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-muted-foreground mb-0.5">Planeado</p>
          <p className="font-semibold">{fmt(item.montoPlaneado)}</p>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-muted-foreground mb-0.5">Real</p>
          <p className="font-semibold text-emerald-400">{item.montoReal !== null ? fmt(item.montoReal) : '—'}</p>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-muted-foreground mb-0.5">Diferencia</p>
          {diff !== null ? (
            <p className={`font-semibold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {diff >= 0 ? '+' : ''}{fmt(diff)}
            </p>
          ) : <p className="text-muted-foreground">—</p>}
        </div>
      </div>
    </div>
  )
}

function ItemsSection({
  tipo,
  items,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: {
  tipo: 'ingreso' | 'egreso'
  items: PresupuestoItem[]
  isLoading: boolean
  onAdd: () => void
  onEdit: (item: PresupuestoItem) => void
  onDelete: (item: PresupuestoItem) => void
}) {
  const filtered = items.filter(i => i.tipo === tipo)
  const totalPlaneado = filtered.reduce((s, i) => s + i.montoPlaneado, 0)
  const totalReal     = filtered.reduce((s, i) => s + (i.montoReal ?? 0), 0)
  const pct = totalPlaneado > 0 ? Math.round((totalReal / totalPlaneado) * 100) : 0

  return (
    <div className="space-y-3">
      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
      ) : (
        filtered.map(item => (
          <ItemRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))
      )}

      <button
        onClick={onAdd}
        className="w-full border border-dashed border-primary/40 rounded-xl p-3 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Agregar ítem de {tipo}
      </button>

      {filtered.length > 0 && (
        <div className="bg-card/30 border border-border/50 rounded-xl p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total planeado</span>
            <span className="font-semibold">{fmt(totalPlaneado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total real</span>
            <span className={`font-semibold ${tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(totalReal)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-border/50">
            <span className="text-muted-foreground text-xs">Ejecución</span>
            <span className="font-bold text-primary">{pct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function EventoPresupuestoDrawer({
  evento,
  onClose,
}: {
  evento: EventoEnriquecido | null
  onClose: () => void
}) {
  const { usuarioActual } = useApp()
  const { data: items = [], isLoading } = useEventoPresupuestoItems(evento?.idEvento)
  const createMutation = useCreatePresupuestoItem()
  const updateMutation = useUpdatePresupuestoItem()
  const deleteMutation = useDeletePresupuestoItem()

  const [activeTab, setActiveTab] = useState<'ingreso' | 'egreso'>('ingreso')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PresupuestoItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; item: PresupuestoItem | null }>({ open: false, item: null })

  const ingresosReales   = items.filter(i => i.tipo === 'ingreso').reduce((s, i) => s + (i.montoReal ?? 0), 0)
  const egresosReales    = items.filter(i => i.tipo === 'egreso').reduce((s, i) => s + (i.montoReal ?? 0), 0)
  const balanceNeto      = ingresosReales - egresosReales

  function openAdd(tipo: 'ingreso' | 'egreso') {
    setActiveTab(tipo)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(item: PresupuestoItem) {
    setEditingItem(item)
    const isPredefined = CATEGORIAS[item.tipo].includes(item.categoria)
    setForm({
      categoriaSelect:  isPredefined ? item.categoria : 'Otro (especificar)',
      categoriaCustom:  isPredefined ? '' : item.categoria,
      descripcion:      item.descripcion ?? '',
      montoPlaneado:    String(item.montoPlaneado),
      montoReal:        item.montoReal !== null ? String(item.montoReal) : '',
    })
    setActiveTab(item.tipo)
    setShowForm(true)
  }

  function handleSave() {
    if (!evento) return
    const categoria = form.categoriaSelect === 'Otro (especificar)' ? form.categoriaCustom.trim() : form.categoriaSelect
    if (!categoria) return
    const montoPlaneado = parseFloat(form.montoPlaneado) || 0
    const montoReal     = form.montoReal !== '' ? parseFloat(form.montoReal) : null

    if (editingItem) {
      const payload: UpdateItemPayload = { categoria, descripcion: form.descripcion || null, montoPlaneado, montoReal }
      updateMutation.mutate({ id: editingItem.id, idEvento: evento.idEvento, payload }, { onSuccess: () => setShowForm(false) })
    } else {
      const payload: CreateItemPayload = {
        idEvento: evento.idEvento,
        tipo: activeTab,
        categoria,
        descripcion: form.descripcion || null,
        montoPlaneado,
        montoReal,
        createdBy: usuarioActual?.idUsuario ?? null,
      }
      createMutation.mutate(payload, { onSuccess: () => setShowForm(false) })
    }
  }

  function handleDelete() {
    if (!confirmDelete.item || !evento) return
    deleteMutation.mutate({ id: confirmDelete.item.id, idEvento: evento.idEvento }, {
      onSuccess: () => setConfirmDelete({ open: false, item: null }),
    })
  }

  const categoriaOptions = CATEGORIAS[activeTab]
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Sheet open={!!evento} onOpenChange={open => { if (!open) onClose() }}>
        <SheetContent className="w-[440px] sm:max-w-[440px] bg-card/95 backdrop-blur-2xl border-border/50 overflow-y-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="text-lg font-bold tracking-tight">{evento?.nombre}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{evento?.ministerioNombre ?? 'Global'} · {evento?.fechaInicio ? new Date(evento.fechaInicio).toLocaleDateString('es-CO') : ''}</p>
              </div>
              <div className={`rounded-xl px-3 py-2 text-right border ${balanceNeto >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
                <p className={`text-base font-bold ${balanceNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {balanceNeto >= 0 ? '+' : ''}{fmt(balanceNeto)}
                </p>
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'ingreso' | 'egreso')}>
            <TabsList className="w-full bg-card/40 border border-border/50 p-1 rounded-xl mb-4">
              <TabsTrigger value="ingreso" className="flex-1 rounded-lg text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Ingresos
              </TabsTrigger>
              <TabsTrigger value="egreso" className="flex-1 rounded-lg text-xs data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                <TrendingDown className="w-3.5 h-3.5 mr-1.5" /> Egresos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ingreso" className="mt-0">
              <ItemsSection tipo="ingreso" items={items} isLoading={isLoading}
                onAdd={() => openAdd('ingreso')} onEdit={openEdit}
                onDelete={item => setConfirmDelete({ open: true, item })} />
            </TabsContent>
            <TabsContent value="egreso" className="mt-0">
              <ItemsSection tipo="egreso" items={items} isLoading={isLoading}
                onAdd={() => openAdd('egreso')} onEdit={openEdit}
                onDelete={item => setConfirmDelete({ open: true, item })} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Add / Edit item dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) setShowForm(false) }}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card/95 backdrop-blur-2xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingItem ? 'Editar ítem' : `Agregar ${activeTab}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Categoría</label>
              <Select value={form.categoriaSelect} onValueChange={v => setForm(f => ({ ...f, categoriaSelect: v, categoriaCustom: '' }))}>
                <SelectTrigger className="h-10 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoriaOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.categoriaSelect === 'Otro (especificar)' && (
                <Input
                  className="mt-2 h-10 bg-background/50 border-white/10 rounded-xl text-sm"
                  placeholder="Escribe la categoría..."
                  value={form.categoriaCustom}
                  onChange={e => setForm(f => ({ ...f, categoriaCustom: e.target.value }))}
                />
              )}
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Descripción (opcional)</label>
              <Input
                className="h-10 bg-background/50 border-white/10 rounded-xl text-sm"
                placeholder="Detalle adicional..."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Monto planeado</label>
                <Input
                  type="number" min={0} step={1000}
                  className="h-10 bg-background/50 border-white/10 rounded-xl text-sm"
                  placeholder="0"
                  value={form.montoPlaneado}
                  onChange={e => setForm(f => ({ ...f, montoPlaneado: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Monto real (opcional)</label>
                <Input
                  type="number" min={0} step={1000}
                  className="h-10 bg-background/50 border-white/10 rounded-xl text-sm"
                  placeholder="0"
                  value={form.montoReal}
                  onChange={e => setForm(f => ({ ...f, montoReal: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.categoriaSelect || (form.categoriaSelect === 'Otro (especificar)' && !form.categoriaCustom.trim())} className="rounded-xl bg-primary">
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Eliminar ítem"
        description={`¿Eliminar "${confirmDelete.item?.categoria}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, item: null })}
      />
    </>
  )
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores. Si `EventoEnriquecido` no tiene `ministerioNombre` o `fechaInicio`, ajustar los campos según los que realmente existan en el tipo (revisar `src/services/eventos.service.ts` la interfaz `EventoEnriquecido`).

- [ ] **Step 3: Verificar que `ConfirmDialog` acepta las props usadas**

```bash
grep -n "isOpen\|onConfirm\|onCancel\|description" src/app/components/ui/ConfirmDialog.tsx | head -10
```

Si la API difiere, ajustar la llamada a `ConfirmDialog` para que coincida con su interfaz real.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/EventoPresupuestoDrawer.tsx
git commit -m "feat: add EventoPresupuestoDrawer component"
```

---

## Task 6: Integrar Finanzas tab en EventsPage

**Files:**
- Modify: `src/app/components/EventsPage.tsx`

**Contexto:** EventsPage ya usa `<Tabs>` de shadcn/ui para "todos / global / ministerio". Se añade una capa exterior de tabs "Eventos / Finanzas" que envuelve todo el contenido actual.

- [ ] **Step 1: Añadir imports al inicio de EventsPage.tsx**

Agregar después de los imports existentes:

```ts
import { EventoPresupuestoDrawer } from "./EventoPresupuestoDrawer"
import { usePresupuestoResumenIglesia } from "@/hooks/useEventoPresupuesto"
import { buildResumen } from "@/services/evento-presupuesto.service"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
```

(TrendingUp, TrendingDown y Wallet pueden ya estar importados — si es así, no duplicar.)

- [ ] **Step 2: Añadir estado y datos de presupuesto dentro de `EventsPage` (después de los useState existentes)**

```tsx
// Budget state
const [presupuestoEvento, setPresupuestoEvento] = useState<EventoEnriquecido | null>(null)
const [finanzasMinisterioFilter, setFinanzasMinisterioFilter] = useState<number>(0)
const [finanzasMes, setFinanzasMes] = useState<number>(new Date().getMonth() + 1)
const [finanzasAnio] = useState<number>(new Date().getFullYear())
const canSeeBudget = rolActual !== 'servidor'

const presupuestoFilters = {
  idMinisterio: finanzasMinisterioFilter || null,
  mes: finanzasMes || null,
  anio: finanzasAnio,
}
const { data: presupuestoItems = [] } = usePresupuestoResumenIglesia(
  canSeeBudget ? idIglesiaNum : undefined,
  presupuestoFilters
)

const resumenEventos = buildResumen(
  eventos.map(e => ({
    idEvento: e.idEvento,
    nombre: e.nombre,
    fechaInicio: e.fechaInicio,
    idMinisterio: e.idMinisterio ?? null,
    idSede: e.idSede ?? null,
  })),
  presupuestoItems
)

const totalIngresosPlaneados = resumenEventos.reduce((s, r) => s + r.ingresosPlaneados, 0)
const totalIngresosReales    = resumenEventos.reduce((s, r) => s + r.ingresosReales, 0)
const totalEgresosPlaneados  = resumenEventos.reduce((s, r) => s + r.egresosPlaneados, 0)
const totalEgresosReales     = resumenEventos.reduce((s, r) => s + r.egresosReales, 0)
const totalBalanceNeto       = totalIngresosReales - totalEgresosReales
const eventosConPresupuesto  = resumenEventos.filter(r => r.items.length > 0).length

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}
```

- [ ] **Step 3: Añadir `FinanzasTab` como función a nivel de módulo en EventsPage.tsx (antes de la función `EventsPage`, después de `EventDialogFields`)**

El patrón ya existe en el archivo: `EventDialogFields` está definida a nivel de módulo antes de `EventsPage`. Seguir el mismo patrón.

```tsx
function FinanzasTab() {
  const meses = [
    { value: 0, label: 'Todos' },
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
  ]

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos plan.', value: fmt(totalIngresosPlaneados), sub: `Real: ${fmt(totalIngresosReales)}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Egresos plan.', value: fmt(totalEgresosPlaneados), sub: `Real: ${fmt(totalEgresosReales)}`, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Balance neto', value: (totalBalanceNeto >= 0 ? '+' : '') + fmt(totalBalanceNeto), sub: `Plan: ${fmt(totalIngresosPlaneados - totalEgresosPlaneados)}`, color: totalBalanceNeto >= 0 ? 'text-emerald-400' : 'text-rose-400', bg: 'bg-primary/10 border-primary/20' },
          { label: 'Con presupuesto', value: `${eventosConPresupuesto} / ${eventos.length}`, sub: `${eventos.length - eventosConPresupuesto} sin asignar`, color: 'text-foreground', bg: 'bg-card/40 border-border/50' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-2xl border p-4 ${kpi.bg}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={String(finanzasMinisterioFilter)} onValueChange={v => setFinanzasMinisterioFilter(Number(v))}>
          <SelectTrigger className="h-9 bg-card/40 border-border/50 rounded-xl text-xs w-48">
            <SelectValue placeholder="Todos los ministerios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Todos los ministerios</SelectItem>
            {ministerios.map(m => (
              <SelectItem key={m.idMinisterio} value={String(m.idMinisterio)}>{m.nombreMinisterio}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(finanzasMes)} onValueChange={v => setFinanzasMes(Number(v))}>
          <SelectTrigger className="h-9 bg-card/40 border-border/50 rounded-xl text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {meses.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {resumenEventos.map(r => {
          const hasBudget = r.items.length > 0
          const pct = r.ingresosPlaneados + r.egresosPlaneados > 0
            ? Math.round(((r.ingresosReales + r.egresosReales) / (r.ingresosPlaneados + r.egresosPlaneados)) * 100)
            : 0
          const ev = eventos.find(e => e.idEvento === r.idEvento)
          if (!ev) return null
          return (
            <div
              key={r.idEvento}
              onClick={() => setPresupuestoEvento(ev)}
              className="bg-card/40 border border-border/50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{r.nombreEvento}</p>
                <p className="text-xs text-muted-foreground">{r.idMinisterio ? ministerios.find(m => m.idMinisterio === r.idMinisterio)?.nombreMinisterio ?? 'Ministerio' : 'Global'} · {new Date(r.fechaInicio).toLocaleDateString('es-CO')}</p>
              </div>
              {hasBudget ? (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-muted-foreground">Ingresos</p>
                    <p className="text-sm font-semibold text-emerald-400">{fmt(r.ingresosReales)}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-muted-foreground">Egresos</p>
                    <p className="text-sm font-semibold text-rose-400">{fmt(r.egresosReales)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Balance</p>
                    <p className={`text-sm font-bold ${r.balanceNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {r.balanceNeto >= 0 ? '+' : ''}{fmt(r.balanceNeto)}
                    </p>
                  </div>
                  <div className="w-14 hidden md:block">
                    <p className="text-[10px] text-muted-foreground mb-1">Ejecutado</p>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-primary mt-0.5">{pct}%</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground italic">Sin presupuesto</p>
                  <span className="text-xs text-primary border border-primary/30 rounded-lg px-2 py-0.5 bg-primary/5">+ Agregar</span>
                </div>
              )}
              <span className="text-muted-foreground/40 text-lg">›</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Envolver el contenido del return en pestañas Eventos/Finanzas**

En el `return` de `EventsPage`, localizar la sección que empieza con el comentario `{/* ── Tabs + Events ── */}` (alrededor de la línea 556) y el header con el título/botón "Nuevo evento". Envolver todo con:

```tsx
<Tabs defaultValue="eventos" className="w-full">
  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
    {/* Título y botón Nuevo evento — mover el header aquí si está separado */}
    <TabsList className="bg-card/40 backdrop-blur-md border border-border/50 p-1 rounded-xl">
      <TabsTrigger value="eventos" className="rounded-lg text-xs font-medium px-4 data-[state=active]:bg-[#1a7fa8] data-[state=active]:text-white data-[state=active]:shadow-md">
        Eventos
      </TabsTrigger>
      {canSeeBudget && (
        <TabsTrigger value="finanzas" className="rounded-lg text-xs font-medium px-4 data-[state=active]:bg-[#1a7fa8] data-[state=active]:text-white data-[state=active]:shadow-md">
          <Wallet className="w-3.5 h-3.5 mr-1.5" /> Finanzas
        </TabsTrigger>
      )}
    </TabsList>
  </div>

  <TabsContent value="eventos" className="mt-0">
    {/* Mover aquí el bloque JSX que actualmente ocupa desde los filtros de búsqueda
        hasta el cierre del <Tabs defaultValue="todos"> existente, incluyendo
        el input de búsqueda, el Select de sede, el Select de estado, y el <Tabs>
        interno (todos/global/ministerio). No mover los <Dialog> — esos van fuera. */}
  </TabsContent>

  {canSeeBudget && (
    <TabsContent value="finanzas" className="mt-0">
      <FinanzasTab />
    </TabsContent>
  )}
</Tabs>
```

Ajustar el JSX real para que el header (título "Eventos", botón "+ Nuevo Evento") quede fuera o dentro del `TabsContent value="eventos"` según se vea mejor — el criterio es que el botón sólo aparezca en la pestaña Eventos, no en Finanzas.

- [ ] **Step 5: Añadir el drawer al final del return, antes del último `</div>`**

```tsx
{/* ── Presupuesto Drawer ── */}
<EventoPresupuestoDrawer
  evento={presupuestoEvento}
  onClose={() => setPresupuestoEvento(null)}
/>
```

- [ ] **Step 6: Verificar tipos y levantar dev server**

```bash
npx tsc --noEmit
npm run dev
```

Navegar a un evento con iglesia, abrir la pestaña Finanzas, verificar:
- KPIs muestran $0 (no hay ítems aún) sin errores
- Lista de eventos muestra "Sin presupuesto"
- Clic en un evento abre el drawer
- Agregar un ítem de ingreso y uno de egreso
- Verificar que los totales se actualizan
- Verificar que el rol `servidor` no ve la pestaña Finanzas

- [ ] **Step 7: Commit final**

```bash
git add src/app/components/EventsPage.tsx
git commit -m "feat: add Finanzas tab and budget drawer to EventsPage"
```
