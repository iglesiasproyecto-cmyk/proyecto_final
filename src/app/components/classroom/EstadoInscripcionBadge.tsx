import { Badge } from '../ui/badge'
import type { DetalleProcesoCurso } from '@/types/app.types'

const CONFIG: Record<DetalleProcesoCurso['estado'], { label: string; color: string }> = {
  inscrito: { label: 'Inscrito', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  en_progreso: { label: 'En Progreso', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completado: { label: 'Completado', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  retirado: { label: 'Retirado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
}

export function EstadoInscripcionBadge({ estado }: { estado: DetalleProcesoCurso['estado'] }) {
  const cfg = CONFIG[estado] ?? CONFIG.inscrito
  return (
    <Badge
      variant="outline"
      className={`${cfg.color} border text-[9px] uppercase font-bold tracking-wider px-2 py-0.5`}
    >
      {cfg.label}
    </Badge>
  )
}
