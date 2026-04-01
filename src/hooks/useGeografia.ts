import { useQuery } from '@tanstack/react-query'
import { getPaises, getDepartamentos, getCiudades } from '@/services/geografia.service'

export function usePaises() {
  return useQuery({
    queryKey: ['paises'],
    queryFn: getPaises,
    staleTime: 30 * 60 * 1000,
  })
}

export function useDepartamentos(idPais?: number) {
  return useQuery({
    queryKey: ['departamentos', idPais],
    queryFn: () => getDepartamentos(idPais),
    staleTime: 30 * 60 * 1000,
  })
}

export function useCiudades(idDepartamento?: number) {
  return useQuery({
    queryKey: ['ciudades', idDepartamento],
    queryFn: () => getCiudades(idDepartamento),
    staleTime: 30 * 60 * 1000,
  })
}
