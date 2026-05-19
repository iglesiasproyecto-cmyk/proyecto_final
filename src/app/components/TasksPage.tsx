import { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useTareasEnriquecidas, useCreateTarea, useUpdateTarea, useUpdateTareaEstado, useDeleteTarea, useAssignUsuariosATarea, useDeleteTareaAsignada, useArchiveTask, useUnarchiveTask, useCreateTareaEvidencia } from "@/hooks/useEventos";
import { useDragDropTasks } from "@/hooks/useDragDropTasks";
import type { TareaEnriquecida } from "@/services/eventos.service";
import { useMinisteriosEnriquecidos, useMinisteriosIdsDeUsuario } from "@/hooks/useMinisterios";
import { useSedesEnriquecidas } from "@/hooks/useIglesias";
import { useCanManageMinisterio } from "@/hooks/useMinisterioRole";
import { useUsuariosDeIglesia } from "@/hooks/useUsuariosDeIglesia";
import { useTaskPermissions, useCanBulkUpdate } from "@/hooks/useTaskPermissions";
import { filterAndSortTareas } from "@/lib/taskUtils";
import { useApp } from "../store/AppContext";
import { SedeMinisterioSelector } from "./ui/SedeMinisterioSelector";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { AnimatedCard } from "./ui/AnimatedCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Calendar,
  ChevronRight, Inbox, Trash2, UserPlus, X, Pencil, Search
} from "lucide-react";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Skeleton } from "./ui/skeleton";
import { TableSkeleton } from "./loading/skeletons";
import { TasksSkeleton } from "./tasks/TasksSkeleton";
import { TaskBulkActions } from "./tasks/TaskBulkActions";
import { TaskArchiveIndicator } from "./tasks/TaskArchiveIndicator";
import { TaskEvidenceReview } from "./tasks/TaskEvidenceReview";

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
  const { idIglesia } = useParams<{ idIglesia: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const idIglesiaNum = Number(idIglesia) || undefined;
  const { usuarioActual, rolActual, iglesiaActual, sedesDelUsuario } = useApp();
  const { data: tareas = [], isLoading } = useTareasEnriquecidas(undefined, idIglesiaNum);
  const createTareaMutation = useCreateTarea();
  const updateEstadoMutation = useUpdateTareaEstado();
  const updateTareaMutation = useUpdateTarea();
  const deleteTareaMutation = useDeleteTarea();
  const assignUsuariosMutation = useAssignUsuariosATarea();
  const deleteAsignadaMutation = useDeleteTareaAsignada();
  const createEvidenciaMutation = useCreateTareaEvidencia();
  const { data: ministerios = [] } = useMinisteriosEnriquecidos(idIglesiaNum);
  const { data: sedes = [] } = useSedesEnriquecidas(idIglesiaNum);
  const { data: usuarioMinisterioIds = [] } = useMinisteriosIdsDeUsuario(rolActual === "lider" ? usuarioActual?.idUsuario : undefined);
  const { data: usuariosDeIglesia = [] } = useUsuariosDeIglesia(idIglesiaNum);

  const isAdminSede = rolActual === "admin_sede";
  const isLider = rolActual === "lider";

  // Count how many ministerios the current user leads (for conditional display)
  const userLeadMinisterios = usuarioMinisterioIds.length;
  const hasMultipleMinisterios = userLeadMinisterios >= 2;
  const shouldShowSelectorFields = !isLider || hasMultipleMinisterios || rolActual === "admin_iglesia" || rolActual === "super_admin" || rolActual === "admin_sede";

  // Get the first ministerio if user leads exactly one
  const singleUserMinisterio = isLider && userLeadMinisterios === 1
    ? ministerios.find(m => m.idMinisterio === usuarioMinisterioIds[0])
    : null;

  const [showCreate, setShowCreate] = useState(false);
  const [sedeFilter, setSedeFilter] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [assignScope, setAssignScope] = useState({
    idSede: 0,
    idMinisterio: 0,
    selectedUserIds: [] as number[],
    assignAll: false,
  });
  const [createForm, setCreateForm] = useState({
    titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" as "baja" | "media" | "alta" | "urgente",
    idSede: 0, idMinisterio: 0, _hideSelectorFields: false,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number; titulo: string }>({ open: false, id: 0, titulo: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [ministerioFilter, setMinisterioFilter] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  // (evidenceUploading removed — handled by TaskEvidenceReview)
  const [confirmCancel, setConfirmCancel] = useState<{ open: boolean; id: number }>({ open: false, id: 0 });
  const [confirmRemoveAssign, setConfirmRemoveAssign] = useState<{ open: boolean; id: number; nombre: string }>({ open: false, id: 0, nombre: "" });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    titulo: "", descripcion: "", fechaLimite: "", prioridad: "media" as TareaEnriquecida['prioridad']
  });
  const [selectedTareaIds, setSelectedTareaIds] = useState<Set<number>>(new Set());

  const task = selectedTask ? tareas.find(t => t.idTarea === selectedTask) : null;
  const isAdminIglesia = rolActual === "admin_iglesia" || rolActual === "super_admin";

  const sedesDisponiblesAsignacion = useMemo(() => {
    if (isAdminSede) return sedes.filter(s => sedesDelUsuario.some(sd => sd.id === s.idSede));
    return sedes;
  }, [isAdminSede, sedes, sedesDelUsuario]);

  const ministeriosDisponiblesAsignacion = useMemo(() => {
    if (isAdminIglesia) {
      if (!assignScope.idSede) return [];
      return ministerios.filter(m => m.idSede === assignScope.idSede);
    }
    if (isAdminSede) {
      const sedeId = sedesDelUsuario[0]?.id ?? 0;
      return ministerios.filter(m => m.idSede === sedeId);
    }
    if (isLider) {
      return ministerios.filter(m => usuarioMinisterioIds.includes(m.idMinisterio));
    }
    return ministerios;
  }, [assignScope.idSede, isAdminIglesia, isAdminSede, isLider, ministerios, sedesDelUsuario, usuarioMinisterioIds]);

  const ministerioAsignacionId = useMemo(() => {
    if (isLider && !assignScope.idMinisterio) return singleUserMinisterio?.idMinisterio ?? 0;
    return assignScope.idMinisterio;
  }, [assignScope.idMinisterio, isLider, singleUserMinisterio]);

  const usuariosAsignables = useMemo(() => {
    if (!ministerioAsignacionId) return [];
    const ministerioObjetivo = ministerios.find(m => m.idMinisterio === ministerioAsignacionId);
    if (!ministerioObjetivo) return [];

    return usuariosDeIglesia.filter(u => {
      const yaAsignado = (task?.asignados || []).some(a => a.idUsuario === u.idUsuario);
      if (yaAsignado) return false;
      return u.ministerios.includes(ministerioObjetivo.nombre);
    });
  }, [ministerioAsignacionId, ministerios, task?.asignados, usuariosDeIglesia]);

  // Archive and permission hooks
  const archiveMutation = useArchiveTask();
  const unarchiveMutation = useUnarchiveTask();
  const canBulkUpdate = useCanBulkUpdate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _taskPerms = useTaskPermissions(task);

  // Drag-drop hook
  const { handleDropTask, isUpdating } = useDragDropTasks();

  const resetCreateForm = () => setCreateForm({ titulo: "", descripcion: "", fechaLimite: "", prioridad: "media", idMinisterio: singleUserMinisterio?.idMinisterio ?? 0, idSede: 0, _hideSelectorFields: !shouldShowSelectorFields });

  useEffect(() => {
    if (showCreate) {
      resetCreateForm();
    }
  }, [showCreate, singleUserMinisterio, isAdminSede, isLider, shouldShowSelectorFields, rolActual]);

  useEffect(() => {
    if (!selectedTask) {
      setAssignScope({ idSede: 0, idMinisterio: 0, selectedUserIds: [], assignAll: false });
      return;
    }

    if (isAdminSede) {
      const defaultSedeId = sedesDelUsuario[0]?.id ?? 0;
      setAssignScope(prev => ({ ...prev, idSede: defaultSedeId }));
    }

    if (isLider && singleUserMinisterio?.idMinisterio) {
      setAssignScope(prev => ({ ...prev, idMinisterio: singleUserMinisterio.idMinisterio }));
    }
  }, [selectedTask, isAdminSede, isLider, sedesDelUsuario, singleUserMinisterio]);

  useEffect(() => {
    setAssignScope(prev => ({ ...prev, idMinisterio: 0, selectedUserIds: [], assignAll: false }));
  }, [assignScope.idSede]);

  useEffect(() => {
    setAssignScope(prev => ({ ...prev, selectedUserIds: [], assignAll: false }));
  }, [assignScope.idMinisterio]);

  useEffect(() => {
    if (!task) {
      setEditMode(false);
      return;
    }
    setEditForm({
      titulo: task.titulo,
      descripcion: task.descripcion || "",
      fechaLimite: task.fechaLimite || "",
      prioridad: task.prioridad,
    });
  }, [task]);

  useEffect(() => {
    if (createForm.idMinisterio || ministerios.length !== 1) return;
    setCreateForm(prev => ({ ...prev, idMinisterio: ministerios[0].idMinisterio }));
  }, [createForm.idMinisterio, ministerios]);

  useEffect(() => {
    const openTask = Number(searchParams.get("openTask") || 0);
    if (!openTask) return;

    if (tareas.some(t => t.idTarea === openTask)) {
      setSelectedTask(openTask);
    } else if (!isLoading) {
      toast.error("La tarea ya no esta disponible");
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("openTask");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, tareas, isLoading]);

  const handleDeleteTarea = (id: number, titulo: string) => {
    setDeleteConfirm({ open: true, id, titulo });
  };

  const confirmDeleteTarea = () => {
    if (!deleteConfirm.id) return;
    deleteTareaMutation.mutate(deleteConfirm.id, {
      onSuccess: () => {
        toast.success(`Tarea "${deleteConfirm.titulo}" eliminada exitosamente`);
        setDeleteConfirm({ open: false, id: 0, titulo: "" });
        setSelectedTask(null);
      },
      onError: (error: any) => {
        toast.error(`Error al eliminar tarea: ${error.message}`);
      }
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
    if (!usuarioActual.idUsuario) {
      toast.error("Tu perfil de usuario no está completamente configurado. Contacta al administrador.");
      console.error('usuarioActual:', usuarioActual);
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

  // Evidence handling moved to TaskEvidenceReview component


  const handleBulkUpdateEstado = (estado: string) => {
    if (selectedTareaIds.size === 0) {
      toast.error("No hay tareas seleccionadas");
      return;
    }
    if (!canBulkUpdate) {
      toast.error("No tienes permiso para actualizar múltiples tareas");
      return;
    }
    // TODO: Implement bulk update RPC call
    toast.success(`Actualizando ${selectedTareaIds.size} tareas a ${estado}`);
    setSelectedTareaIds(new Set());
  };

  const handleBulkArchive = () => {
    if (selectedTareaIds.size === 0) {
      toast.error("No hay tareas seleccionadas");
      return;
    }
    if (!canBulkUpdate) {
      toast.error("No tienes permiso para archivar tareas");
      return;
    }
    // TODO: Implement bulk archive
    toast.success(`Archivando ${selectedTareaIds.size} tareas`);
    setSelectedTareaIds(new Set());
  };

  const handleClearSelection = () => {
    setSelectedTareaIds(new Set());
  };

  const handleToggleTaskSelect = (idTarea: number) => {
    const newSet = new Set(selectedTareaIds);
    if (newSet.has(idTarea)) {
      newSet.delete(idTarea);
    } else {
      newSet.add(idTarea);
    }
    setSelectedTareaIds(newSet);
  };

  const handleArchiveTask = () => {
    if (!task?.idTarea || !canBulkUpdate) return;
    archiveMutation.mutate(task.idTarea);
  };

  const handleUnarchiveTask = () => {
    if (!task?.idTarea || !canBulkUpdate) return;
    unarchiveMutation.mutate(task.idTarea);
  };

  const filteredAndSortedTareas = useMemo(() =>
    filterAndSortTareas(tareas, { searchQuery, dateFilter, sortOrder }),
    [tareas, searchQuery, dateFilter, sortOrder]
  );

  const visibleTareas = useMemo(() => {
    if (!ministerioFilter) return filteredAndSortedTareas;
    return filteredAndSortedTareas.filter(t => t.idMinisterio === ministerioFilter);
  }, [filteredAndSortedTareas, ministerioFilter]);

  // Hooks must be called before any conditional returns
  const canCreateInContext = useCanManageMinisterio(ministerioFilter || null);

  if (isLoading) return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <div className="flex items-center gap-4 p-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <TasksSkeleton />
    </div>
  );

  const isAdmin = rolActual === "admin_iglesia" || rolActual === "super_admin" || rolActual === "admin_sede";
  const canManageTasks = isLider || isAdmin;
  const canShowCreateButton =
    canManageTasks && (ministerioFilter === 0 || canCreateInContext);
  const myAssignment = task?.asignados?.find(a => a.idUsuario === usuarioActual?.idUsuario) ?? null;
  const canActAsServidor = rolActual === "servidor" && !!myAssignment;

  // State transitions handled by TaskEvidenceReview (en_progreso → en_revision → completada/rechazada)

  const tasksByStatus = (status: string) => visibleTareas.filter(t => t.estado === status);
  const COLS = ["pendiente", "en_progreso", "en_revision", "completada"] as const;

  // Draggable task card component
  function DraggableTaskCard({ task: t, tIdx }: { task: typeof visibleTareas[0]; tIdx: number }) {
    const prio = prioridadConfig[t.prioridad] ?? prioridadConfig.media;
    const canServerAct = rolActual === "servidor" && !!t.asignados?.some(a => a.idUsuario === usuarioActual?.idUsuario);

    const [{ isDragging }, drag] = useDrag(() => ({
      type: 'task',
      item: { id: t.idTarea, estado: t.estado },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }), [t.idTarea, t.estado]);

    return (
      <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }} className="cursor-grab active:cursor-grabbing">
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

            {t.ministerioNombre && (
              <p className="text-[10px] font-bold text-primary/60 mb-2 truncate uppercase tracking-wider">
                {t.ministerioNombre}
              </p>
            )}

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
      </div>
    );
  }

  // Droppable column component
  function DroppableColumn({ status }: { status: typeof COLS[0] }) {
    const cfg = statusConfig[status];
    const statusTasks = tasksByStatus(status);

    const [{ isOver }, drop] = useDrop(() => ({
      accept: 'task',
      drop: (item: { id: number; estado: string }) => {
        if (item.estado !== status) {
          handleDropTask(item.id, status);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }), [status, handleDropTask]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <div className="w-[85vw] sm:w-[350px] lg:w-full shrink-0 snap-center">
          {/* Column header */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl bg-card/60 backdrop-blur-xl border border-white/10 border-b-0`}>
            <div className={`w-2 h-2 rounded-full ${cfg.dot} shadow-[0_0_6px_currentColor]`} />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/70">{cfg.label}</span>
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} border`}>{statusTasks.length}</span>
          </div>

          {/* Cards - droppable area */}
          <div ref={drop} className={`space-y-3 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-b-3xl border border-white/5 border-t-0 p-3 min-h-[400px] transition-all ${isOver ? 'bg-primary/10 border-primary/50' : ''}`}>
            <AnimatePresence>
              {statusTasks.map((t, tIdx) => (
                <DraggableTaskCard key={t.idTarea} task={t} tIdx={tIdx} />
              ))}
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
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 overflow-hidden"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <ListTodo className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-0.5">Operaciones</p>
            <h1 className="text-4xl font-light tracking-tight text-foreground leading-tight">
              Tareas
            </h1>
            <p className="text-foreground text-xs sm:text-sm mt-1">Gestión de tareas operativas del ministerio</p>
          </div>
        </div>
        {canShowCreateButton && (
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
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors" />
          <Input 
            placeholder="Buscar por título o descripción..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 h-11 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-300 text-sm"
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
          <SedeMinisterioSelector
            sedes={sedes}
            ministerios={ministerios}
            selectedSedeId={sedeFilter}
            selectedMinisterioId={ministerioFilter}
            onSedeChange={(idSede, clearMinisterio) => {
              setSedeFilter(idSede);
              if (clearMinisterio) setMinisterioFilter(0);
            }}
            onMinisterioChange={(idMinisterio, autoSedeId) => {
              setMinisterioFilter(idMinisterio);
              setSedeFilter(autoSedeId);
            }}
            allowNoMinisterio
          />
        </div>
      </motion.div>

      {/* ── Bulk Actions ── */}
      <TaskBulkActions
        selectedCount={selectedTareaIds.size}
        onBulkUpdateEstado={canBulkUpdate ? handleBulkUpdateEstado : undefined}
        onBulkArchive={canBulkUpdate ? handleBulkArchive : undefined}
        onClearSelection={handleClearSelection}
        isLoading={false}
      />

      {/* ── Kanban Board ── */}
      <DndProvider backend={HTML5Backend}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto pb-6 lg:pb-0 snap-x lg:snap-none -mx-4 px-4 lg:mx-0 lg:px-0 hide-scrollbar"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
        {COLS.map((status) => (
          <DroppableColumn key={status} status={status} />
        ))}
      </motion.div>
      </DndProvider>

      {/* ── Task Detail Dialog ── */}
      <Dialog
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null);
            setAssignScope({ idSede: 0, idMinisterio: 0, selectedUserIds: [], assignAll: false });
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogDescription className="sr-only">Detalles de la tarea seleccionada</DialogDescription>
          {task ? (
            <>
              {/* ── Header ── */}
              <div className="relative p-6 pb-5 bg-gradient-to-b from-primary/10 to-transparent border-b border-white/5 shrink-0">
                <div className="absolute top-0 right-0 p-5">
                  {isAdmin && (
                    <button 
                      onClick={() => setEditMode(!editMode)}
                      className={`p-2 rounded-xl transition-all shadow-sm ${editMode ? 'bg-primary text-white shadow-primary/20' : 'bg-background border border-white/10 text-primary hover:bg-primary/10'}`}
                      title={editMode ? "Cancelar Edición" : "Editar Tarea"}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-start gap-4 pr-12">
                  <div className={`w-12 h-12 rounded-2xl ${statusConfig[task.estado]?.color} border flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                    {statusConfig[task.estado]?.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline" className={`${prioridadConfig[task.prioridad]?.color} border-0 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md`}>
                        {prioridadConfig[task.prioridad]?.label}
                      </Badge>
                      {task.fechaLimite && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase bg-white/5 px-2 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3" /> {task.fechaLimite}
                        </span>
                      )}
                    </div>
                    <DialogTitle className="text-xl font-bold tracking-tight leading-tight text-foreground">{task.titulo}</DialogTitle>
                  </div>
                </div>

                {(task.ministerioNombre || task.eventoNombre) && (
                  <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t border-white/5">
                    {task.ministerioNombre && (
                      <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase text-primary/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                        {task.ministerioNombre}
                      </div>
                    )}
                    {task.eventoNombre && (
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        {task.eventoNombre}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Body ── */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <FieldLabel>Título</FieldLabel>
                      <Input 
                        value={editForm.titulo} 
                        onChange={e => setEditForm(p => ({ ...p, titulo: e.target.value }))}
                        className="h-10 bg-background/50 border-white/10"
                      />
                    </div>
                    <div>
                      <FieldLabel>Descripción</FieldLabel>
                      <Input 
                        value={editForm.descripcion} 
                        onChange={e => setEditForm(p => ({ ...p, descripcion: e.target.value }))}
                        className="h-10 bg-background/50 border-white/10"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Fecha y Hora Límite</FieldLabel>
                        <Input 
                          type="datetime-local"
                          value={editForm.fechaLimite} 
                          onChange={e => setEditForm(p => ({ ...p, fechaLimite: e.target.value }))}
                          className="h-10 bg-background/50 border-white/10"
                        />
                      </div>
                      <div>
                        <FieldLabel>Prioridad</FieldLabel>
                        <select
                          value={editForm.prioridad}
                          onChange={e => setEditForm(p => ({ ...p, prioridad: e.target.value as "baja" | "media" | "alta" | "urgente" }))}
                          className="w-full h-10 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none"
                        >
                          <option value="baja">Baja</option>
                          <option value="media">Media</option>
                          <option value="alta">Alta</option>
                          <option value="urgente">Urgente</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 dark:bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Estado Actual</span>
                        <Badge variant="outline" className={`${statusConfig[task.estado]?.color} border-0 text-xs px-3 py-1 font-bold rounded-lg w-full justify-center`}>
                          {statusConfig[task.estado]?.label}
                        </Badge>
                      </div>
                      <div className="bg-white/5 dark:bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Personas Asig.</span>
                        <div className="text-xl font-light text-foreground">{task.asignados?.length || 0}</div>
                      </div>
                    </div>

                    {task.descripcion && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <ListTodo className="w-3 h-3" /> Descripción
                        </span>
                        <p className="text-[13px] text-foreground/80 leading-relaxed bg-white/5 dark:bg-black/20 rounded-2xl p-4 border border-white/5 whitespace-pre-wrap">
                          {task.descripcion}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Assigned users */}
                {!editMode && task.asignados && task.asignados.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <UserPlus className="w-3 h-3" /> Personas Asignadas
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {task.asignados.map(a => (
                        <div key={a.idTareaAsignada} className="flex items-center gap-2 bg-background border border-white/10 shadow-sm rounded-xl py-1.5 pl-1.5 pr-3 group">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                            {(a.nombreCompleto || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[11px] font-bold tracking-tight truncate max-w-[120px]">{a.nombreCompleto}</span>
                          {canManageTasks && (
                            <button
                              className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              onClick={() => setConfirmRemoveAssign({ open: true, id: a.idTareaAsignada, nombre: a.nombreCompleto || "" })}
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

                {/* Assign user Panel */}
                {!editMode && canManageTasks && (
                  <div className="bg-white/5 dark:bg-black/20 rounded-2xl border border-white/5 p-5 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5 mb-2">
                      <UserPlus className="w-3.5 h-3.5 text-primary" /> Agregar Asignación
                    </span>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {isAdminIglesia && (
                        <select
                          className="w-full h-10 rounded-xl border border-white/10 bg-background/80 px-3 text-xs font-semibold text-foreground/80 outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
                          value={assignScope.idSede}
                          onChange={e => setAssignScope(prev => ({ ...prev, idSede: Number(e.target.value) }))}
                        >
                          <option value={0}>Seleccionar Sede...</option>
                          {sedesDisponiblesAsignacion.map(s => (
                            <option key={s.idSede} value={s.idSede}>{s.nombre}</option>
                          ))}
                        </select>
                      )}

                      {(!isLider || userLeadMinisterios > 1) && (
                        <select
                          className="w-full h-10 rounded-xl border border-white/10 bg-background/80 px-3 text-xs font-semibold text-foreground/80 outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
                          value={ministerioAsignacionId}
                          onChange={e => setAssignScope(prev => ({ ...prev, idMinisterio: Number(e.target.value) }))}
                          disabled={isAdminIglesia && !assignScope.idSede}
                        >
                          <option value={0}>Seleccionar Ministerio...</option>
                          {ministeriosDisponiblesAsignacion.map(m => (
                            <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>
                          ))}
                        </select>
                      )}

                      {isLider && userLeadMinisterios <= 1 && singleUserMinisterio && (
                        <div className="w-full h-10 rounded-xl border border-white/10 bg-background/40 px-3 text-xs font-semibold text-foreground/60 flex items-center">
                          {singleUserMinisterio.nombre}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mt-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-foreground/80 cursor-pointer w-fit">
                        <input
                          type="checkbox"
                          className="rounded border-white/20 text-primary focus:ring-primary/30 bg-background"
                          checked={assignScope.assignAll}
                          onChange={e => setAssignScope(prev => ({
                            ...prev,
                            assignAll: e.target.checked,
                            selectedUserIds: e.target.checked ? usuariosAsignables.map(u => u.idUsuario) : [],
                          }))}
                          disabled={!ministerioAsignacionId || usuariosAsignables.length === 0}
                        />
                        Seleccionar todos los disponibles ({usuariosAsignables.length})
                      </label>

                      <div className="max-h-40 overflow-y-auto space-y-1 bg-background/60 border border-white/10 rounded-xl p-2 custom-scrollbar">
                        {usuariosAsignables.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground text-center py-2">No hay usuarios disponibles en este ministerio.</p>
                        ) : usuariosAsignables.map(u => (
                          <label key={u.idUsuario} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-xs font-medium text-foreground/80">
                            <input
                              type="checkbox"
                              className="rounded border-white/20 text-primary focus:ring-primary/30 bg-background"
                              checked={assignScope.selectedUserIds.includes(u.idUsuario)}
                              onChange={e => {
                                setAssignScope(prev => {
                                  const selectedUserIds = e.target.checked
                                    ? [...prev.selectedUserIds, u.idUsuario]
                                    : prev.selectedUserIds.filter(id => id !== u.idUsuario);
                                  return {
                                    ...prev,
                                    selectedUserIds,
                                    assignAll: selectedUserIds.length === usuariosAsignables.length && usuariosAsignables.length > 0,
                                  };
                                });
                              }}
                            />
                            {u.nombres} {u.apellidos}
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full h-10 rounded-xl shadow-md bg-primary hover:bg-primary/90 text-white transition-all font-semibold"
                      disabled={assignUsuariosMutation.isPending || !task || assignScope.selectedUserIds.length === 0 || !ministerioAsignacionId}
                      onClick={async () => {
                        if (!task) return;
                        if (isAdminIglesia && !assignScope.idSede) { toast.error("Selecciona una sede"); return; }
                        if (!ministerioAsignacionId) { toast.error("Selecciona un ministerio"); return; }

                        const idsToAssign = assignScope.assignAll ? usuariosAsignables.map(u => u.idUsuario) : assignScope.selectedUserIds;
                        if (!idsToAssign.length) { toast.error("Selecciona al menos un usuario"); return; }

                        const result = await assignUsuariosMutation.mutateAsync({
                          idTarea: task.idTarea,
                          idMinisterioContexto: ministerioAsignacionId,
                          idsUsuarios: idsToAssign,
                        });

                        if (result.assigned > 0 || result.duplicated > 0) {
                          toast.success(`${result.assigned} asignados, ${result.duplicated} ya asignados`);
                          setAssignScope(prev => ({ ...prev, selectedUserIds: [], assignAll: false }));
                          return;
                        }
                        toast.error("No se pudo asignar la tarea");
                      }}
                    >
                      {assignUsuariosMutation.isPending ? "Asignando..." : <><UserPlus className="w-4 h-4 mr-2" /> Confirmar Asignación</>}
                    </Button>
                  </div>
                )}

                {/* Archive Indicator */}
                {!editMode && task && (
                  <TaskArchiveIndicator
                    archivedAt={task.archivedAt}
                    onUnarchive={canBulkUpdate ? handleUnarchiveTask : undefined}
                    isLoading={unarchiveMutation.isPending}
                  />
                )}

                {/* Evidence & Review Section — for tasks with assignees or in review state */}
                {!editMode && task && usuarioActual && (
                  <TaskEvidenceReview
                    task={task}
                    currentUserId={usuarioActual.idUsuario}
                    isAssignor={canManageTasks}
                    isAssignee={!!myAssignment}
                  />
                )}
              </div>

              {/* ── Footer ── */}
              <div className="p-5 border-t border-white/5 bg-background/50 backdrop-blur-xl shrink-0 flex items-center justify-between gap-3 flex-wrap">
                {editMode ? (
                  <div className="flex w-full justify-end gap-2">
                    <Button variant="ghost" className="rounded-xl font-semibold" onClick={() => setEditMode(false)}>Cancelar</Button>
                    <Button 
                      className="rounded-xl font-bold px-6 shadow-md" 
                      disabled={updateTareaMutation.isPending}
                      onClick={() => {
                        updateTareaMutation.mutate({
                          id: task.idTarea,
                          data: {
                            titulo: editForm.titulo,
                            descripcion: editForm.descripcion || null,
                            fechaLimite: editForm.fechaLimite || null,
                            prioridad: editForm.prioridad,
                          }
                        }, { onSuccess: () => { toast.success("Tarea actualizada"); setEditMode(false); }});
                      }}
                    >
                      {updateTareaMutation.isPending ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <button
                            className="h-10 px-4 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-all border border-amber-500/20"
                            disabled={updateEstadoMutation.isPending}
                            onClick={() => setConfirmCancel({ open: true, id: task.idTarea })}
                          >
                            <X className="w-3.5 h-3.5" /> Cancelar
                          </button>
                          <button
                            className="h-10 px-4 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                            disabled={deleteTareaMutation.isPending}
                            onClick={() => { handleDeleteTarea(task.idTarea, task.titulo); setSelectedTask(null); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-auto">
                      <Button variant="ghost" className="rounded-xl font-semibold hover:bg-white/5 text-muted-foreground" onClick={() => setSelectedTask(null)}>Cerrar</Button>
                      
                      {/* Only show Iniciar in footer — all other state changes are handled by TaskEvidenceReview */}
                      {canActAsServidor && task.estado === 'pendiente' && (
                        <Button
                          className="rounded-xl font-bold shadow-md px-6"
                          onClick={() => { updateEstadoMutation.mutate({ id: task.idTarea, estado: 'en_progreso' }); }}
                        >
                          Iniciar
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground font-medium">Cargando tarea...</div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogDescription className="sr-only">Formulario para crear una nueva tarea</DialogDescription>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Nueva Tarea
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Completa los datos para crear una nueva tarea.</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {shouldShowSelectorFields && (
              <SedeMinisterioSelector
                sedes={sedes}
                ministerios={ministerios}
                selectedSedeId={createForm.idSede}
                selectedMinisterioId={createForm.idMinisterio}
                onSedeChange={(idSede, clearMinisterio) =>
                  setCreateForm((p) => ({ ...p, idSede, idMinisterio: clearMinisterio ? 0 : p.idMinisterio }))
                }
                onMinisterioChange={(idMinisterio, autoSedeId) =>
                  setCreateForm((p) => ({ ...p, idMinisterio, idSede: autoSedeId }))
                }
                sedeReadOnly={rolActual === "admin_sede" || rolActual === "lider"}
                ministerioReadOnly={rolActual === "lider"}
              />
            )}
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
                <FieldLabel>Fecha y Hora Límite</FieldLabel>
                <Input type="datetime-local" value={createForm.fechaLimite} onChange={e => setCreateForm(p => ({ ...p, fechaLimite: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
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
          <DialogDescription className="sr-only">Confirmación para eliminar una tarea</DialogDescription>
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

      <ConfirmDialog
        isOpen={confirmCancel.open}
        onClose={() => setConfirmCancel({ open: false, id: 0 })}
        onConfirm={() => {
          updateEstadoMutation.mutate({ id: confirmCancel.id, estado: 'cancelada' });
          setConfirmCancel({ open: false, id: 0 });
          setSelectedTask(null);
        }}
        title="¿Cancelar Tarea?"
        description="¿Estás seguro de que quieres cancelar esta tarea? Se marcará como cancelada y detendrá su progreso."
      />

      <ConfirmDialog
        isOpen={confirmRemoveAssign.open}
        onClose={() => setConfirmRemoveAssign({ open: false, id: 0, nombre: "" })}
        onConfirm={() => {
          deleteAsignadaMutation.mutate(confirmRemoveAssign.id);
          setConfirmRemoveAssign({ open: false, id: 0, nombre: "" });
        }}
        title="¿Remover Asignación?"
        description={`¿Estás seguro de que quieres remover a ${confirmRemoveAssign.nombre} de esta tarea?`}
      />
    </div>
  );
}
