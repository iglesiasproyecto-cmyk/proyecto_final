import { useQuery } from '@tanstack/react-query'
import { getUsuariosDeIglesia, type UsuarioEnriquecido } from '@/services/ministerios.service'

export type { UsuarioEnriquecido }

export function useUsuariosDeIglesia(idIglesia?: number) {
  return useQuery({
    queryKey: ['usuarios-iglesia', idIglesia],
    queryFn: () => getUsuariosDeIglesia(idIglesia!),
    enabled: !!idIglesia && idIglesia > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
