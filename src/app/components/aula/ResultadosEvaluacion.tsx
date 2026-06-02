import React from 'react'
import { useRespuestasCorrectas, useIntentosEvaluacion } from '@/hooks/useIntentoEvaluacion'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'

type Props = {
  resultados: any
  evaluacion: any
  idUsuario: number
  respuestasSeleccionadas?: Record<string, string> // { idPregunta: idOpcion }
}

export function ResultadosEvaluacion({ resultados, evaluacion, idUsuario, respuestasSeleccionadas }: Props) {
  const [mostrarRespuestas, setMostrarRespuestas] = React.useState(false)
  // Uses aula_respuesta.es_correcta (set server-side) — never reads es_correcta from aula_opcion
  const { data: respuestasCorrectas } = useRespuestasCorrectas(resultados.id_intento)
  const { data: intentos } = useIntentosEvaluacion(evaluacion.id_aula_evaluacion, idUsuario)

  const puedeReintentar = evaluacion.reintentos_permitidos && !resultados.aprobado
  const alcanzoMaxIntentos = evaluacion.max_intentos && (intentos?.length ?? 0) >= evaluacion.max_intentos

  return (
    <div className="space-y-8">
      {/* Score Card */}
      <Card className="rounded-[28px] border border-white/10 bg-gradient-to-br from-card/55 to-card/35 backdrop-blur-2xl">
        <CardContent className="pt-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              {resultados.aprobado ? (
                <div className="relative h-32 w-32">
                  <CheckCircle className="h-32 w-32 text-green-500 animate-bounce" />
                </div>
              ) : (
                <AlertCircle className="h-32 w-32 text-amber-500" />
              )}
            </div>

            <div>
              <p className="text-6xl font-black text-foreground">{resultados.puntaje_obtenido}%</p>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-2">
                Tu Calificación · {resultados.correctas ?? 0}/{resultados.total ?? 0} correctas
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <Badge
                variant={resultados.aprobado ? 'default' : 'secondary'}
                className={`h-8 px-4 text-sm font-bold rounded-full ${
                  resultados.aprobado
                    ? 'bg-green-500/10 text-green-600 border-green-500/30'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                }`}
              >
                {resultados.aprobado ? '¡APROBADO!' : 'REPROBADO'}
              </Badge>
              <Badge variant="outline">Intento {resultados.numero_intento}</Badge>
            </div>

            {resultados.aprobado ? (
              <p className="text-base font-medium text-green-600">
                ¡Felicidades! Aprobaste con {resultados.puntaje_obtenido}%. Requería {resultados.puntaje_minimo}%.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-base font-medium text-amber-600">
                  Necesitas {resultados.puntaje_minimo - resultados.puntaje_obtenido}% más para aprobar.
                </p>
                {alcanzoMaxIntentos && (
                  <p className="text-sm font-semibold text-red-600">
                    Alcanzaste el máximo de intentos permitidos.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Show Answers Button */}
      {respuestasCorrectas && (
        <Button
          onClick={() => setMostrarRespuestas(!mostrarRespuestas)}
          variant="outline"
          className="w-full rounded-2xl h-11"
        >
          {mostrarRespuestas ? 'Ocultar' : 'Ver'} Respuestas Correctas
        </Button>
      )}

      {/* Answer Review */}
      {mostrarRespuestas && respuestasCorrectas && (
        <div className="space-y-4">
          {evaluacion.preguntas.map((pregunta: any, idx: number) => (
            <Card key={pregunta.id_aula_pregunta} className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
              <CardHeader>
                <CardTitle className="text-base">Pregunta {idx + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{pregunta.enunciado}</p>
                {/* Show per-question result (correct/incorrect) without revealing the answer key */}
                {respuestasCorrectas && (
                  <div className={`p-3 rounded-xl border-2 text-sm font-semibold ${
                    respuestasCorrectas[pregunta.id_aula_pregunta]
                      ? 'border-green-500 bg-green-500/10 text-green-700'
                      : 'border-red-400 bg-red-500/10 text-red-700'
                  }`}>
                    {respuestasCorrectas[pregunta.id_aula_pregunta] ? '✓ Respuesta correcta' : '✗ Respuesta incorrecta'}
                  </div>
                )}
                <div className="space-y-2">
                  {pregunta.opciones.map((opcion: any) => {
                    const fueSeleccionada = respuestasSeleccionadas?.[pregunta.id_aula_pregunta]?.toString() === opcion.id_aula_opcion.toString()
                    return (
                      <div
                        key={opcion.id_aula_opcion}
                        className={`p-3 rounded-xl border-2 ${
                          fueSeleccionada
                            ? 'border-[#4682b4] bg-[#4682b4]/10'
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <p className="text-sm font-medium">{opcion.texto}</p>
                        {fueSeleccionada && (
                          <p className="text-xs font-bold text-[#4682b4] mt-1">← Tu respuesta</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Retry or Continue Button */}
      <div className="flex gap-4">
        {puedeReintentar && !alcanzoMaxIntentos && (
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="flex-1 h-11 rounded-2xl"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        )}
        <Button className="flex-1 h-11 rounded-2xl bg-[#4682b4] text-white hover:bg-[#4682b4]/90">
          Continuar
        </Button>
      </div>
    </div>
  )
}
