/**
 * ReviewCommentsFeed.tsx
 * Displays the chronological timeline of comments and approval/rejection records
 * for the task review workflow. Visible to both assignor and assignee.
 */

import { motion, AnimatePresence } from 'motion/react'
import { MessageSquare, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import type { TimelineEntry } from '@/services/evidenceService'

interface ReviewCommentsFeedProps {
  timeline: TimelineEntry[]
  currentUserId: number
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Ahora mismo'
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days < 7) return `Hace ${days}d`
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function ReviewCommentsFeed({ timeline, currentUserId }: ReviewCommentsFeedProps) {
  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
        <MessageSquare className="w-8 h-8 opacity-20" />
        <p className="text-xs">Sin comentarios aún</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {timeline.map((entry, idx) => {
          if (entry._kind === 'comentario') {
            const isOwn = entry.idUsuario === currentUserId
            return (
              <motion.div
                key={`c-${entry.idTareaComentario}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm">
                  {(entry.nombreCompleto || '?').charAt(0).toUpperCase()}
                </div>
                <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {entry.nombreCompleto || 'Usuario'}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60">
                      {formatRelativeTime(entry.creadoEn)}
                    </span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed ${
                    isOwn
                      ? 'bg-[#4682b4]/20 border border-[#4682b4]/30 text-foreground rounded-tr-sm'
                      : 'bg-white/5 border border-white/10 text-foreground rounded-tl-sm'
                  }`}>
                    {entry.contenido}
                  </div>
                </div>
              </motion.div>
            )
          }

          if (entry._kind === 'aprobacion') {
            const isApproval = entry.accion === 'aprobar'
            const isRejection = entry.accion === 'rechazar'

            const iconClass = isApproval
              ? 'bg-emerald-500/20 border-emerald-500/30'
              : isRejection
              ? 'bg-rose-500/20 border-rose-500/30'
              : 'bg-amber-500/20 border-amber-500/30'

            const textClass = isApproval
              ? 'text-emerald-400'
              : isRejection
              ? 'text-rose-400'
              : 'text-amber-400'

            const Icon = isApproval ? CheckCircle2 : isRejection ? XCircle : RotateCcw

            const label = isApproval
              ? '✓ Aprobado'
              : isRejection
              ? '✗ Rechazado'
              : '↻ Reabierto'

            return (
              <motion.div
                key={`a-${entry.idTareaAprobacion}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04 }}
                className="flex justify-center"
              >
                <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${iconClass} max-w-[90%] w-full`}>
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${textClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span className={`text-[11px] font-black uppercase tracking-wide ${textClass}`}>
                        {label}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        {formatRelativeTime(entry.creadoEn)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      por <strong className="text-foreground/80">{entry.nombreCompleto || 'Usuario'}</strong>
                    </p>
                    {entry.observaciones && (
                      <p className="text-[11px] text-foreground/70 mt-1.5 whitespace-pre-wrap leading-relaxed border-t border-white/5 pt-1.5">
                        {entry.observaciones}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          }

          return null
        })}
      </AnimatePresence>
    </div>
  )
}
