import { useQuery } from '@tanstack/react-query'
import { getUsuariosDeIglesia, type UsuarioEnriquecido } from '@/services/ministerios.service'

export type { UsuarioEnriquecido }

export function useUsuariosDeIglesia(idIglesia?: number) {
  return useQuery({
    queryKey: ['usuarios-iglesia', idIglesia],
    queryFn: () => getUsuariosDeIglesia(idIglesia!),
    enabled: !!idIglesia && idIglesia > 0,
    staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnWindowFocus: false,
    gcTime: 10 * 60 * 1000,  // Clear cache after 10 min unused
    retry: 1,  // Retry once on failure (not 3x)
  })
}
