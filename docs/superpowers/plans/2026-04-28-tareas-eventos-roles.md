# Tareas + Eventos + Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el flujo de tareas para que el líder cree tareas con evento opcional y asignación multi-servidor filtrada por ministerio; el servidor gestione sus tareas asignadas con cambio de estado y evidencias; el líder supervise y apruebe.

**Architecture:** `TasksPage` se convierte en un coordinador de rol. Se crean tres componentes en `src/app/components/tareas/`: `CrearTareaDialog` (formulario un solo paso), `LiderTareasView` (kanban + supervisión), `ServidorTareasView` (lista de mis tareas). Se agregan dos funciones de servicio y dos hooks.

**Tech Stack:** React 18, TanStack Query v5, Supabase JS v2, Tailwind CSS v4, shadcn/ui, Framer Motion, Lucide React, sonner (toasts)

---

## Mapa de archivos

| Acción | Ruta |
|--------|------|
| Modificar | `src/services/ministerios.service.ts` |
| Modificar | `src/hooks/useMinisterios.ts` |
| Modificar | `src/services/eventos.service.ts` |
| Modificar | `src/hooks/useEventos.ts` |
| **Crear** | `src/app/components/tareas/CrearTareaDialog.tsx` |
| **Crear** | `src/app/components/tareas/LiderTareasView.tsx` |
| **Crear** | `src/app/components/tareas/ServidorTareasView.tsx` |
| Modificar | `src/app/components/TasksPage.tsx` |

---

## Task 1: Agregar funciones de servicio para servidores y eventos por ministerio

**Files:**
- Modify: `src/services/ministerios.service.ts`
- Modify: `src/services/eventos.service.ts`

- [ ] **Step 1: Agregar `ServidorMinisterio` interface y `getServidoresMinisterio` en ministerios.service.ts**

Al final del archivo, antes del último `export`, añadir:

```ts
export interface ServidorMinisterio {
  idUsuario: number
  nombreCompleto: string
  rolEnMinisterio: string | null
}

export async function getServidoresMinisterio(idMinisterio: number): Promise<ServidorMinisterio[]> {
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('id_usuario, rol_en_ministerio, usuario(nombres, apellidos)')
    .eq('id_ministerio', idMinisterio)
    .neq('rol_en_ministerio', 'Líder de Ministerio')
    .is('fecha_salida', null)
  if (error) throw error
  return (data as any[]).map(r => ({
    idUsuario: r.id_usuario,
    nombreCompleto: `${r.usuario?.nombres ?? ''} ${r.usuario?.apellidos ?? ''}`.trim(),
    rolEnMinisterio: r.rol_en_ministerio,
  }))
}
```

- [ ] **Step 2: Agregar `getEventosPorMinisterio` en eventos.service.ts**

Al final del archivo, añadir:

```ts
export async function getEventosPorMinisterio(idMinisterio: number): Promise<Evento[]> {
  const { data, error } = await supabase
    .from('evento')
    .select('*')
    .eq('id_ministerio', idMinisterio)
    .neq('estado', 'cancelado')
    .neq('estado', 'finalizado')
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data.map(mapEvento)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/ministerios.service.ts src/services/eventos.service.ts
git commit -m "feat: add getServidoresMinisterio and getEventosPorMinisterio services"
```

---

## Task 2: Agregar hooks para los nuevos servicios

**Files:**
- Modify: `src/hooks/useMinisterios.ts`
- Modify: `src/hooks/useEventos.ts`

- [ ] **Step 1: Agregar import y hook `useServidoresMinisterio` en useMinisterios.ts**

En la línea de imports del servicio, agregar `getServidoresMinisterio` al import existente:

```ts
import {
  getMinisterios, getMiembrosMinisterio,
  getMinisteriosEnriquecidos, getMiembrosMinisterioEnriquecidos,
  getMinisteriosIdsDeUsuario,
  createMinisterio, updateMinisterio, toggleMinisterioEstado,
  createMiembroMinisterio,
  deleteMinisterio, deleteMiembroMinisterio, updateMiembroMinisterio,
  getServidoresMinisterio,
} from '@/services/ministerios.service'
```

Al final del archivo añadir:

```ts
export function useServidoresMinisterio(idMinisterio: number) {
  return useQuery({
    queryKey: ['servidores-ministerio', idMinisterio],
    queryFn: () => getServidoresMinisterio(idMinisterio),
    enabled: idMinisterio > 0,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 2: Agregar import y hook `useEventosPorMinisterio` en useEventos.ts**

Agregar `getEventosPorMinisterio` al import existente de `@/services/eventos.service`:

```ts
import {
  getTiposEvento, getEventos, getTareas, getTareasAsignadas,
  getEventosEnriquecidos, getTareasEnriquecidas,
  createTipoEvento, updateTipoEvento, deleteTipoEvento,
  createEvento, createTarea, updateTareaEstado,
  updateEvento, deleteEvento, updateTarea, deleteTarea,
  createTareaAsignada, updateTareaAsignada, deleteTareaAsignada,
  getTareaEvidencias, createTareaEvidencia,
  getEventosPorMinisterio,
} from '@/services/eventos.service'
```

Al final del archivo añadir:

```ts
export function useEventosPorMinisterio(idMinisterio: number) {
  return useQuery({
    queryKey: ['eventos-ministerio', idMinisterio],
    queryFn: () => getEventosPorMinisterio(idMinisterio),
    enabled: idMinisterio > 0,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMinisterios.ts src/hooks/useEventos.ts
git commit -m "feat: add useServidoresMinisterio and useEventosPorMinisterio hooks"
```

---

## Task 3: Crear directorio y `CrearTareaDialog`

**Files:**
- Create: `src/app/components/tareas/CrearTareaDialog.tsx`

- [ ] **Step 1: Crear el directorio**

```bash
mkdir -p src/app/components/tareas
```

- [ ] **Step 2: Crear `src/app/components/tareas/CrearTareaDialog.tsx`**

```tsx
import { useState, useEffect } from "react"
import { useCreateTarea, useCreateTareaAsignada, useEventosPorMinisterio } from "@/hooks/useEventos"
import { useMinisteriosEnriquecidos, useServidoresMinisterio } from "@/hooks/useMinisterios"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { toast } from "sonner"
import { Calendar, Link2, Users } from "lucide-react"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
      {children}
    </label>
  )
}

const prioridadConfig = {
  baja:    { label: "Baja",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  media:   { label: "Media",   color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
  alta:    { label: "Alta",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  urgente: { label: "Urgente", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  idUsuarioCreador: number
  onCreated?: (idTarea: number) => void
}

export function CrearTareaDialog({ open, onOpenChange, idUsuarioCreador, onCreated }: Props) {
  const { data: ministerios = [] } = useMinisteriosEnriquecidos()
  const createTarea = useCreateTarea()
  const createAsignada = useCreateTareaAsignada()

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    fechaLimite: "",
    prioridad: "media" as "baja" | "media" | "alta" | "urgente",
    idMinisterio: 0,
    idEvento: 0,
  })
  const [asignadosIds, setAsignadosIds] = useState<number[]>([])

  const { data: servidores = [] } = useServidoresMinisterio(form.idMinisterio)
  const { data: eventos = [] } = useEventosPorMinisterio(form.idMinisterio)

  useEffect(() => {
    if (form.idMinisterio || ministerios.length !== 1) return
    setForm(p => ({ ...p, idMinisterio: ministerios[0].idMinisterio }))
  }, [ministerios, form.idMinisterio])

  const resetForm = () => {
    setForm({ titulo: "", descripcion: "", fechaLimite: "", prioridad: "media", idMinisterio: 0, idEvento: 0 })
    setAsignadosIds([])
  }

  const toggleServidor = (id: number) => {
    setAsignadosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleCreate = async () => {
    if (!form.titulo.trim()) { toast.error("El título es obligatorio"); return }
    if (!form.idMinisterio) { toast.error("Selecciona un ministerio"); return }
    try {
      const tarea = await createTarea.mutateAsync({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        fechaLimite: form.fechaLimite || null,
        prioridad: form.prioridad,
        idUsuarioCreador,
        idMinisterio: form.idMinisterio,
        idEvento: form.idEvento || null,
      })
      if (asignadosIds.length > 0) {
        await Promise.allSettled(
          asignadosIds.map(idUsuario => createAsignada.mutateAsync({ idTarea: tarea.idTarea, idUsuario }))
        )
      }
      toast.success(`Tarea "${tarea.titulo}" creada`)
      onCreated?.(tarea.idTarea)
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error('[CrearTareaDialog] Error:', error)
      toast.error("Error al crear tarea: " + (error?.message ?? "Error desconocido"))
    }
  }

  const isPending = createTarea.isPending || createAsignada.isPending

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) resetForm() }}>
      <DialogContent className="sm:max-w-lg rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Nueva Tarea
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crea una tarea, vincúlala a un evento y asigna servidores.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Ministerio */}
          <div>
            <FieldLabel>Ministerio</FieldLabel>
            <select
              value={form.idMinisterio}
              onChange={e => {
                const id = Number(e.target.value)
                setForm(p => ({ ...p, idMinisterio: id, idEvento: 0 }))
                setAsignadosIds([])
              }}
              className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value={0}>Seleccionar ministerio...</option>
              {ministerios.map(m => (
                <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Evento (opcional) */}
          {form.idMinisterio > 0 && (
            <div>
              <FieldLabel>
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" />
                  Evento
                  <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span>
                </span>
              </FieldLabel>
              <select
                value={form.idEvento}
                onChange={e => setForm(p => ({ ...p, idEvento: Number(e.target.value) }))}
                className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value={0}>Sin evento</option>
                {eventos.map(ev => (
                  <option key={ev.idEvento} value={ev.idEvento}>{ev.nombre}</option>
                ))}
              </select>
              {eventos.length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                  No hay eventos activos en este ministerio.
                </p>
              )}
            </div>
          )}

          {/* Título */}
          <div>
            <FieldLabel>Título</FieldLabel>
            <Input
              value={form.titulo}
              onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder="Ej. Preparar decoración para el culto"
              className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
            />
          </div>

          {/* Descripción */}
          <div>
            <FieldLabel>
              Descripción{" "}
              <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span>
            </FieldLabel>
            <Input
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Detalles de la tarea"
              className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
            />
          </div>

          {/* Fecha + Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />Fecha Límite
                </span>
              </FieldLabel>
              <Input
                type="date"
                value={form.fechaLimite}
                onChange={e => setForm(p => ({ ...p, fechaLimite: e.target.value }))}
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
            <div>
              <FieldLabel>Prioridad</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {(["baja", "media", "alta", "urgente"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setForm(prev => ({ ...prev, prioridad: p }))}
                    className={`h-8 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all ${
                      form.prioridad === p
                        ? `${prioridadConfig[p].color} border-current scale-105`
                        : "bg-background/30 border-white/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {prioridadConfig[p].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Servidores */}
          {form.idMinisterio > 0 && (
            <div>
              <FieldLabel>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  Asignar servidores
                  <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span>
                </span>
              </FieldLabel>
              {servidores.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 bg-background/30 rounded-xl px-3 py-2 border border-white/5">
                  No hay servidores en este ministerio.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {servidores.map(s => {
                    const selected = asignadosIds.includes(s.idUsuario)
                    return (
                      <button
                        key={s.idUsuario}
                        onClick={() => toggleServidor(s.idUsuario)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all ${
                          selected
                            ? "bg-primary/10 border-primary/30 text-foreground"
                            : "bg-background/30 border-white/5 text-foreground/70 hover:border-white/20"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-primary border-primary text-white" : "border-white/20"}`}>
                          {selected && <span className="text-[9px] font-black leading-none">✓</span>}
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-[10px] text-white font-black shrink-0">
                          {s.nombreCompleto.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium truncate">{s.nombreCompleto}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {asignadosIds.length > 0 && (
                <p className="text-[10px] text-primary/70 mt-1.5">
                  {asignadosIds.length} servidor{asignadosIds.length !== 1 ? "es" : ""} seleccionado{asignadosIds.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 mt-2 gap-2">
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={() => { onOpenChange(false); resetForm() }}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl"
            onClick={handleCreate}
            disabled={isPending || !idUsuarioCreador}
          >
            {isPending ? "Creando..." : "Crear Tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/tareas/CrearTareaDialog.tsx
git commit -m "feat: add CrearTareaDialog with event picker and filtered multi-assign"
```

---

## Task 4: Crear `LiderTareasView`

**Files:**
- Create: `src/app/components/tareas/LiderTareasView.tsx`

- [ ] **Step 1: Crear `src/app/components/tareas/LiderTareasView.tsx`**

```tsx
import { useState, useMemo } from "react"
import {
  useTareasEnriquecidas, useUpdateTareaEstado, useDeleteTarea,
  useDeleteTareaAsignada, useCreateTareaAsignada, useTareaEvidencias,
} from "@/hooks/useEventos"
import { useServidoresMinisterio } from "@/hooks/useMinisterios"
import { getTareaEvidenciaSignedUrl } from "@/services/eventos.service"
import { useApp } from "@/app/store/AppContext"
import { AnimatedCard } from "@/app/components/ui/AnimatedCard"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Input } from "@/app/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import {
  ListTodo, Plus, CheckCircle2, Clock, AlertCircle,
  Calendar, Inbox, Trash2, UserPlus, X, Paperclip,
} from "lucide-react"
import { CrearTareaDialog } from "./CrearTareaDialog"

const statusConfig = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20",   dot: "bg-amber-400",   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  en_progreso: { label: "En Progreso", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",   dot: "bg-[#4682b4]",    icon: <Clock className="w-3.5 h-3.5" /> },
  en_revision: { label: "En Revisión", color: "bg-violet-500/10 text-violet-400 border-violet-500/20", dot: "bg-violet-400",   icon: <Clock className="w-3.5 h-3.5" /> },
  completada:  { label: "Completada",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
} as const

const prioridadConfig: Record<string, { label: string; color: string; dot: string }> = {
  baja:    { label: "Baja",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20",   dot: "bg-slate-400" },
  media:   { label: "Media",   color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",   dot: "bg-[#4682b4]" },
  alta:    { label: "Alta",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",   dot: "bg-amber-400" },
  urgente: { label: "Urgente", color: "bg-rose-500/10 text-rose-400 border-rose-500/20",      dot: "bg-rose-500" },
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
      {children}
    </label>
  )
}

const COLS = ["pendiente", "en_progreso", "en_revision", "completada"] as const

export function LiderTareasView() {
  const { usuarioActual } = useApp()
  const { data: tareas = [], isLoading } = useTareasEnriquecidas()
  const updateEstado = useUpdateTareaEstado()
  const deleteTarea = useDeleteTarea()
  const deleteAsignada = useDeleteTareaAsignada()
  const createAsignada = useCreateTareaAsignada()

  const [showCreate, setShowCreate] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number; titulo: string }>({ open: false, id: 0, titulo: "" })
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [assignUserId, setAssignUserId] = useState(0)

  const task = selectedTaskId ? tareas.find(t => t.idTarea === selectedTaskId) ?? null : null
  const { data: evidencias = [] } = useTareaEvidencias(selectedTaskId ?? undefined)
  const { data: servidoresTarea = [] } = useServidoresMinisterio(task?.idMinisterio ?? 0)

  const filteredTareas = useMemo(() => {
    let r = [...tareas]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      r = r.filter(t => t.titulo.toLowerCase().includes(q) || (t.descripcion ?? "").toLowerCase().includes(q))
    }
    if (dateFilter) r = r.filter(t => t.fechaLimite === dateFilter)
    r.sort((a, b) => {
      const diff = new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime()
      return sortOrder === "newest" ? -diff : diff
    })
    return r
  }, [tareas, searchQuery, dateFilter, sortOrder])

  const tasksByStatus = (s: string) => filteredTareas.filter(t => t.estado === s)
  const enRevisionCount = tasksByStatus("en_revision").length

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Cargando tareas...</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <ListTodo className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Gestión</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Tareas</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">Supervisión y asignación de tareas del ministerio</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {enRevisionCount > 0 && (
            <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[11px] font-bold text-violet-400">{enRevisionCount} en revisión</span>
            </div>
          )}
          <Button
            onClick={() => setShowCreate(true)}
            className="h-10 rounded-xl font-medium shrink-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30 transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nueva Tarea
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {COLS.map((s, idx) => {
          const cfg = statusConfig[s]
          const count = tasksByStatus(s).length
          const gradient = s === "pendiente" ? "from-amber-500 to-orange-600" : s === "en_progreso" ? "from-[#709dbd] to-[#4682b4]" : s === "en_revision" ? "from-violet-500 to-purple-600" : "from-emerald-500 to-teal-600"
          return (
            <AnimatedCard key={s} index={idx} className="p-4 group">
              <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg text-white ${s === "en_revision" && count > 0 ? "animate-pulse" : ""}`}>
                  {cfg.icon}
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px] py-0 tracking-widest uppercase">KPI</Badge>
              </div>
              <p className="text-4xl font-light tracking-tight text-foreground">{count}</p>
              <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{cfg.label}</p>
            </AnimatedCard>
          )
        })}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-3 bg-card/40 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-sm"
      >
        <div className="flex-1">
          <Input
            placeholder="Buscar por título o descripción..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-background/50 border-white/10 h-11"
          />
        </div>
        <div className="flex gap-3">
          <Input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-[150px] bg-background/50 border-white/10 h-11"
          />
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as "newest" | "oldest")}
            className="w-[180px] h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguas primero</option>
          </select>
        </div>
      </motion.div>

      {/* Kanban */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto pb-6 lg:pb-0 snap-x lg:snap-none -mx-4 px-4 lg:mx-0 lg:px-0 hide-scrollbar"
      >
        {COLS.map((status, colIdx) => {
          const cfg = statusConfig[status]
          const statusTasks = tasksByStatus(status)
          const isReview = status === "en_revision" && statusTasks.length > 0
          return (
            <motion.div key={status} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + colIdx * 0.06 }}>
              <div className="w-[80vw] sm:w-[320px] lg:w-full shrink-0 snap-center">
                <div className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl bg-card/60 backdrop-blur-xl border border-white/10 border-b-0 ${isReview ? "border-violet-500/30" : ""}`}>
                  <div className={`w-2 h-2 rounded-full ${cfg.dot} ${isReview ? "animate-pulse" : ""} shadow-[0_0_6px_currentColor]`} />
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/70">{cfg.label}</span>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} border`}>{statusTasks.length}</span>
                </div>
                <div className="space-y-3 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-b-3xl border border-white/5 border-t-0 p-3 min-h-[400px]">
                  <AnimatePresence>
                    {statusTasks.map((t, tIdx) => {
                      const prio = prioridadConfig[t.prioridad] ?? prioridadConfig.media
                      return (
                        <AnimatedCard key={t.idTarea} index={tIdx} className="p-4 group cursor-pointer" onClick={() => setSelectedTaskId(t.idTarea)}>
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="outline" className={`${prio.color} border-0 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-lg`}>
                              {prio.label}
                            </Badge>
                            {t.fechaLimite && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase bg-white/5 px-2 py-0.5 rounded-lg">
                                <Calendar className="w-2.5 h-2.5" />{t.fechaLimite}
                              </span>
                            )}
                          </div>
                          <h4 className="text-[13px] font-bold leading-snug group-hover:text-[#4682b4] transition-colors mb-1 uppercase italic">{t.titulo}</h4>
                          {t.eventoNombre && (
                            <p className="text-[10px] font-bold text-[#4682b4]/60 mb-2 truncate uppercase tracking-wider">↳ {t.eventoNombre}</p>
                          )}
                          {t.descripcion && (
                            <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{t.descripcion}</p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="flex -space-x-2">
                              {t.asignados?.slice(0, 3).map(a => (
                                <div key={a.idTareaAsignada} className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] border-2 border-card flex items-center justify-center text-[9px] text-white font-black shadow-sm" title={a.nombreCompleto}>
                                  {(a.nombreCompleto || "?").charAt(0).toUpperCase()}
                                </div>
                              ))}
                              {(t.asignados?.length ?? 0) > 3 && (
                                <div className="w-6 h-6 rounded-lg bg-white/10 border-2 border-card flex items-center justify-center text-[9px] text-muted-foreground font-black">
                                  +{(t.asignados?.length ?? 0) - 3}
                                </div>
                              )}
                            </div>
                            <button
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-all"
                              onClick={e => { e.stopPropagation(); setDeleteConfirm({ open: true, id: t.idTarea, titulo: t.titulo }) }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </AnimatedCard>
                      )
                    })}
                  </AnimatePresence>
                  {statusTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                      <Inbox className="w-7 h-7 opacity-20" />
                      <p className="text-xs">Sin tareas aquí</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTaskId} onOpenChange={() => { setSelectedTaskId(null); setAssignUserId(0) }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {task ? (
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${statusConfig[task.estado as keyof typeof statusConfig]?.color} border flex items-center justify-center shrink-0 mt-0.5`}>
                  {statusConfig[task.estado as keyof typeof statusConfig]?.icon}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold tracking-tight leading-snug">{task.titulo}</DialogTitle>
                  {task.eventoNombre && <p className="text-[11px] text-primary/60 mt-0.5">↳ {task.eventoNombre}</p>}
                </div>
              </div>
            ) : <DialogTitle>Detalle de Tarea</DialogTitle>}
          </DialogHeader>

          {task && (
            <>
              <div className="space-y-5 py-1">
                {task.descripcion && (
                  <div>
                    <FieldLabel>Descripción</FieldLabel>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-background/40 rounded-xl p-3 border border-white/5">{task.descripcion}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Estado</FieldLabel>
                    <Badge variant="outline" className={`${statusConfig[task.estado as keyof typeof statusConfig]?.color} border text-[10px] uppercase font-bold tracking-wider w-full justify-center py-1`}>
                      {statusConfig[task.estado as keyof typeof statusConfig]?.label}
                    </Badge>
                  </div>
                  <div>
                    <FieldLabel>Prioridad</FieldLabel>
                    <Badge variant="outline" className={`${prioridadConfig[task.prioridad]?.color} border text-[10px] uppercase font-bold tracking-wider w-full justify-center py-1`}>
                      {prioridadConfig[task.prioridad]?.label}
                    </Badge>
                  </div>
                  {task.fechaLimite && (
                    <div>
                      <FieldLabel>Fecha Límite</FieldLabel>
                      <div className="flex items-center gap-1 text-xs text-foreground/70 bg-background/40 rounded-xl px-2 py-1.5 border border-white/5">
                        <Calendar className="w-3 h-3 text-primary/50 shrink-0" />{task.fechaLimite}
                      </div>
                    </div>
                  )}
                </div>

                {task.asignados && task.asignados.length > 0 && (
                  <div>
                    <FieldLabel>Personas asignadas</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {task.asignados.map(a => (
                        <div key={a.idTareaAsignada} className="flex items-center gap-2 bg-background/50 border border-white/10 rounded-xl px-3 py-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-[9px] text-primary font-bold">
                            {(a.nombreCompleto || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium">{a.nombreCompleto}</span>
                          <button
                            className="text-muted-foreground/40 hover:text-rose-400 transition-colors ml-0.5"
                            onClick={() => { if (confirm(`¿Remover a ${a.nombreCompleto}?`)) deleteAsignada.mutate(a.idTareaAsignada) }}
                            disabled={deleteAsignada.isPending}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border/40">
                  <FieldLabel>
                    <span className="flex items-center gap-1.5"><UserPlus className="w-3 h-3" />Asignar servidor</span>
                  </FieldLabel>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-10 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      value={assignUserId}
                      onChange={e => setAssignUserId(Number(e.target.value))}
                    >
                      <option value={0}>Seleccionar servidor...</option>
                      {servidoresTarea
                        .filter(s => !(task.asignados ?? []).some(a => a.idUsuario === s.idUsuario))
                        .map(s => <option key={s.idUsuario} value={s.idUsuario}>{s.nombreCompleto}</option>)}
                    </select>
                    <Button
                      className="h-10 rounded-xl px-4"
                      disabled={!assignUserId || createAsignada.isPending}
                      onClick={() => {
                        if (!assignUserId) return
                        createAsignada.mutate(
                          { idTarea: task.idTarea, idUsuario: assignUserId },
                          { onSuccess: () => setAssignUserId(0) }
                        )
                      }}
                    >
                      {createAsignada.isPending ? "..." : <UserPlus className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {evidencias.length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <FieldLabel>
                      <span className="flex items-center gap-1.5"><Paperclip className="w-3 h-3" />Evidencias</span>
                    </FieldLabel>
                    <div className="space-y-2">
                      {evidencias.map(ev => (
                        <div key={ev.idTareaEvidencia} className="flex items-center justify-between gap-3 bg-background/40 border border-white/10 rounded-xl px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{ev.nombreArchivo}</p>
                            {ev.nombreCompleto && <p className="text-[10px] text-muted-foreground truncate">{ev.nombreCompleto}</p>}
                          </div>
                          <Button
                            variant="ghost" className="h-8 px-3 rounded-lg"
                            onClick={async () => {
                              try { window.open(await getTareaEvidenciaSignedUrl(ev.objectPath), "_blank", "noopener,noreferrer") }
                              catch { toast.error("No se pudo abrir la evidencia.") }
                            }}
                          >Ver</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-border/50 pt-4 gap-2">
                <button
                  className="mr-auto h-9 px-3 rounded-xl flex items-center gap-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  onClick={() => { setDeleteConfirm({ open: true, id: task.idTarea, titulo: task.titulo }); setSelectedTaskId(null) }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
                <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedTaskId(null)}>Cerrar</Button>
                {task.estado === "en_revision" && (
                  <>
                    <Button
                      variant="ghost" className="rounded-xl"
                      onClick={() => { updateEstado.mutate({ id: task.idTarea, estado: "en_progreso" }); setSelectedTaskId(null) }}
                    >
                      Reabrir
                    </Button>
                    <Button
                      className="rounded-xl"
                      onClick={() => { updateEstado.mutate({ id: task.idTarea, estado: "completada" }); setSelectedTaskId(null) }}
                    >
                      Aprobar
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm.open} onOpenChange={open => setDeleteConfirm(p => ({ ...p, open }))}>
        <DialogContent className="sm:max-w-sm rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-rose-400" />
              </div>
              <DialogTitle className="text-lg font-bold text-center">¿Eliminar tarea?</DialogTitle>
              <p className="text-sm text-muted-foreground text-center">
                Se eliminará <span className="font-semibold text-foreground">"{deleteConfirm.titulo}"</span>. Esta acción no se puede deshacer.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 pt-2">
            <Button variant="ghost" className="rounded-xl w-full" onClick={() => setDeleteConfirm({ open: false, id: 0, titulo: "" })}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl w-full bg-rose-500 hover:bg-rose-600 text-white"
              onClick={() => deleteTarea.mutate(deleteConfirm.id, { onSuccess: () => setDeleteConfirm({ open: false, id: 0, titulo: "" }) })}
              disabled={deleteTarea.isPending}
            >
              {deleteTarea.isPending ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrearTareaDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        idUsuarioCreador={usuarioActual?.idUsuario ?? 0}
        onCreated={idTarea => setSelectedTaskId(idTarea)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/tareas/LiderTareasView.tsx
git commit -m "feat: add LiderTareasView with kanban, supervision, and filtered assignment"
```

---

## Task 5: Crear `ServidorTareasView`

**Files:**
- Create: `src/app/components/tareas/ServidorTareasView.tsx`

- [ ] **Step 1: Crear `src/app/components/tareas/ServidorTareasView.tsx`**

```tsx
import { useState, useMemo } from "react"
import {
  useTareasEnriquecidas, useUpdateTareaEstado,
  useTareaEvidencias, useCreateTareaEvidencia,
} from "@/hooks/useEventos"
import { getTareaEvidenciaSignedUrl } from "@/services/eventos.service"
import { useApp } from "@/app/store/AppContext"
import { AnimatedCard } from "@/app/components/ui/AnimatedCard"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import {
  ListTodo, CheckCircle2, Clock, AlertCircle,
  Calendar, Paperclip, Inbox, ChevronRight,
} from "lucide-react"

const statusConfig = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20",       dot: "bg-amber-400",   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  en_progreso: { label: "En Progreso", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",       dot: "bg-[#4682b4]",    icon: <Clock className="w-3.5 h-3.5" /> },
  en_revision: { label: "En Revisión", color: "bg-violet-500/10 text-violet-400 border-violet-500/20",    dot: "bg-violet-400",   icon: <Clock className="w-3.5 h-3.5" /> },
  completada:  { label: "Completada",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelada:   { label: "Cancelada",   color: "bg-rose-500/10 text-rose-400 border-rose-500/20",          dot: "bg-rose-400",    icon: <AlertCircle className="w-3.5 h-3.5" /> },
} as const

const prioridadConfig: Record<string, { label: string; color: string }> = {
  baja:    { label: "Baja",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  media:   { label: "Media",   color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
  alta:    { label: "Alta",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  urgente: { label: "Urgente", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
}

const STATUS_TABS = [
  { key: "todas",       label: "Todas" },
  { key: "pendiente",   label: "Pendientes" },
  { key: "en_progreso", label: "En Progreso" },
  { key: "en_revision", label: "En Revisión" },
  { key: "completada",  label: "Completadas" },
] as const

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
      {children}
    </label>
  )
}

type TabKey = typeof STATUS_TABS[number]["key"]

export function ServidorTareasView() {
  const { usuarioActual } = useApp()
  const { data: todasTareas = [], isLoading } = useTareasEnriquecidas()
  const updateEstado = useUpdateTareaEstado()
  const createEvidencia = useCreateTareaEvidencia()

  const [activeTab, setActiveTab] = useState<TabKey>("todas")
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [evidenceUploading, setEvidenceUploading] = useState(false)

  const misTareas = useMemo(() => {
    return todasTareas.filter(t => t.asignados?.some(a => a.idUsuario === usuarioActual?.idUsuario))
  }, [todasTareas, usuarioActual?.idUsuario])

  const filteredTareas = useMemo(() => {
    if (activeTab === "todas") return misTareas
    return misTareas.filter(t => t.estado === activeTab)
  }, [misTareas, activeTab])

  const task = selectedTaskId ? misTareas.find(t => t.idTarea === selectedTaskId) ?? null : null
  const myAssignment = task?.asignados?.find(a => a.idUsuario === usuarioActual?.idUsuario) ?? null
  const { data: evidencias = [] } = useTareaEvidencias(selectedTaskId ?? undefined)

  const getNextAction = (estado: string) => {
    if (estado === "pendiente")   return { label: "Iniciar tarea",       next: "en_progreso" as const, icon: <ChevronRight className="w-3.5 h-3.5" /> }
    if (estado === "en_progreso") return { label: "Enviar a revisión",   next: "en_revision" as const,  icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
    return null
  }

  const canUploadEvidence = task && myAssignment &&
    (task.estado === "en_progreso" || task.estado === "en_revision")

  const handleUploadEvidence = (file: File) => {
    if (!usuarioActual || !myAssignment) return
    setEvidenceUploading(true)
    createEvidencia.mutate(
      { idTareaAsignada: myAssignment.idTareaAsignada, idUsuario: usuarioActual.idUsuario, file },
      {
        onSuccess: () => toast.success("Evidencia subida exitosamente."),
        onError: () => toast.error("Error al subir evidencia."),
        onSettled: () => setEvidenceUploading(false),
      }
    )
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Cargando tus tareas...</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <ListTodo className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Mis Asignaciones</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Mis Tareas</h1>
            <p className="text-muted-foreground text-xs mt-1">
              {misTareas.length} tarea{misTareas.length !== 1 ? "s" : ""} asignada{misTareas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {STATUS_TABS.map(tab => {
          const count = tab.key === "todas"
            ? misTareas.length
            : misTareas.filter(t => t.estado === tab.key).length
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                active
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card/40 border-white/10 text-muted-foreground hover:border-white/20"
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${active ? "bg-primary/20" : "bg-white/5"}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Task list */}
      {filteredTareas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground bg-card/20 rounded-3xl border border-white/5">
          <Inbox className="w-10 h-10 opacity-20" />
          <p className="text-sm">No tienes tareas en este estado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredTareas.map((t, idx) => {
              const cfg = statusConfig[t.estado as keyof typeof statusConfig] ?? statusConfig.pendiente
              const prio = prioridadConfig[t.prioridad] ?? prioridadConfig.media
              const action = getNextAction(t.estado)
              return (
                <AnimatedCard key={t.idTarea} index={idx} className="p-4 group cursor-pointer" onClick={() => setSelectedTaskId(t.idTarea)}>
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-xl ${cfg.color} border flex items-center justify-center shrink-0 mt-0.5`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-[14px] font-bold group-hover:text-[#4682b4] transition-colors uppercase italic leading-snug">{t.titulo}</h4>
                        <Badge variant="outline" className={`${prio.color} border-0 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-lg shrink-0`}>
                          {prio.label}
                        </Badge>
                      </div>
                      {t.eventoNombre && (
                        <p className="text-[10px] font-bold text-[#4682b4]/60 mb-1 truncate uppercase tracking-wider">↳ {t.eventoNombre}</p>
                      )}
                      {t.descripcion && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">{t.descripcion}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${cfg.color} border text-[9px] uppercase font-bold tracking-wider`}>
                            {cfg.label}
                          </Badge>
                          {t.fechaLimite && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/60 uppercase">
                              <Calendar className="w-2.5 h-2.5" />{t.fechaLimite}
                            </span>
                          )}
                        </div>
                        {action && (
                          <button
                            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
                            onClick={e => { e.stopPropagation(); updateEstado.mutate({ id: t.idTarea, estado: action.next }) }}
                          >
                            {action.icon}{action.label}
                          </button>
                        )}
                        {t.estado === "en_revision" && (
                          <span className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            <Clock className="w-3 h-3" />Esperando revisión
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimatedCard>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTaskId} onOpenChange={() => setSelectedTaskId(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            {task && (
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${statusConfig[task.estado as keyof typeof statusConfig]?.color} border flex items-center justify-center shrink-0 mt-0.5`}>
                  {statusConfig[task.estado as keyof typeof statusConfig]?.icon}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold leading-snug">{task.titulo}</DialogTitle>
                  {task.eventoNombre && <p className="text-[11px] text-primary/60 mt-0.5">↳ {task.eventoNombre}</p>}
                </div>
              </div>
            )}
          </DialogHeader>

          {task && (
            <>
              <div className="space-y-4 py-1">
                {task.descripcion && (
                  <div>
                    <FieldLabel>Descripción</FieldLabel>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-background/40 rounded-xl p-3 border border-white/5">{task.descripcion}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Estado</FieldLabel>
                    <Badge variant="outline" className={`${statusConfig[task.estado as keyof typeof statusConfig]?.color} border text-[10px] uppercase font-bold w-full justify-center py-1`}>
                      {statusConfig[task.estado as keyof typeof statusConfig]?.label}
                    </Badge>
                  </div>
                  {task.fechaLimite && (
                    <div>
                      <FieldLabel>Fecha Límite</FieldLabel>
                      <div className="flex items-center gap-1 text-xs text-foreground/70 bg-background/40 rounded-xl px-2 py-1.5 border border-white/5">
                        <Calendar className="w-3 h-3 text-primary/50 shrink-0" />{task.fechaLimite}
                      </div>
                    </div>
                  )}
                </div>

                {/* Evidencias */}
                <div className="pt-2 border-t border-border/40">
                  <FieldLabel>
                    <span className="flex items-center gap-1.5"><Paperclip className="w-3 h-3" />Evidencias</span>
                  </FieldLabel>
                  {evidencias.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {evidencias.map(ev => (
                        <div key={ev.idTareaEvidencia} className="flex items-center justify-between gap-3 bg-background/40 border border-white/10 rounded-xl px-3 py-2">
                          <p className="text-xs font-semibold truncate">{ev.nombreArchivo}</p>
                          <Button
                            variant="ghost" className="h-8 px-3 rounded-lg"
                            onClick={async () => {
                              try { window.open(await getTareaEvidenciaSignedUrl(ev.objectPath), "_blank", "noopener,noreferrer") }
                              catch { toast.error("No se pudo abrir la evidencia.") }
                            }}
                          >Ver</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {canUploadEvidence ? (
                    <div>
                      <input
                        type="file"
                        className="w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-[#4682b4]/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#4682b4] hover:file:bg-[#4682b4]/20"
                        disabled={evidenceUploading}
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) handleUploadEvidence(f)
                          e.currentTarget.value = ""
                        }}
                      />
                      {evidenceUploading && <p className="text-[10px] text-muted-foreground mt-1">Subiendo evidencia...</p>}
                    </div>
                  ) : (
                    evidencias.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/50">Sin evidencias adjuntas.</p>
                    )
                  )}
                </div>
              </div>

              <DialogFooter className="border-t border-border/50 pt-4 gap-2">
                <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedTaskId(null)}>Cerrar</Button>
                {(() => {
                  const action = getNextAction(task.estado)
                  if (!action) return null
                  return (
                    <Button
                      className="rounded-xl"
                      onClick={() => { updateEstado.mutate({ id: task.idTarea, estado: action.next }); setSelectedTaskId(null) }}
                    >
                      {action.label}
                    </Button>
                  )
                })()}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/tareas/ServidorTareasView.tsx
git commit -m "feat: add ServidorTareasView with task list, status actions, and evidence upload"
```

---

## Task 6: Reemplazar `TasksPage.tsx` por coordinador de rol

**Files:**
- Modify: `src/app/components/TasksPage.tsx`

- [ ] **Step 1: Reemplazar el contenido completo de `src/app/components/TasksPage.tsx`**

Reemplazar todo el contenido del archivo con:

```tsx
import { useApp } from "../store/AppContext"
import { LiderTareasView } from "./tareas/LiderTareasView"
import { ServidorTareasView } from "./tareas/ServidorTareasView"

export function TasksPage() {
  const { rolActual } = useApp()
  const isLiderOrAdmin = rolActual === "lider" || rolActual === "admin_iglesia" || rolActual === "super_admin"
  return isLiderOrAdmin ? <LiderTareasView /> : <ServidorTareasView />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/TasksPage.tsx
git commit -m "refactor: TasksPage as thin role coordinator for LiderTareasView and ServidorTareasView"
```

---

## Task 7: Verificar que compila sin errores

- [ ] **Step 1: Ejecutar el build**

```bash
npm run build
```

Resultado esperado: compilación exitosa sin errores TypeScript.

Si hay errores de TypeScript sobre `TareaEnriquecida` (no importado en LiderTareasView o ServidorTareasView), verificar que la importación no sea necesaria — el tipo se infiere de `useTareasEnriquecidas().data`. Si TypeScript se queja de algún `estado` con acceso de clave, ajustar el cast a `task.estado as keyof typeof statusConfig`.

- [ ] **Step 2: Verificar en el servidor de desarrollo**

```bash
npm run dev
```

Probar:
1. Iniciar sesión como **líder** → ir a Tareas → ver kanban con 4 columnas → botón "Nueva Tarea" → formulario abre con selector de ministerio → al seleccionar ministerio aparecen eventos y servidores → crear tarea con evento y servidores asignados → tarea aparece en columna "Pendiente" con el evento visible.
2. Iniciar sesión como **servidor** → ir a Tareas → ver "Mis Tareas" con tabs → ver solo las tareas asignadas → clic en "Iniciar tarea" → estado cambia a "En Progreso" → subir evidencia → clic en "Enviar a revisión" → estado cambia a "En Revisión".
3. Volver a líder → ver tarea en columna "En Revisión" con indicador pulsante → abrir detalle → clic "Aprobar" → tarea pasa a "Completada".

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: complete task-event-roles flow with leader kanban and server task list"
```
