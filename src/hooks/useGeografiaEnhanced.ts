import { useQuery } from '@tanstack/react-query'
import { getPaises, getDepartamentos as getDeptoFromDB, getCiudades as getCiudadesFromDB } from '@/services/geografia.service'
import type { Pais, DepartamentoGeo, Ciudad } from '@/types/app.types'

/**
 * Hook que obtiene departamentos de Supabase exclusivamente
 * No usa datos locales - requiere que existan en BD
 */
export function useDepartamentosEnhanced(idPais?: number) {
  return useQuery({
    queryKey: ['departamentos-enhanced', idPais],
    queryFn: async () => {
      const data = await getDeptoFromDB(idPais)
      if (!data || data.length === 0) {
        throw new Error('No se encontraron departamentos en la base de datos')
      }
      return data
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!idPais, // Solo ejecutar si hay país seleccionado
  })
}

/**
 * Hook que obtiene ciudades de Supabase exclusivamente
 * No usa datos locales - requiere que existan en BD
 */
export function useCiudadesEnhanced(idDepartamento?: number, nombreDepartamento?: string) {
  return useQuery({
    queryKey: ['ciudades-enhanced', idDepartamento, nombreDepartamento],
    queryFn: async () => {
      if (!idDepartamento) {
        return []
      }

      const data = await getCiudadesFromDB(idDepartamento)
      if (!data) {
        throw new Error('No se pudieron obtener las ciudades')
      }
      return data
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!idDepartamento, // Solo ejecutar si hay departamento seleccionado
  })
}

/**
 * Hook para obtener países disponibles exclusivamente de BD
 * No usa datos locales - requiere que existan en BD
 */
export function usePaisesEnhanced() {
  return useQuery({
    queryKey: ['paises-enhanced'],
    queryFn: async () => {
      const data = await getPaises()
      if (!data || data.length === 0) {
        throw new Error('No se encontraron países en la base de datos')
      }
      return data
    },
    staleTime: 60 * 60 * 1000, // 1 hora
  })
}
