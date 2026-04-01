import { useQuery } from '@tanstack/react-query'
import { getIglesias, getPastores, getIglesiaPastores, getSedes } from '@/services/iglesias.service'

export function useIglesias() {
  return useQuery({
    queryKey: ['iglesias'],
    queryFn: getIglesias,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePastores() {
  return useQuery({
    queryKey: ['pastores'],
    queryFn: getPastores,
    staleTime: 5 * 60 * 1000,
  })
}

export function useIglesiaPastores() {
  return useQuery({
    queryKey: ['iglesia-pastores'],
    queryFn: getIglesiaPastores,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSedes(idIglesia?: number) {
  return useQuery({
    queryKey: ['sedes', idIglesia],
    queryFn: () => getSedes(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}
