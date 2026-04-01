import { useQuery } from '@tanstack/react-query'
import { getNotificaciones } from '@/services/notificaciones.service'

export function useNotificaciones(idUsuario: number) {
  return useQuery({
    queryKey: ['notificaciones', idUsuario],
    queryFn: () => getNotificaciones(idUsuario),
    enabled: !!idUsuario,
    staleTime: 30 * 1000,
  })
}
