import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApp } from '@/app/store/AppContext'
import {
  getNotificaciones, markNotificacionRead, markAllNotificacionesRead, createNotificacion,
} from '@/services/notificaciones.service'

export function useNotificaciones(idUsuario: number) {
  return useQuery({
    queryKey: ['notificaciones', idUsuario],
    queryFn: () => getNotificaciones(idUsuario),
    enabled: !!idUsuario,
    staleTime: 30 * 1000,
  })
}

export function useMarkNotificacionRead() {
  const qc = useQueryClient()
  const { decrementNotificacionesCount } = useApp()
  return useMutation({
    mutationFn: (id: number) => markNotificacionRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones'] })
      decrementNotificacionesCount()
    },
  })
}

export function useMarkAllNotificacionesRead() {
  const qc = useQueryClient()
  const { resetNotificacionesCount } = useApp()
  return useMutation({
    mutationFn: (idUsuario: number) => markAllNotificacionesRead(idUsuario),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones'] })
      resetNotificacionesCount()
    },
  })
}

export function useCreateNotificacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createNotificacion,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['notificaciones', variables.idUsuario] })
    },
  })
}
