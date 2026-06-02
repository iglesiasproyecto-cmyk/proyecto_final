import React, { useState } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { useEvaluacionModulo } from '@/hooks/useEvaluacionCurso'
import { useRegistrarIntento } from '@/hooks/useIntentoEvaluacion'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ResultadosEvaluacion } from './ResultadosEvaluacion'

type Props = {
  idModulo: number
  onEvaluacionCompletada?: () => void
}

export function AulaEvaluacionInterfaz({ idModulo, onEvaluacionCompletada }: Props) {
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = React.useState<number | null>(null)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [enviado, setEnviado] = useState(false)
  const [resultados, setResultados] = useState<any>(null)

  React.useEffect(() => {
    if (user?.id) {
      getInternalUserId(user.id).then(setInternalUserId)
    }
  }, [user?.id])

  const { data: evaluacion, isLoading } = useEvaluacionModulo(idModulo)
  const registrarMutation = useRegistrarIntento()

  const handleSeleccionarRespuesta = (idPregunta: number, idOpcion: string) => {
    setRespuestas(prev => ({
      ...prev,
      [idPregunta]: idOpcion
    }))
  }

  const handleEnviar = async () => {
    if (!internalUserId || !evaluacion) return

    // Validate all questions answered
    if (Object.keys(respuestas).length !== evaluacion.preguntas.length) {
      toast.error('Debes responder todas las preguntas')
      return
    }

    try {
      const resultado = await registrarMutation.mutateAsync({
        idAulaEvaluacion: evaluacion.id_aula_evaluacion,
        idUsuario: internalUserId,
        respuestas,
      })

      setResultados(resultado)
      setEnviado(true)

      if (resultado.aprobado && onEvaluacionCompletada) {
        onEvaluacionCompletada()
      }
    } catch (error: any) {
      toast.error(error.message ?? 'Error al enviar evaluación')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!evaluacion) {
    return (
      <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
        <CardContent className="flex items-center gap-3 py-8">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <p className="text-muted-foreground">Evaluación no encontrada</p>
        </CardContent>
      </Card>
    )
  }

  if (enviado && resultados) {
    return (
      <ResultadosEvaluacion
        resultados={resultados}
        evaluacion={evaluacion}
        idUsuario={internalUserId!}
        respuestasSeleccionadas={respuestas}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Evaluación del Módulo
        </p>
        <h2 className="text-3xl font-black tracking-tight">{evaluacion.titulo}</h2>
        {evaluacion.descripcion && (
          <p className="mt-2 text-muted-foreground">{evaluacion.descripcion}</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm font-semibold">Puntaje mínimo: {evaluacion.puntaje_minimo}%</span>
        </div>
      </div>

      <div className="space-y-6">
        {evaluacion.preguntas.map((pregunta, indexPregunta) => (
          <Card key={pregunta.id_aula_pregunta} className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
            <CardHeader>
              <CardTitle className="text-lg">
                Pregunta {indexPregunta + 1} de {evaluacion.preguntas.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base font-medium">{pregunta.enunciado}</p>
              <div className="space-y-3">
                {pregunta.opciones.map(opcion => (
                  <label
                    key={opcion.id_aula_opcion}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 p-4 cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <input
                      type="radio"
                      name={`pregunta-${pregunta.id_aula_pregunta}`}
                      value={opcion.id_aula_opcion}
                      checked={respuestas[pregunta.id_aula_pregunta] === opcion.id_aula_opcion.toString()}
                      onChange={() => handleSeleccionarRespuesta(pregunta.id_aula_pregunta, opcion.id_aula_opcion.toString())}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{opcion.texto}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleEnviar}
        disabled={registrarMutation.isPending || Object.keys(respuestas).length !== evaluacion.preguntas.length}
        className="h-12 rounded-2xl bg-[#4682b4] text-white hover:bg-[#4682b4]/90 w-full font-bold"
      >
        {registrarMutation.isPending ? 'Enviando...' : 'Enviar Respuestas'}
      </Button>
    </div>
  )
}
