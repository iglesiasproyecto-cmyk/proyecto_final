import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTiposEvento, getEventos, getTareas, getTareasAsignadas,
  createTipoEvento, updateTipoEvento, deleteTipoEvento,
  createEvento, createTarea, updateTareaEstado,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventos'] }),
  })
}

export function useCreateTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTarea,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas'] }),
  })
}

export function useUpdateTareaEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: Tarea['estado'] }) =>
      updateTareaEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas'] }),
  })
}
