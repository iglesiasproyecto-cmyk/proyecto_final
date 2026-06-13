// src/app/components/disponibilidad/EquipoDisponibilidadPanel.tsx
import { useState, useMemo } from 'react'
import { X, Users } from 'lucide-react'
import { motion } from 'motion/react'
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

  const ids = useMemo(() => servidores.map(s => s.idUsuario), [servidores])
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
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">Disponibilidad del Equipo</h3>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{servidores.length} {servidores.length === 1 ? 'servidor' : 'servidores'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-primary/10 transition-all duration-200"
          title="Cerrar panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 block">Filtrar por servidor</label>
        <select
          value={filtroId}
          onChange={e => setFiltroId(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
          className="w-full h-10 rounded-xl border-2 border-white/10 bg-white dark:bg-black/20 backdrop-blur-sm px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all cursor-pointer hover:border-primary/20"
        >
          <option value="todos">Todos los servidores</option>
          {servidores.map(s => (
            <option key={s.idUsuario} value={s.idUsuario}>{s.nombreCompleto}</option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div className="relative">
        {isLoading ? (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs text-muted-foreground text-center py-12 font-medium"
          >
            Cargando disponibilidad...
          </motion.div>
        ) : (
          <div className="bg-gradient-to-br from-white/50 to-white/30 dark:from-black/30 dark:to-black/20 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
            <CalendarioMensual
              renderDay={({ date, isCurrentMonth }) => {
                if (!isCurrentMonth) return null
                const ausentes = ausenciasDia(date)
                if (ausentes.length === 0) return null
                const allAbsent = ausentes.length === servidoresFiltrados.length && servidoresFiltrados.length > 0
                return (
                  <div className={`absolute inset-0 rounded-xl pointer-events-none transition-all ${
                    allAbsent
                      ? 'bg-rose-500/20 ring-1 ring-inset ring-rose-400/40'
                      : 'bg-amber-500/15 ring-1 ring-inset ring-amber-400/30'
                  }`}>
                    <div className="absolute bottom-1 left-0 right-0 flex flex-wrap justify-center gap-0.5 px-0.5">
                      {ausentes.slice(0, 3).map(srv => (
                        <motion.span
                          key={srv.idUsuario}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          title={srv.nombreCompleto || '?'}
                          className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 text-[6px] text-white font-black flex items-center justify-center leading-none shadow-sm"
                        >
                          {(srv.nombreCompleto || "?").charAt(0).toUpperCase()}
                        </motion.span>
                      ))}
                      {ausentes.length > 3 && (
                        <span className="w-3.5 h-3.5 rounded-full bg-rose-400/50 text-[6px] text-white font-black flex items-center justify-center text-[5px]">
                          +{ausentes.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )
              }}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Indicadores</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[11px] text-foreground/80 font-medium">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm" />
            <span>Algunos no disponibles</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-foreground/80 font-medium">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 shadow-sm" />
            <span>Todos no disponibles</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
