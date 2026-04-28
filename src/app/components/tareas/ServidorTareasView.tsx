import { useState, useMemo } from "react"
import {
  useTareasEnriquecidas, useUpdateTareaEstado,
  useTareaEvidencias, useCreateTareaEvidencia,
} from "@/hooks/useEventos"
import { getTareaEvidenciaSignedUrl } from "@/services/eventos.service"
import { useApp } from "@/app/store/AppContext"
import { AnimatedCard } from "@/app/components/ui/AnimatedCard"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import {
  ListTodo, CheckCircle2, Clock, AlertCircle,
  Calendar, Paperclip, Inbox, ChevronRight,
} from "lucide-react"

const statusConfig = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20",       dot: "bg-amber-400",   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  en_progreso: { label: "En Progreso", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",       dot: "bg-[#4682b4]",    icon: <Clock className="w-3.5 h-3.5" /> },
  en_revision: { label: "En Revisión", color: "bg-violet-500/10 text-violet-400 border-violet-500/20",    dot: "bg-violet-400",   icon: <Clock className="w-3.5 h-3.5" /> },
  completada:  { label: "Completada",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelada:   { label: "Cancelada",   color: "bg-rose-500/10 text-rose-400 border-rose-500/20",          dot: "bg-rose-400",    icon: <AlertCircle className="w-3.5 h-3.5" /> },
} as const

const prioridadConfig: Record<string, { label: string; color: string }> = {
  baja:    { label: "Baja",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  media:   { label: "Media",   color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
  alta:    { label: "Alta",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  urgente: { label: "Urgente", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
}

const STATUS_TABS = [
  { key: "todas",       label: "Todas" },
  { key: "pendiente",   label: "Pendientes" },
  { key: "en_progreso", label: "En Progreso" },
  { key: "en_revision", label: "En Revisión" },
  { key: "completada",  label: "Completadas" },
] as const

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
      {children}
    </label>
  )
}

type TabKey = typeof STATUS_TABS[number]["key"]

export function ServidorTareasView() {
  const { usuarioActual } = useApp()
  const { data: todasTareas = [], isLoading } = useTareasEnriquecidas()
  const updateEstado = useUpdateTareaEstado()
  const createEvidencia = useCreateTareaEvidencia()

  const [activeTab, setActiveTab] = useState<TabKey>("todas")
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [evidenceUploading, setEvidenceUploading] = useState(false)

  const misTareas = useMemo(() => {
    return todasTareas.filter(t => t.asignados?.some(a => a.idUsuario === usuarioActual?.idUsuario))
  }, [todasTareas, usuarioActual?.idUsuario])

  const filteredTareas = useMemo(() => {
    if (activeTab === "todas") return misTareas
    return misTareas.filter(t => t.estado === activeTab)
  }, [misTareas, activeTab])

  const task = selectedTaskId ? misTareas.find(t => t.idTarea === selectedTaskId) ?? null : null
  const myAssignment = task?.asignados?.find(a => a.idUsuario === usuarioActual?.idUsuario) ?? null
  const { data: evidencias = [] } = useTareaEvidencias(selectedTaskId ?? undefined)

  const getNextAction = (estado: string) => {
    if (estado === "pendiente")   return { label: "Iniciar tarea",     next: "en_progreso" as const, icon: <ChevronRight className="w-3.5 h-3.5" /> }
    if (estado === "en_progreso") return { label: "Enviar a revisión", next: "en_revision" as const,  icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
    return null
  }

  const canUploadEvidence = task && myAssignment &&
    (task.estado === "en_progreso" || task.estado === "en_revision")

  const handleUploadEvidence = (file: File) => {
    if (!usuarioActual || !myAssignment) return
    setEvidenceUploading(true)
    createEvidencia.mutate(
      { idTareaAsignada: myAssignment.idTareaAsignada, idUsuario: usuarioActual.idUsuario, file },
      {
        onSuccess: () => toast.success("Evidencia subida exitosamente."),
        onError: () => toast.error("Error al subir evidencia."),
        onSettled: () => setEvidenceUploading(false),
      }
    )
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Cargando tus tareas...</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
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
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Mis Asignaciones</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Mis Tareas</h1>
            <p className="text-muted-foreground text-xs mt-1">
              {misTareas.length} tarea{misTareas.length !== 1 ? "s" : ""} asignada{misTareas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {STATUS_TABS.map(tab => {
          const count = tab.key === "todas" ? misTareas.length : misTareas.filter(t => t.estado === tab.key).length
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                active ? "bg-primary/10 border-primary/30 text-primary" : "bg-card/40 border-white/10 text-muted-foreground hover:border-white/20"
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${active ? "bg-primary/20" : "bg-white/5"}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Task list */}
      {filteredTareas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground bg-card/20 rounded-3xl border border-white/5">
          <Inbox className="w-10 h-10 opacity-20" />
          <p className="text-sm">No tienes tareas en este estado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredTareas.map((t, idx) => {
              const cfg = statusConfig[t.estado as keyof typeof statusConfig] ?? statusConfig.pendiente
              const prio = prioridadConfig[t.prioridad] ?? prioridadConfig.media
              const action = getNextAction(t.estado)
              return (
                <AnimatedCard key={t.idTarea} index={idx} className="p-4 group cursor-pointer" onClick={() => setSelectedTaskId(t.idTarea)}>
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-xl ${cfg.color} border flex items-center justify-center shrink-0 mt-0.5`}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-[14px] font-bold group-hover:text-[#4682b4] transition-colors uppercase italic leading-snug">{t.titulo}</h4>
                        <Badge variant="outline" className={`${prio.color} border-0 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-lg shrink-0`}>{prio.label}</Badge>
                      </div>
                      {t.eventoNombre && <p className="text-[10px] font-bold text-[#4682b4]/60 mb-1 truncate uppercase tracking-wider">↳ {t.eventoNombre}</p>}
                      {t.descripcion && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">{t.descripcion}</p>}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${cfg.color} border text-[9px] uppercase font-bold tracking-wider`}>{cfg.label}</Badge>
                          {t.fechaLimite && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/60 uppercase">
                              <Calendar className="w-2.5 h-2.5" />{t.fechaLimite}
                            </span>
                          )}
                        </div>
                        {action && (
                          <button
                            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
                            onClick={e => { e.stopPropagation(); updateEstado.mutate({ id: t.idTarea, estado: action.next }) }}
                          >
                            {action.icon}{action.label}
                          </button>
                        )}
                        {t.estado === "en_revision" && (
                          <span className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            <Clock className="w-3 h-3" />Esperando revisión
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimatedCard>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTaskId} onOpenChange={() => setSelectedTaskId(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {task && (
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${statusConfig[task.estado as keyof typeof statusConfig]?.color} border flex items-center justify-center shrink-0 mt-0.5`}>
                  {statusConfig[task.estado as keyof typeof statusConfig]?.icon}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold leading-snug">{task.titulo}</DialogTitle>
                  {task.eventoNombre && <p className="text-[11px] text-primary/60 mt-0.5">↳ {task.eventoNombre}</p>}
                </div>
              </div>
            )}
          </DialogHeader>

          {task && (
            <>
              <div className="space-y-4 py-1">
                {task.descripcion && (
                  <div>
                    <FieldLabel>Descripción</FieldLabel>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-background/40 rounded-xl p-3 border border-white/5">{task.descripcion}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Estado</FieldLabel>
                    <Badge variant="outline" className={`${statusConfig[task.estado as keyof typeof statusConfig]?.color} border text-[10px] uppercase font-bold w-full justify-center py-1`}>
                      {statusConfig[task.estado as keyof typeof statusConfig]?.label}
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

                {/* Evidencias */}
                <div className="pt-2 border-t border-border/40">
                  <FieldLabel><span className="flex items-center gap-1.5"><Paperclip className="w-3 h-3" />Evidencias</span></FieldLabel>
                  {evidencias.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {evidencias.map(ev => (
                        <div key={ev.idTareaEvidencia} className="flex items-center justify-between gap-3 bg-background/40 border border-white/10 rounded-xl px-3 py-2">
                          <p className="text-xs font-semibold truncate">{ev.nombreArchivo}</p>
                          <Button variant="ghost" className="h-8 px-3 rounded-lg" onClick={async () => {
                            try { window.open(await getTareaEvidenciaSignedUrl(ev.objectPath), "_blank", "noopener,noreferrer") }
                            catch { toast.error("No se pudo abrir la evidencia.") }
                          }}>Ver</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {canUploadEvidence ? (
                    <div>
                      <input
                        type="file"
                        className="w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-[#4682b4]/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#4682b4] hover:file:bg-[#4682b4]/20"
                        disabled={evidenceUploading}
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) handleUploadEvidence(f)
                          e.currentTarget.value = ""
                        }}
                      />
                      {evidenceUploading && <p className="text-[10px] text-muted-foreground mt-1">Subiendo evidencia...</p>}
                    </div>
                  ) : (
                    evidencias.length === 0 && <p className="text-[10px] text-muted-foreground/50">Sin evidencias adjuntas.</p>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t border-border/50 pt-4 gap-2">
                <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedTaskId(null)}>Cerrar</Button>
                {(() => {
                  const action = getNextAction(task.estado)
                  if (!action) return null
                  return (
                    <Button className="rounded-xl" onClick={() => { updateEstado.mutate({ id: task.idTarea, estado: action.next }); setSelectedTaskId(null) }}>
                      {action.label}
                    </Button>
                  )
                })()}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
