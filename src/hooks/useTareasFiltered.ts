import { useQuery } from '@tanstack/react-query'
import { getTareasFiltered } from '@/services/tareaFiltering.service'

// ── Options Interface ──

export interface UseTareasFilteredOptions {
  idIglesia?: number
  idMinisterio?: number
  estado?: string
  prioridad?: string
  busqueda?: string
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  pageSize?: number
}

// ── Hook ──

export function useTareasFiltered(options: UseTareasFilteredOptions) {
  const {
    idIglesia,
    idMinisterio,
    estado,
    prioridad,
    busqueda,
    fechaDesde,
    fechaHasta,
    page = 0,
    pageSize = 50,
  } = options

  const offset = page * pageSize

  return useQuery({
    queryKey: [
      'tareas-filtered',
      idIglesia,
      idMinisterio,
      estado,
      prioridad,
      busqueda,
      fechaDesde,
      fechaHasta,
      page,
      pageSize,
    ],
    queryFn: () =>
      getTareasFiltered({
        idIglesia,
        idMinisterio,
        estado,
        prioridad,
        busqueda,
        fechaDesde,
        fechaHasta,
        limit: pageSize,
        offset,
      }),
    staleTime: 30 * 1000,
  })
}
