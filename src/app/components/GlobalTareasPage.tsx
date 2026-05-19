import { useState, useMemo } from "react";
import { useTareasGlobal, useCreateTarea, useDeleteTarea, useUpdateTareaEstado } from "@/hooks/useEventos";
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
  ListTodo, Plus, Search, Building2, ChevronDown, Users,
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
  today.setHours(0, 0, 0, 0);
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
  const { usuarioActual } = useApp();
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
    if (!usuarioActual?.idUsuario) {
      toast.error("Tu perfil de usuario no está completamente configurado. Contacta al administrador.");
      return;
    }
    createMutation.mutate(
      {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        fechaLimite: form.fechaLimite || null,
        prioridad: form.prioridad,
        idUsuarioCreador: usuarioActual.idUsuario,
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
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder={form.sedeId ? "Selecciona un ministerio" : "Primero selecciona una sede"} />
                </SelectTrigger>
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    deleteMutation.mutate(tarea.idTarea, {
      onSuccess: () => { toast.success("Tarea eliminada"); setConfirmDelete(false); onClose(); },
      onError: (e: any) => { toast.error(`Error al eliminar: ${e.message}`); setConfirmDelete(false); },
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
            <SelectTrigger className="h-10 bg-background/50 border-white/10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
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
          <Button
            variant="destructive"
            className="w-full rounded-xl"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar Tarea"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar Tarea"
        description={`¿Estás seguro de que deseas eliminar la tarea "${tarea.titulo}"? Esta acción no se puede deshacer.`}
        confirmText={deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
        isDestructive
      />
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
                  <span className="text-[11px] text-muted-foreground hidden sm:block shrink-0 truncate max-w-[140px]">
                    {t.ministerioNombre}{t.sedeNombre ? ` · ${t.sedeNombre}` : ""}
                  </span>
                  <Badge className={`text-[9px] px-1.5 py-0.5 shrink-0 ${estadoColors[t.estado] ?? ""}`}>
                    {estadoLabels[t.estado] ?? t.estado}
                  </Badge>
                  <span className={`text-[11px] shrink-0 ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                    {formatFecha(t.fechaLimite)}
                  </span>
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

  const chipBase = "px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all duration-300 whitespace-nowrap hover:-translate-y-0.5";
  const chipActive = "bg-primary text-white border-primary shadow-md shadow-primary/20";
  const chipInactive = "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 shadow-sm hover:border-primary/40 dark:hover:border-primary/50 hover:text-primary dark:hover:text-white hover:shadow-md dark:hover:shadow-primary/5";

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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors" />
            <Input 
              placeholder="Buscar tarea..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 h-10 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-300 text-sm" 
            />
          </div>
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto shrink-0 h-10 rounded-xl font-medium bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30">
            <Plus className="w-4 h-4 mr-2" /> Nueva Tarea
          </Button>
        </div>
      </motion.div>

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

      <Sheet open={!!selectedTarea} onOpenChange={open => { if (!open) setSelectedTarea(null); }}>
        {selectedTarea && <TareaSheet tarea={selectedTarea} onClose={() => setSelectedTarea(null)} />}
      </Sheet>

      <CreateTareaDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
