import { useState, useEffect, useContext } from 'react'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import {
  usePreguntasPorEvaluacion,
  useRegistrarRespuesta,
  useFinalizarIntento,
  useAbandonarIntento
} from '@/hooks/useEvaluaciones'
import { AppContext } from '@/app/store/AppContext'
import type { PreguntaConOpciones } from '@/types/app.types'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'

interface ResolucionEvaluacionProps {
  idEvaluacion: number
  idIntento: number
  onFinalized?: (idIntento: number) => void
}

export function ResolucionEvaluacion({
  idEvaluacion,
  idIntento,
  onFinalized
}: ResolucionEvaluacionProps) {
  const { usuarioActual } = useContext(AppContext)!
  const [indicePregunta, setIndicePregunta] = useState(0)
  const [respuestas, setRespuestas] = useState<{ [key: number]: number }>({})
  const [tiempoInicio] = useState(Date.now())
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)

  const { data: preguntasData, isLoading } = usePreguntasPorEvaluacion(idEvaluacion)
  const registrarRespuesta = useRegistrarRespuesta()
  const finalizarIntento = useFinalizarIntento()
  const abandonarIntento = useAbandonarIntento()

  const preguntas = preguntasData || []
  const preguntaActual = preguntas[indicePregunta] as PreguntaConOpciones | undefined

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTiempoTranscurrido(Math.floor((Date.now() - tiempoInicio) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [tiempoInicio])

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p>Cargando evaluación...</p>
      </Card>
    )
  }

  if (preguntas.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">No hay preguntas en esta evaluación.</p>
      </Card>
    )
  }

  if (!preguntaActual) {
    return null
  }

  const handleSeleccionarOpcion = (idOpcion: number) => {
    const idPregunta = preguntaActual.pregunta.idPregunta
    setRespuestas((prev) => ({
      ...prev,
      [idPregunta]: idOpcion
    }))

    // Registrar respuesta en BD
    if (usuarioActual) {
      registrarRespuesta.mutate({
        idPregunta,
        idUsuario: usuarioActual.idUsuario,
        idEvaluacion,
        idOpcionSelected: idOpcion,
        intento: 1
      })
    }
  }

  const handleFinalizarEvaluacion = () => {
    // Calcular puntos totales
    let puntajeTotal = 0
    preguntas.forEach((p) => {
      const idOpcionSeleccionada = respuestas[p.pregunta.idPregunta]
      if (idOpcionSeleccionada) {
        const opcion = p.opciones.find((o) => o.idOpcion === idOpcionSeleccionada)
        puntajeTotal += opcion?.puntos || 0
      }
    })

    const puntajeMaximo = preguntas.reduce((sum, p) => {
      const maxPuntos = Math.max(...p.opciones.map((o) => o.puntos || 0), 0)
      return sum + maxPuntos
    }, 0)

    finalizarIntento.mutate(
      {
        idIntento,
        puntajeTotal,
        puntajeMaximo,
        tiempoDuracion: tiempoTranscurrido
      },
      {
        onSuccess: () => {
          onFinalized?.(idIntento)
        }
      }
    )
  }

  const handleAbandonar = () => {
    if (confirm('¿Está seguro que desea abandonar la evaluación?')) {
      abandonarIntento.mutate(idIntento, {
        onSuccess: () => {
          onFinalized?.(idIntento)
        }
      })
    }
  }

  // Formatear tiempo
  const minutos = Math.floor(tiempoTranscurrido / 60)
  const segundos = tiempoTranscurrido % 60
  const tiempoFormato = `${minutos}:${segundos.toString().padStart(2, '0')}`

  // Calcular progreso
  const progreso = ((indicePregunta + 1) / preguntas.length) * 100

  return (
    <div className="space-y-6">
      {/* Header con progreso y tiempo */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              Pregunta {indicePregunta + 1} de {preguntas.length}
            </span>
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {tiempoFormato}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pregunta */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {preguntaActual.pregunta.titulo}
        </h2>
        {preguntaActual.pregunta.descripcion && (
          <p className="text-gray-600 mb-6">{preguntaActual.pregunta.descripcion}</p>
        )}

        {/* Opciones */}
        <div className="space-y-3">
          {preguntaActual.opciones.map((opcion, idx) => {
            const isSelected =
              respuestas[preguntaActual.pregunta.idPregunta] === opcion.idOpcion

            return (
              <div
                key={opcion.idOpcion}
                onClick={() => handleSeleccionarOpcion(opcion.idOpcion)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isSelected ? 'text-primary' : 'text-gray-700'
                      }`}
                    >
                      <span className="font-bold">
                        {String.fromCharCode(65 + idx)})
                      </span>
                      {' '}
                      {opcion.textoOpcion}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Botones de navegación */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setIndicePregunta(Math.max(0, indicePregunta - 1))}
          disabled={indicePregunta === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>

        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleAbandonar}
            disabled={abandonarIntento.isPending}
          >
            Abandonar
          </Button>

          {indicePregunta === preguntas.length - 1 ? (
            <Button
              onClick={handleFinalizarEvaluacion}
              disabled={finalizarIntento.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {finalizarIntento.isPending ? 'Finalizando...' : 'Finalizar Evaluación'}
            </Button>
          ) : (
            <Button onClick={() => setIndicePregunta(indicePregunta + 1)}>
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de respuestas */}
      <Card className="p-4 bg-gray-50">
        <p className="text-sm text-gray-600 mb-3">
          Respuestas: {Object.keys(respuestas).length} de {preguntas.length}
        </p>
        <div className="flex flex-wrap gap-2">
          {preguntas.map((p, idx) => {
            const esRespondida = !!respuestas[p.pregunta.idPregunta]
            const esActual = idx === indicePregunta

            return (
              <button
                key={p.pregunta.idPregunta}
                onClick={() => setIndicePregunta(idx)}
                className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                  esActual
                    ? 'bg-primary text-white border-2 border-primary'
                    : esRespondida
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-gray-200 text-gray-700 border-2 border-gray-300'
                }`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
