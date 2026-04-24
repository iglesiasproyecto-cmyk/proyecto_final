import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as evaluacionesService from '@/services/evaluaciones.service'
import type { Pregunta, OpcionRespuesta } from '@/types/app.types'

// ============ PREGUNTAS ============

export function usePreguntasPorEvaluacion(idEvaluacion?: number) {
  return useQuery({
    queryKey: ['preguntas', idEvaluacion],
    queryFn: () => evaluacionesService.obtenerPreguntasPorEvaluacion(idEvaluacion || 0),
    enabled: !!idEvaluacion,
    staleTime: 5 * 60 * 1000
  })
}

export function usePregunta(idPregunta?: number) {
  return useQuery({
    queryKey: ['pregunta', idPregunta],
    queryFn: () => evaluacionesService.obtenerPregunta(idPregunta || 0),
    enabled: !!idPregunta,
    staleTime: 5 * 60 * 1000
  })
}

export function useCrearPregunta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.crearPregunta,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['preguntas', variables.idEvaluacion] })
      toast.success('Pregunta creada')
    },
    onError: (error: any) => {
      console.error('Error:', error)
      toast.error('Error al crear pregunta')
    }
  })
}

export function useActualizarPregunta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idPregunta, data }: { idPregunta: number; data: any }) =>
      evaluacionesService.actualizarPregunta(idPregunta, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      qc.invalidateQueries({ queryKey: ['pregunta', variables.idPregunta] })
      toast.success('Pregunta actualizada')
    },
    onError: () => toast.error('Error al actualizar')
  })
}

export function useEliminarPregunta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.eliminarPregunta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      toast.success('Pregunta eliminada')
    },
    onError: () => toast.error('Error al eliminar')
  })
}

// ============ OPCIONES ============

export function useCrearOpcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.crearOpcion,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      qc.invalidateQueries({ queryKey: ['pregunta', variables.idPregunta] })
      toast.success('Opción creada')
    },
    onError: () => toast.error('Error al crear opción')
  })
}

export function useActualizarOpcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idOpcion, data }: { idOpcion: number; data: any }) =>
      evaluacionesService.actualizarOpcion(idOpcion, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      toast.success('Opción actualizada')
    },
    onError: () => toast.error('Error al actualizar')
  })
}

export function useEliminarOpcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.eliminarOpcion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      toast.success('Opción eliminada')
    },
    onError: () => toast.error('Error al eliminar')
  })
}

// ============ RESPUESTAS ============

export function useRegistrarRespuesta() {
  return useMutation({
    mutationFn: evaluacionesService.registrarRespuesta,
    onError: (error: any) => {
      console.error('Error:', error)
      toast.error('Error al registrar respuesta')
    }
  })
}

export function useObtenerRespuestasDelIntento(
  idUsuario?: number,
  idEvaluacion?: number,
  numeroIntento?: number
) {
  return useQuery({
    queryKey: ['respuestas-intento', idUsuario, idEvaluacion, numeroIntento],
    queryFn: () =>
      evaluacionesService.obtenerRespuestasDelIntento(
        idUsuario || 0,
        idEvaluacion || 0,
        numeroIntento || 1
      ),
    enabled: !!(idUsuario && idEvaluacion && numeroIntento)
  })
}

export function useActualizarRespuesta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idRespuesta, data }: { idRespuesta: number; data: any }) =>
      evaluacionesService.actualizarRespuesta(idRespuesta, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['respuestas-intento'] })
      toast.success('Respuesta actualizada')
    },
    onError: () => toast.error('Error al actualizar respuesta')
  })
}

// ============ INTENTOS ============

export function useIniciarIntento() {
  return useMutation({
    mutationFn: evaluacionesService.iniciarIntento,
    onSuccess: () => toast.success('Intento iniciado'),
    onError: () => toast.error('Error al iniciar intento')
  })
}

export function useFinalizarIntento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.finalizarIntento,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion-intento'] })
      qc.invalidateQueries({ queryKey: ['evaluaciones'] })
      qc.invalidateQueries({ queryKey: ['resultado-intento'] })
      toast.success('Evaluación finalizada')
    },
    onError: () => toast.error('Error al finalizar')
  })
}

export function useAbandonarIntento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.abandonarIntento,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion-intento'] })
      toast.success('Intento abandonado')
    },
    onError: () => toast.error('Error al abandonar')
  })
}

export function useObtenerResultadoIntento(idIntento?: number) {
  return useQuery({
    queryKey: ['resultado-intento', idIntento],
    queryFn: () => evaluacionesService.obtenerResultadoIntento(idIntento || 0),
    enabled: !!idIntento
  })
}

export function useIntentosUsuario(idUsuario?: number, idEvaluacion?: number) {
  return useQuery({
    queryKey: ['intentos-usuario', idUsuario, idEvaluacion],
    queryFn: () =>
      evaluacionesService.obtenerIntentosUsuario(idUsuario || 0, idEvaluacion || 0),
    enabled: !!(idUsuario && idEvaluacion)
  })
}
