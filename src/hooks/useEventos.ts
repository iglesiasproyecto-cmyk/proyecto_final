import { useQuery } from '@tanstack/react-query'
import { getTiposEvento, getEventos, getTareas, getTareasAsignadas } from '@/services/eventos.service'

export function useTiposEvento() {
  return useQuery({
    queryKey: ['tipos-evento'],
    queryFn: getTiposEvento,
    staleTime: 30 * 60 * 1000,
  })
}

export function useEventos(idIglesia?: number) {
  return useQuery({
    queryKey: ['eventos', idIglesia],
    queryFn: () => getEventos(idIglesia),
    staleTime: 60 * 1000,
  })
}

export function useTareas() {
  return useQuery({
    queryKey: ['tareas'],
    queryFn: getTareas,
    staleTime: 60 * 1000,
  })
}

export function useTareasAsignadas(idUsuario: number) {
  return useQuery({
    queryKey: ['tareas-asignadas', idUsuario],
    queryFn: () => getTareasAsignadas(idUsuario),
    enabled: !!idUsuario,
    staleTime: 60 * 1000,
  })
}
