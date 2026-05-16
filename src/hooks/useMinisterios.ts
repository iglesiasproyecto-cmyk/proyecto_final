import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMinisterios, getMiembrosMinisterio,
  getMinisteriosEnriquecidos, getMiembrosMinisterioEnriquecidos,
  getMinisteriosPorSede, getUsuariosActivosPorMinisterio,
  getMinisteriosIdsDeUsuario,
  createMinisterio, updateMinisterio, toggleMinisterioEstado,
  createMiembroMinisterio,
  deleteMinisterio, deleteMiembroMinisterio, updateMiembroMinisterio,
  getServidoresMinisterio,
} from '@/services/ministerios.service'

export function useMinisterios(idIglesia?: number) {
  return useQuery({
    queryKey: ['ministerios', idIglesia],
    queryFn: () => getMinisterios(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMiembrosMinisterio(idMinisterio: number) {
  return useQuery({
    queryKey: ['miembros-ministerio', idMinisterio],
    queryFn: () => getMiembrosMinisterio(idMinisterio),
    enabled: idMinisterio > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMinisteriosEnriquecidos(idIglesia?: number) {
  return useQuery({
    queryKey: ['ministerios-enriquecidos', idIglesia],
    queryFn: () => getMinisteriosEnriquecidos(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMinisteriosPorSede(idSede?: number) {
  return useQuery({
    queryKey: ['ministerios-por-sede', idSede],
    queryFn: () => getMinisteriosPorSede(idSede as number),
    enabled: !!idSede && idSede > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUsuariosActivosPorMinisterio(idMinisterio?: number) {
  return useQuery({
    queryKey: ['usuarios-activos-ministerio', idMinisterio],
    queryFn: () => getUsuariosActivosPorMinisterio(idMinisterio as number),
    enabled: !!idMinisterio && idMinisterio > 0,
    staleTime: 60 * 1000,
  })
}

export function useMiembrosMinisterioEnriquecidos(idMinisterio?: number) {
  return useQuery({
    queryKey: ['miembros-ministerio-enriquecidos', idMinisterio],
    queryFn: () => getMiembrosMinisterioEnriquecidos(idMinisterio),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMinisteriosIdsDeUsuario(idUsuario?: number) {
  return useQuery({
    queryKey: ['ministerios-ids-usuario', idUsuario],
    queryFn: () => getMinisteriosIdsDeUsuario(idUsuario as number),
    enabled: !!idUsuario,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMinisterio,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ministerios'] })
      qc.invalidateQueries({ queryKey: ['ministerios-enriquecidos'] })
    },
  })
}

export function useUpdateMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateMinisterio>[1] }) =>
      updateMinisterio(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ministerios'] })
      qc.invalidateQueries({ queryKey: ['ministerios-enriquecidos'] })
    },
  })
}

export function useToggleMinisterioEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleMinisterioEstado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ministerios'] })
      qc.invalidateQueries({ queryKey: ['ministerios-enriquecidos'] })
    },
  })
}

export function useCreateMiembroMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMiembroMinisterio,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['miembros-ministerio', variables.idMinisterio] })
      qc.invalidateQueries({ queryKey: ['miembros-ministerio-enriquecidos'] })
      qc.invalidateQueries({ queryKey: ['ministerios-enriquecidos'] })
    },
  })
}

export function useDeleteMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteMinisterio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ministerios'] })
      qc.invalidateQueries({ queryKey: ['ministerios-enriquecidos'] })
    },
  })
}

export function useDeleteMiembroMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteMiembroMinisterio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['miembros-ministerio'] })
      qc.invalidateQueries({ queryKey: ['miembros-ministerio-enriquecidos'] })
      qc.invalidateQueries({ queryKey: ['ministerios-enriquecidos'] })
    },
  })
}

export function useUpdateMiembroMinisterio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateMiembroMinisterio>[1] }) =>
      updateMiembroMinisterio(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['miembros-ministerio'] })
      qc.invalidateQueries({ queryKey: ['miembros-ministerio-enriquecidos'] })
    },
  })
}

export function useServidoresMinisterio(idMinisterio: number) {
  return useQuery({
    queryKey: ['servidores-ministerio', idMinisterio],
    queryFn: () => getServidoresMinisterio(idMinisterio),
    enabled: idMinisterio > 0,
    staleTime: 5 * 60 * 1000,
  })
}
