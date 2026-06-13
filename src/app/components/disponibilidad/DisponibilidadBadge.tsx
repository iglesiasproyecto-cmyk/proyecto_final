// src/app/components/disponibilidad/DisponibilidadBadge.tsx
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useDisponibilidadUsuario, estaDisponible } from '@/hooks/useDisponibilidad'

interface Props {
  usuarioId: number
  nombreUsuario: string
  fecha: string   // 'YYYY-MM-DD'
}

export function DisponibilidadBadge({ usuarioId, nombreUsuario, fecha }: Props) {
  const { data: reglas = [], isLoading } = useDisponibilidadUsuario(usuarioId)

  if (isLoading || !fecha) return null

  const fechaObj = new Date(fecha + 'T12:00:00') // mediodía para evitar offset TZ
  const { disponible, nota } = estaDisponible(usuarioId, fechaObj, reglas)

  if (disponible) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{nombreUsuario} está disponible</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold">{nombreUsuario} no está disponible este día</p>
        {nota && <p className="text-[10px] opacity-80 mt-0.5">Motivo: {nota}</p>}
      </div>
    </div>
  )
}
