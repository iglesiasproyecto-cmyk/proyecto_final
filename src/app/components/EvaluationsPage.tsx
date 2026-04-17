import { useState } from "react";
import { useEvaluacionesEnriquecidas, useDeleteEvaluacion, useCreateEvaluacion, useUpdateEvaluacion, useCursos } from "@/hooks/useCursos";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { 
  ClipboardCheck, Plus, Filter, TrendingUp, Trash2, Pencil, 
  ChevronRight, Calendar, Star, BookOpen, AlertCircle, CheckCircle2 
} from "lucide-react";

const estadoEvalConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-500/10 text-amber-500 border-amber-500/20",   icon: AlertCircle },
  aprobado:    { label: "Aprobado",    color: "bg-primary/10 text-primary border-primary/20",         icon: CheckCircle2 },
  reprobado:   { label: "Reprobado",   color: "bg-rose-500/10 text-rose-500 border-rose-500/20",      icon: XCircle },
  en_revision: { label: "En Revisión", color: "bg-blue-500/10 text-blue-500 border-blue-500/20",      icon: Clock },
};

function XCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
  );
}

function Clock(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>;
}

export function EvaluationsPage() {
  const { usuarioActual, rolActual } = useApp();
  const { data: evaluaciones = [], isLoading } = useEvaluacionesEnriquecidas();
  const { data: cursos = [] } = useCursos();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [cursoFilter, setCursoFilter] = useState("all");
  const [editTarget, setEditTarget] = useState<{ id: number; calificacion: string; estado: string; observaciones: string } | null>(null);
  const [createForm, setCreateForm] = useState({ idModulo: 0, calificacion: "", estado: "pendiente" as string, observaciones: "", fechaEvaluacion: "" });
  
  const resetCreateForm = () => setCreateForm({ idModulo: 0, calificacion: "", estado: "pendiente", observaciones: "", fechaEvaluacion: "" });
  const canManageEvaluaciones =
    rolActual === "super_admin" || rolActual === "admin_iglesia" || rolActual === "lider";

  const deleteEvaluacionMutation = useDeleteEvaluacion();
  const createEvaluacionMutation = useCreateEvaluacion();
  const updateEvaluacionMutation = useUpdateEvaluacion();

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm tracking-widest uppercase text-[10px] font-bold">Obteniendo Resultados...</span>
      </div>
    </div>
  );

  const uniqueCursos = [...new Set(evaluaciones.map((e) => e.cursoNombre).filter(Boolean))] as string[];

  const filtered = evaluaciones.filter((ev) => {
    return cursoFilter === "all" || ev.cursoNombre === cursoFilter;
  });

  const avgCal = evaluaciones.filter((e) => e.calificacion !== null).length > 0
    ? evaluaciones.filter((e) => e.calificacion !== null).reduce((sum, e) => sum + (e.calificacion || 0), 0) / evaluaciones.filter((e) => e.calificacion !== null).length
    : 0;

  const getCalColor = (cal: number | null) => {
    if (cal === null) return "text-muted-foreground";
    return cal >= 80 ? "text-primary" : cal >= 60 ? "text-amber-500" : "text-rose-500";
  };

  const handleDelete = () => {
    if (!canManageEvaluaciones) return;
    if (!deleteTarget) return;
    deleteEvaluacionMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleCreate = () => {
    if (!canManageEvaluaciones) return;
    if (!createForm.idModulo || !usuarioActual) return;
    createEvaluacionMutation.mutate(
      {
        idModulo: createForm.idModulo,
        idUsuario: usuarioActual.idUsuario,
        calificacion: createForm.calificacion ? Number(createForm.calificacion) : null,
        estado: createForm.estado as any,
        observaciones: createForm.observaciones.trim() || null,
        fechaEvaluacion: createForm.fechaEvaluacion || null,
      },
      { onSuccess: () => { setShowCreate(false); resetCreateForm(); } }
    );
  };

  const handleUpdate = () => {
    if (!canManageEvaluaciones) return;
    if (!editTarget) return;
    updateEvaluacionMutation.mutate(
      {
        id: editTarget.id,
        data: {
          calificacion: editTarget.calificacion ? Number(editTarget.calificacion) : null,
          estado: editTarget.estado as any,
          observaciones: editTarget.observaciones.trim() || null,
        },
      },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  const moduleOptions = cursos.flatMap(c =>
    (c.modulos || []).map(m => ({ idModulo: m.idModulo, label: `${c.nombre} — ${m.titulo}` }))
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header Panorámico */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 bg-card/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-48 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shrink-0 shadow-lg shadow-cyan-600/20">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none mb-2">
              Mis Evaluaciones
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium">Historial académico y resultados de formación</p>
          </div>
        </div>
        {canManageEvaluaciones ? (
          <Button onClick={() => setShowCreate(true)} className="h-11 rounded-2xl font-bold uppercase tracking-widest text-[10px] shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Nueva Evaluación
          </Button>
        ) : (
          <Badge variant="outline" className="h-11 px-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70 border-white/10 bg-background/30">
            Modo Lectura
          </Badge>
        )}
      </motion.div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-1 bg-primary/10 backdrop-blur-xl border border-primary/20 rounded-3xl p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Promedio General</span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white"><Star className="w-4 h-4 fill-current" /></div>
          </div>
          <div>
            <p className={`text-4xl font-black ${getCalColor(avgCal)}`}>{avgCal > 0 ? avgCal.toFixed(1) : "—"}</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-2">{evaluaciones.length} evaluaciones en total</p>
          </div>
        </motion.div>

        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {uniqueCursos.slice(0, 3).map((c, i) => {
            const cursoEvals = evaluaciones.filter((e) => e.cursoNombre === c && e.calificacion !== null);
            const avg = cursoEvals.length > 0 ? cursoEvals.reduce((sum, e) => sum + (e.calificacion || 0), 0) / cursoEvals.length : 0;
            return (
              <motion.div
                key={c}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 hover:bg-white/5 transition-colors"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 truncate">{c}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${getCalColor(avg)}`}>{avg > 0 ? avg.toFixed(1) : "—"}</span>
                  <span className="text-[10px] font-bold text-muted-foreground/40">AVG</span>
                </div>
                <div className="mt-3 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r from-primary to-primary/40 rounded-full`} style={{ width: `${avg}%` }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* List Section */}
      <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-[32px] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.25em] text-primary/70">
            <TrendingUp className="w-4 h-4" /> Historial de Resultados
          </h3>
          <div className="flex items-center gap-2 bg-background/40 border border-white/5 rounded-2xl px-3 h-10 shrink-0">
            <Filter className="w-3.5 h-3.5 text-muted-foreground/40" />
            <select 
              value={cursoFilter} 
              onChange={(e) => setCursoFilter(e.target.value)} 
              className="text-[11px] bg-transparent border-0 outline-none text-foreground/70 cursor-pointer font-bold uppercase tracking-tight"
            >
              <option value="all">Todos los cursos</option>
              {uniqueCursos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-20 flex flex-col items-center gap-3 text-muted-foreground/20"
              >
                <ClipboardCheck className="w-16 h-16" />
                <p className="text-sm font-medium">No se encontraron evaluaciones</p>
              </motion.div>
            ) : (
              filtered.sort((a, b) => new Date(b.fechaEvaluacion || b.creadoEn).getTime() - new Date(a.fechaEvaluacion || a.creadoEn).getTime()).map((ev, idx) => {
                const cfg = estadoEvalConfig[ev.estado] || estadoEvalConfig.pendiente;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={ev.idEvaluacion}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group flex flex-col sm:flex-row sm:items-center p-5 hover:bg-white/5 transition-all gap-5"
                  >
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-background/80 to-background/40 border border-white/5 flex flex-col items-center justify-center shrink-0 shadow-sm">
                        <span className="text-[9px] font-black uppercase text-muted-foreground/50 leading-none">
                          {new Date(ev.fechaEvaluacion || ev.creadoEn).toLocaleDateString("es", { month: "short" })}
                        </span>
                        <span className="text-lg font-black text-foreground/80 leading-tight">
                          {new Date(ev.fechaEvaluacion || ev.creadoEn).getDate()}
                        </span>
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter bg-primary/5 text-primary border-primary/20 border-0 px-2 h-4">
                            {ev.cursoNombre}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{ev.moduloNombre}</span>
                        </div>
                        <p className="text-sm font-semibold truncate text-foreground/90 group-hover:text-primary transition-colors">
                          Evaluación de {ev.moduloNombre}
                        </p>
                        {ev.observaciones && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic px-2 border-l border-primary/20">"{ev.observaciones}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pl-[68px] sm:pl-0">
                      <div className="flex flex-col items-end">
                        <span className={`text-2xl font-black ${getCalColor(ev.calificacion)}`}>
                          {ev.calificacion !== null ? ev.calificacion.toFixed(1) : "—"}
                        </span>
                        <Badge variant="outline" className={`text-[9px] uppercase font-black tracking-widest border-0 flex items-center gap-1 ${cfg.color}`}>
                          <Icon className="w-2.5 h-2.5" /> {cfg.label}
                        </Badge>
                      </div>

                      {canManageEvaluaciones && (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setEditTarget({ id: ev.idEvaluacion, calificacion: ev.calificacion?.toString() ?? "", estado: ev.estado, observaciones: ev.observaciones ?? "" })} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(ev.idEvaluacion)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/10 text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:translate-x-1 group-hover:text-primary transition-all hidden sm:block" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={canManageEvaluaciones && !!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight">¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta acción no se puede deshacer. Se eliminará permanentemente esta evaluación del historial académico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteEvaluacionMutation.isPending} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white">
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <Dialog open={canManageEvaluaciones && showCreate} onOpenChange={o => { if (!o) { setShowCreate(false); resetCreateForm(); } }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Registrar Evaluación</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <FieldLabel>Módulo Académico *</FieldLabel>
              <select className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20" value={createForm.idModulo} onChange={e => setCreateForm(p => ({ ...p, idModulo: Number(e.target.value) }))}>
                <option value={0}>Seleccionar módulo...</option>
                {moduleOptions.map(mo => <option key={mo.idModulo} value={mo.idModulo}>{mo.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel>Calificación (0-100)</FieldLabel>
                <Input type="number" min="0" max="100" step="0.5" value={createForm.calificacion} onChange={e => setCreateForm(p => ({ ...p, calificacion: e.target.value }))} placeholder="Ej. 95.0" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <FieldLabel>Estado</FieldLabel>
                <select className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20" value={createForm.estado} onChange={e => setCreateForm(p => ({ ...p, estado: e.target.value }))}>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="reprobado">Reprobado</option>
                  <option value="en_revision">En Revisión</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>Fecha de Evaluación</FieldLabel>
              <Input type="date" value={createForm.fechaEvaluacion} onChange={e => setCreateForm(p => ({ ...p, fechaEvaluacion: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div className="space-y-2">
              <FieldLabel>Observaciones</FieldLabel>
              <textarea value={createForm.observaciones} onChange={e => setCreateForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Retroalimentación o notas adicionales..." className="w-full h-24 rounded-xl border border-white/10 bg-background/50 p-4 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</Button>
            <Button className="rounded-xl px-8" onClick={handleCreate} disabled={createEvaluacionMutation.isPending || !createForm.idModulo}>
              {createEvaluacionMutation.isPending ? "Guardando..." : "Guardar Evaluación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={canManageEvaluaciones && !!editTarget} onOpenChange={o => { if (!o) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Editar Evaluación</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Calificación</FieldLabel>
                  <Input type="number" min="0" max="100" step="0.5" value={editTarget.calificacion} onChange={e => setEditTarget(p => p ? { ...p, calificacion: e.target.value } : p)} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Estado</FieldLabel>
                  <select className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20" value={editTarget.estado} onChange={e => setEditTarget(p => p ? { ...p, estado: e.target.value } : p)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="reprobado">Reprobado</option>
                    <option value="en_revision">En Revisión</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel>Observaciones</FieldLabel>
                <textarea value={editTarget.observaciones} onChange={e => setEditTarget(p => p ? { ...p, observaciones: e.target.value } : p)} className="w-full h-28 rounded-xl border border-white/10 bg-background/50 p-4 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button className="rounded-xl px-8" onClick={handleUpdate} disabled={updateEvaluacionMutation.isPending}>
              {updateEvaluacionMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
