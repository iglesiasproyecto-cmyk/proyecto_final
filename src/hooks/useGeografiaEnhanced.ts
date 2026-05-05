import { useQuery } from '@tanstack/react-query'
import { getPaises, getDepartamentos as getDeptoFromDB, getCiudades as getCiudadesFromDB } from '@/services/geografia.service'
import type { Pais, DepartamentoGeo, Ciudad } from '@/types/app.types'

/**
 * Hook que trae países SOLO desde la geografía agregada
 * Solo muestra los países que existen en el módulo de geografía
 */
export function usePaisesEnhanced() {
  return useQuery({
    queryKey: ['paises-enhanced'],
    queryFn: async () => {
      try {
        // Traer solo datos de la base de datos
        const data = await getPaises()
        return data || []
      } catch (error) {
        console.warn('Error fetching paises from DB:', error)
        return []
      }
    },
    staleTime: 30 * 60 * 1000,
  })
}

/**
 * Hook que trae departamentos SOLO desde la geografía agregada
 * Solo muestra los departamentos que se han creado en el módulo de geografía
 * Sin fallback a datos hardcodeados
 */
export function useDepartamentosEnhanced(idPais?: number) {
  return useQuery({
    queryKey: ['departamentos-enhanced', idPais],
    queryFn: async () => {
      try {
        // Traer solo datos de la base de datos
        const data = await getDeptoFromDB(idPais)
        return data || []
      } catch (error) {
        console.warn('Error fetching departamentos from DB:', error)
        return []
      }
    },
    staleTime: 30 * 60 * 1000,
  })
}

/**
 * Hook que trae ciudades SOLO desde la geografía agregada
 * Solo muestra las ciudades que se han creado en el módulo de geografía para el departamento seleccionado
 * Sin fallback a datos hardcodeados
 */
export function useCiudadesEnhanced(idDepartamento?: number, nombreDepartamento?: string) {
  return useQuery({
    queryKey: ['ciudades-enhanced', idDepartamento, nombreDepartamento],
    queryFn: async () => {
      try {
        // Traer solo datos de la base de datos
        if (idDepartamento) {
          const data = await getCiudadesFromDB(idDepartamento)
          return data || []
        }
      } catch (error) {
        console.warn('Error fetching ciudades from DB:', error)
      }
      return []
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!idDepartamento,
  })
}
