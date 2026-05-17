# Global Eventos & Tareas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/app/global/eventos` and `/app/global/tareas` pages so super_admin can view and manage all events and tasks across every iglesia, grouped by iglesia.

**Architecture:** Extend `EventoEnriquecido` and `TareaEnriquecida` with iglesia fields; add `useEventosGlobal()` / `useTareasGlobal()` hooks with isolated query keys; create two new global page components that group data by iglesia with collapsible sections, inline Sheet detail, and multi-step create dialogs. Tenant routes are not touched.

**Tech Stack:** React 18, TanStack Query v5, Supabase REST, shadcn/ui (Sheet, Dialog, Select, Badge, Card, Input, Button, Skeleton), Framer Motion, Lucide icons, sonner toasts.

---

### Task 1: Extend service types and queries — `src/services/eventos.service.ts`

**Files:**
- Modify: `src/services/eventos.service.ts` (lines 176-254)

- [ ] **Step 1: Extend `EventoEnriquecido` interface — add `iglesiaNombre?`**

In `src/services/eventos.service.ts`, replace lines 176-179:
```typescript
export interface EventoEnriquecido extends Evento {
  tipoEventoTexto: string | null
  cantidadTareas: number
  iglesiaNombre?: string   // populated when called without idIglesia
}
```

- [ ] **Step 2: Extend `TareaEnriquecida` interface — add `iglesiaId?`, `iglesiaNombre?`, `sedeNombre?`**

In `src/services/eventos.service.ts`, replace lines 181-186:
```typescript
export interface TareaEnriquecida extends Tarea {
  eventoNombre: string
  ministerioNombre: string
  asignadosCount: number
  asignados: (TareaAsignada & { nombreCompleto: string })[]
  iglesiaId?: number       // populated when called without idIglesia
  iglesiaNombre?: string   // populated when called without idIglesia
  sedeNombre?: string      // ministerio's sede name
}
```

- [ ] **Step 3: Update `getEventosEnriquecidos` SELECT to join iglesia**

In `src/services/eventos.service.ts`, replace line 193:
```typescript
    .select('*, tarea(count), iglesia(nombre)')
```

Then in the `.map()` on line 201-205, add `iglesiaNombre` to the returned object:
```typescript
  return (data as any[]).map(r => ({
    ...mapEvento(r),
    tipoEventoTexto: r.tipo_evento_texto ?? null,
    cantidadTareas: Array.isArray(r.tarea) ? r.tarea[0]?.count ?? 0 : 0,
    iglesiaNombre: r.iglesia?.nombre ?? undefined,
  }))
```

- [ ] **Step 4: Update `getTareasEnriquecidas` SELECT to join sede name and iglesia**

In `src/services/eventos.service.ts`, replace the `ministerio!inner(...)` part inside the select template literal (lines 220-224):
```typescript
  let q = supabase
    .from('tarea')
    .select(`
      *,
      ministerio!inner(nombre, sede!inner(id_iglesia, nombre, iglesia(id_iglesia, nombre))),
      evento(nombre),
      ${asignadaSelect}
    `)
    .order('creado_en', { ascending: false })
```

- [ ] **Step 5: Map the new fields in `getTareasEnriquecidas`**

In `src/services/eventos.service.ts`, inside the `.map()` return object (after `asignados,` around line 253), add:
```typescript
    return {
      ...mapTarea(r),
      eventoNombre: r.evento?.nombre ?? '',
      ministerioNombre: r.ministerio?.nombre ?? '',
      asignadosCount: asignados.length,
      asignados,
      iglesiaId: r.ministerio?.sede?.iglesia?.id_iglesia ?? undefined,
      iglesiaNombre: r.ministerio?.sede?.iglesia?.nombre ?? undefined,
      sedeNombre: r.ministerio?.sede?.nombre ?? undefined,
    }
```

- [ ] **Step 6: Verify build passes**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` with no TypeScript errors referencing `eventos.service.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/services/eventos.service.ts
git commit -m "feat(service): extend EventoEnriquecido and TareaEnriquecida with iglesia context for global views"
```

---

### Task 2: Add global query hooks — `src/hooks/useEventos.ts`

**Files:**
- Modify: `src/hooks/useEventos.ts` (after line 93)

- [ ] **Step 1: Add the two global hooks**

In `src/hooks/useEventos.ts`, after the closing brace of `useTareasEnriquecidas` (after line 93), insert:

```typescript
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

Both `getEventosEnriquecidos` and `getTareasEnriquecidas` are already imported at the top of the file — no new imports needed.

- [ ] **Step 2: Verify build passes**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEventos.ts
git commit -m "feat(hooks): add useEventosGlobal and useTareasGlobal for super_admin global views"
```

---

### Task 3: Create `GlobalEventosPage.tsx`

**Files:**
- Create: `src/app/components/GlobalEventosPage.tsx`

The page groups events by iglesia in collapsible sections. Cards show nombre, scope badge (Global/Ministerial), estado badge, fecha inicio, task count, and sede. Clicking a card opens a right Sheet with full detail + edit. A "+ Nuevo Evento" button opens a 2-step create dialog (step 1 = iglesia, step 2 = event fields).

- [ ] **Step 1: Create `src/app/components/GlobalEventosPage.tsx`**

```typescript
import { useState, useMemo } from "react";
import { useEventosGlobal, useCreateEvento, useUpdateEvento, useDeleteEvento } from "@/hooks/useEventos";
import { useIglesias, useSedes } from "@/hooks/useIglesias";
import { useMinisteriosPorSede } from "@/hooks/useMinisterios";
import type { EventoEnriquecido } from "@/services/eventos.service";
import { useApp } from "../store/AppContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays, Plus, Search, Building2, ChevronDown,
  Trash2, Pencil, ListChecks,
} from "lucide-react";
import { toast } from "sonner";

type EstadoFilter = "all" | "programado" | "en_curso" | "finalizado" | "cancelado";
type ScopeFilter = "all" | "global" | "ministerial";

const estadoColors: Record<string, string> = {
  programado: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  en_curso: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  finalizado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const estadoLabels: Record<string, string> = {
  programado: "Programado",
  en_curso: "En Curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function CreateEventoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    iglesiaId: "", nombre: "", descripcion: "", fechaInicio: "",
    fechaFin: "", tipoEventoTexto: "", sedeId: "", ministerioId: "",
  });
  const { data: iglesias = [] } = useIglesias();
  const { data: sedes = [] } = useSedes(form.iglesiaId ? Number(form.iglesiaId) : undefined);
  const { data: ministerios = [] } = useMinisteriosPorSede(form.sedeId ? Number(form.sedeId) : undefined);
  const createMutation = useCreateEvento();

  const reset = () => {
    setStep(1);
    setForm({ iglesiaId: "", nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", tipoEventoTexto: "", sedeId: "", ministerioId: "" });
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.fechaInicio || !form.fechaFin) {
      toast.error("Nombre, fecha inicio y fecha fin son requeridos");
      return;
    }
    createMutation.mutate(
      {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        tipoEventoTexto: form.tipoEventoTexto.trim() || null,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        idIglesia: Number(form.iglesiaId),
        idSede: form.sedeId ? Number(form.sedeId) : null,
        idMinisterio: form.ministerioId ? Number(form.ministerioId) : null,
      },
      {
        onSuccess: () => { toast.success("Evento creado exitosamente"); handleClose(); },
        onError: (e: any) => toast.error(`Error al crear: ${e.message}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            {step === 1 ? "Nuevo Evento · Seleccionar Iglesia" : "Nuevo Evento · Detalles"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Iglesia</label>
              <Select value={form.iglesiaId} onValueChange={v => setForm(p => ({ ...p, iglesiaId: v, sedeId: "", ministerioId: "" }))}>
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona una iglesia" />
                </SelectTrigger>
                <SelectContent>
                  {iglesias.map(ig => <SelectItem key={ig.idIglesia} value={String(ig.idIglesia)}>{ig.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="border-t border-border/50 pt-4">
              <Button variant="ghost" className="rounded-xl" onClick={handleClose}>Cancelar</Button>
              <Button className="rounded-xl" disabled={!form.iglesiaId} onClick={() => setStep(2)}>Siguiente</Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Nombre del Evento *</label>
              <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Conferencia Anual" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Descripción</label>
              <Input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del evento" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Fecha Inicio *</label>
                <Input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Fecha Fin *</label>
                <Input type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Tipo de Evento</label>
              <Input value={form.tipoEventoTexto} onChange={e => setForm(p => ({ ...p, tipoEventoTexto: e.target.value }))} placeholder="Ej. Retiro, Vigilia, Conferencia" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Sede (opcional)</label>
              <Select value={form.sedeId} onValueChange={v => setForm(p => ({ ...p, sedeId: v, ministerioId: "" }))}>
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder="Sin sede (evento global)" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map(s => <SelectItem key={s.idSede} value={String(s.idSede)}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.sedeId && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Ministerio (opcional)</label>
                <Select value={form.ministerioId} onValueChange={v => setForm(p => ({ ...p, ministerioId: v }))}>
                  <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                    <SelectValue placeholder="Sin ministerio" />
                  </SelectTrigger>
                  <SelectContent>
                    {ministerios.map(m => <SelectItem key={m.idMinisterio} value={String(m.idMinisterio)}>{m.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter className="border-t border-border/50 pt-4">
              <Button variant="ghost" className="rounded-xl" onClick={() => setStep(1)}>Atrás</Button>
              <Button className="rounded-xl" onClick={handleSubmit} disabled={!form.nombre.trim() || !form.fechaInicio || !form.fechaFin || createMutation.isPending}>
                {createMutation.isPending ? "Creando..." : "Crear Evento"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditEventoDialog({ evento, onClose }: { evento: EventoEnriquecido; onClose: () => void }) {
  const [form, setForm] = useState({
    nombre: evento.nombre,
    descripcion: evento.descripcion ?? "",
    fechaInicio: evento.fechaInicio ?? "",
    fechaFin: evento.fechaFin ?? "",
    tipoEventoTexto: evento.tipoEventoTexto ?? "",
    estado: evento.estado,
  });
  const updateMutation = useUpdateEvento();

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.fechaInicio || !form.fechaFin) {
      toast.error("Nombre, fecha inicio y fecha fin son requeridos");
      return;
    }
    updateMutation.mutate(
      {
        id: evento.idEvento,
        data: {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          tipoEventoTexto: form.tipoEventoTexto.trim() || null,
          estado: form.estado,
        },
      },
      {
        onSuccess: () => { toast.success("Evento actualizado"); onClose(); },
        onError: (e: any) => toast.error(`Error: ${e.message}`),
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Editar Evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Nombre *</label>
            <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Descripción</label>
            <Input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Fecha Inicio *</label>
              <Input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Fecha Fin *</label>
              <Input type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Tipo de Evento</label>
            <Input value={form.tipoEventoTexto} onChange={e => setForm(p => ({ ...p, tipoEventoTexto: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Estado</label>
            <Select value={form.estado} onValueChange={v => setForm(p => ({ ...p, estado: v as any }))}>
              <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="programado">Programado</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="ghost" className="rounded-xl" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-xl" onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventoSheet({
  evento,
  onClose,
}: {
  evento: EventoEnriquecido;
  onClose: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const isMinisterial = !!evento.idMinisterio;
  const scope = isMinisterial ? "Ministerial" : "Global";

  return (
    <>
      <SheetContent className="w-[420px] sm:max-w-[420px] bg-card/95 backdrop-blur-2xl border-border/50 overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-xl font-bold tracking-tight">{evento.nombre}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-1">{evento.iglesiaNombre}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge className={`text-[10px] ${estadoColors[evento.estado] ?? ""}`}>{estadoLabels[evento.estado] ?? evento.estado}</Badge>
              <Badge variant="outline" className="text-[10px]">{scope}</Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {evento.descripcion && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Descripción</p>
              <p className="text-sm text-foreground/80">{evento.descripcion}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Fecha Inicio</p>
              <p className="text-sm">{evento.fechaInicio ? new Date(evento.fechaInicio).toLocaleDateString("es-CO") : "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Fecha Fin</p>
              <p className="text-sm">{evento.fechaFin ? new Date(evento.fechaFin).toLocaleDateString("es-CO") : "—"}</p>
            </div>
          </div>
          {evento.tipoEventoTexto && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Tipo</p>
              <p className="text-sm">{evento.tipoEventoTexto}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Tareas Asociadas</p>
            <p className="text-sm font-medium">{evento.cantidadTareas}</p>
          </div>
          <div className="pt-4 border-t border-border/50">
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowEdit(true)}>
              <Pencil className="w-4 h-4 mr-2" /> Editar Evento
            </Button>
          </div>
        </div>
      </SheetContent>
      {showEdit && <EditEventoDialog evento={evento} onClose={() => setShowEdit(false)} />}
    </>
  );
}

function IglesiaSection({ iglesiaNombre, eventos, onSelect, onDelete }: {
  iglesiaNombre: string;
  eventos: EventoEnriquecido[];
  onSelect: (e: EventoEnriquecido) => void;
  onDelete: (e: EventoEnriquecido) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-3">
      <button
        className="flex items-center gap-2 w-full text-left group"
        onClick={() => setCollapsed(c => !c)}
      >
        <Building2 className="w-4 h-4 text-primary/70 shrink-0" />
        <span className="font-semibold text-sm text-foreground/90">{iglesiaNombre}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{eventos.length}</Badge>
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${collapsed ? "-rotate-90" : ""}`} />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pl-6"
          >
            {eventos.map((ev, i) => {
              const isMinisterial = !!ev.idMinisterio;
              return (
                <motion.div
                  key={ev.idEvento}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    className="group relative p-4 bg-card/40 backdrop-blur-xl border border-border/50 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl flex flex-col gap-2 overflow-hidden"
                    onClick={() => onSelect(ev)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-md shrink-0">
                        <CalendarDays className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`text-[9px] px-1.5 py-0.5 ${estadoColors[ev.estado] ?? ""}`}>
                          {estadoLabels[ev.estado] ?? ev.estado}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0.5">
                          {isMinisterial ? "Ministerial" : "Global"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-[13px] leading-tight group-hover:text-primary transition-colors">{ev.nombre}</h3>
                      {ev.tipoEventoTexto && <p className="text-[11px] text-muted-foreground">{ev.tipoEventoTexto}</p>}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-auto pt-2 border-t border-border/50">
                      <span>{ev.fechaInicio ? new Date(ev.fechaInicio).toLocaleDateString("es-CO", { month: "short", day: "numeric" }) : "—"}</span>
                      <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" />{ev.cantidadTareas}</span>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-colors"
                        onClick={e => { e.stopPropagation(); onDelete(ev); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function GlobalEventosPage() {
  const { data: eventos = [], isLoading } = useEventosGlobal();
  const deleteMutation = useDeleteEvento();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<EventoEnriquecido | null>(null);

  const filtered = useMemo(() => {
    return eventos.filter(ev => {
      if (search && !ev.nombre.toLowerCase().includes(search.toLowerCase())) return false;
      if (estadoFilter !== "all" && ev.estado !== estadoFilter) return false;
      if (scopeFilter === "global" && ev.idMinisterio !== null && ev.idMinisterio !== undefined) return false;
      if (scopeFilter === "ministerial" && !ev.idMinisterio) return false;
      return true;
    });
  }, [eventos, search, estadoFilter, scopeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, EventoEnriquecido[]>();
    filtered.forEach(ev => {
      const key = ev.iglesiaNombre ?? "Sin iglesia";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleDelete = (ev: EventoEnriquecido) => {
    if (!confirm(`¿Eliminar evento "${ev.nombre}"? Esta acción no se puede deshacer.`)) return;
    deleteMutation.mutate(ev.idEvento, {
      onSuccess: () => toast.success(`Evento "${ev.nombre}" eliminado`),
      onError: (e: any) => toast.error(`Error al eliminar: ${e.message}`),
    });
  };

  const chipBase = "px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors";
  const chipActive = "bg-primary text-primary-foreground border-primary";
  const chipInactive = "bg-background/50 text-muted-foreground border-border/40 hover:border-primary/40";

  if (isLoading) return (
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      <Skeleton className="h-16 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <CalendarDays className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-1">Gestión Global</p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Eventos</h1>
            <p className="text-foreground font-normal text-xs sm:text-sm mt-1">Todos los eventos de todas las iglesias</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input placeholder="Buscar evento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm text-sm" />
          </div>
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto shrink-0 h-10 rounded-xl font-medium bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Evento
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-5">
        {(["all", "programado", "en_curso", "finalizado", "cancelado"] as EstadoFilter[]).map(f => (
          <span key={f} className={`${chipBase} ${estadoFilter === f ? chipActive : chipInactive}`} onClick={() => setEstadoFilter(f)}>
            {f === "all" ? "Todos" : estadoLabels[f]}
          </span>
        ))}
        <span className="mx-2 border-l border-border/40" />
        {(["all", "global", "ministerial"] as ScopeFilter[]).map(f => (
          <span key={f} className={`${chipBase} ${scopeFilter === f ? chipActive : chipInactive}`} onClick={() => setScopeFilter(f)}>
            {f === "all" ? "Todos" : f === "global" ? "Global" : "Ministerial"}
          </span>
        ))}
      </div>

      {/* Grouped content */}
      <div className="space-y-8 px-4">
        {grouped.map(([iglesia, evs]) => (
          <IglesiaSection
            key={iglesia}
            iglesiaNombre={iglesia}
            eventos={evs}
            onSelect={setSelectedEvento}
            onDelete={handleDelete}
          />
        ))}
        {grouped.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4"><Search className="w-8 h-8 opacity-40" /></div>
            <p className="font-semibold text-sm">No se encontraron eventos</p>
            <p className="text-xs">Prueba con otros filtros o crea uno nuevo.</p>
          </div>
        )}
      </div>

      {/* Sheet detail */}
      <Sheet open={!!selectedEvento} onOpenChange={open => { if (!open) setSelectedEvento(null); }}>
        {selectedEvento && <EventoSheet evento={selectedEvento} onClose={() => setSelectedEvento(null)} />}
      </Sheet>

      <CreateEventoDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/GlobalEventosPage.tsx
git commit -m "feat(ui): add GlobalEventosPage with iglesia-grouped cards, filters, Sheet detail, and create dialog"
```

---

### Task 4: Create `GlobalTareasPage.tsx`

**Files:**
- Create: `src/app/components/GlobalTareasPage.tsx`

The page groups tasks by iglesia in collapsible sections. Each row shows a priority dot, título, ministerio·sede context, estado badge, fecha límite (red if overdue), and assignee count. Clicking a row opens a right Sheet with full detail and a status dropdown. A "+ Nueva Tarea" button opens a 3-step create dialog (step 1 = iglesia, step 2 = sede + ministerio, step 3 = task fields).

- [ ] **Step 1: Create `src/app/components/GlobalTareasPage.tsx`**

```typescript
import { useState, useMemo } from "react";
import { useTareasGlobal, useCreateTarea, useUpdateTarea, useDeleteTarea, useUpdateTareaEstado } from "@/hooks/useEventos";
import { useIglesias, useSedes } from "@/hooks/useIglesias";
import { useMinisteriosPorSede } from "@/hooks/useMinisterios";
import type { TareaEnriquecida } from "@/services/eventos.service";
import type { Tarea } from "@/types/app.types";
import { useApp } from "../store/AppContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import {
  ListTodo, Plus, Search, Building2, ChevronDown,
  Trash2, Users,
} from "lucide-react";
import { toast } from "sonner";

type EstadoFilter = "all" | "pendiente" | "en_progreso" | "en_revision" | "completada";
type PrioridadFilter = "all" | "alta" | "urgente";

const estadoColors: Record<string, string> = {
  pendiente: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  en_progreso: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  en_revision: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  en_revision: "En Revisión",
  completada: "Completada",
};

const prioridadDot: Record<string, string> = {
  baja: "bg-slate-400",
  media: "bg-blue-400",
  alta: "bg-orange-400",
  urgente: "bg-red-500",
};

const prioridadLabels: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

function isOverdue(fechaLimite: string | null | undefined): boolean {
  if (!fechaLimite) return false;
  return new Date(fechaLimite) < new Date();
}

function formatFecha(fechaLimite: string | null | undefined): string {
  if (!fechaLimite) return "Sin fecha";
  const d = new Date(fechaLimite);
  const today = new Date();
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  return d.toLocaleDateString("es-CO", { month: "short", day: "numeric" });
}

function CreateTareaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    iglesiaId: "", sedeId: "", ministerioId: "",
    titulo: "", descripcion: "", prioridad: "media" as Tarea["prioridad"], fechaLimite: "",
  });
  const { usuario } = useApp();
  const { data: iglesias = [] } = useIglesias();
  const { data: sedes = [] } = useSedes(form.iglesiaId ? Number(form.iglesiaId) : undefined);
  const { data: ministerios = [] } = useMinisteriosPorSede(form.sedeId ? Number(form.sedeId) : undefined);
  const createMutation = useCreateTarea();

  const reset = () => {
    setStep(1);
    setForm({ iglesiaId: "", sedeId: "", ministerioId: "", titulo: "", descripcion: "", prioridad: "media", fechaLimite: "" });
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!form.titulo.trim() || !form.ministerioId) {
      toast.error("Título y ministerio son requeridos");
      return;
    }
    createMutation.mutate(
      {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        fechaLimite: form.fechaLimite || null,
        prioridad: form.prioridad,
        idUsuarioCreador: usuario?.idUsuario ?? 0,
        idMinisterio: Number(form.ministerioId),
      },
      {
        onSuccess: () => { toast.success("Tarea creada exitosamente"); handleClose(); },
        onError: (e: any) => toast.error(`Error al crear: ${e.message}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            {step === 1 ? "Nueva Tarea · Iglesia" : step === 2 ? "Nueva Tarea · Ministerio" : "Nueva Tarea · Detalles"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Iglesia</label>
              <Select value={form.iglesiaId} onValueChange={v => setForm(p => ({ ...p, iglesiaId: v, sedeId: "", ministerioId: "" }))}>
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"><SelectValue placeholder="Selecciona una iglesia" /></SelectTrigger>
                <SelectContent>{iglesias.map(ig => <SelectItem key={ig.idIglesia} value={String(ig.idIglesia)}>{ig.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter className="border-t border-border/50 pt-4">
              <Button variant="ghost" className="rounded-xl" onClick={handleClose}>Cancelar</Button>
              <Button className="rounded-xl" disabled={!form.iglesiaId} onClick={() => setStep(2)}>Siguiente</Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Sede</label>
              <Select value={form.sedeId} onValueChange={v => setForm(p => ({ ...p, sedeId: v, ministerioId: "" }))}>
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"><SelectValue placeholder="Selecciona una sede" /></SelectTrigger>
                <SelectContent>{sedes.map(s => <SelectItem key={s.idSede} value={String(s.idSede)}>{s.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Ministerio</label>
              <Select value={form.ministerioId} onValueChange={v => setForm(p => ({ ...p, ministerioId: v }))} disabled={!form.sedeId}>
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"><SelectValue placeholder={form.sedeId ? "Selecciona un ministerio" : "Primero selecciona una sede"} /></SelectTrigger>
                <SelectContent>{ministerios.map(m => <SelectItem key={m.idMinisterio} value={String(m.idMinisterio)}>{m.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter className="border-t border-border/50 pt-4">
              <Button variant="ghost" className="rounded-xl" onClick={() => setStep(1)}>Atrás</Button>
              <Button className="rounded-xl" disabled={!form.sedeId || !form.ministerioId} onClick={() => setStep(3)}>Siguiente</Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Título *</label>
              <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej. Diseñar volante del evento" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Descripción</label>
              <Input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción opcional" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Prioridad</label>
              <Select value={form.prioridad} onValueChange={v => setForm(p => ({ ...p, prioridad: v as Tarea["prioridad"] }))}>
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Fecha Límite</label>
              <Input type="date" value={form.fechaLimite} onChange={e => setForm(p => ({ ...p, fechaLimite: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <DialogFooter className="border-t border-border/50 pt-4">
              <Button variant="ghost" className="rounded-xl" onClick={() => setStep(2)}>Atrás</Button>
              <Button className="rounded-xl" onClick={handleSubmit} disabled={!form.titulo.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Creando..." : "Crear Tarea"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TareaSheet({ tarea, onClose }: { tarea: TareaEnriquecida; onClose: () => void }) {
  const updateEstadoMutation = useUpdateTareaEstado();
  const deleteMutation = useDeleteTarea();
  const overdue = isOverdue(tarea.fechaLimite) && tarea.estado !== "completada";

  const handleDelete = () => {
    if (!confirm(`¿Eliminar tarea "${tarea.titulo}"?`)) return;
    deleteMutation.mutate(tarea.idTarea, {
      onSuccess: () => { toast.success("Tarea eliminada"); onClose(); },
      onError: (e: any) => toast.error(`Error: ${e.message}`),
    });
  };

  return (
    <SheetContent className="w-[420px] sm:max-w-[420px] bg-card/95 backdrop-blur-2xl border-border/50 overflow-y-auto">
      <SheetHeader className="mb-6">
        <div className="flex items-start gap-3">
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${prioridadDot[tarea.prioridad] ?? "bg-slate-400"}`} />
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-xl font-bold tracking-tight leading-tight">{tarea.titulo}</SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">{tarea.iglesiaNombre} · {tarea.ministerioNombre}</p>
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-5">
        {tarea.descripcion && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Descripción</p>
            <p className="text-sm text-foreground/80">{tarea.descripcion}</p>
          </div>
        )}

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Estado</p>
          <Select
            value={tarea.estado}
            onValueChange={v => updateEstadoMutation.mutate(
              { id: tarea.idTarea, estado: v as Tarea["estado"] },
              {
                onSuccess: () => toast.success("Estado actualizado"),
                onError: (e: any) => toast.error(`Error: ${e.message}`),
              }
            )}
          >
            <SelectTrigger className="h-10 bg-background/50 border-white/10 rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_progreso">En Progreso</SelectItem>
              <SelectItem value="en_revision">En Revisión</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Prioridad</p>
            <p className="text-sm font-medium">{prioridadLabels[tarea.prioridad] ?? tarea.prioridad}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Fecha Límite</p>
            <p className={`text-sm font-medium ${overdue ? "text-red-500" : ""}`}>
              {tarea.fechaLimite ? new Date(tarea.fechaLimite).toLocaleDateString("es-CO") : "Sin fecha"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ministerio · Sede</p>
          <p className="text-sm">{tarea.ministerioNombre}{tarea.sedeNombre ? ` · ${tarea.sedeNombre}` : ""}</p>
        </div>

        {tarea.asignados.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Asignados ({tarea.asignadosCount})</p>
            <div className="space-y-1.5">
              {tarea.asignados.map(a => (
                <div key={a.idTareaAsignada} className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {a.nombreCompleto.charAt(0).toUpperCase()}
                  </div>
                  <span>{a.nombreCompleto}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border/50">
          <Button variant="destructive" className="w-full rounded-xl" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar Tarea"}
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}

function IglesiaSection({ iglesiaNombre, tareas, onSelect }: {
  iglesiaNombre: string;
  tareas: TareaEnriquecida[];
  onSelect: (t: TareaEnriquecida) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-2">
      <button
        className="flex items-center gap-2 w-full text-left group"
        onClick={() => setCollapsed(c => !c)}
      >
        <Building2 className="w-4 h-4 text-primary/70 shrink-0" />
        <span className="font-semibold text-sm text-foreground/90">{iglesiaNombre}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tareas.length}</Badge>
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${collapsed ? "-rotate-90" : ""}`} />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-6 space-y-1"
          >
            {tareas.map((t, i) => {
              const overdue = isOverdue(t.fechaLimite) && t.estado !== "completada";
              return (
                <motion.div
                  key={t.idTarea}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/50 cursor-pointer transition-colors border border-transparent hover:border-border/40"
                  onClick={() => onSelect(t)}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${prioridadDot[t.prioridad] ?? "bg-slate-400"}`} />
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{t.titulo}</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:block shrink-0">{t.ministerioNombre}{t.sedeNombre ? ` · ${t.sedeNombre}` : ""}</span>
                  <Badge className={`text-[9px] px-1.5 py-0.5 shrink-0 ${estadoColors[t.estado] ?? ""}`}>{estadoLabels[t.estado] ?? t.estado}</Badge>
                  <span className={`text-[11px] shrink-0 ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>{formatFecha(t.fechaLimite)}</span>
                  {t.asignadosCount > 0 && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                      <Users className="w-3 h-3" />{t.asignadosCount}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function GlobalTareasPage() {
  const { data: tareas = [], isLoading } = useTareasGlobal();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("all");
  const [prioridadFilter, setPrioridadFilter] = useState<PrioridadFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState<TareaEnriquecida | null>(null);

  const filtered = useMemo(() => {
    return tareas.filter(t => {
      if (search && !t.titulo.toLowerCase().includes(search.toLowerCase())) return false;
      if (estadoFilter !== "all" && t.estado !== estadoFilter) return false;
      if (prioridadFilter !== "all" && t.prioridad !== prioridadFilter) return false;
      return true;
    });
  }, [tareas, search, estadoFilter, prioridadFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, TareaEnriquecida[]>();
    filtered.forEach(t => {
      const key = t.iglesiaNombre ?? "Sin iglesia";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const chipBase = "px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors";
  const chipActive = "bg-primary text-primary-foreground border-primary";
  const chipInactive = "bg-background/50 text-muted-foreground border-border/40 hover:border-primary/40";

  if (isLoading) return (
    <div className="space-y-4 max-w-6xl mx-auto px-4">
      <Skeleton className="h-16 w-72" />
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <ListTodo className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-1">Gestión Global</p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Tareas</h1>
            <p className="text-foreground font-normal text-xs sm:text-sm mt-1">Todas las tareas de todas las iglesias</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input placeholder="Buscar tarea..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm text-sm" />
          </div>
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto shrink-0 h-10 rounded-xl font-medium bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> Nueva Tarea
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-5">
        {(["all", "pendiente", "en_progreso", "en_revision", "completada"] as EstadoFilter[]).map(f => (
          <span key={f} className={`${chipBase} ${estadoFilter === f ? chipActive : chipInactive}`} onClick={() => setEstadoFilter(f)}>
            {f === "all" ? "Todos" : estadoLabels[f]}
          </span>
        ))}
        <span className="mx-2 border-l border-border/40" />
        {(["all", "alta", "urgente"] as PrioridadFilter[]).map(f => (
          <span key={f} className={`${chipBase} ${prioridadFilter === f ? chipActive : chipInactive}`} onClick={() => setPrioridadFilter(f)}>
            {f === "all" ? "Todas" : prioridadLabels[f]}
          </span>
        ))}
      </div>

      {/* Grouped list */}
      <div className="space-y-6 px-4">
        {grouped.map(([iglesia, ts]) => (
          <IglesiaSection
            key={iglesia}
            iglesiaNombre={iglesia}
            tareas={ts}
            onSelect={setSelectedTarea}
          />
        ))}
        {grouped.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4"><Search className="w-8 h-8 opacity-40" /></div>
            <p className="font-semibold text-sm">No se encontraron tareas</p>
            <p className="text-xs">Prueba con otros filtros o crea una nueva.</p>
          </div>
        )}
      </div>

      {/* Sheet detail */}
      <Sheet open={!!selectedTarea} onOpenChange={open => { if (!open) setSelectedTarea(null); }}>
        {selectedTarea && <TareaSheet tarea={selectedTarea} onClose={() => setSelectedTarea(null)} />}
      </Sheet>

      <CreateTareaDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/GlobalTareasPage.tsx
git commit -m "feat(ui): add GlobalTareasPage with iglesia-grouped list, filters, Sheet detail, and 3-step create dialog"
```

---

### Task 5: Wire routes and navigation

**Files:**
- Modify: `src/app/routes.ts`
- Modify: `src/app/components/AppLayout.tsx`

- [ ] **Step 1: Add imports and routes in `routes.ts`**

After line 37 (`import { GlobalMinisteriosPage } from "./components/GlobalMinisteriosPage"`), add:
```typescript
import { GlobalEventosPage } from "./components/GlobalEventosPage";
import { GlobalTareasPage } from "./components/GlobalTareasPage";
```

After line 78 (`{ path: "ministerios", Component: GlobalMinisteriosPage, ErrorBoundary: ErrorPage },`), add:
```typescript
              { path: "eventos", Component: GlobalEventosPage, ErrorBoundary: ErrorPage },
              { path: "tareas", Component: GlobalTareasPage, ErrorBoundary: ErrorPage },
```

- [ ] **Step 2: Add nav items in `AppLayout.tsx`**

In `AppLayout.tsx`, inside the `super_admin` case (around line 87, after the `Ministerios` nav item on line 85), add:
```typescript
        { label: "Eventos", path: "/app/global/eventos", icon: <CalendarDays className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Tareas", path: "/app/global/tareas", icon: <ListTodo className="w-5 h-5" />, section: "Gestión Global" },
```

Both `CalendarDays` and `ListTodo` are already imported on line 11 of `AppLayout.tsx`.

Also add page titles to the `pageTitles` map (around line 43):
```typescript
  "/app/global/eventos": "Eventos Globales",
  "/app/global/tareas": "Tareas Globales",
```

- [ ] **Step 3: Verify build passes**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -20
```
Expected: `✓ built in` — no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes.ts src/app/components/AppLayout.tsx
git commit -m "feat(routing): wire /app/global/eventos and /app/global/tareas routes and nav items for super_admin"
```
