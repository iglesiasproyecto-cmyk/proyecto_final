import { useState, useMemo } from "react";
import { useEventosGlobal, useCreateEvento, useUpdateEvento, useDeleteEvento } from "@/hooks/useEventos";
import { useIglesias, useSedes } from "@/hooks/useIglesias";
import { useMinisteriosPorSede } from "@/hooks/useMinisterios";
import type { EventoEnriquecido } from "@/services/eventos.service";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ConfirmDialog } from "./ui/ConfirmDialog";
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

function EventoSheet({ evento, onClose }: { evento: EventoEnriquecido; onClose: () => void }) {
  const [showEdit, setShowEdit] = useState(false);
  const isMinisterial = !!evento.idMinisterio;

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
              <Badge variant="outline" className="text-[10px]">{isMinisterial ? "Ministerial" : "Global"}</Badge>
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
  const [confirmDeleteEvento, setConfirmDeleteEvento] = useState<EventoEnriquecido | null>(null);

  const filtered = useMemo(() => {
    return eventos.filter(ev => {
      if (search && !ev.nombre.toLowerCase().includes(search.toLowerCase())) return false;
      if (estadoFilter !== "all" && ev.estado !== estadoFilter) return false;
      if (scopeFilter === "global" && (ev.idMinisterio !== null && ev.idMinisterio !== undefined)) return false;
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
    setConfirmDeleteEvento(ev);
  };

  const executeDelete = () => {
    if (!confirmDeleteEvento) return;
    deleteMutation.mutate(confirmDeleteEvento.idEvento, {
      onSuccess: () => { toast.success(`Evento "${confirmDeleteEvento.nombre}" eliminado`); setConfirmDeleteEvento(null); },
      onError: (e: any) => { toast.error(`Error al eliminar: ${e.message}`); setConfirmDeleteEvento(null); },
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
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto shrink-0 h-10 rounded-xl font-medium bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Evento
          </Button>
        </div>
      </motion.div>

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

      <Sheet open={!!selectedEvento} onOpenChange={open => { if (!open) setSelectedEvento(null); }}>
        {selectedEvento && <EventoSheet evento={selectedEvento} onClose={() => setSelectedEvento(null)} />}
      </Sheet>

      <CreateEventoDialog open={showCreate} onClose={() => setShowCreate(false)} />

      <ConfirmDialog
        isOpen={!!confirmDeleteEvento}
        onClose={() => setConfirmDeleteEvento(null)}
        onConfirm={executeDelete}
        title="Eliminar Evento"
        description={`¿Estás seguro de que deseas eliminar el evento "${confirmDeleteEvento?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText={deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
        isDestructive
      />
    </div>
  );
}
