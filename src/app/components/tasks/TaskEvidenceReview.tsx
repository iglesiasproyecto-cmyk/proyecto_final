/**
 * TaskEvidenceReview.tsx
 * Full review panel shown in the task detail dialog when task is "en_revision" or has any review history.
 * 
 * For assignors: shows evidence, comments feed, approve/reject buttons
 * For assignees: shows status, comment feed, evidence upload when rejected
 */

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  FileText, Image, Download, Upload, CheckCircle2, XCircle, 
  MessageSquare, Send, Loader2, AlertTriangle, FilePlus, X
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { ReviewCommentsFeed } from './ReviewCommentsFeed'
import { 
  useTaskTimeline, 
  useCreateTareaComentario, 
  useCreateTareaAprobacion,
  useTareaEvidencias,
  useCreateTareaEvidencia,
  useUpdateTareaEstado,
} from '@/hooks/useEventos'
import { getTareaEvidenciaSignedUrl } from '@/services/eventos.service'
import { validateFile, validateFileCount, MAX_FILES_PER_TASK } from '@/services/evidenceService'
import type { TareaEnriquecida } from '@/services/eventos.service'
import { toast } from 'sonner'

interface TaskEvidenceReviewProps {
  task: TareaEnriquecida
  currentUserId: number
  isAssignor: boolean   // creator/lider can approve/reject
  isAssignee: boolean   // assigned user can upload evidence and send to review
}

function getFileIcon(nombre: string) {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image className="w-4 h-4 text-[#4682b4]" />
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-400" />
  return <FileText className="w-4 h-4 text-amber-400" />
}

export function TaskEvidenceReview({ task, currentUserId, isAssignor, isAssignee }: TaskEvidenceReviewProps) {
  const [comment, setComment] = useState('')
  const [rejectComment, setRejectComment] = useState('')
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [evidenceUploading, setEvidenceUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const { data: timeline = [], isLoading: timelineLoading } = useTaskTimeline(task.idTarea)
  const { data: evidencias = [], isLoading: evidenciasLoading } = useTareaEvidencias(task.idTarea)
  const commentMutation = useCreateTareaComentario()
  const approvalMutation = useCreateTareaAprobacion()
  const createEvidenciaMutation = useCreateTareaEvidencia()
  const updateEstadoMutation = useUpdateTareaEstado()

  // My assignment (needed for evidence upload)
  const myAssignment = task.asignados?.find(a => a.idUsuario === currentUserId) ?? null

  const isDeadlinePassed = task.fechaLimite
    ? new Date(task.fechaLimite) < new Date()
    : false

  // Lock uploading new evidence only when deadline has passed AND task is not already in review
  // Reviewing/approving/commenting is always allowed regardless of deadline
  const isUploadLocked = isDeadlinePassed && task.estado !== 'en_revision' && task.estado !== 'en_progreso'
  const isInRevision = task.estado === 'en_revision'

  // File handling
  const handleFilesSelected = (files: File[]) => {
    for (const file of files) {
      // Check count against current state + already-uploaded
      const countErr = validateFileCount(pendingFiles.length + evidencias.length)
      if (countErr) { toast.error(countErr.message); break }
      const typeErr = validateFile(file)
      if (typeErr) { toast.error(typeErr.message); continue }
      setPendingFiles(prev => [...prev, file])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFilesSelected(Array.from(e.dataTransfer.files))
  }

  const removePending = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSendToReview = async () => {
    if (!myAssignment) {
      toast.error('No tienes asignación válida para esta tarea')
      return
    }

    setEvidenceUploading(true)
    try {
      // Upload pending files
      for (const file of pendingFiles) {
        await createEvidenciaMutation.mutateAsync({
          idTareaAsignada: myAssignment.idTareaAsignada,
          idUsuario: currentUserId,
          file,
        })
      }
      setPendingFiles([])

      // Update task status to en_revision
      await updateEstadoMutation.mutateAsync({ id: task.idTarea, estado: 'en_revision' })
      toast.success('Evidencia enviada para revisión')
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar evidencia')
    } finally {
      setEvidenceUploading(false)
    }
  }

  const handleAddComment = () => {
    if (!comment.trim()) return
    commentMutation.mutate({
      idTarea: task.idTarea,
      idUsuario: currentUserId,
      contenido: comment.trim(),
    }, {
      onSuccess: () => setComment(''),
    })
  }

  const handleApprove = () => {
    approvalMutation.mutate({
      idTarea: task.idTarea,
      idUsuario: currentUserId,
      accion: 'aprobar',
      observaciones: comment.trim() || null,
    }, {
      onSuccess: () => {
        // Also update task estado to completada
        updateEstadoMutation.mutate({ id: task.idTarea, estado: 'completada' })
        setComment('')
      },
    })
  }

  const handleReject = () => {
    if (!rejectComment.trim()) {
      toast.error('Debes dejar un comentario explicando el rechazo')
      return
    }
    approvalMutation.mutate({
      idTarea: task.idTarea,
      idUsuario: currentUserId,
      accion: 'rechazar',
      observaciones: rejectComment.trim(),
    }, {
      onSuccess: () => {
        // Return task to en_progreso so assignee can work again
        updateEstadoMutation.mutate({ id: task.idTarea, estado: 'en_progreso' })
        setRejectComment('')
        setShowRejectPanel(false)
      },
    })
  }

  const handleOpenEvidence = async (objectPath: string) => {
    try {
      const url = await getTareaEvidenciaSignedUrl(objectPath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('No se pudo abrir el archivo')
    }
  }

  const totalFileCount = evidencias.length + pendingFiles.length
  const canUploadMore = totalFileCount < MAX_FILES_PER_TASK

  return (
    <div className="space-y-5 pt-4 border-t border-white/5">

      {/* ── Section Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <FilePlus className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-foreground">
            Evidencia &amp; Revisión
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {isInRevision ? 'En revisión por el responsable' : 'Adjunta archivos y envía para revisión'}
          </p>
        </div>
        {isInRevision && (
          <span className="ml-auto text-[9px] font-black uppercase bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full">
            En Revisión
          </span>
        )}
      </div>

      {/* ── Deadline Warning ── */}
      {isDeadlinePassed && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] font-medium">Fecha límite vencida — solo el revisador puede comentar</span>
        </div>
      )}

      {/* ── Evidence Files ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Archivos Adjuntos ({evidencias.length}/{MAX_FILES_PER_TASK})
        </p>

        {evidenciasLoading ? (
          <div className="flex items-center gap-2 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cargando archivos...</span>
          </div>
        ) : evidencias.length === 0 && pendingFiles.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sin archivos adjuntos</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {evidencias.map((ev) => (
              <div
                key={ev.idTareaEvidencia}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
              >
                {getFileIcon(ev.nombreArchivo)}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{ev.nombreArchivo}</p>
                  {ev.nombreCompleto && (
                    <p className="text-[9px] text-muted-foreground">por {ev.nombreCompleto}</p>
                  )}
                </div>
                <button
                  onClick={() => handleOpenEvidence(ev.objectPath)}
                  className="p-1.5 rounded-lg hover:bg-[#4682b4]/20 text-muted-foreground hover:text-[#4682b4] transition-colors"
                  title="Abrir archivo"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Pending new files */}
            {pendingFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
              >
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{file.name}</p>
                  <p className="text-[9px] text-amber-400">
                    {(file.size / 1024 / 1024).toFixed(2)}MB — pendiente
                  </p>
                </div>
                <button
                  onClick={() => removePending(idx)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Upload zone (assignee only, not upload-locked, not in revision) ── */}
        {isAssignee && !isUploadLocked && !isInRevision && canUploadMore && (
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#4682b4] bg-[#4682b4]/10'
                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-[9px] text-muted-foreground/60 mt-0.5">
              JPG, PNG, PDF, DOC — Máx 10MB por archivo
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handleFilesSelected(Array.from(e.target.files || []))}
            />
          </div>
        )}

        {/* ── Send to Review button ── */}
        {isAssignee && !isInRevision && !isUploadLocked && (pendingFiles.length > 0 || evidencias.length > 0 || task.estado === 'en_progreso') && (
          <Button
            onClick={handleSendToReview}
            disabled={evidenceUploading || updateEstadoMutation.isPending}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-purple-900/30 rounded-xl font-bold"
          >
            {evidenceUploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Enviar para Revisión</>
            )}
          </Button>
        )}
      </div>

      {/* ── Timeline / Comments Feed ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Historial de Revisión
        </p>

        {timelineLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cargando...</span>
          </div>
        ) : (
          <ReviewCommentsFeed timeline={timeline} currentUserId={currentUserId} />
        )}
      </div>

      {/* ── Comment box (everyone can comment — no lock on comments) ── */}
      {(
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Agregar un comentario..."
              className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#4682b4]/50 focus:ring-1 focus:ring-[#4682b4]/30 transition-all"
            />
            <button
              onClick={handleAddComment}
              disabled={!comment.trim() || commentMutation.isPending}
              className="w-9 h-9 rounded-xl bg-[#4682b4]/20 hover:bg-[#4682b4]/30 border border-[#4682b4]/30 flex items-center justify-center text-[#4682b4] disabled:opacity-40 transition-colors"
            >
              {commentMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <MessageSquare className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Assignor: Approve / Reject buttons (siempre permitido en revisión, sin lock) ── */}
      {isAssignor && isInRevision && (
        <div className="space-y-3 pt-2 border-t border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Decisión del Revisor
          </p>

          <AnimatePresence mode="wait">
            {!showRejectPanel ? (
              <motion.div
                key="action-buttons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-2"
              >
                <Button
                  onClick={handleApprove}
                  disabled={approvalMutation.isPending || updateEstadoMutation.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20"
                >
                  {approvalMutation.isPending
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4 mr-2" />
                  }
                  Aprobar Tarea
                </Button>
                <Button
                  onClick={() => setShowRejectPanel(true)}
                  variant="outline"
                  className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl font-bold"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="reject-panel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    Motivo del rechazo <span className="text-rose-500">*</span>
                  </p>
                  <button
                    onClick={() => setShowRejectPanel(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Explica qué debe corregir el asignado..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-rose-500/20 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-rose-500/40 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleReject}
                    disabled={!rejectComment.trim() || approvalMutation.isPending}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold"
                  >
                    {approvalMutation.isPending
                      ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      : <XCircle className="w-4 h-4 mr-2" />
                    }
                    Confirmar Rechazo
                  </Button>
                  <Button
                    onClick={() => setShowRejectPanel(false)}
                    variant="outline"
                    className="border-white/10 rounded-xl"
                  >
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Approved status ── */}
      {task.estado === 'completada' && timeline.some(t => t._kind === 'aprobacion' && (t as any).accion === 'aprobar') && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-[12px] font-bold text-emerald-400">Tarea Aprobada</p>
            <p className="text-[10px] text-muted-foreground">El trabajo fue aceptado por el revisor</p>
          </div>
        </div>
      )}
    </div>
  )
}
