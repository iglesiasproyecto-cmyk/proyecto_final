// src/app/components/disponibilidad/EquipoDisponibilidadPanel.tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { CalendarioMensual } from './CalendarioMensual'
import { useDisponibilidadEquipo, estaDisponible } from '@/hooks/useDisponibilidad'

interface Servidor {
  idUsuario: number
  nombreCompleto: string
}

interface Props {
  servidores: Servidor[]
  onClose: () => void
}

export function EquipoDisponibilidadPanel({ servidores, onClose }: Props) {
  const [filtroId, setFiltroId] = useState<number | 'todos'>('todos')

  const ids = servidores.map(s => s.idUsuario)
  const { data: reglas = [], isLoading } = useDisponibilidadEquipo(ids)

  const servidoresFiltrados = filtroId === 'todos'
    ? servidores
    : servidores.filter(s => s.idUsuario === filtroId)

  function ausenciasDia(date: Date): Servidor[] {
    return servidoresFiltrados.filter(srv => {
      const reglasServidor = reglas.filter(r => r.usuarioId === srv.idUsuario)
      const { disponible } = estaDisponible(srv.idUsuario, date, reglasServidor)
      return !disponible
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Disponibilidad del equipo</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{servidores.length} servidores</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter */}
      <select
        value={filtroId}
        onChange={e => setFiltroId(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
        className="w-full h-9 rounded-xl border border-white/10 bg-background/50 px-3 text-xs text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
      >
        <option value="todos">Todos los servidores</option>
        {servidores.map(s => (
          <option key={s.idUsuario} value={s.idUsuario}>{s.nombreCompleto}</option>
        ))}
      </select>

      {/* Calendar */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Cargando disponibilidad...</p>
      ) : (
        <CalendarioMensual
          renderDay={({ date, isCurrentMonth }) => {
            if (!isCurrentMonth) return null
            const ausentes = ausenciasDia(date)
            if (ausentes.length === 0) return null
            const allAbsent = ausentes.length === servidoresFiltrados.length && servidoresFiltrados.length > 0
            return (
              <div className={`absolute inset-0 rounded-xl pointer-events-none ${
                allAbsent
                  ? 'bg-rose-500/15 border border-rose-500/30'
                  : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                <div className="absolute bottom-0.5 left-0 right-0 flex flex-wrap justify-center gap-0.5 px-0.5">
                  {ausentes.slice(0, 3).map(srv => (
                    <span
                      key={srv.idUsuario}
                      title={srv.nombreCompleto}
                      className="w-3.5 h-3.5 rounded-full bg-rose-400/80 text-[6px] text-white font-black flex items-center justify-center leading-none"
                    >
                      {srv.nombreCompleto.charAt(0).toUpperCase()}
                    </span>
                  ))}
                  {ausentes.length > 3 && (
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-400/40 text-[6px] text-rose-200 font-black flex items-center justify-center">
                      +{ausentes.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )
          }}
        />
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500/60 inline-block" />
          Algunos no disponibles
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-500/60 inline-block" />
          Todos no disponibles
        </span>
      </div>
    </div>
  )
}
