import { useState, useMemo, useEffect } from "react";
import { useTareasEnriquecidas, useCreateTarea, useUpdateTareaEstado, useDeleteTarea, useCreateTareaAsignada, useDeleteTareaAsignada, useTareaEvidencias, useCreateTareaEvidencia } from "@/hooks/useEventos";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useMinisteriosEnriquecidos } from "@/hooks/useMinisterios";
import { getTareaEvidenciaSignedUrl } from "@/services/eventos.service";
import { useApp } from "../store/AppContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { AnimatedCard } from "./ui/AnimatedCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Calendar,
  ChevronRight, Inbox, Trash2, UserPlus, X, Paperclip,
} from "lucide-react";

const statusConfig = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20",   dot: "bg-amber-400",   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  en_progreso: { label: "En Progreso", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",      dot: "bg-[#4682b4]",    icon: <Clock className="w-3.5 h-3.5" /> },
  en_revision: { label: "En Revision", color: "bg-violet-500/10 text-violet-400 border-violet-500/20",      dot: "bg-violet-400",    icon: <Clock className="w-3.5 h-3.5" /> },
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
  const { usuarioActual, rolActual } = useApp();
  const { data: tareas = [], isLoading } = useTareasEnriquecidas();
  const createTareaMutation = useCreateTarea();
  const updateEstadoMutation = useUpdateTareaEstado();
  const deleteTareaMutation = useDeleteTarea();
  const createAsignadaMutation = useCreateTareaAsignada();
  const deleteAsignadaMutation = useDeleteTareaAsignada();
  const createEvidenciaMutation = useCreateTareaEvidencia();
  const { data: usuarios = [] } = useUsuarios();
  const { data: ministerios = [] } = useMinisteriosEnriquecidos();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [assignUserId, setAssignUserId] = useState(0);
  const [createForm, setCreateForm] = useState({
    titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" as "baja" | "media" | "alta" | "urgente", idMinisterio: 0,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number; titulo: string }>({ open: false, id: 0, titulo: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [evidenceUploading, setEvidenceUploading] = useState(false);

  const resetCreateForm = () => setCreateForm({ titulo: "", descripcion: "", fechaLimite: "", prioridad: "media", idMinisterio: 0 });

  useEffect(() => {
    if (createForm.idMinisterio || ministerios.length !== 1) return;
    setCreateForm(prev => ({ ...prev, idMinisterio: ministerios[0].idMinisterio }));
  }, [createForm.idMinisterio, ministerios]);

  const handleDeleteTarea = (id: number, titulo: string) => {
    setDeleteConfirm({ open: true, id, titulo });
  };

  const confirmDeleteTarea = () => {
    if (!deleteConfirm.id) return;
    deleteTareaMutation.mutate(deleteConfirm.id, {
      onSuccess: () => {
        setDeleteConfirm({ open: false, id: 0, titulo: "" });
        setSelectedTask(null);
      },
    });
  };

  const handleCreateTarea = () => {
    if (!createForm.titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (!createForm.idMinisterio) {
      toast.error("Selecciona un ministerio");
      return;
    }
    if (!usuarioActual) {
      toast.error("Debes iniciar sesión para crear tareas");
      return;
    }
    createTareaMutation.mutate(
      { titulo: createForm.titulo.trim(), descripcion: createForm.descripcion.trim() || null, fechaLimite: createForm.fechaLimite || null, prioridad: createForm.prioridad, idUsuarioCreador: usuarioActual.idUsuario, idMinisterio: createForm.idMinisterio },
      {
        onSuccess: (tareaCreada) => {
          toast.success(`Tarea "${tareaCreada.titulo}" creada exitosamente`);
          setShowCreate(false);
          resetCreateForm();
          setSelectedTask(tareaCreada.idTarea);
        },
        onError: (error) => {
          console.error('[TasksPage] Error creating task:', error);
          const msg = error?.message || "";
          if (msg.includes("403") || msg.includes("401") || msg.includes("JWT") || msg.includes("auth")) {
            toast.error("Error de autenticación. Tu sesión puede haber expirado. Intenta cerrar sesión y volver a entrar.");
          } else if (msg.includes("foreign key") || msg.includes("violates")) {
            toast.error("Error de validación. Verifica que todos los datos sean correctos.");
          } else if (msg.includes("row-level security") || msg.includes("RLS") || msg.includes("new row violates")) {
            toast.error("Error de permisos (RLS). Contacta al administrador.");
          } else {
            toast.error("Error al crear tarea: " + msg);
          }
        }
      }
    );
  };

  const handleOpenEvidence = async (objectPath: string) => {
    try {
      const url = await getTareaEvidenciaSignedUrl(objectPath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error('[TasksPage] Error opening evidence:', err);
      toast.error("No se pudo abrir la evidencia.");
    }
  };

  const handleUploadEvidence = (file: File) => {
    if (!usuarioActual || !myAssignment) {
      toast.error("No tienes una asignacion valida para subir evidencia.");
      return;
    }
    setEvidenceUploading(true);
    createEvidenciaMutation.mutate(
      { idTareaAsignada: myAssignment.idTareaAsignada, idUsuario: usuarioActual.idUsuario, file },
      {
        onSuccess: () => {
          toast.success("Evidencia subida.");
        },
        onError: (error: any) => {
          console.error('[TasksPage] Error uploading evidence:', error);
          toast.error("Error al subir evidencia.");
        },
        onSettled: () => setEvidenceUploading(false),
      }
    );
  };

  const filteredAndSortedTareas = useMemo(() => {
    let result = [...tareas];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.titulo.toLowerCase().includes(q) || 
        (t.descripcion && t.descripcion.toLowerCase().includes(q))
      );
    }
    
    if (dateFilter) {
      result = result.filter(t => t.fechaLimite === dateFilter);
    }
    
    result.sort((a, b) => {
      const dateA = new Date(a.creadoEn).getTime();
      const dateB = new Date(b.creadoEn).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [tareas, searchQuery, dateFilter, sortOrder]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Cargando tareas...</span>
      </div>
    </div>
  );

  const task = selectedTask ? tareas.find(t => t.idTarea === selectedTask) : null;
  const isLider = rolActual === "lider";
  const isAdmin = rolActual === "admin_iglesia" || rolActual === "super_admin";
  const canManageTasks = isLider || isAdmin;
  const myAssignment = task?.asignados?.find(a => a.idUsuario === usuarioActual?.idUsuario) ?? null;
  const canActAsServidor = rolActual === "servidor" && !!myAssignment;

  const { data: evidencias = [] } = useTareaEvidencias(task?.idTarea);

  const getActionForServer = (estado: string) => {
    if (estado === "pendiente") return { label: "Iniciar", next: "en_progreso" as const };
    if (estado === "en_progreso") return { label: "Enviar a revision", next: "en_revision" as const };
    return null;
  };

  const getActionForLeader = (estado: string) => {
    if (estado === "en_revision") {
      return {
        approve: { label: "Aprobar", next: "completada" as const },
        rework: { label: "Reabrir", next: "en_progreso" as const },
      };
    }
    return null;
  };

  const tasksByStatus = (status: string) => filteredAndSortedTareas.filter(t => t.estado === status);
  const COLS = ["pendiente", "en_progreso", "en_revision", "completada"] as const;

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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
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
        {canManageTasks && (
          <Button onClick={() => setShowCreate(true)} className="h-10 rounded-xl font-medium shrink-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transition-all">
            <Plus className="w-4 h-4 mr-1.5" /> Nueva Tarea
          </Button>
        )}
      </motion.div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {COLS.map((s, idx) => {
          const cfg = statusConfig[s];
          const count = tasksByStatus(s).length;
          const gradient = s === "pendiente"
            ? "from-amber-500 to-orange-600"
            : s === "en_progreso"
              ? "from-[#709dbd] to-[#4682b4]"
              : s === "en_revision"
                ? "from-violet-500 to-purple-600"
                : "from-emerald-500 to-teal-600";
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

      {/* ── Filtros y Buscador ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-3 bg-card/40 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-sm"
      >
        <div className="flex-1 relative">
          <Input 
            placeholder="Buscar por título o descripción..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background/50 border-white/10 h-11"
          />
        </div>
        <div className="flex gap-3">
          <Input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-[150px] bg-background/50 border-white/10 h-11"
            title="Filtrar por Fecha Límite"
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="w-[180px] h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguas primero</option>
          </select>
        </div>
      </motion.div>

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
                    const prio = prioridadConfig[t.prioridad] ?? prioridadConfig.media;
                    const canServerAct = rolActual === "servidor" && !!t.asignados?.some(a => a.idUsuario === usuarioActual?.idUsuario);
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
                              {canManageTasks && (
                                <button
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                  onClick={e => { e.stopPropagation(); handleDeleteTarea(t.idTarea, t.titulo); }}
                                  disabled={deleteTareaMutation.isPending}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {(() => {
                                const action = canServerAct ? getActionForServer(t.estado) : null;
                                if (!action) return null;
                                return (
                                  <button
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-all"
                                    onClick={e => { e.stopPropagation(); updateEstadoMutation.mutate({ id: t.idTarea, estado: action.next }); }}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                );
                              })()}
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
          <DialogHeader>
            {task ? (
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${statusConfig[task.estado]?.color} border flex items-center justify-center shrink-0 mt-0.5`}>
                  {statusConfig[task.estado]?.icon}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold tracking-tight leading-snug">{task.titulo}</DialogTitle>
                  {task.eventoNombre && <p className="text-[11px] text-primary/60 mt-0.5">{task.eventoNombre}</p>}
                </div>
              </div>
            ) : (
              <DialogTitle className="text-lg font-bold tracking-tight leading-snug">Detalle de Tarea</DialogTitle>
            )}
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
                          {canManageTasks && (
                            <button
                              className="text-muted-foreground/40 hover:text-rose-400 transition-colors ml-0.5"
                              onClick={() => { if (confirm(`¿Remover a ${a.nombreCompleto}?`)) deleteAsignadaMutation.mutate(a.idTareaAsignada); }}
                              disabled={deleteAsignadaMutation.isPending}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assign user */}
                {canManageTasks && (
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
                )}

                {/* Evidencias */}
                {(evidencias.length > 0 || canActAsServidor) && (
                  <div className="pt-2 border-t border-border/40">
                    <FieldLabel><span className="flex items-center gap-1.5"><Paperclip className="w-3 h-3" /> Evidencias</span></FieldLabel>
                    {evidencias.length > 0 && (
                      <div className="space-y-2">
                        {evidencias.map(ev => (
                          <div key={ev.idTareaEvidencia} className="flex items-center justify-between gap-3 bg-background/40 border border-white/10 rounded-xl px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{ev.nombreArchivo}</p>
                              {ev.nombreCompleto && (
                                <p className="text-[10px] text-muted-foreground truncate">{ev.nombreCompleto}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              className="h-8 px-3 rounded-lg"
                              onClick={() => handleOpenEvidence(ev.objectPath)}
                            >
                              Ver
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {canActAsServidor && (
                      <div className="mt-3">
                        <input
                          type="file"
                          className="w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-[#4682b4]/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#4682b4] hover:file:bg-[#4682b4]/20"
                          disabled={evidenceUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadEvidence(file);
                            e.currentTarget.value = "";
                          }}
                        />
                        {evidenceUploading && (
                          <p className="text-[10px] text-muted-foreground mt-1">Subiendo evidencia...</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-border/50 pt-4 gap-2">
                {canManageTasks && (
                  <button
                    className="mr-auto h-9 px-3 rounded-xl flex items-center gap-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                    disabled={deleteTareaMutation.isPending}
                    onClick={() => { handleDeleteTarea(task.idTarea, task.titulo); setSelectedTask(null); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                )}
                <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedTask(null)}>Cerrar</Button>
                {(() => {
                  const serverAction = canActAsServidor ? getActionForServer(task.estado) : null;
                  if (!serverAction) return null;
                  return (
                    <Button
                      className="rounded-xl"
                      onClick={() => { updateEstadoMutation.mutate({ id: task.idTarea, estado: serverAction.next }); setSelectedTask(null); }}
                    >
                      {serverAction.label}
                    </Button>
                  );
                })()}
                {(() => {
                  const leaderAction = canManageTasks ? getActionForLeader(task.estado) : null;
                  if (!leaderAction) return null;
                  return (
                    <>
                      <Button
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => { updateEstadoMutation.mutate({ id: task.idTarea, estado: leaderAction.rework.next }); setSelectedTask(null); }}
                      >
                        {leaderAction.rework.label}
                      </Button>
                      <Button
                        className="rounded-xl"
                        onClick={() => { updateEstadoMutation.mutate({ id: task.idTarea, estado: leaderAction.approve.next }); setSelectedTask(null); }}
                      >
                        {leaderAction.approve.label}
                      </Button>
                    </>
                  );
                })()}
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
              <FieldLabel>Ministerio</FieldLabel>
              <select
                value={createForm.idMinisterio}
                onChange={e => setCreateForm(p => ({ ...p, idMinisterio: Number(e.target.value) }))}
                className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value={0}>Seleccionar ministerio...</option>
                {ministerios.map(m => (
                  <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>
                ))}
              </select>
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

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-sm rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-rose-400" />
              </div>
              <DialogTitle className="text-lg font-bold tracking-tight text-center">¿Eliminar tarea?</DialogTitle>
              <p className="text-sm text-muted-foreground text-center">
                Estás a punto de eliminar <span className="font-semibold text-foreground">"{deleteConfirm.titulo}"</span>. Esta acción no se puede deshacer.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button variant="ghost" className="rounded-xl w-full" onClick={() => setDeleteConfirm({ open: false, id: 0, titulo: "" })}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl w-full bg-rose-500 hover:bg-rose-600 text-white"
              onClick={confirmDeleteTarea}
              disabled={deleteTareaMutation.isPending}
            >
              {deleteTareaMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
