import { useState } from "react";
import { useTareasEnriquecidas, useCreateTarea, useUpdateTareaEstado, useDeleteTarea, useCreateTareaAsignada, useDeleteTareaAsignada } from "@/hooks/useEventos";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useApp } from "../store/AppContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { AnimatedCard } from "./ui/AnimatedCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import {
  ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Calendar,
  ChevronRight, Inbox, Trash2, Users, UserPlus, X,
} from "lucide-react";

const statusConfig = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20",   dot: "bg-amber-400",   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  en_progreso: { label: "En Progreso", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",      dot: "bg-[#4682b4]",    icon: <Clock className="w-3.5 h-3.5" /> },
  completada:  { label: "Completada",  color: "bg-primary/10 text-primary border-primary/20",         dot: "bg-primary",     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelada:   { label: "Cancelada",   color: "bg-rose-500/10 text-rose-400 border-rose-500/20",      dot: "bg-rose-400",    icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const prioridadConfig: Record<string, { label: string; color: string; dot: string }> = {
  baja:    { label: "Baja",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20",   dot: "bg-slate-400" },
  media:   { label: "Media",   color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",      dot: "bg-[#4682b4]" },
  alta:    { label: "Alta",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",   dot: "bg-amber-400" },
  urgente: { label: "Urgente", color: "bg-rose-500/10 text-rose-400 border-rose-500/20",      dot: "bg-rose-500" },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>;
}

export function TasksPage() {
  const { usuarioActual } = useApp();
  const { data: tareas = [], isLoading } = useTareasEnriquecidas();
  const createTareaMutation = useCreateTarea();
  const updateEstadoMutation = useUpdateTareaEstado();
  const deleteTareaMutation = useDeleteTarea();
  const createAsignadaMutation = useCreateTareaAsignada();
  const deleteAsignadaMutation = useDeleteTareaAsignada();
  const { data: usuarios = [] } = useUsuarios();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [assignUserId, setAssignUserId] = useState(0);
  const [createForm, setCreateForm] = useState({
    titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" as "baja" | "media" | "alta" | "urgente",
  });

  const resetCreateForm = () => setCreateForm({ titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" });

  const handleDeleteTarea = (id: number, titulo: string) => {
    if (!confirm(`¿Eliminar tarea "${titulo}"?`)) return;
    deleteTareaMutation.mutate(id);
  };

  const handleCreateTarea = () => {
    if (!createForm.titulo.trim() || !usuarioActual) return;
    createTareaMutation.mutate(
      { titulo: createForm.titulo.trim(), descripcion: createForm.descripcion.trim() || null, fechaLimite: createForm.fechaLimite || null, prioridad: createForm.prioridad, idUsuarioCreador: usuarioActual.idUsuario },
      { onSuccess: () => { setShowCreate(false); resetCreateForm(); } }
    );
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Cargando tareas...</span>
      </div>
    </div>
  );

  const task = selectedTask ? tareas.find(t => t.idTarea === selectedTask) : null;
  const nextStatus = (current: string): "en_progreso" | "completada" | null => {
    if (current === "pendiente") return "en_progreso";
    if (current === "en_progreso") return "completada";
    return null;
  };
  const tasksByStatus = (status: string) => tareas.filter(t => t.estado === status);
  const COLS = ["pendiente", "en_progreso", "completada"] as const;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <ListTodo className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Operaciones</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">
              Tareas
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">Gestión de tareas operativas del ministerio</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="h-10 rounded-xl font-medium shrink-0 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg shadow-cyan-600/30 hover:shadow-cyan-500/40 transition-all">
          <Plus className="w-4 h-4 mr-1.5" /> Nueva Tarea
        </Button>
      </motion.div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {COLS.map((s, idx) => {
          const cfg = statusConfig[s];
          const count = tasksByStatus(s).length;
          const gradient = s === "pendiente" ? "from-amber-500 to-orange-600" : s === "en_progreso" ? "from-[#709dbd] to-[#4682b4]" : "from-emerald-500 to-teal-600";
          return (
            <AnimatedCard key={s} index={idx} className="p-4 group">
              <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg text-white`}>
                  {cfg.icon}
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px] py-0 tracking-widest uppercase">KPI</Badge>
              </div>
              <div>
                <p className="text-4xl font-light tracking-tight text-foreground">{count}</p>
                <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{cfg.label}</p>
              </div>
            </AnimatedCard>
          );
        })}
      </div>


      {/* ── Kanban Board ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex lg:grid lg:grid-cols-3 gap-6 overflow-x-auto pb-6 lg:pb-0 snap-x lg:snap-none -mx-4 px-4 lg:mx-0 lg:px-0 hide-scrollbar"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
        {COLS.map((status, colIdx) => {
          const cfg = statusConfig[status];
          const statusTasks = tasksByStatus(status);
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + colIdx * 0.06 }}
            >
              <div className="w-[85vw] sm:w-[350px] lg:w-full shrink-0 snap-center">
                {/* Column header */}
              <div className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl bg-card/60 backdrop-blur-xl border border-white/10 border-b-0`}>
                <div className={`w-2 h-2 rounded-full ${cfg.dot} shadow-[0_0_6px_currentColor]`} />
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/70">{cfg.label}</span>
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} border`}>{statusTasks.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-3 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-b-3xl border border-white/5 border-t-0 p-3 min-h-[400px]">
                <AnimatePresence>
                  {statusTasks.map((t, tIdx) => {
                    const next = nextStatus(t.estado);
                    const prio = prioridadConfig[t.prioridad] ?? prioridadConfig.media;
                    return (
                      <AnimatedCard
                        key={t.idTarea}
                        index={tIdx}
                        className="p-4 group cursor-pointer"
                        onClick={() => setSelectedTask(t.idTarea)}
                      >
                        <div className="relative z-10">
                          {/* Prioridad indicator */}
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="outline" className={`${prio.color} border-0 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-lg`}>
                              {prio.label}
                            </Badge>
                            {t.fechaLimite && (
                              <span className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase bg-white/5 px-2 py-0.5 rounded-lg">
                                <Calendar className="w-2.5 h-2.5" /> {t.fechaLimite}
                              </span>
                            )}
                          </div>

                          <h4 className="text-[14px] font-bold leading-snug tracking-tight group-hover:text-[#4682b4] transition-colors mb-2 uppercase italic">{t.titulo}</h4>
                          
                          {t.eventoNombre && (
                            <p className="text-[10px] font-bold text-[#4682b4]/70 mb-2 truncate uppercase tracking-wider">{t.eventoNombre}</p>
                          )}
                          
                          {t.descripcion && (
                            <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{t.descripcion}</p>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="flex -space-x-2">
                              {t.asignados && t.asignados.slice(0, 3).map(a => (
                                <div key={a.idTareaAsignada} className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] border-2 border-card flex items-center justify-center text-[9px] text-white font-black shadow-sm" title={a.nombreCompleto}>
                                  {(a.nombreCompleto || "?").charAt(0).toUpperCase()}
                                </div>
                              ))}
                              {t.asignados && t.asignados.length > 3 && (
                                <div className="w-6 h-6 rounded-lg bg-white/10 border-2 border-card flex items-center justify-center text-[9px] text-muted-foreground font-black">+{t.asignados.length - 3}</div>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                onClick={e => { e.stopPropagation(); handleDeleteTarea(t.idTarea, t.titulo); }}
                                disabled={deleteTareaMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {next && (
                                <button
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-all"
                                  onClick={e => { e.stopPropagation(); updateEstadoMutation.mutate({ id: t.idTarea, estado: next }); }}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </AnimatedCard>
                    );
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
          );
        })}
      </motion.div>

      {/* ── Task Detail Dialog ── */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          {task && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${statusConfig[task.estado]?.color} border flex items-center justify-center shrink-0 mt-0.5`}>
                    {statusConfig[task.estado]?.icon}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold tracking-tight leading-snug">{task.titulo}</DialogTitle>
                    {task.eventoNombre && <p className="text-[11px] text-primary/60 mt-0.5">{task.eventoNombre}</p>}
                  </div>
                </div>
              </DialogHeader>

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
                    <Badge variant="outline" className={`${statusConfig[task.estado]?.color} border text-[10px] uppercase font-bold tracking-wider w-full justify-center py-1`}>
                      {statusConfig[task.estado]?.label}
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
                        <Calendar className="w-3 h-3 text-primary/50 shrink-0" /> {task.fechaLimite}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assigned users */}
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
                            onClick={() => { if (confirm(`¿Remover a ${a.nombreCompleto}?`)) deleteAsignadaMutation.mutate(a.idTareaAsignada); }}
                            disabled={deleteAsignadaMutation.isPending}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assign user */}
                <div className="pt-2 border-t border-border/40">
                  <FieldLabel><span className="flex items-center gap-1.5"><UserPlus className="w-3 h-3" /> Asignar usuario</span></FieldLabel>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-10 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      value={assignUserId}
                      onChange={e => setAssignUserId(Number(e.target.value))}
                    >
                      <option value={0}>Seleccionar usuario...</option>
                      {usuarios
                        .filter(u => u.activo && !(task?.asignados || []).some(a => a.idUsuario === u.idUsuario))
                        .map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nombres} {u.apellidos}</option>)
                      }
                    </select>
                    <Button
                      className="h-10 rounded-xl px-4"
                      disabled={!assignUserId || createAsignadaMutation.isPending || !task}
                      onClick={() => {
                        if (!task || !assignUserId) return;
                        createAsignadaMutation.mutate({ idTarea: task.idTarea, idUsuario: assignUserId }, { onSuccess: () => setAssignUserId(0) });
                      }}
                    >
                      {createAsignadaMutation.isPending ? "..." : <UserPlus className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-border/50 pt-4 gap-2">
                <button
                  className="mr-auto h-9 px-3 rounded-xl flex items-center gap-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  disabled={deleteTareaMutation.isPending}
                  onClick={() => { handleDeleteTarea(task.idTarea, task.titulo); setSelectedTask(null); }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
                <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedTask(null)}>Cerrar</Button>
                {nextStatus(task.estado) && (
                  <Button
                    className="rounded-xl"
                    onClick={() => { updateEstadoMutation.mutate({ id: task.idTarea, estado: nextStatus(task.estado)! }); setSelectedTask(null); }}
                  >
                    → {statusConfig[nextStatus(task.estado)!].label}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Nueva Tarea
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Completa los datos para crear una nueva tarea.</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <FieldLabel>Título</FieldLabel>
              <Input value={createForm.titulo} onChange={e => setCreateForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej. Preparar la reunión de líderes" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div>
              <FieldLabel>Descripción <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span></FieldLabel>
              <Input value={createForm.descripcion} onChange={e => setCreateForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Detalles de la tarea" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Fecha Límite</FieldLabel>
                <Input type="date" value={createForm.fechaLimite} onChange={e => setCreateForm(p => ({ ...p, fechaLimite: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
              </div>
              <div>
                <FieldLabel>Prioridad</FieldLabel>
                <select
                  value={createForm.prioridad}
                  onChange={e => setCreateForm(p => ({ ...p, prioridad: e.target.value as typeof createForm.prioridad }))}
                  className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            {/* Priority preview */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {(["baja", "media", "alta", "urgente"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setCreateForm(prev => ({ ...prev, prioridad: p }))}
                  className={`h-8 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${createForm.prioridad === p ? `${prioridadConfig[p].color} border-current scale-105` : "bg-background/30 border-white/5 text-muted-foreground hover:text-foreground"}`}
                >
                  {prioridadConfig[p].label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="border-t border-border/50 pt-4 mt-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</Button>
            <Button className="rounded-xl" onClick={handleCreateTarea} disabled={createTareaMutation.isPending || !usuarioActual}>
              {createTareaMutation.isPending ? "Creando..." : "Crear Tarea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
