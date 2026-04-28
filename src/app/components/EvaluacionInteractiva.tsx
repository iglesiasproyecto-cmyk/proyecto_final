import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { useEvaluacionDetalleModulo } from '@/hooks/useEvaluacionesDetalladas'
import { useIntentosEvaluacion, useCrearIntentoEvaluacion } from '@/hooks/useEvaluacionesDetalladas'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import { Textarea } from '@/app/components/ui/textarea'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Progress } from '@/app/components/ui/progress'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface EvaluacionInteractivaProps {
  idModulo: number
  onCompletar?: () => void
}

export function EvaluacionInteractiva({ idModulo, onCompletar }: EvaluacionInteractivaProps) {
  const { user } = useAuth()
  const { data: preguntas } = useEvaluacionDetalleModulo(idModulo)
  const { data: intentos } = useIntentosEvaluacion({
    idModulo,
    idDetalleProcesoCurso: null, // TODO: Obtener el id correcto
    idUsuario: user?.id
  })

  const crearIntento = useCrearIntentoEvaluacion()

  const [respuestas, setRespuestas] = useState<Record<number, string>>({})
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [calificacion, setCalificacion] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Obtener el detalle proceso curso
  const [detalleProcesoCurso, setDetalleProcesoCurso] = useState<number | null>(null)

  useEffect(() => {
    const getDetalleProceso = async () => {
      if (!user?.id) return

      const { data } = await supabase
        .from('detalle_proceso_curso')
        .select('id_detalle_proceso_curso')
        .eq('id_usuario', user.id)
        .single()

      setDetalleProcesoCurso(data?.id_detalle_proceso_curso || null)
    }

    getDetalleProceso()
  }, [user?.id])

  const ultimoIntento = intentos?.[0] // El más reciente

  const handleRespuestaChange = (idPregunta: number, respuesta: string) => {
    setRespuestas(prev => ({
      ...prev,
      [idPregunta]: respuesta
    }))
  }

  const calcularCalificacion = () => {
    if (!preguntas) return 0

    let correctas = 0
    preguntas.forEach(pregunta => {
      const respuestaUsuario = respuestas[pregunta.id_evaluacion_detalle]
      if (respuestaUsuario?.toLowerCase().trim() === pregunta.respuesta_correcta.toLowerCase().trim()) {
        correctas++
      }
    })

    return Math.round((correctas / preguntas.length) * 100)
  }

  const enviarEvaluacion = async () => {
    if (!detalleProcesoCurso || !preguntas) return

    setEnviando(true)
    try {
      const calificacionObtenida = calcularCalificacion()
      const aprobado = calificacionObtenida >= 70 // TODO: Hacer configurable

      await crearIntento.mutateAsync({
        id_detalle_proceso_curso: detalleProcesoCurso,
        id_modulo: idModulo,
        id_usuario: user!.id,
        calificacion_obtenida: calificacionObtenida,
        estado: aprobado ? 'aprobado' : 'reprobado',
        respuestas: respuestas
      })

      setCalificacion(calificacionObtenida)
      setMostrarResultados(true)

      if (aprobado) {
        toast.success('¡Evaluación aprobada!')
        onCompletar?.()
      } else {
        toast.error('Evaluación reprobada. Puedes intentarlo nuevamente.')
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error)
      toast.error('Error al enviar la evaluación')
    } finally {
      setEnviando(false)
    }
  }

  const puedeReintentar = () => {
    // TODO: Implementar lógica de reintentos permitidos
    return ultimoIntento?.estado === 'reprobado'
  }

  if (!preguntas || preguntas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay evaluación disponible</h3>
          <p className="text-muted-foreground text-center">
            Este módulo no tiene evaluación configurada aún.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Si ya hay un intento aprobado, mostrar resultado final
  if (ultimoIntento?.estado === 'aprobado') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            Evaluación Aprobada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {ultimoIntento.calificacion_obtenida}%
            </div>
            <p className="text-muted-foreground">
              Completado el {new Date(ultimoIntento.creado_en).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Si está mostrando resultados de un intento reciente
  if (mostrarResultados && calificacion !== null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center ${
            calificacion >= 70 ? 'text-green-600' : 'text-red-600'
          }`}>
            {calificacion >= 70 ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <XCircle className="h-5 w-5 mr-2" />
            )}
            {calificacion >= 70 ? 'Evaluación Aprobada' : 'Evaluación Reprobada'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className={`text-3xl font-bold mb-2 ${
              calificacion >= 70 ? 'text-green-600' : 'text-red-600'
            }`}>
              {calificacion}%
            </div>
            <p className="text-muted-foreground">
              {calificacion >= 70
                ? '¡Felicitaciones! Has aprobado la evaluación.'
                : 'No has alcanzado el puntaje mínimo requerido.'
              }
            </p>
          </div>

          {calificacion < 70 && puedeReintentar() && (
            <Button
              onClick={() => {
                setMostrarResultados(false)
                setRespuestas({})
                setCalificacion(null)
              }}
              className="w-full"
            >
              Intentar Nuevamente
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Mostrar la evaluación para responder
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluación del Módulo</CardTitle>
        <CardDescription>
          Responde todas las preguntas. Necesitas al menos 70% para aprobar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ultimoIntento && ultimoIntento.estado === 'reprobado' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Tu último intento obtuvo {ultimoIntento.calificacion_obtenida}%.
              {puedeReintentar() ? ' Puedes intentarlo nuevamente.' : ' Has agotado los intentos permitidos.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{preguntas.length} preguntas</span>
          <span>{Object.keys(respuestas).length} respondidas</span>
        </div>

        <Progress
          value={(Object.keys(respuestas).length / preguntas.length) * 100}
          className="h-2"
        />

        <div className="space-y-6">
          {preguntas.map((pregunta, index) => (
            <Card key={pregunta.id_evaluacion_detalle} className="p-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div className="flex-1">
                    <p className="font-medium">{pregunta.pregunta}</p>
                  </div>
                </div>

                {pregunta.tipo_pregunta === 'multiple_choice' && pregunta.opciones && (
                  <RadioGroup
                    value={respuestas[pregunta.id_evaluacion_detalle] || ''}
                    onValueChange={(value) => handleRespuestaChange(pregunta.id_evaluacion_detalle, value)}
                  >
                    {pregunta.opciones.map((opcion, opcionIndex) => (
                      <div key={opcionIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={opcion} id={`q${pregunta.id_evaluacion_detalle}-${opcionIndex}`} />
                        <Label htmlFor={`q${pregunta.id_evaluacion_detalle}-${opcionIndex}`}>
                          {String.fromCharCode(65 + opcionIndex)}. {opcion}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {pregunta.tipo_pregunta === 'verdadero_falso' && (
                  <RadioGroup
                    value={respuestas[pregunta.id_evaluacion_detalle] || ''}
                    onValueChange={(value) => handleRespuestaChange(pregunta.id_evaluacion_detalle, value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Verdadero" id={`q${pregunta.id_evaluacion_detalle}-true`} />
                      <Label htmlFor={`q${pregunta.id_evaluacion_detalle}-true`}>Verdadero</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Falso" id={`q${pregunta.id_evaluacion_detalle}-false`} />
                      <Label htmlFor={`q${pregunta.id_evaluacion_detalle}-false`}>Falso</Label>
                    </div>
                  </RadioGroup>
                )}

                {(pregunta.tipo_pregunta === 'respuesta_corta' || pregunta.tipo_pregunta === 'ensayo') && (
                  <div className="space-y-2">
                    <Label>Tu respuesta:</Label>
                    {pregunta.tipo_pregunta === 'respuesta_corta' ? (
                      <Input
                        value={respuestas[pregunta.id_evaluacion_detalle] || ''}
                        onChange={(e) => handleRespuestaChange(pregunta.id_evaluacion_detalle, e.target.value)}
                        placeholder="Escribe tu respuesta..."
                      />
                    ) : (
                      <Textarea
                        value={respuestas[pregunta.id_evaluacion_detalle] || ''}
                        onChange={(e) => handleRespuestaChange(pregunta.id_evaluacion_detalle, e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        rows={4}
                      />
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={enviarEvaluacion}
            disabled={Object.keys(respuestas).length !== preguntas.length || enviando}
          >
            {enviando ? 'Enviando...' : 'Enviar Evaluación'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}