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
          <Input placeholder="Buscar por título o descripción..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-background/50 border-white/10 h-11" />
        </div>
        <div className="flex gap-3">
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-[150px] bg-background/50 border-white/10 h-11" />
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as "newest" | "oldest")} className="w-[180px] h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
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
                            <Badge variant="outline" className={`${prio.color} border-0 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-lg`}>{prio.label}</Badge>
                            {t.fechaLimite && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase bg-white/5 px-2 py-0.5 rounded-lg">
                                <Calendar className="w-2.5 h-2.5" />{t.fechaLimite}
                              </span>
                            )}
                          </div>
                          <h4 className="text-[13px] font-bold leading-snug group-hover:text-[#4682b4] transition-colors mb-1 uppercase italic">{t.titulo}</h4>
                          {t.eventoNombre && <p className="text-[10px] font-bold text-[#4682b4]/60 mb-2 truncate uppercase tracking-wider">↳ {t.eventoNombre}</p>}
                          {t.descripcion && <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{t.descripcion}</p>}
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
                  <FieldLabel><span className="flex items-center gap-1.5"><UserPlus className="w-3 h-3" />Asignar servidor</span></FieldLabel>
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
                    <FieldLabel><span className="flex items-center gap-1.5"><Paperclip className="w-3 h-3" />Evidencias</span></FieldLabel>
                    <div className="space-y-2">
                      {evidencias.map(ev => (
                        <div key={ev.idTareaEvidencia} className="flex items-center justify-between gap-3 bg-background/40 border border-white/10 rounded-xl px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{ev.nombreArchivo}</p>
                            {ev.nombreCompleto && <p className="text-[10px] text-muted-foreground truncate">{ev.nombreCompleto}</p>}
                          </div>
                          <Button variant="ghost" className="h-8 px-3 rounded-lg" onClick={async () => {
                            try { window.open(await getTareaEvidenciaSignedUrl(ev.objectPath), "_blank", "noopener,noreferrer") }
                            catch { toast.error("No se pudo abrir la evidencia.") }
                          }}>Ver</Button>
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
                    <Button variant="ghost" className="rounded-xl" onClick={() => { updateEstado.mutate({ id: task.idTarea, estado: "en_progreso" }); setSelectedTaskId(null) }}>
                      Reabrir
                    </Button>
                    <Button className="rounded-xl" onClick={() => { updateEstado.mutate({ id: task.idTarea, estado: "completada" }); setSelectedTaskId(null) }}>
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
            <Button variant="ghost" className="rounded-xl w-full" onClick={() => setDeleteConfirm({ open: false, id: 0, titulo: "" })}>Cancelar</Button>
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
