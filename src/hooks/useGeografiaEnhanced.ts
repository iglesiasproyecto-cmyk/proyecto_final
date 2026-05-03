import { useQuery } from '@tanstack/react-query'
import { getDepartamentos as getDeptoFromDB, getCiudades as getCiudadesFromDB } from '@/services/geografia.service'
import { listaDepartamentos, getCiudadesPorDepartamento } from '@/constants/colombia_geography'
import type { DepartamentoGeo, Ciudad } from '@/types/app.types'

/**
 * Hook mejorado que traé departamentos de Supabase pero con fallback a datos hardcodeados de Colombia
 * Garantiza que siempre habrá departamentos disponibles
 * Si Supabase tiene menos de 15 departamentos, usa los datos locales completos (32 departamentos)
 */
export function useDepartamentosEnhanced(idPais?: number) {
  return useQuery({
    queryKey: ['departamentos-enhanced', idPais],
    queryFn: async () => {
      try {
        // Intentar traer de la base de datos
        const data = await getDeptoFromDB(idPais)
        // Si tenemos datos completos (todos los 32 departamentos de Colombia), usarlos
        if (data && data.length >= 32) return data
        // Si tenemos muy pocos datos, usar fallback
        if (data && data.length < 15) {
          console.log(`DB has only ${data.length} departamentos, using local data with all 32 departamentos`)
        }
      } catch (error) {
        console.warn('Error fetching departamentos from DB, using fallback:', error)
      }

      // Fallback: retornar datos locales de Colombia (todos los 32 departamentos)
      return listaDepartamentos.map((nombre, idx) => ({
        idDepartamentoGeo: idx + 1,
        nombre,
        idPais: idPais || 1, // Asumimos que Colombia es ID 1
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      } as DepartamentoGeo))
    },
    staleTime: 30 * 60 * 1000,
  })
}

/**
 * Hook mejorado que traé ciudades de Supabase pero con fallback a datos hardcodeados de Colombia
 * Garantiza que siempre haya ciudades disponibles para departamentos de Colombia
 */
export function useCiudadesEnhanced(idDepartamento?: number, nombreDepartamento?: string) {
  return useQuery({
    queryKey: ['ciudades-enhanced', idDepartamento, nombreDepartamento],
    queryFn: async () => {
      try {
        // Intentar traer de la base de datos
        if (idDepartamento) {
          const data = await getCiudadesFromDB(idDepartamento)
          if (data && data.length > 0) return data
        }
      } catch (error) {
        console.warn('Error fetching ciudades from DB, using fallback:', error)
      }

      // Fallback: retornar datos locales basados en el nombre del departamento
      if (nombreDepartamento) {
        const ciudades = getCiudadesPorDepartamento(nombreDepartamento)
        return ciudades.map((nombre, idx) => ({
          idCiudad: idx + 1,
          nombre,
          idDepartamentoGeo: idDepartamento || 1,
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString(),
        } as Ciudad))
      }

      return []
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!idDepartamento || !!nombreDepartamento,
  })
}
