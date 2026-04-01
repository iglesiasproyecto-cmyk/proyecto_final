import { useQuery } from '@tanstack/react-query'
import { getMinisterios, getMiembrosMinisterio } from '@/services/ministerios.service'

export function useMinisterios(idSede?: number) {
  return useQuery({
    queryKey: ['ministerios', idSede],
    queryFn: () => getMinisterios(idSede),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMiembrosMinisterio(idMinisterio: number) {
  return useQuery({
    queryKey: ['miembros', idMinisterio],
    queryFn: () => getMiembrosMinisterio(idMinisterio),
    enabled: !!idMinisterio,
    staleTime: 5 * 60 * 1000,
  })
}
