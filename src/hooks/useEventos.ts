import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTiposEvento, getEventos, getTareas, getTareasAsignadas,
  getEventosEnriquecidos, getTareasEnriquecidas,
  createTipoEvento, updateTipoEvento, deleteTipoEvento,
  createEvento, createTarea, updateTareaEstado,
  updateEvento, deleteEvento, updateTarea, deleteTarea,
  createTareaAsignada, updateTareaAsignada, deleteTareaAsignada,
  getTareaEvidencias, createTareaEvidencia,
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
      qc.refetchQueries({ queryKey: ['eventos-enriquecidos'], type: 'all' })
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
      qc.refetchQueries({ queryKey: ['tareas'], type: 'all' })
      qc.refetchQueries({ queryKey: ['tareas-enriquecidas'], type: 'all' })
    },
  })
}

// â”€â”€ Enriched query hooks â”€â”€

export function useEventosEnriquecidos(idIglesia?: number) {
  return useQuery({
    queryKey: ['eventos-enriquecidos', idIglesia],
    queryFn: () => getEventosEnriquecidos(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTareasEnriquecidas(idEvento?: number) {
  return useQuery({
    queryKey: ['tareas-enriquecidas', idEvento],
    queryFn: () => getTareasEnriquecidas(idEvento),
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

// â”€â”€ Evento update/delete mutations â”€â”€

export function useUpdateEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateEvento>[1] }) =>
      updateEvento(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.refetchQueries({ queryKey: ['eventos-enriquecidos'], type: 'all' })
    },
  })
}

export function useDeleteEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEvento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.refetchQueries({ queryKey: ['eventos-enriquecidos'], type: 'all' })
    },
  })
}

// â”€â”€ Tarea update/delete mutations â”€â”€

export function useUpdateTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTarea>[1] }) =>
      updateTarea(id, data),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['tareas'], type: 'all' })
      qc.refetchQueries({ queryKey: ['tareas-enriquecidas'], type: 'all' })
    },
  })
}

export function useDeleteTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTarea(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['tareas'], type: 'all' })
      qc.refetchQueries({ queryKey: ['tareas-enriquecidas'], type: 'all' })
      qc.refetchQueries({ queryKey: ['eventos-enriquecidos'], type: 'all' })
    },
  })
}

// â”€â”€ TareaAsignada mutations â”€â”€

export function useCreateTareaAsignada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createTareaAsignada>[0]) => createTareaAsignada(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas-asignadas'] })
      qc.refetchQueries({ queryKey: ['tareas-enriquecidas'], type: 'all' })
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
    },
  })
}

export function useDeleteTareaAsignada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTareaAsignada(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas-asignadas'] })
      qc.refetchQueries({ queryKey: ['tareas-enriquecidas'], type: 'all' })
    },
  })
}

export function useCreateTareaEvidencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTareaEvidencia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarea-evidencias'] })
      qc.refetchQueries({ queryKey: ['tareas-enriquecidas'], type: 'all' })
    },
  })
}
