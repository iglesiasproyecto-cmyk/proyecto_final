import { useCompanerosCiclo } from '@/hooks/useInscripciones'
import { EstadoInscripcionBadge } from './EstadoInscripcionBadge'
import { Users, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  idCiclo: number | null
  cursoNombre: string
  onClose: () => void
}

export function CompanerosDrawer({ idCiclo, cursoNombre, onClose }: Props) {
  const { data = [], isLoading } = useCompanerosCiclo(idCiclo)

  return (
    <AnimatePresence>
      {idCiclo !== null && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-card border-l border-white/10 z-50 shadow-2xl flex flex-col"
          >
            <header className="flex items-center justify-between p-4 border-b border-border/40">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compañeros</p>
                <h3 className="font-bold text-sm">{cursoNombre}</h3>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl hover:bg-accent/40 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto divide-y divide-border/30">
              {isLoading && <p className="p-4 text-xs text-muted-foreground">Cargando...</p>}
              {!isLoading && data.length === 0 && (
                <div className="p-8 flex flex-col items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5 opacity-40" />
                  <p className="text-xs">Sin compañeros visibles.</p>
                </div>
              )}
              {data.map((c) => (
                <div key={c.idDetalleProcesoCurso} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                    {(c.nombres[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {c.nombres} {c.apellidos}
                    </p>
                  </div>
                  <EstadoInscripcionBadge estado={c.estado} />
                </div>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
