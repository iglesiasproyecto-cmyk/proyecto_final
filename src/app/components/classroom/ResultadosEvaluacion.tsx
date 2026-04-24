import { useContext } from 'react'
import { useObtenerResultadoIntento, usePreguntasPorEvaluacion } from '@/hooks/useEvaluaciones'
import { Card } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { AppContext } from '@/app/store/AppContext'
import { CheckCircle, XCircle, Clock, Award, TrendingUp } from 'lucide-react'

interface ResultadosEvaluacionProps {
  idIntento: number
  onVolver?: () => void
}

export function ResultadosEvaluacion({ idIntento, onVolver }: ResultadosEvaluacionProps) {
  const { data: resultado, isLoading } = useObtenerResultadoIntento(idIntento)
  const { data: preguntasData } = usePreguntasPorEvaluacion(
    resultado?.intento.idEvaluacion
  )

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p>Cargando resultados...</p>
      </Card>
    )
  }

  if (!resultado) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">No se encontraron resultados.</p>
      </Card>
    )
  }

  const { intento, detalles, respuestas } = resultado
  const esAprobado = detalles.porcentaje >= 60
  const preguntas = preguntasData || []

  // Formatear tiempo
  const minutos = Math.floor((intento.tiempoDuracion || 0) / 60)
  const segundos = (intento.tiempoDuracion || 0) % 60

  return (
    <div className="space-y-6">
      {/* Resumen Principal */}
      <Card
        className={`p-8 text-center ${
          esAprobado ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-rose-50'
        }`}
      >
        <div className="flex justify-center mb-4">
          {esAprobado ? (
            <CheckCircle className="w-20 h-20 text-green-600" />
          ) : (
            <XCircle className="w-20 h-20 text-red-600" />
          )}
        </div>
        <h2
          className={`text-4xl font-bold mb-2 ${
            esAprobado ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {esAprobado ? '¡Aprobado!' : 'No Aprobado'}
        </h2>
        <p className="text-gray-700 mb-4">
          Obtuviste {detalles.puntajeObtenido.toFixed(2)} de{' '}
          {detalles.puntajeMaximo.toFixed(2)} puntos
        </p>
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="60"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200"
              />
              <circle
                cx="64"
                cy="64"
                r="60"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${(detalles.porcentaje / 100) * 376.99} 376.99`}
                className={esAprobado ? 'text-green-600' : 'text-red-600'}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className={`text-3xl font-bold ${esAprobado ? 'text-green-600' : 'text-red-600'}`}>
                  {detalles.porcentaje.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Award className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-600">{detalles.totalPreguntas}</p>
          <p className="text-xs text-gray-600">Total de preguntas</p>
        </Card>

        <Card className="p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-600">{detalles.correctas}</p>
          <p className="text-xs text-gray-600">Respuestas correctas</p>
        </Card>

        <Card className="p-4 text-center">
          <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-600">
            {detalles.totalPreguntas - detalles.correctas}
          </p>
          <p className="text-xs text-gray-600">Respuestas incorrectas</p>
        </Card>

        <Card className="p-4 text-center">
          <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-600">
            {minutos}m {segundos}s
          </p>
          <p className="text-xs text-gray-600">Tiempo usado</p>
        </Card>
      </div>

      {/* Detalle de Respuestas */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Detalle de Respuestas
        </h3>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {respuestas.map((respuesta, idx) => {
            const pregunta = preguntas.find(
              (p) => p.pregunta.idPregunta === respuesta.idPregunta
            )
            const opcionSeleccionada = pregunta?.opciones.find(
              (o) => o.idOpcion === respuesta.idOpcionSelected
            )
            const esCorrecta = respuesta.puntosObtenidos && respuesta.puntosObtenidos > 0

            return (
              <div key={respuesta.idRespuesta} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {esCorrecta ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      Pregunta {idx + 1}. {pregunta?.pregunta.titulo}
                    </p>

                    {opcionSeleccionada ? (
                      <div className="mt-2 text-sm">
                        <p className="text-gray-600">
                          <span className="font-medium">Tu respuesta:</span> {opcionSeleccionada.textoOpcion}
                        </p>
                        <p
                          className={`mt-1 font-medium ${
                            esCorrecta ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {esCorrecta
                            ? `✓ Correcta (+${respuesta.puntosObtenidos} puntos)`
                            : '✗ Incorrecta (0 puntos)'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">
                        No respondida
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Información del Intento */}
      <Card className="p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Intento</p>
            <p className="font-semibold">#{intento.numeroIntento}</p>
          </div>
          <div>
            <p className="text-gray-600">Estado</p>
            <p className="font-semibold capitalize">{intento.estado}</p>
          </div>
          <div>
            <p className="text-gray-600">Fecha</p>
            <p className="font-semibold">
              {new Date(intento.creadoEn).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Calificación Final</p>
            <p className={`font-semibold ${esAprobado ? 'text-green-600' : 'text-red-600'}`}>
              {detalles.porcentaje.toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Botones de Acción */}
      {onVolver && (
        <div className="flex justify-center">
          <Button onClick={onVolver} className="px-8">
            Volver a Cursos
          </Button>
        </div>
      )}
    </div>
  )
}
