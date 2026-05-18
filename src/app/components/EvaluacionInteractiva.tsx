import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { toast } from 'sonner'
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ChevronRight, ChevronLeft,
  Award, RefreshCw, BookOpen, Star, HelpCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface EvaluacionInteractivaProps {
  idModulo: number
  onCompletar?: () => void
}

export function EvaluacionInteractiva({ idModulo, onCompletar }: EvaluacionInteractivaProps) {
  const queryClient = useQueryClient()
  const [preguntaActiva, setPreguntaActiva] = useState(0)
  const [respuestas, setRespuestas] = useState<Record<number, string>>({})
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [resultadoIntento, setResultadoIntento] = useState<any | null>(null)

  // 1. Obtener la evaluación estructurada segura para el estudiante
  const { data: evaluacion, isLoading, error, refetch } = useQuery({
    queryKey: ['evaluacion-estudiante', idModulo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_evaluacion_estudiante', { p_id_modulo: idModulo })
      if (error) throw error
      return data
    },
    enabled: !!idModulo,
  })

  // 2. Mutación para calificar e insertar el intento en el servidor (100% segura)
  const calificarMutation = useMutation({
    mutationFn: async (payload: { idModulo: number; respuestas: Record<number, string> }) => {
      const { data, error } = await supabase.rpc('calificar_y_guardar_intento', {
        p_id_modulo: payload.idModulo,
        p_respuestas: payload.respuestas,
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setResultadoIntento(data)
      setMostrarResultados(true)
      queryClient.invalidateQueries({ queryKey: ['evaluacion-estudiante', idModulo] })
      queryClient.invalidateQueries({ queryKey: ['calificaciones-curso'] })
      queryClient.invalidateQueries({ queryKey: ['avance-curso'] })

      if (data.aprobado) {
        toast.success('¡Felicitaciones! Has aprobado la evaluación.')
        onCompletar?.()
      } else {
        toast.error('No has alcanzado el puntaje mínimo de aprobación.')
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al enviar la evaluación')
    }
  })

  const handleSeleccionarOpcion = (idPregunta: number, opcionTexto: string) => {
    setRespuestas(prev => ({
      ...prev,
      [idPregunta]: opcionTexto
    }))
  }

  const handleSiguiente = () => {
    if (evaluacion && preguntaActiva < evaluacion.preguntas.length - 1) {
      setPreguntaActiva(prev => prev + 1)
    }
  }

  const handleAnterior = () => {
    if (preguntaActiva > 0) {
      setPreguntaActiva(prev => prev - 1)
    }
  }

  const handleEnviar = () => {
    if (!evaluacion) return
    const respondidasCount = Object.keys(respuestas).length
    const totalCount = evaluacion.preguntas.length

    if (respondidasCount < totalCount) {
      toast.warning(`Por favor responde todas las preguntas (${respondidasCount} de ${totalCount} respondidas)`)
      return
    }

    calificarMutation.mutate({ idModulo, respuestas })
  }

  const handleReintentar = () => {
    setPreguntaActiva(0)
    setRespuestas({})
    setMostrarResultados(false)
    setResultadoIntento(null)
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <BookOpen className="w-6 h-6 text-primary absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Preparando evaluación...</p>
      </div>
    )
  }

  if (error || !evaluacion) {
    return (
      <Card className="border-border/50 bg-card/40 backdrop-blur-xl rounded-[32px] overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500/80 mb-4 animate-bounce" />
          <h3 className="text-xl font-black uppercase tracking-tight">Evaluación no disponible</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-2 leading-relaxed">
            Este módulo no tiene una evaluación activa configurada aún, o ocurrió un error al cargarla.
          </p>
        </CardContent>
      </Card>
    )
  }

  const preguntas = evaluacion.preguntas || []
  const totalPreguntas = preguntas.length

  if (totalPreguntas === 0) {
    return (
      <Card className="border-border/50 bg-card/40 backdrop-blur-xl rounded-[32px] overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <HelpCircle className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-black uppercase tracking-tight">Evaluación Vacía</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Esta evaluación no contiene preguntas asignadas actualmente.
          </p>
        </CardContent>
      </Card>
    )
  }

  // 1. Mostrar pantalla de felicitaciones si ya aprobó anteriormente
  if (evaluacion.aprobado_antes && !mostrarResultados) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 sm:p-12 rounded-[40px] bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/30 text-center space-y-6 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-green-500/20">
          <Award className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <Badge className="border-none bg-green-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-green-600">
            ¡Evaluación Completada!
          </Badge>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic">¡Felicidades!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Ya has aprobado esta evaluación con éxito en intentos anteriores. Tu progreso ha sido registrado y puedes continuar con el siguiente módulo.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card/40 border border-green-500/10 max-w-xs mx-auto flex items-center justify-around">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Estado</p>
            <p className="text-sm font-bold text-green-600 uppercase mt-0.5">Aprobado</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Mínimo</p>
            <p className="text-sm font-bold mt-0.5">{evaluacion.puntaje_minimo}%</p>
          </div>
        </div>
      </motion.div>
    )
  }

  // 2. Mostrar pantalla de resultados del intento actual
  if (mostrarResultados && resultadoIntento) {
    const aprobado = resultadoIntento.aprobado
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-8 sm:p-12 rounded-[40px] border text-center space-y-6 relative overflow-hidden shadow-2xl transition-all duration-500 ${
          aprobado
            ? 'from-green-500/10 via-emerald-500/5 to-transparent border-green-500/30'
            : 'from-orange-500/10 via-red-500/5 to-transparent border-orange-500/30'
        }`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white mx-auto shadow-xl ${
          aprobado
            ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-green-500/25'
            : 'bg-gradient-to-br from-orange-400 to-red-500 shadow-orange-500/25'
        }`}>
          {aprobado ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
        </div>

        <div className="space-y-2">
          <Badge className={`border-none px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
            aprobado ? 'bg-green-500/20 text-green-600' : 'bg-orange-500/20 text-orange-500'
          }`}>
            {aprobado ? 'Aprobado' : 'Reprobado'}
          </Badge>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic">
            {aprobado ? '¡Excelente Trabajo!' : 'Sigue Intentándolo'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {aprobado
              ? 'Has demostrado un gran dominio de los temas presentados en este módulo.'
              : 'No lograste alcanzar el puntaje mínimo de aprobación en este intento. Revisa el contenido e inténtalo de nuevo.'
            }
          </p>
        </div>

        {/* Círculo / Dial de puntuación premium */}
        <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" className="text-muted/20" fill="transparent" />
            <circle
              cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8"
              className={aprobado ? 'text-green-500' : 'text-orange-500'}
              strokeDasharray={2 * Math.PI * 60}
              strokeDashoffset={2 * Math.PI * 60 * (1 - resultadoIntento.puntaje_obtenido / 100)}
              strokeLinecap="round" fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-4xl font-black ${aprobado ? 'text-green-600' : 'text-orange-500'}`}>
              {resultadoIntento.puntaje_obtenido}%
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider mt-0.5">
              Puntaje
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          <div className="p-4 rounded-2xl bg-card/50 border border-border/40 text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Correctas</p>
            <p className="text-base font-bold mt-1 text-foreground">
              {resultadoIntento.preguntas_correctas} de {resultadoIntento.preguntas_totales}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-card/50 border border-border/40 text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Intento</p>
            <p className="text-base font-bold mt-1 text-foreground">
              #{resultadoIntento.numero_intento} ({resultadoIntento.intentos_restantes} restantes)
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-center pt-2">
          {!aprobado && resultadoIntento.intentos_restantes > 0 ? (
            <Button onClick={handleReintentar} className="px-6 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90">
              <RefreshCw className="w-4 h-4 mr-2" /> Reintentar Evaluación
            </Button>
          ) : (
            <Button onClick={onCompletar} variant="outline" className="px-6 rounded-2xl border-border/60 font-bold">
              Continuar
            </Button>
          )}
        </div>
      </motion.div>
    )
  }

  // 3. Flujo activo de responder preguntas
  const pregunta = preguntas[preguntaActiva]
  const respondidasCount = Object.keys(respuestas).length
  const progresoPorcentaje = Math.round((respondidasCount / totalPreguntas) * 100)

  return (
    <div className="space-y-6">
      {/* Cabecera evaluación */}
      <Card className="border-border/50 bg-card/40 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-primary/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                <Star className="mr-1 h-3 w-3 animate-pulse" />
                Módulo Evaluativo
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-background/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Intentos: {evaluacion.intentos_realizados} de {evaluacion.max_intentos}
              </Badge>
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground/90 uppercase italic">{evaluacion.titulo}</h3>
              {evaluacion.descripcion && (
                <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">{evaluacion.descripcion}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/55 px-4 py-2backdrop-blur-sm self-stretch sm:self-auto justify-center">
            <Clock className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground">Evaluación Activa</span>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
          <span>Progreso</span>
          <span>{respondidasCount} de {totalPreguntas} respondidas ({progresoPorcentaje}%)</span>
        </div>
        <Progress value={progresoPorcentaje} className="h-2 rounded-full bg-white/5 border border-white/5" />
      </div>

      {/* Caja de Pregunta Activa */}
      <div className="relative min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={pregunta.id_aula_pregunta}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden"
          >
            {/* Step badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                Pregunta {preguntaActiva + 1} de {totalPreguntas}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-background/30 capitalize">
                {pregunta.tipo === 'opcion_multiple' ? 'Opción múltiple' : pregunta.tipo === 'verdadero_falso' ? 'Verdadero o falso' : 'Respuesta corta'}
              </Badge>
            </div>

            {/* Enunciado */}
            <h4 className="text-lg font-black tracking-tight text-foreground leading-relaxed">
              {pregunta.enunciado}
            </h4>

            {/* Render Opciones */}
            <div className="space-y-3 pt-2">
              {pregunta.tipo === 'opcion_multiple' && pregunta.opciones && (
                <div className="grid grid-cols-1 gap-3">
                  {pregunta.opciones.map((opcion: any, idx: number) => {
                    const seleccionada = respuestas[pregunta.id_aula_pregunta] === opcion.texto
                    return (
                      <button
                        key={opcion.id_aula_opcion}
                        onClick={() => handleSeleccionarOpcion(pregunta.id_aula_pregunta, opcion.texto)}
                        className={`w-full p-4 rounded-2xl text-left text-sm font-semibold flex items-center gap-3 border transition-all duration-300 ${
                          seleccionada
                            ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5 text-foreground'
                            : 'bg-background/40 border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 border transition-all ${
                          seleccionada ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted/40 border-border/60'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 leading-snug">{opcion.texto}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {pregunta.tipo === 'verdadero_falso' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Verdadero', 'Falso'].map((vfOption) => {
                    const seleccionada = respuestas[pregunta.id_aula_pregunta] === vfOption
                    return (
                      <button
                        key={vfOption}
                        onClick={() => handleSeleccionarOpcion(pregunta.id_aula_pregunta, vfOption)}
                        className={`p-4 rounded-2xl text-center text-sm font-bold border transition-all duration-300 flex items-center justify-center gap-2 ${
                          seleccionada
                            ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5 text-foreground'
                            : 'bg-background/40 border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {vfOption}
                      </button>
                    )
                  })}
                </div>
              )}

              {pregunta.tipo === 'respuesta_corta' && (
                <div className="space-y-2 max-w-lg">
                  <label className="text-xs font-semibold text-muted-foreground">Tu respuesta:</label>
                  <input
                    type="text"
                    placeholder="Escribe tu respuesta aquí..."
                    className="w-full px-4 py-3 rounded-2xl border border-border/60 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={respuestas[pregunta.id_aula_pregunta] || ''}
                    onChange={(e) => handleSeleccionarOpcion(pregunta.id_aula_pregunta, e.target.value)}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controles de Navegación */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={handleAnterior}
          disabled={preguntaActiva === 0}
          className="rounded-xl px-4 py-2 border border-border/40 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4 mr-1.5" /> Anterior
        </Button>

        {preguntaActiva === totalPreguntas - 1 ? (
          <Button
            onClick={handleEnviar}
            disabled={calificarMutation.isPending || respondidasCount < totalPreguntas}
            className="rounded-xl px-6 py-2.5 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10"
          >
            {calificarMutation.isPending ? 'Enviando...' : 'Enviar Evaluación'}
          </Button>
        ) : (
          <Button
            onClick={handleSiguiente}
            disabled={!respuestas[pregunta.id_aula_pregunta]}
            className="rounded-xl px-4 py-2 bg-primary text-primary-foreground font-bold hover:opacity-95"
          >
            Siguiente <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  )
}