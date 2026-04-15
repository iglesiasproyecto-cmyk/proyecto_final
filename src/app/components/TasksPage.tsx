import { useState } from "react";
import { useTareasEnriquecidas, useCreateTarea, useUpdateTareaEstado, useDeleteTarea, useCreateTareaAsignada, useDeleteTareaAsignada } from "@/hooks/useEventos";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { motion } from "motion/react";
import { ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Calendar, ChevronRight, Inbox, Trash2, Users, UserPlus, X } from "lucide-react";

const statusConfig = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700", headerBg: "from-amber-500 to-orange-500", icon: <AlertCircle className="w-4 h-4" /> },
  en_progreso: { label: "En Progreso", color: "bg-blue-100 text-blue-700", headerBg: "from-blue-500 to-indigo-500", icon: <Clock className="w-4 h-4" /> },
  completada: { label: "Completada", color: "bg-green-100 text-green-700", headerBg: "from-green-500 to-emerald-500", icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700", headerBg: "from-red-500 to-pink-500", icon: <AlertCircle className="w-4 h-4" /> },
};

const prioridadConfig: Record<string, { label: string; color: string; dot: string }> = {
  baja: { label: "Baja", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  media: { label: "Media", color: "bg-blue-100 text-blue-600", dot: "bg-blue-500" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-600", dot: "bg-orange-500" },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-600", dot: "bg-red-500" },
};

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
    titulo: "",
    descripcion: "",
    fechaLimite: "",
    prioridad: "media" as "baja" | "media" | "alta" | "urgente",
  });

  const resetCreateForm = () => setCreateForm({ titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" });

  const handleDeleteTarea = (id: number, titulo: string) => {
    if (!confirm(`¿Eliminar tarea "${titulo}"?`)) return;
    deleteTareaMutation.mutate(id);
  };

  const handleCreateTarea = () => {
    if (!createForm.titulo.trim() || !usuarioActual) return;
    createTareaMutation.mutate(
      {
        titulo: createForm.titulo.trim(),
        descripcion: createForm.descripcion.trim() || null,
        fechaLimite: createForm.fechaLimite || null,
        prioridad: createForm.prioridad,
        idUsuarioCreador: usuarioActual.idUsuario,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          resetCreateForm();
        },
      }
    );
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const task = selectedTask ? tareas.find((t) => t.idTarea === selectedTask) : null;
  const nextStatus = (current: string): "en_progreso" | "completada" | null => {
    if (current === "pendiente") return "en_progreso";
    if (current === "en_progreso") return "completada";
    return null;
  };
  const tasksByStatus = (status: string) => tareas.filter((t) => t.estado === status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Tareas</h1>
          <p className="text-muted-foreground text-sm">Gestion de tareas operativas</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Nueva Tarea
        </Button>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(["pendiente", "en_progreso", "completada"] as const).map((s, i) => {
          const cfg = statusConfig[s];
          return (
            <motion.div key={s} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4 group hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>{cfg.icon}</div>
                <p className="text-2xl tracking-tight">{tasksByStatus(s).length}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(["pendiente", "en_progreso", "completada"] as const).map((status, colIdx) => {
          const cfg = statusConfig[status];
          const statusTasks = tasksByStatus(status);
          return (
            <motion.div key={status} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + colIdx * 0.05 }}>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl bg-gradient-to-r ${cfg.headerBg} text-white`}>
                {cfg.icon}
                <span className="text-sm">{cfg.label}</span>
                <Badge variant="outline" className="ml-auto text-[10px] bg-white/20 border-white/30 text-white">{statusTasks.length}</Badge>
              </div>
              <div className="space-y-2 bg-muted/30 rounded-b-xl p-2.5 min-h-[220px] border border-t-0 border-border/50">
                {statusTasks.map((t, tIdx) => {
                  const next = nextStatus(t.estado);
                  const prio = prioridadConfig[t.prioridad];
                  return (
                    <motion.div
                      key={t.idTarea}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 + tIdx * 0.03 }}
                    >
                      <Card
                        className="p-3.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                        onClick={() => setSelectedTask(t.idTarea)}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <h4 className="text-sm leading-snug">{t.titulo}</h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`w-2 h-2 rounded-full ${prio.dot}`} title={prio.label} />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDeleteTarea(t.idTarea, t.titulo); }}
                              disabled={deleteTareaMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {t.eventoNombre && (
                          <p className="text-[10px] text-primary/70 mb-1 truncate">{t.eventoNombre}</p>
                        )}
                        <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2">{t.descripcion}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {t.fechaLimite && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">
                              <Calendar className="w-3 h-3" />{t.fechaLimite}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[10px] ${prio.color} border-0 px-1.5 py-0`}>{prio.label}</Badge>
                          {t.asignadosCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full ml-auto">
                              <Users className="w-3 h-3" />{t.asignadosCount}
                            </span>
                          )}
                        </div>
                        {t.asignados && t.asignados.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex -space-x-1.5">
                              {t.asignados.slice(0, 3).map((a) => (
                                <div key={a.idTareaAsignada} className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] text-primary border-2 border-card" title={a.nombreCompleto}>
                                  {(a.nombreCompleto || "?").charAt(0)}
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{t.asignados.map((a) => (a.nombreCompleto || "").split(" ")[0]).join(", ")}</span>
                          </div>
                        )}
                        {next && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full mt-2.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); updateEstadoMutation.mutate({ id: t.idTarea, estado: next }); }}
                          >
                            Mover a {statusConfig[next].label} <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
                {statusTasks.length === 0 && (
                  <div className="text-center py-10">
                    <Inbox className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-muted-foreground">Sin tareas</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {tareas.length === 0 && (
        <Card className="p-16 text-center">
          <ListTodo className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-muted-foreground mb-2">Sin tareas</h3>
          <p className="text-sm text-muted-foreground">Las tareas apareceran aqui cuando sean creadas.</p>
        </Card>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md">
          {task && (
            <>
              <DialogHeader>
                <DialogTitle>{task.titulo}</DialogTitle>
                {task.eventoNombre && <p className="text-xs text-primary/70 mt-0.5">{task.eventoNombre}</p>}
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground">Descripcion</label>
                  <p className="text-sm mt-1">{task.descripcion}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Estado</label>
                    <div className="mt-1">
                      <Badge variant="outline" className={`${statusConfig[task.estado]?.color || ""} border-0`}>
                        {statusConfig[task.estado]?.label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Prioridad</label>
                    <div className="mt-1">
                      <Badge variant="outline" className={`${prioridadConfig[task.prioridad]?.color || ""} border-0`}>
                        {prioridadConfig[task.prioridad]?.label}
                      </Badge>
                    </div>
                  </div>
                  {task.fechaLimite && (
                    <div>
                      <label className="text-xs text-muted-foreground">Fecha Limite</label>
                      <p className="text-sm mt-1">{task.fechaLimite}</p>
                    </div>
                  )}
                </div>
                {task.asignados && task.asignados.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground">Asignados</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {task.asignados.map((a) => (
                        <Badge key={a.idTareaAsignada} variant="secondary" className="text-xs flex items-center gap-1">
                          {a.nombreCompleto}
                          <button
                            onClick={() => { if (confirm(`¿Remover a ${a.nombreCompleto} de esta tarea?`)) deleteAsignadaMutation.mutate(a.idTareaAsignada); }}
                            className="ml-0.5 text-muted-foreground hover:text-destructive"
                            disabled={deleteAsignadaMutation.isPending}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Assign user section */}
                <div className="border-t pt-3">
                  <label className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><UserPlus className="w-3.5 h-3.5" /> Asignar usuario</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-9 rounded-md border border-input bg-input-background px-3 text-sm"
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
                      size="sm"
                      disabled={!assignUserId || createAsignadaMutation.isPending || !task}
                      onClick={() => {
                        if (!task || !assignUserId) return;
                        createAsignadaMutation.mutate({ idTarea: task.idTarea, idUsuario: assignUserId }, { onSuccess: () => setAssignUserId(0) });
                      }}
                    >
                      {createAsignadaMutation.isPending ? "..." : <UserPlus className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mr-auto"
                  disabled={deleteTareaMutation.isPending}
                  onClick={() => { handleDeleteTarea(task.idTarea, task.titulo); setSelectedTask(null); }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
                </Button>
                <Button variant="outline" onClick={() => setSelectedTask(null)}>Cerrar</Button>
                {nextStatus(task.estado) && (
                  <Button onClick={() => { updateEstadoMutation.mutate({ id: task.idTarea, estado: nextStatus(task.estado)! }); setSelectedTask(null); }}>
                    Mover a {statusConfig[nextStatus(task.estado)!].label}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
              <Input
                value={createForm.titulo}
                onChange={(e) => setCreateForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Título de la tarea"
                className="bg-input-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
              <Input
                value={createForm.descripcion}
                onChange={(e) => setCreateForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción opcional"
                className="bg-input-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fecha Límite</label>
                <Input
                  type="date"
                  value={createForm.fechaLimite}
                  onChange={(e) => setCreateForm(p => ({ ...p, fechaLimite: e.target.value }))}
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Prioridad</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm"
                  value={createForm.prioridad}
                  onChange={(e) => setCreateForm(p => ({ ...p, prioridad: e.target.value as typeof createForm.prioridad }))}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</Button>
            <Button onClick={handleCreateTarea} disabled={createTareaMutation.isPending || !usuarioActual}>
              {createTareaMutation.isPending ? "Creando..." : "Crear Tarea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
