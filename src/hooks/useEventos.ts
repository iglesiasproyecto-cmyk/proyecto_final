import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAulaCursoCompleto } from '@/services/aula.service'
import { supabase } from '@/lib/supabaseClient'
import {
  getEventos, getTareas, getTareasAsignadas,
  getEventosEnriquecidos, getTareasEnriquecidas,
  createEvento,
  createTarea, updateTareaEstado,
  updateEvento, deleteEvento, updateTarea, deleteTarea,
  createTareaAsignada, updateTareaAsignada, deleteTareaAsignada,
  assignUsuariosATarea,
  getTareaEvidencias, createTareaEvidencia,
  getEventosPorMinisterio,
} from '@/services/eventos.service'
import { archiveTask, unarchiveTask } from '@/services/tareaArchive.service'
import {
  getTaskTimeline,
  createTareaComentario,
  createTareaAprobacion,
} from '@/services/evidenceService'
import type { Tarea } from '@/types/app.types'
import { toast } from 'sonner'

export function useEventos(idIglesia?: number) {
  return useQuery({
    queryKey: ['eventos', idIglesia],
    queryFn: () => getEventos(idIglesia),
    staleTime: 60 * 1000,
  })
}

export function useTareas() {
  return useQuery({ queryKey: ['tareas'], queryFn: getTareas, staleTime: 60 * 1000 })
}

export function useTareasAsignadas(idUsuario: number) {
  return useQuery({
    queryKey: ['tareas-asignadas', idUsuario],
    queryFn: () => getTareasAsignadas(idUsuario),
    enabled: !!idUsuario,
    staleTime: 60 * 1000,
  })
}

export function useCreateEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEvento,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.invalidateQueries({ queryKey: ['eventos-enriquecidos'] })
    },
  })
}

export function useCreateTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTarea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['eventos-enriquecidos'] })
      qc.invalidateQueries({ queryKey: ['tareas-asignadas'] })
    },
  })
}

export function useUpdateTareaEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: Tarea['estado'] }) =>
      updateTareaEstado(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}

// ── Enriched query hooks ──

export function useEventosEnriquecidos(idIglesia?: number) {
  return useQuery({
    queryKey: ['eventos-enriquecidos', idIglesia],
    queryFn: () => getEventosEnriquecidos(idIglesia),
    enabled: idIglesia !== undefined,
    staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnWindowFocus: false,
  })
}

export function useTareasEnriquecidas(idEvento?: number, idIglesia?: number, idUsuario?: number) {
  return useQuery({
    queryKey: ['tareas-enriquecidas', idEvento, idIglesia, idUsuario],
    queryFn: () => getTareasEnriquecidas(idEvento, idIglesia, idUsuario),
    staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnWindowFocus: false,
  })
}

export function useEventosGlobal() {
  return useQuery({
    queryKey: ['eventos-enriquecidos', 'global'],
    queryFn: () => getEventosEnriquecidos(),
    staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnWindowFocus: false,
  })
}

export function useTareasGlobal() {
  return useQuery({
    queryKey: ['tareas-enriquecidas', 'global'],
    queryFn: () => getTareasEnriquecidas(),
    staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnWindowFocus: false,
  })
}

export function useTareaEvidencias(idTarea?: number) {
  return useQuery({
    queryKey: ['tarea-evidencias', idTarea],
    queryFn: () => getTareaEvidencias(idTarea as number),
    enabled: !!idTarea,
    staleTime: 60 * 1000,
  })
}

// ── Evento update/delete mutations ──

export function useUpdateEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateEvento>[1] }) =>
      updateEvento(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.invalidateQueries({ queryKey: ['eventos-enriquecidos'] })
    },
  })
}

export function useDeleteEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEvento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.invalidateQueries({ queryKey: ['eventos-enriquecidos'] })
    },
  })
}

// ── Tarea update/delete mutations ──

export function useUpdateTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTarea>[1] }) =>
      updateTarea(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}

export function useDeleteTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTarea(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['eventos-enriquecidos'] })
    },
  })
}

// ── Aula Actividad mutations ──
// Note: updated_at is automatically handled by database triggers

export function useCompletarActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idUsuario, idActividad, completada }: {
      idUsuario: number
      idActividad: number
      completada: boolean
    }) => {
      const { data, error } = await supabase
        .from('aula_progreso_actividad')
        .upsert({
          id_usuario: idUsuario,
          id_aula_actividad: idActividad,
          completada,
          completada_en: completada ? new Date().toISOString() : null,
        }, {
          onConflict: 'id_usuario,id_aula_actividad'
        })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acceso-modulos'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}

// ── Aula Certificado mutations ──

export function useEmitirCertificado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idUsuario, idCurso }: { idUsuario: number; idCurso: number }) => {
      const { data, error } = await supabase
        .from('aula_certificado')
        .upsert({
          id_usuario: idUsuario,
          id_aula_curso: idCurso,
          emitido_en: new Date().toISOString()
        }, {
          onConflict: 'id_usuario,id_aula_curso'
        })

      if (error) {
        if (error.code === '23505') {
          throw new Error('El usuario ya tiene un certificado para este curso')
        }
        throw error
      }

      return data
    },
    onSuccess: (_, { idUsuario, idCurso }) => {
      qc.invalidateQueries({ queryKey: ['certificados-usuario', idUsuario] })
      qc.invalidateQueries({ queryKey: ['tiene-certificado', idUsuario, idCurso] })
    },
  })
}

// ── Aula optimized loading ──

export function useAulaCursoCompleto(idCurso: number | undefined) {
  return useQuery({
    queryKey: ['aula-curso-completo', idCurso],
    queryFn: () => getAulaCursoCompleto(idCurso!),
    enabled: !!idCurso,
    staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnWindowFocus: false, // 5 minutes
  })
}

// ── TareaAsignada mutations ──

export function useCreateTareaAsignada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createTareaAsignada>[0]) => createTareaAsignada(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas-asignadas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}

export function useAssignUsuariosATarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assignUsuariosATarea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas-asignadas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['notificaciones'] })
    },
  })
}

export function useUpdateTareaAsignada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTareaAsignada>[1] }) =>
      updateTareaAsignada(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas-asignadas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}

export function useDeleteTareaAsignada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTareaAsignada(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}

export function useCreateTareaEvidencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTareaEvidencia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarea-evidencias'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
    },
  })
}

export function useEventosPorMinisterio(idMinisterio: number) {
  return useQuery({
    queryKey: ['eventos-ministerio', idMinisterio],
    queryFn: () => getEventosPorMinisterio(idMinisterio),
    enabled: typeof idMinisterio === 'number' && idMinisterio > 0,
    staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnWindowFocus: false,
  })
}

// ── Archive mutations ──

export function useArchiveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: archiveTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
      toast.success('Tarea archivada exitosamente')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al archivar tarea')
    },
  })
}

export function useUnarchiveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: unarchiveTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
      toast.success('Tarea restaurada exitosamente')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al restaurar tarea')
    },
  })
}

// ── Task Review Workflow Hooks ──

export function useTaskTimeline(idTarea: number | undefined) {
  return useQuery({
    queryKey: ['task-timeline', idTarea],
    queryFn: () => getTaskTimeline(idTarea!),
    enabled: !!idTarea,
    staleTime: 30 * 1000,
  })
}

export function useCreateTareaComentario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTareaComentario,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['task-timeline', variables.idTarea] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al agregar comentario')
    },
  })
}

export function useCreateTareaAprobacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTareaAprobacion,
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['task-timeline', variables.idTarea] })
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
      const msg = variables.accion === 'aprobar'
        ? 'Tarea aprobada exitosamente'
        : variables.accion === 'rechazar'
        ? 'Tarea rechazada — el asignado recibirá los comentarios'
        : 'Tarea reabierta para trabajo adicional'
      toast.success(msg)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al procesar la revisión')
    },
  })
}
