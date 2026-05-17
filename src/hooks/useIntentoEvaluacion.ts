import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  registrarIntentoEvaluacion,
  obtenerIntentosUsuario,
  obtenerRespuestasCorrectasEvaluacion,
} from '@/services/evaluaciones.service'

interface IntentoResponse {
  success: boolean
  message: string
  puntaje_obtenido: number
  aprobado: boolean
  numero_intento: number
  puntaje_minimo: number
}

export function useRegistrarIntento() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      idAulaEvaluacion,
      idUsuario,
      respuestas,
    }: {
      idAulaEvaluacion: number
      idUsuario: number
      respuestas: Record<string, string>
    }) => registrarIntentoEvaluacion(idAulaEvaluacion, idUsuario, respuestas),

    onSuccess: (_data, variables) => {
      // Invalidate attempts cache
      qc.invalidateQueries({
        queryKey: ['intentos-evaluacion', variables.idAulaEvaluacion, variables.idUsuario],
      })
      // Invalidate certificates cache (in case certificate was emitted)
      qc.invalidateQueries({
        queryKey: ['certificados-usuario', variables.idUsuario],
      })
    },
  })
}

export function useIntentosEvaluacion(
  idAulaEvaluacion?: number,
  idUsuario?: number
) {
  return useQuery({
    queryKey: ['intentos-evaluacion', idAulaEvaluacion, idUsuario],
    queryFn: () => obtenerIntentosUsuario(idAulaEvaluacion!, idUsuario!),
    enabled: !!idAulaEvaluacion && !!idUsuario,
  })
}

export function useRespuestasCorrectas(idAulaEvaluacion?: number) {
  return useQuery({
    queryKey: ['respuestas-correctas', idAulaEvaluacion],
    queryFn: () => obtenerRespuestasCorrectasEvaluacion(idAulaEvaluacion!),
    enabled: !!idAulaEvaluacion,
  })
}
