# Calendario de Disponibilidad de Usuarios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a servidores marcar días de no disponibilidad y a líderes consultarlos al asignar tareas, con advertencia no bloqueante en `CrearTareaDialog`.

**Architecture:** Tabla Supabase `disponibilidad` (lista negra: se marca lo que NO se puede), servicio + hooks react-query siguiendo el patrón existente del proyecto. Tres capas de UI: tab personal en Perfil, panel de equipo en Tareas, badge inline en diálogo de asignación.

**Tech Stack:** React 18, TypeScript, Supabase (supabase-js), TanStack Query, shadcn/ui (Tabs, Sheet, Popover, Badge), Tailwind CSS v4, Lucide React, Framer Motion.

---

## File Map

### Nuevos archivos
- `supabase/migrations/20260613000000_disponibilidad_table.sql` — tabla + RLS + índices
- `src/types/app.types.ts` — **modificar**: añadir `DisponibilidadRegla`
- `src/services/disponibilidad.service.ts` — CRUD contra Supabase
- `src/hooks/useDisponibilidad.ts` — react-query hooks + helper `estaDisponible()`
- `src/app/components/disponibilidad/CalendarioMensual.tsx` — calendario base reutilizable
- `src/app/components/disponibilidad/ReglaForm.tsx` — formulario para fecha específica / rango
- `src/app/components/disponibilidad/PatronRecurrenteForm.tsx` — formulario patrón recurrente
- `src/app/components/disponibilidad/DisponibilidadTab.tsx` — gestión personal (Fechas + Recurrentes)
- `src/app/components/disponibilidad/EquipoDisponibilidadPanel.tsx` — vista de equipo para líderes
- `src/app/components/disponibilidad/DisponibilidadBadge.tsx` — badge inline

### Archivos a modificar
- `src/app/components/ProfilePage.tsx` — añadir tab "Disponibilidad" (mobile accordion + desktop tabs)
- `src/app/components/tareas/CrearTareaDialog.tsx` — integrar `DisponibilidadBadge` tras selección de servidor
- `src/app/components/TasksPage.tsx` — botón + integración de `EquipoDisponibilidadPanel`

---

## Task 1: Migración de base de datos

**Files:**
- Create: `supabase/migrations/20260613000000_disponibilidad_table.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260613000000_disponibilidad_table.sql

CREATE TABLE IF NOT EXISTS disponibilidad (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('fecha_especifica', 'recurrente')),
  fecha         DATE,
  fecha_fin     DATE,
  patron        JSONB,
  nota          TEXT,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_usuario_id ON disponibilidad(usuario_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_fecha ON disponibilidad(fecha) WHERE tipo = 'fecha_especifica';
CREATE INDEX IF NOT EXISTS idx_disponibilidad_activo ON disponibilidad(activo) WHERE activo = true;

-- Trigger updated_at
CREATE OR REPLACE TRIGGER set_disponibilidad_updated_at
  BEFORE UPDATE ON disponibilidad
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;

-- Lectura: propio usuario
CREATE POLICY "disponibilidad_select_own"
  ON disponibilidad FOR SELECT
  USING (usuario_id = (SELECT id_usuario FROM usuario WHERE auth_user_id = auth.uid() LIMIT 1));

-- Lectura: líder ve miembros de su ministerio
CREATE POLICY "disponibilidad_select_lider"
  ON disponibilidad FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM miembro_ministerio mm
      JOIN miembro_ministerio mm_lider ON mm_lider.id_ministerio = mm.id_ministerio
      JOIN usuario u_lider ON u_lider.id_usuario = mm_lider.id_usuario
      WHERE mm.id_usuario = disponibilidad.usuario_id
        AND u_lider.auth_user_id = auth.uid()
        AND mm_lider.rol = 'lider'
        AND mm_lider.activo = true
        AND mm.activo = true
    )
  );

-- Lectura: admin_iglesia y super_admin ven todo dentro de su iglesia
CREATE POLICY "disponibilidad_select_admin"
  ON disponibilidad FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuario u
      WHERE u.auth_user_id = auth.uid()
        AND get_my_claim('rol') IN ('"admin_iglesia"', '"super_admin"', '"admin_sede"')
    )
  );

-- Insertar: solo propio
CREATE POLICY "disponibilidad_insert_own"
  ON disponibilidad FOR INSERT
  WITH CHECK (usuario_id = (SELECT id_usuario FROM usuario WHERE auth_user_id = auth.uid() LIMIT 1));

-- Actualizar: solo propio
CREATE POLICY "disponibilidad_update_own"
  ON disponibilidad FOR UPDATE
  USING (usuario_id = (SELECT id_usuario FROM usuario WHERE auth_user_id = auth.uid() LIMIT 1));

-- Eliminar: solo propio
CREATE POLICY "disponibilidad_delete_own"
  ON disponibilidad FOR DELETE
  USING (usuario_id = (SELECT id_usuario FROM usuario WHERE auth_user_id = auth.uid() LIMIT 1));
```

- [ ] **Step 2: Aplicar la migración via MCP de Supabase**

Usa el MCP tool `apply_migration` con el contenido del archivo anterior.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260613000000_disponibilidad_table.sql
git commit -m "feat(db): crear tabla disponibilidad con RLS"
```

---

## Task 2: Tipo TypeScript `DisponibilidadRegla`

**Files:**
- Modify: `src/types/app.types.ts`

- [ ] **Step 1: Añadir la interfaz al final de `app.types.ts`, antes del cierre del archivo**

Abrir `src/types/app.types.ts` y añadir al final:

```typescript
export interface DisponibilidadRegla {
  id: number;
  usuarioId: number;
  tipo: 'fecha_especifica' | 'recurrente';
  fecha?: string;        // 'YYYY-MM-DD'
  fechaFin?: string;     // 'YYYY-MM-DD' — rango opcional
  patron?: {
    tipo: 'semanal' | 'mensual';
    diasSemana?: number[];   // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
    semanaDelMes?: number;   // 1–4, o -1 = última
  };
  nota?: string;
  activo: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/app.types.ts
git commit -m "feat(types): añadir DisponibilidadRegla"
```

---

## Task 3: Service layer `disponibilidad.service.ts`

**Files:**
- Create: `src/services/disponibilidad.service.ts`

- [ ] **Step 1: Crear el servicio**

```typescript
// src/services/disponibilidad.service.ts
import { supabase } from '@/lib/supabaseClient'
import type { DisponibilidadRegla } from '@/types/app.types'

type Row = {
  id: number
  usuario_id: number
  tipo: string
  fecha: string | null
  fecha_fin: string | null
  patron: any
  nota: string | null
  activo: boolean
  created_at: string
}

function mapRow(r: Row): DisponibilidadRegla {
  return {
    id: r.id,
    usuarioId: r.usuario_id,
    tipo: r.tipo as DisponibilidadRegla['tipo'],
    fecha: r.fecha ?? undefined,
    fechaFin: r.fecha_fin ?? undefined,
    patron: r.patron ?? undefined,
    nota: r.nota ?? undefined,
    activo: r.activo,
    createdAt: r.created_at,
  }
}

export async function getDisponibilidadUsuario(usuarioId: number): Promise<DisponibilidadRegla[]> {
  const { data, error } = await supabase
    .from('disponibilidad')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(mapRow)
}

export async function getDisponibilidadEquipo(usuarioIds: number[]): Promise<DisponibilidadRegla[]> {
  if (usuarioIds.length === 0) return []
  const { data, error } = await supabase
    .from('disponibilidad')
    .select('*')
    .in('usuario_id', usuarioIds)
    .eq('activo', true)
  if (error) throw error
  return (data as Row[]).map(mapRow)
}

export async function createDisponibilidadRegla(
  regla: Omit<DisponibilidadRegla, 'id' | 'createdAt'>
): Promise<DisponibilidadRegla> {
  const { data, error } = await supabase
    .from('disponibilidad')
    .insert({
      usuario_id: regla.usuarioId,
      tipo: regla.tipo,
      fecha: regla.fecha ?? null,
      fecha_fin: regla.fechaFin ?? null,
      patron: regla.patron ?? null,
      nota: regla.nota ?? null,
      activo: regla.activo,
    })
    .select()
    .single()
  if (error) throw error
  return mapRow(data as Row)
}

export async function toggleDisponibilidadRegla(id: number, activo: boolean): Promise<void> {
  const { error } = await supabase
    .from('disponibilidad')
    .update({ activo })
    .eq('id', id)
  if (error) throw error
}

export async function deleteDisponibilidadRegla(id: number): Promise<void> {
  const { error } = await supabase
    .from('disponibilidad')
    .delete()
    .eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/disponibilidad.service.ts
git commit -m "feat(service): disponibilidad CRUD service"
```

---

## Task 4: React Query hooks + helper `estaDisponible`

**Files:**
- Create: `src/hooks/useDisponibilidad.ts`

- [ ] **Step 1: Crear el hook**

```typescript
// src/hooks/useDisponibilidad.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDisponibilidadUsuario,
  getDisponibilidadEquipo,
  createDisponibilidadRegla,
  toggleDisponibilidadRegla,
  deleteDisponibilidadRegla,
} from '@/services/disponibilidad.service'
import type { DisponibilidadRegla } from '@/types/app.types'

// ── Pure helper ──────────────────────────────────────────────────────────────

export function estaDisponible(
  usuarioId: number,
  fecha: Date,
  reglas: DisponibilidadRegla[]
): { disponible: boolean; nota?: string } {
  const activas = reglas.filter(r => r.activo && r.usuarioId === usuarioId)
  const fechaStr = fecha.toISOString().split('T')[0]

  // Evalúa fecha_especifica primero (mayor precedencia)
  for (const r of activas) {
    if (r.tipo !== 'fecha_especifica') continue
    if (!r.fecha) continue
    const desde = r.fecha
    const hasta = r.fechaFin ?? r.fecha
    if (fechaStr >= desde && fechaStr <= hasta) {
      return { disponible: false, nota: r.nota }
    }
  }

  // Evalúa recurrentes
  const diaSemana = fecha.getDay() // 0=Dom … 6=Sáb
  const dia = fecha.getDate()
  const mesYear = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const primerDiaSemana = mesYear.getDay()
  const semanaDelMes = Math.ceil((dia + primerDiaSemana) / 7)
  // Última semana: comprueba si añadir 7 días sobrepasa el mes
  const esUltimaSemana = new Date(fecha.getFullYear(), fecha.getMonth(), dia + 7).getMonth() !== fecha.getMonth()

  for (const r of activas) {
    if (r.tipo !== 'recurrente' || !r.patron) continue
    if (r.patron.tipo === 'semanal') {
      if (r.patron.diasSemana?.includes(diaSemana)) {
        return { disponible: false, nota: r.nota }
      }
    } else if (r.patron.tipo === 'mensual') {
      const semanaMatch =
        r.patron.semanaDelMes === -1
          ? esUltimaSemana
          : r.patron.semanaDelMes === semanaDelMes
      if (semanaMatch && r.patron.diasSemana?.includes(diaSemana)) {
        return { disponible: false, nota: r.nota }
      }
    }
  }

  return { disponible: true }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useDisponibilidadUsuario(usuarioId?: number) {
  return useQuery({
    queryKey: ['disponibilidad', usuarioId],
    queryFn: () => getDisponibilidadUsuario(usuarioId!),
    enabled: !!usuarioId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDisponibilidadEquipo(usuarioIds: number[]) {
  return useQuery({
    queryKey: ['disponibilidad-equipo', usuarioIds],
    queryFn: () => getDisponibilidadEquipo(usuarioIds),
    enabled: usuarioIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDisponibilidadRegla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createDisponibilidadRegla,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['disponibilidad', data.usuarioId] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-equipo'] })
    },
  })
}

export function useToggleDisponibilidadRegla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      toggleDisponibilidadRegla(id, activo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-equipo'] })
    },
  })
}

export function useDeleteDisponibilidadRegla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteDisponibilidadRegla,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-equipo'] })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useDisponibilidad.ts
git commit -m "feat(hooks): useDisponibilidad + helper estaDisponible"
```

---

## Task 5: Componente `CalendarioMensual`

**Files:**
- Create: `src/app/components/disponibilidad/CalendarioMensual.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/app/components/disponibilidad/CalendarioMensual.tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export interface DayCellData {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
}

interface Props {
  year?: number
  month?: number          // 0-indexed
  onMonthChange?: (year: number, month: number) => void
  renderDay?: (data: DayCellData) => React.ReactNode
  onDayClick?: (date: Date) => void
}

export function CalendarioMensual({ year: yearProp, month: monthProp, onMonthChange, renderDay, onDayClick }: Props) {
  const today = new Date()
  const [year, setYear] = useState(yearProp ?? today.getFullYear())
  const [month, setMonth] = useState(monthProp ?? today.getMonth())

  function navigate(delta: number) {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setYear(y)
    setMonth(m)
    onMonthChange?.(y, m)
  }

  function buildDays(): DayCellData[] {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrev = new Date(year, month, 0).getDate()
    const cells: DayCellData[] = []

    // Previous month fill
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrev - i)
      cells.push({ date: d, isCurrentMonth: false, isToday: false })
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const isToday = date.toDateString() === today.toDateString()
      cells.push({ date, isCurrentMonth: true, isToday })
    }
    // Next month fill to complete 6 rows
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false, isToday: false })
    }
    return cells
  }

  const days = buildDays()

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-bold uppercase tracking-widest text-foreground/80">
          {MESES[month]} {year}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((cell, i) => (
          <button
            key={i}
            onClick={() => cell.isCurrentMonth && onDayClick?.(cell.date)}
            className={`
              relative min-h-[40px] rounded-xl p-1 text-xs font-medium transition-all
              ${cell.isCurrentMonth ? 'cursor-pointer hover:bg-primary/10' : 'opacity-25 cursor-default pointer-events-none'}
              ${cell.isToday ? 'ring-2 ring-primary/60' : ''}
            `}
          >
            <span className={`
              absolute top-1 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center rounded-full text-[11px]
              ${cell.isToday ? 'bg-primary text-white font-black' : 'text-foreground/70'}
            `}>
              {cell.date.getDate()}
            </span>
            {cell.isCurrentMonth && renderDay?.(cell)}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/disponibilidad/CalendarioMensual.tsx
git commit -m "feat(ui): CalendarioMensual base reutilizable"
```

---

## Task 6: Componente `ReglaForm` (fecha específica)

**Files:**
- Create: `src/app/components/disponibilidad/ReglaForm.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/app/components/disponibilidad/ReglaForm.tsx
import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import type { DisponibilidadRegla } from '@/types/app.types'

interface Props {
  initialDate?: string   // 'YYYY-MM-DD'
  onSave: (data: Pick<DisponibilidadRegla, 'tipo' | 'fecha' | 'fechaFin' | 'nota'>) => void
  onCancel: () => void
  isSaving?: boolean
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
      {children}
    </label>
  )
}

export function ReglaForm({ initialDate, onSave, onCancel, isSaving }: Props) {
  const [fecha, setFecha] = useState(initialDate ?? '')
  const [usarRango, setUsarRango] = useState(false)
  const [fechaFin, setFechaFin] = useState('')
  const [nota, setNota] = useState('')

  function handleSave() {
    if (!fecha) return
    onSave({
      tipo: 'fecha_especifica',
      fecha,
      fechaFin: usarRango && fechaFin ? fechaFin : undefined,
      nota: nota.trim() || undefined,
    })
  }

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-background/50 border border-white/10">
      <div>
        <FieldLabel>Fecha</FieldLabel>
        <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="h-9 bg-background/50 border-white/10 rounded-xl text-sm" />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={usarRango}
          onChange={e => setUsarRango(e.target.checked)}
          className="rounded"
        />
        <span className="text-xs text-muted-foreground">Es un rango de días</span>
      </label>

      {usarRango && (
        <div>
          <FieldLabel>Fecha fin</FieldLabel>
          <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            min={fecha}
            className="h-9 bg-background/50 border-white/10 rounded-xl text-sm" />
        </div>
      )}

      <div>
        <FieldLabel>Motivo <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span></FieldLabel>
        <Input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Ej: Trabajo, Viaje, Médico..."
          className="h-9 bg-background/50 border-white/10 rounded-xl text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" className="rounded-xl" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={!fecha || isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/disponibilidad/ReglaForm.tsx
git commit -m "feat(ui): ReglaForm para fechas específicas"
```

---

## Task 7: Componente `PatronRecurrenteForm`

**Files:**
- Create: `src/app/components/disponibilidad/PatronRecurrenteForm.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/app/components/disponibilidad/PatronRecurrenteForm.tsx
import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import type { DisponibilidadRegla } from '@/types/app.types'

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const SEMANAS = [
  { label: '1ª semana', value: 1 },
  { label: '2ª semana', value: 2 },
  { label: '3ª semana', value: 3 },
  { label: '4ª semana', value: 4 },
  { label: 'Última semana', value: -1 },
]

interface Props {
  onSave: (data: Pick<DisponibilidadRegla, 'tipo' | 'patron' | 'nota'>) => void
  onCancel: () => void
  isSaving?: boolean
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
      {children}
    </label>
  )
}

export function PatronRecurrenteForm({ onSave, onCancel, isSaving }: Props) {
  const [tipoPatron, setTipoPatron] = useState<'semanal' | 'mensual'>('semanal')
  const [diasSemana, setDiasSemana] = useState<number[]>([])
  const [semanaDelMes, setSemanaDelMes] = useState<number>(1)
  const [nota, setNota] = useState('')

  function toggleDia(d: number) {
    setDiasSemana(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function handleSave() {
    if (diasSemana.length === 0) return
    onSave({
      tipo: 'recurrente',
      patron: tipoPatron === 'semanal'
        ? { tipo: 'semanal', diasSemana }
        : { tipo: 'mensual', semanaDelMes, diasSemana },
      nota: nota.trim() || undefined,
    })
  }

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-background/50 border border-white/10">
      {/* Tipo */}
      <div>
        <FieldLabel>Tipo de repetición</FieldLabel>
        <div className="flex gap-2">
          {(['semanal', 'mensual'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipoPatron(t)}
              className={`flex-1 h-9 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                tipoPatron === t
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-background/30 border-white/5 text-muted-foreground hover:border-white/20'
              }`}
            >
              {t === 'semanal' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
        </div>
      </div>

      {/* Semana del mes (solo mensual) */}
      {tipoPatron === 'mensual' && (
        <div>
          <FieldLabel>Semana del mes</FieldLabel>
          <select
            value={semanaDelMes}
            onChange={e => setSemanaDelMes(Number(e.target.value))}
            className="w-full h-9 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80"
          >
            {SEMANAS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {/* Días de la semana */}
      <div>
        <FieldLabel>Días</FieldLabel>
        <div className="flex gap-1.5 flex-wrap">
          {DIAS.map((d, i) => (
            <button
              key={i}
              onClick={() => toggleDia(i)}
              className={`w-10 h-10 rounded-xl border text-xs font-bold transition-all ${
                diasSemana.includes(i)
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-background/30 border-white/5 text-muted-foreground hover:border-white/20'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        {diasSemana.length === 0 && (
          <p className="text-[10px] text-rose-400 mt-1">Selecciona al menos un día</p>
        )}
      </div>

      {/* Nota */}
      <div>
        <FieldLabel>Motivo <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span></FieldLabel>
        <Input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Ej: Trabajo, Estudio..."
          className="h-9 bg-background/50 border-white/10 rounded-xl text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" className="rounded-xl" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={diasSemana.length === 0 || isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar patrón'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/disponibilidad/PatronRecurrenteForm.tsx
git commit -m "feat(ui): PatronRecurrenteForm para repeticiones"
```

---

## Task 8: Componente `DisponibilidadTab` (gestión personal)

**Files:**
- Create: `src/app/components/disponibilidad/DisponibilidadTab.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/app/components/disponibilidad/DisponibilidadTab.tsx
import { useState } from 'react'
import { Plus, Repeat2, Trash2, ToggleLeft, ToggleRight, CalendarX } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { toast } from 'sonner'
import { CalendarioMensual } from './CalendarioMensual'
import { ReglaForm } from './ReglaForm'
import { PatronRecurrenteForm } from './PatronRecurrenteForm'
import {
  useDisponibilidadUsuario,
  useCreateDisponibilidadRegla,
  useToggleDisponibilidadRegla,
  useDeleteDisponibilidadRegla,
  estaDisponible,
} from '@/hooks/useDisponibilidad'
import type { DisponibilidadRegla } from '@/types/app.types'

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const SEMANAS_LABEL: Record<number, string> = { 1:'1ª',2:'2ª',3:'3ª',4:'4ª',-1:'Última' }

interface Props {
  usuarioId: number
}

export function DisponibilidadTab({ usuarioId }: Props) {
  const [subTab, setSubTab] = useState<'fechas' | 'recurrentes'>('fechas')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showReglaForm, setShowReglaForm] = useState(false)
  const [showPatronForm, setShowPatronForm] = useState(false)

  const { data: reglas = [], isLoading } = useDisponibilidadUsuario(usuarioId)
  const createRegla = useCreateDisponibilidadRegla()
  const toggleRegla = useToggleDisponibilidadRegla()
  const deleteRegla = useDeleteDisponibilidadRegla()

  async function handleSaveRegla(data: Pick<DisponibilidadRegla, 'tipo' | 'fecha' | 'fechaFin' | 'nota'>) {
    try {
      await createRegla.mutateAsync({ ...data, usuarioId, activo: true })
      toast.success('Regla guardada')
      setShowReglaForm(false)
      setSelectedDate(null)
    } catch { toast.error('Error al guardar') }
  }

  async function handleSavePatron(data: Pick<DisponibilidadRegla, 'tipo' | 'patron' | 'nota'>) {
    try {
      await createRegla.mutateAsync({ ...data, usuarioId, activo: true })
      toast.success('Patrón guardado')
      setShowPatronForm(false)
    } catch { toast.error('Error al guardar') }
  }

  async function handleToggle(regla: DisponibilidadRegla) {
    try {
      await toggleRegla.mutateAsync({ id: regla.id, activo: !regla.activo })
    } catch { toast.error('Error al actualizar') }
  }

  async function handleDelete(id: number) {
    try {
      await deleteRegla.mutateAsync(id)
      toast.success('Regla eliminada')
    } catch { toast.error('Error al eliminar') }
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date)
    setShowReglaForm(true)
  }

  const reglasFecha = reglas.filter(r => r.tipo === 'fecha_especifica')
  const reglasRecurrentes = reglas.filter(r => r.tipo === 'recurrente')

  function describePatro(r: DisponibilidadRegla): string {
    if (!r.patron) return ''
    const dias = (r.patron.diasSemana ?? []).map(d => DIAS[d]).join(', ')
    if (r.patron.tipo === 'semanal') return `Todos los ${dias}`
    const sem = SEMANAS_LABEL[r.patron.semanaDelMes ?? 1]
    return `${sem} semana — ${dias}`
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(['fechas','recurrentes'] as const).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              subTab === t
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            {t === 'fechas' ? 'Fechas' : 'Recurrentes'}
          </button>
        ))}
      </div>

      {subTab === 'fechas' && (
        <div className="space-y-4">
          {/* Calendar */}
          <div className="p-4 rounded-2xl bg-background/30 border border-white/10">
            <CalendarioMensual
              onDayClick={handleDayClick}
              renderDay={({ date, isCurrentMonth }) => {
                if (!isCurrentMonth) return null
                const { disponible } = estaDisponible(usuarioId, date, reglas)
                if (disponible) return null
                return (
                  <div className="absolute inset-0 rounded-xl bg-rose-500/15 border border-rose-500/30 pointer-events-none" />
                )
              }}
            />
          </div>

          {/* Form on day click */}
          {showReglaForm && selectedDate && (
            <ReglaForm
              initialDate={selectedDate.toISOString().split('T')[0]}
              onSave={handleSaveRegla}
              onCancel={() => { setShowReglaForm(false); setSelectedDate(null) }}
              isSaving={createRegla.isPending}
            />
          )}

          {/* List of specific-date rules */}
          {reglasFecha.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fechas marcadas</p>
              {reglasFecha.map(r => (
                <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${
                  r.activo ? 'bg-rose-500/5 border-rose-500/20' : 'bg-background/20 border-white/5 opacity-50'
                }`}>
                  <CalendarX className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">
                      {r.fecha}{r.fechaFin ? ` → ${r.fechaFin}` : ''}
                    </p>
                    {r.nota && <p className="text-[10px] text-muted-foreground truncate">{r.nota}</p>}
                  </div>
                  <button onClick={() => handleToggle(r)} className="shrink-0 text-muted-foreground hover:text-foreground">
                    {r.activo ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="shrink-0 text-muted-foreground hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showReglaForm && (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border-dashed border-white/20 text-muted-foreground hover:text-foreground"
              onClick={() => setShowReglaForm(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Marcar día como no disponible
            </Button>
          )}
        </div>
      )}

      {subTab === 'recurrentes' && (
        <div className="space-y-3">
          {reglasRecurrentes.length === 0 && !showPatronForm && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No hay patrones recurrentes. Agrega uno para no repetir el mismo día cada semana.
            </p>
          )}

          {reglasRecurrentes.map(r => (
            <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${
              r.activo ? 'bg-background/30 border-white/10' : 'bg-background/10 border-white/5 opacity-50'
            }`}>
              <Repeat2 className="w-4 h-4 text-primary/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">{describePatro(r)}</p>
                {r.nota && <p className="text-[10px] text-muted-foreground truncate">{r.nota}</p>}
              </div>
              <button onClick={() => handleToggle(r)} className="shrink-0 text-muted-foreground hover:text-foreground">
                {r.activo ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => handleDelete(r.id)} className="shrink-0 text-muted-foreground hover:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {showPatronForm ? (
            <PatronRecurrenteForm
              onSave={handleSavePatron}
              onCancel={() => setShowPatronForm(false)}
              isSaving={createRegla.isPending}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border-dashed border-white/20 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPatronForm(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Agregar patrón recurrente
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/disponibilidad/DisponibilidadTab.tsx
git commit -m "feat(ui): DisponibilidadTab gestión personal"
```

---

## Task 9: Integrar tab en `ProfilePage`

**Files:**
- Modify: `src/app/components/ProfilePage.tsx`

- [ ] **Step 1: Añadir import al inicio de `ProfilePage.tsx`**

Añadir entre los imports existentes:

```typescript
import { DisponibilidadTab } from './disponibilidad/DisponibilidadTab'
```

También añadir `CalendarDays` al import de lucide-react existente.

- [ ] **Step 2: Añadir AccordionItem mobile (bloque `lg:hidden`)**

Buscar el último `</AccordionItem>` antes de `</Accordion>` en el bloque mobile (línea ~196) y añadir después:

```tsx
<AccordionItem value="disponibilidad" className="border-0 bg-card/40 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-lg border border-white/10 px-4">
  <AccordionTrigger className="hover:no-underline py-5 text-xs font-black tracking-widest uppercase text-[#4682b4]">
    <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />Disponibilidad</div>
  </AccordionTrigger>
  <AccordionContent className="pt-2 pb-6">
    {usuarioActual && <DisponibilidadTab usuarioId={usuarioActual.idUsuario} />}
  </AccordionContent>
</AccordionItem>
```

- [ ] **Step 3: Añadir TabsTrigger desktop**

Buscar el `TabsTrigger value="hoja-de-vida"` y añadir antes del botón de "Salir":

```tsx
<TabsTrigger value="disponibilidad" className="shrink-0 lg:w-full justify-start rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2.5 sm:py-4 text-[10px] sm:text-[12px] font-black tracking-widest uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#709dbd] data-[state=active]:to-[#4682b4] data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-900/20 transition-all duration-300">
  <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 sm:mr-3" /> Disponibilidad
</TabsTrigger>
```

- [ ] **Step 4: Añadir TabsContent desktop**

Después del `TabsContent value="hoja-de-vida"` añadir:

```tsx
<TabsContent value="disponibilidad" className="mt-0">
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
    <div className="p-6 sm:p-10 rounded-3xl sm:rounded-[40px] bg-card/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-2xl space-y-6 sm:space-y-8 relative overflow-hidden">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg text-white">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black tracking-tight text-foreground/90 uppercase italic">Mi Disponibilidad</h3>
          <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">Marca los días que no puedes</p>
        </div>
      </div>
      {usuarioActual && <DisponibilidadTab usuarioId={usuarioActual.idUsuario} />}
    </div>
  </motion.div>
</TabsContent>
```

- [ ] **Step 5: Commit**

```bash
git add src/app/components/ProfilePage.tsx
git commit -m "feat(profile): añadir tab Disponibilidad"
```

---

## Task 10: Componente `DisponibilidadBadge`

**Files:**
- Create: `src/app/components/disponibilidad/DisponibilidadBadge.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/app/components/disponibilidad/DisponibilidadBadge.tsx
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useDisponibilidadUsuario, estaDisponible } from '@/hooks/useDisponibilidad'

interface Props {
  usuarioId: number
  nombreUsuario: string
  fecha: string   // 'YYYY-MM-DD'
}

export function DisponibilidadBadge({ usuarioId, nombreUsuario, fecha }: Props) {
  const { data: reglas = [], isLoading } = useDisponibilidadUsuario(usuarioId)

  if (isLoading || !fecha) return null

  const fechaObj = new Date(fecha + 'T12:00:00') // mediodía para evitar offset TZ
  const { disponible, nota } = estaDisponible(usuarioId, fechaObj, reglas)

  if (disponible) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{nombreUsuario} está disponible</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold">{nombreUsuario} no está disponible este día</p>
        {nota && <p className="text-[10px] opacity-80 mt-0.5">Motivo: {nota}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/disponibilidad/DisponibilidadBadge.tsx
git commit -m "feat(ui): DisponibilidadBadge para asignación de tareas"
```

---

## Task 11: Integrar `DisponibilidadBadge` en `CrearTareaDialog`

**Files:**
- Modify: `src/app/components/tareas/CrearTareaDialog.tsx`

- [ ] **Step 1: Añadir import**

Añadir al inicio de `CrearTareaDialog.tsx`:

```typescript
import { DisponibilidadBadge } from '@/app/components/disponibilidad/DisponibilidadBadge'
```

- [ ] **Step 2: Añadir badges tras la lista de servidores**

Localizar el bloque que termina en `{asignadosIds.length > 0 && (<p className="text-[10px]...`  (línea ~256) y añadir antes de ese párrafo:

```tsx
{asignadosIds.length > 0 && form.fechaLimite && (
  <div className="mt-2 space-y-1.5">
    {asignadosIds.map(idU => {
      const srv = servidores.find(s => s.idUsuario === idU)
      if (!srv) return null
      return (
        <DisponibilidadBadge
          key={idU}
          usuarioId={idU}
          nombreUsuario={srv.nombreCompleto}
          fecha={form.fechaLimite}
        />
      )
    })}
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/tareas/CrearTareaDialog.tsx
git commit -m "feat(tasks): integrar DisponibilidadBadge en CrearTareaDialog"
```

---

## Task 12: Componente `EquipoDisponibilidadPanel`

**Files:**
- Create: `src/app/components/disponibilidad/EquipoDisponibilidadPanel.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/app/components/disponibilidad/EquipoDisponibilidadPanel.tsx
import { useState } from 'react'
import { X, Users } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { CalendarioMensual } from './CalendarioMensual'
import { estaDisponible, useDisponibilidadEquipo } from '@/hooks/useDisponibilidad'

interface Servidor {
  idUsuario: number
  nombreCompleto: string
}

interface Props {
  servidores: Servidor[]
  onClose: () => void
}

export function EquipoDisponibilidadPanel({ servidores, onClose }: Props) {
  const [filtroUsuario, setFiltroUsuario] = useState<number | 'todos'>('todos')
  const ids = servidores.map(s => s.idUsuario)
  const { data: reglas = [], isLoading } = useDisponibilidadEquipo(ids)

  const servidoresFiltrados = filtroUsuario === 'todos'
    ? servidores
    : servidores.filter(s => s.idUsuario === filtroUsuario)

  function getAusentesEnFecha(date: Date): Servidor[] {
    return servidoresFiltrados.filter(s => {
      const { disponible } = estaDisponible(s.idUsuario, date, reglas)
      return !disponible
    })
  }

  return (
    <div className="p-5 rounded-3xl bg-card/60 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest">Disponibilidad del Equipo</p>
            <p className="text-[10px] text-muted-foreground">{servidores.length} miembro{servidores.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Filtro */}
      <select
        value={filtroUsuario}
        onChange={e => setFiltroUsuario(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
        className="w-full h-9 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80"
      >
        <option value="todos">Todos los miembros</option>
        {servidores.map(s => (
          <option key={s.idUsuario} value={s.idUsuario}>{s.nombreCompleto}</option>
        ))}
      </select>

      {/* Calendario con ausencias */}
      <CalendarioMensual
        renderDay={({ date, isCurrentMonth }) => {
          if (!isCurrentMonth || isLoading) return null
          const ausentes = getAusentesEnFecha(date)
          if (ausentes.length === 0) return null
          return (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 flex-wrap justify-center max-w-full px-0.5">
              {ausentes.slice(0, 3).map(s => (
                <div
                  key={s.idUsuario}
                  title={s.nombreCompleto}
                  className="w-4 h-4 rounded-full bg-gradient-to-br from-[#709dbd] to-[#4682b4] border border-card flex items-center justify-center text-[7px] text-white font-black"
                >
                  {s.nombreCompleto.charAt(0).toUpperCase()}
                </div>
              ))}
              {ausentes.length > 3 && (
                <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[7px] text-rose-400 font-black">
                  +{ausentes.length - 3}
                </div>
              )}
            </div>
          )
        }}
      />

      {/* Leyenda */}
      <p className="text-[10px] text-muted-foreground text-center">
        Los avatares en cada día indican quiénes no están disponibles
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/disponibilidad/EquipoDisponibilidadPanel.tsx
git commit -m "feat(ui): EquipoDisponibilidadPanel vista de lider"
```

---

## Task 13: Integrar panel en `TasksPage`

**Files:**
- Modify: `src/app/components/TasksPage.tsx`

- [ ] **Step 1: Añadir imports en `TasksPage.tsx`**

En la línea del import de `lucide-react` (línea ~24), añadir `CalendarDays` a la lista existente:
```typescript
import { ..., CalendarDays } from 'lucide-react'
```

Añadir también el import del panel y del hook:
```typescript
import { EquipoDisponibilidadPanel } from './disponibilidad/EquipoDisponibilidadPanel'
import { useServidoresMinisterio } from '@/hooks/useMinisterios'
```

(El import de `useMinisteriosEnriquecidos` ya existe en la línea 8 — añadir `useServidoresMinisterio` a ese mismo import.)

- [ ] **Step 2: Añadir state para el panel**

Localizar los `useState` al inicio de `TasksPage` y añadir:

```typescript
const [showDisponibilidad, setShowDisponibilidad] = useState(false)
```

- [ ] **Step 3: Derivar servidores del ministerio para el panel**

Localizar donde se usa `useServidoresMinisterio` o donde se lista el equipo. Añadir:

```typescript
const idMinisterioLider = isLider ? (singleUserMinisterio?.idMinisterio ?? 0) : 0
const { data: servidoresEquipo = [] } = useServidoresMinisterio(
  isLider ? (idMinisterioLider || (usuarioMinisterioIds[0] ?? 0)) : 0
)
```

Nota: `useServidoresMinisterio` ya está importado desde `@/hooks/useMinisterios`.

- [ ] **Step 4: Añadir botón junto al botón "Nueva Tarea" en el Header**

Localizar el bloque del Header (línea ~617) donde está `{canShowCreateButton && (<Button onClick={() => setShowCreate...>`:

```tsx
{isLider && (
  <Button
    variant="outline"
    onClick={() => setShowDisponibilidad(prev => !prev)}
    className="h-10 rounded-xl font-medium shrink-0 border-white/10 text-foreground/80 hover:text-foreground"
  >
    <CalendarDays className="w-4 h-4 mr-1.5" />
    {showDisponibilidad ? 'Ocultar disponibilidad' : 'Ver disponibilidad del equipo'}
  </Button>
)}
```

- [ ] **Step 5: Añadir el panel en el JSX, después del Header motion.div**

Después del cierre del `</motion.div>` del Header y antes de `{/* ── Stats row ── */}`:

```tsx
{isLider && showDisponibilidad && (
  <EquipoDisponibilidadPanel
    servidores={servidoresEquipo.map(s => ({ idUsuario: s.idUsuario, nombreCompleto: s.nombreCompleto }))}
    onClose={() => setShowDisponibilidad(false)}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/components/TasksPage.tsx
git commit -m "feat(tasks): integrar EquipoDisponibilidadPanel para líderes"
```

---

## Task 14: Verificación final

- [ ] **Step 1: Iniciar servidor de desarrollo**

```bash
npm run dev
```

- [ ] **Step 2: Verificar flujo de servidor**
  - Ir a Perfil → tab "Disponibilidad"
  - Hacer click en un día del calendario → debe aparecer `ReglaForm`
  - Guardar una regla → el día debe quedar marcado en rojo
  - Ir a sub-tab "Recurrentes" → agregar un patrón semanal → aparece en la lista con toggle

- [ ] **Step 3: Verificar flujo de líder en Tareas**
  - Hacer login como líder
  - En Tareas → botón "Ver disponibilidad del equipo" debe aparecer
  - Al hacer click → se muestra el panel con el calendario y los avatares de ausentes

- [ ] **Step 4: Verificar badge en CrearTareaDialog**
  - Click "Nueva Tarea" → seleccionar ministerio → seleccionar servidor(es) → poner fecha límite
  - Si el servidor tiene una regla para esa fecha → debe aparecer el banner amarillo de advertencia
  - Si el servidor está disponible → badge verde

- [ ] **Step 5: Commit final si hay ajustes menores**

```bash
git add -p
git commit -m "fix(disponibilidad): ajustes post-verificación"
```
