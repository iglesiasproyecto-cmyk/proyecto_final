import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { motion } from "motion/react";
import { ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Calendar, Users, ChevronRight, Flag, Inbox } from "lucide-react";

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
  const { tareas, updateTareaEstado, ministerios, miembrosMinisterio, user } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  if (!user) return null;
  const role = user.rol;

  let visibleTasks = tareas;
  let canCreate = false;
  let pageTitle = "Tareas";
  let pageSubtitle = "Gestion de tareas operativas";

  if (role === "lider") {
    visibleTasks = tareas.filter((t) => t.idMinisterio === user.idMinisterio);
    canCreate = true;
    pageTitle = "Tareas del Ministerio";
    pageSubtitle = `Gestiona las tareas de ${ministerios.find((m) => m.idMinisterio === user.idMinisterio)?.nombre || "tu ministerio"}`;
  } else if (role === "servidor") {
    visibleTasks = tareas.filter((t) => t.asignados?.some((a) => a.idUsuario === user.idUsuario));
    pageTitle = "Mis Tareas";
    pageSubtitle = "Tus tareas asignadas";
  } else {
    visibleTasks = [];
  }

  const task = selectedTask ? visibleTasks.find((t) => t.idTarea === selectedTask) : null;
  const nextStatus = (current: string) => {
    if (current === "pendiente") return "en_progreso" as const;
    if (current === "en_progreso") return "completada" as const;
    return null;
  };
  const tasksByStatus = (status: string) => visibleTasks.filter((t) => t.estado === status);
  const canUpdateStatus = (taskItem: typeof tareas[0]) => {
    if (role === "servidor") return taskItem.asignados?.some((a) => a.idUsuario === user.idUsuario) ?? false;
    return role === "lider";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>{pageTitle}</h1>
          <p className="text-muted-foreground text-sm">{pageSubtitle}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Nueva Tarea
          </Button>
        )}
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
                  const canUpdate = canUpdateStatus(t);
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
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2">{t.descripcion}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {t.fechaLimite && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">
                              <Calendar className="w-3 h-3" />{t.fechaLimite}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[10px] ${prio.color} border-0 px-1.5 py-0`}>{prio.label}</Badge>
                        </div>
                        {role !== "servidor" && t.asignados && t.asignados.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex -space-x-1.5">
                              {t.asignados.slice(0, 3).map((a) => (
                                <div key={a.idTareaAsignada} className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] text-primary border-2 border-card" title={a.nombreCompleto}>
                                  {a.nombreCompleto.charAt(0)}
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{t.asignados.map((a) => a.nombreCompleto.split(" ")[0]).join(", ")}</span>
                          </div>
                        )}
                        {next && canUpdate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full mt-2.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); updateTareaEstado(t.idTarea, next); }}
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

      {role === "servidor" && visibleTasks.length === 0 && (
        <Card className="p-16 text-center">
          <ListTodo className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-muted-foreground mb-2">Sin tareas asignadas</h3>
          <p className="text-sm text-muted-foreground">Tu lider te asignara tareas cuando sea necesario.</p>
        </Card>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md">
          {task && (
            <>
              <DialogHeader><DialogTitle>{task.titulo}</DialogTitle></DialogHeader>
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
                        <Badge key={a.idTareaAsignada} variant="secondary" className="text-xs">{a.nombreCompleto}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTask(null)}>Cerrar</Button>
                {nextStatus(task.estado) && canUpdateStatus(task) && (
                  <Button onClick={() => { updateTareaEstado(task.idTarea, nextStatus(task.estado)!); setSelectedTask(null); }}>
                    Mover a {statusConfig[nextStatus(task.estado)!].label}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      {canCreate && (
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Nueva Tarea</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Titulo</label>
                <Input placeholder="Titulo de la tarea" className="bg-input-background h-11" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Descripcion</label>
                <textarea placeholder="Descripcion detallada" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-input-background min-h-[80px] resize-y" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Fecha limite</label>
                  <Input type="date" className="bg-input-background h-11" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Prioridad</label>
                  <select className="w-full border rounded-xl px-3 py-2.5 text-sm bg-input-background h-11">
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Asignar a</label>
                <select className="w-full border rounded-xl px-3 py-2.5 text-sm bg-input-background h-11">
                  {miembrosMinisterio.filter((mm) => mm.idMinisterio === user.idMinisterio && mm.activo).map((mm) => (
                    <option key={mm.idMiembroMinisterio} value={mm.idUsuario}>{mm.nombreCompleto} ({mm.rolEnMinisterio})</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={() => setShowCreate(false)}>Crear Tarea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
