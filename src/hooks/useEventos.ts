import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAulaCursoCompleto } from '@/services/aula.service'
import {
  getTiposEvento, getEventos, getTareas, getTareasAsignadas,
  getEventosEnriquecidos, getTareasEnriquecidas,
  createTipoEvento, updateTipoEvento, deleteTipoEvento,
  createEvento, createTarea, updateTareaEstado,
  updateEvento, deleteEvento, updateTarea, deleteTarea,
  createTareaAsignada, updateTareaAsignada, deleteTareaAsignada,
  getTareaEvidencias, createTareaEvidencia,
  getEventosPorMinisterio,
} from '@/services/eventos.service'
import type { Tarea } from '@/types/app.types'

export function useTiposEvento() {
  return useQuery({ queryKey: ['tipos-evento'], queryFn: getTiposEvento, staleTime: 30 * 60 * 1000 })
}

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

export function useCreateTipoEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, descripcion }: { nombre: string; descripcion: string | null }) =>
      createTipoEvento(nombre, descripcion),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-evento'] }),
  })
}

export function useUpdateTipoEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre, descripcion }: { id: number; nombre: string; descripcion: string | null }) =>
      updateTipoEvento(id, nombre, descripcion),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-evento'] }),
  })
}

export function useDeleteTipoEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTipoEvento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-evento'] }),
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
    staleTime: 5 * 60 * 1000,
  })
}

export function useTareasEnriquecidas(idEvento?: number) {
  return useQuery({
    queryKey: ['tareas-enriquecidas', idEvento],
    queryFn: () => getTareasEnriquecidas(idEvento),
    enabled: !!idEvento,
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    staleTime: 5 * 60 * 1000,
  })
}
