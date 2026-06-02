import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import {
  CheckCircle2, XCircle, ChevronDown, ChevronRight, Users, ClipboardList,
  TrendingUp, Award, Calendar, Mail
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface CalificacionesTabProps {
  idCurso: number
}

export function CalificacionesTab({ idCurso }: CalificacionesTabProps) {
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set())

  const { data: evaluaciones = [], isLoading } = useQuery({
    queryKey: ['calificaciones-curso', idCurso],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_calificaciones_curso', { p_id_curso: idCurso })
      if (error) throw error
      return (data as any[]) || []
    }
  })

  const toggleExpandir = (id: number) => {
    setExpandidas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-card/20 border border-border/20 rounded-3xl animate-pulse" />
          ))}
        </div>
        {[1, 2].map(i => (
          <div key={i} className="h-20 bg-card/20 border border-border/20 rounded-3xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!evaluaciones.length) {
    return (
      <Card className="border-border/50 bg-card/40 backdrop-blur-xl rounded-[32px] overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground/50 mb-4">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight">Sin Calificaciones</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2 leading-relaxed">
            Las calificaciones y los intentos realizados por los servidores aparecerán tan pronto como completen las evaluaciones disponibles.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas Resumen Global (Responsivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(() => {
          const totalIntentos = evaluaciones.reduce((acc: number, ev: any) => acc + (ev.intentos?.length || 0), 0)
          const aprobados = evaluaciones.reduce((acc: number, ev: any) => acc + (ev.intentos?.filter((i: any) => i.aprobado).length || 0), 0)
          const tasaAprobacion = totalIntentos > 0 ? Math.round((aprobados / totalIntentos) * 100) : 0
          return (
            <>
              <div className="p-5 rounded-3xl bg-card/40 border border-border/40 backdrop-blur-xl flex sm:flex-col justify-between items-center sm:text-center gap-2 shadow-sm">
                <span className="text-xs text-muted-foreground font-black uppercase tracking-widest sm:order-2">Evaluaciones</span>
                <span className="text-3xl font-black text-primary sm:order-1">{evaluaciones.length}</span>
              </div>
              <div className="p-5 rounded-3xl bg-card/40 border border-border/40 backdrop-blur-xl flex sm:flex-col justify-between items-center sm:text-center gap-2 shadow-sm">
                <span className="text-xs text-muted-foreground font-black uppercase tracking-widest sm:order-2">Intentos</span>
                <span className="text-3xl font-black text-foreground sm:order-1">{totalIntentos}</span>
              </div>
              <div className={`p-5 rounded-3xl border backdrop-blur-xl flex sm:flex-col justify-between items-center sm:text-center gap-2 shadow-sm transition-colors duration-300 ${
                tasaAprobacion >= 70 ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'
              }`}>
                <span className="text-xs text-muted-foreground font-black uppercase tracking-widest sm:order-2">Tasa de Aprobación</span>
                <span className={`text-3xl font-black sm:order-1 ${tasaAprobacion >= 70 ? 'text-green-600' : 'text-orange-500'}`}>{tasaAprobacion}%</span>
              </div>
            </>
          )
        })()}
      </div>

      {/* Listado de Evaluaciones */}
      <div className="space-y-4">
        {evaluaciones.map((ev: any) => {
          const intentos = ev.intentos || []
          const aprobados = intentos.filter((i: any) => i.aprobado).length
          const promedio = intentos.length > 0
            ? Math.round(intentos.reduce((s: number, i: any) => s + (i.puntaje || 0), 0) / intentos.length)
            : 0
          const expandida = expandidas.has(ev.id_evaluacion)

          return (
            <motion.div
              key={ev.id_evaluacion}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm"
            >
              {/* Fila principal */}
              <button
                onClick={() => toggleExpandir(ev.id_evaluacion)}
                className="w-full p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-accent/15 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                    <ClipboardList className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-foreground uppercase tracking-tight italic leading-tight">{ev.titulo_evaluacion}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{ev.modulo_titulo} · Puntaje Mínimo: {ev.puntaje_minimo}%</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground mt-2 md:mt-0 border-t md:border-none pt-3 md:pt-0 border-border/40">
                  <span className="flex items-center gap-1.5 bg-background/40 py-1 px-3 rounded-full border border-border/40">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    {intentos.length} intentos
                  </span>
                  <span className="flex items-center gap-1.5 bg-green-500/10 text-green-600 py-1 px-3 rounded-full border border-green-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {aprobados} aprobados
                  </span>
                  <span className="flex items-center gap-1.5 bg-background/40 py-1 px-3 rounded-full border border-border/40">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                    Promedio: {promedio}%
                  </span>
                  <span className="hidden md:inline-block ml-2 text-muted-foreground/60 transition-transform duration-300">
                    {expandida ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                </div>
              </button>

              {/* Contenido Desplegable */}
              <AnimatePresence>
                {expandida && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/40 bg-background/20 px-5 sm:px-6 pb-6 pt-4">
                      {intentos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground space-y-1">
                          <Users className="w-8 h-8 opacity-20 mx-auto mb-2" />
                          <p className="text-sm font-semibold">Aún no hay intentos registrados</p>
                          <p className="text-xs">Los registros se mostrarán aquí en tiempo real.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Desktop Header */}
                          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/20 pb-2">
                            <span className="col-span-5">Estudiante / Servidor</span>
                            <span className="col-span-2 text-center">Intento N°</span>
                            <span className="col-span-2 text-center">Puntaje</span>
                            <span className="col-span-3 text-right">Fecha</span>
                          </div>

                          {/* Intentos list */}
                          <div className="space-y-2">
                            {intentos.map((intento: any) => (
                              <div
                                key={intento.id_intento}
                                className={`flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:items-center p-4 sm:px-4 sm:py-3 rounded-2xl border transition-all hover:bg-background/40 ${
                                  intento.aprobado
                                    ? 'bg-green-500/5 border-green-500/20'
                                    : 'bg-orange-500/5 border-orange-500/20'
                                }`}
                              >
                                {/* Info Estudiante */}
                                <div className="col-span-5 flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                                    intento.aprobado ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-500'
                                  }`}>
                                    {intento.nombre_usuario?.charAt(0) || 'U'}
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-sm text-foreground leading-tight truncate">{intento.nombre_usuario}</h5>
                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                      <Mail className="w-3 h-3 text-muted-foreground/60" /> {intento.email}
                                    </p>
                                  </div>
                                </div>

                                {/* Intento # */}
                                <div className="col-span-2 flex sm:justify-center items-center justify-between sm:border-none border-t border-b border-border/20 py-2 sm:py-0">
                                  <span className="sm:hidden text-xs text-muted-foreground font-bold uppercase">N° Intento</span>
                                  <Badge variant="outline" className="font-bold bg-background/30 rounded-lg px-2.5">
                                    Intento #{intento.numero_intento || 1}
                                  </Badge>
                                </div>

                                {/* Puntaje y Estado */}
                                <div className="col-span-2 flex sm:flex-col sm:items-center items-center justify-between gap-1">
                                  <span className="sm:hidden text-xs text-muted-foreground font-bold uppercase">Resultado</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-base font-black ${intento.aprobado ? 'text-green-600' : 'text-orange-500'}`}>
                                      {intento.puntaje}%
                                    </span>
                                    {intento.aprobado ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-orange-500" />
                                    )}
                                  </div>
                                </div>

                                {/* Fecha */}
                                <div className="col-span-3 flex sm:justify-end items-center justify-between text-xs text-muted-foreground">
                                  <span className="sm:hidden text-xs text-muted-foreground font-bold uppercase">Completado</span>
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {intento.fecha ? new Date(intento.fecha).toLocaleDateString('es-ES', {
                                      day: '2-digit', month: 'short', year: 'numeric'
                                    }) : '—'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
