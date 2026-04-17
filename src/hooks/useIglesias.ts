import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getIglesias, getPastores, getIglesiaPastores, getSedes,
  getIglesiasEnriquecidas, getPastoresEnriquecidos, getSedesEnriquecidas,
  createIglesia, updateIglesia, toggleIglesiaEstado, deleteIglesia,
  createSede, updateSede, toggleSedeEstado, deleteSede,
  createPastor, updatePastor, deletePastor,
  createIglesiaPastor, closeIglesiaPastor,
} from '@/services/iglesias.service'

export function useIglesias() {
  return useQuery({ queryKey: ['iglesias'], queryFn: getIglesias, staleTime: 5 * 60 * 1000 })
}

export function usePastores() {
  return useQuery({ queryKey: ['pastores'], queryFn: getPastores, staleTime: 5 * 60 * 1000 })
}

export function useIglesiaPastores() {
  return useQuery({ queryKey: ['iglesia-pastores'], queryFn: getIglesiaPastores, staleTime: 5 * 60 * 1000 })
}

export function useSedes(idIglesia?: number) {
  return useQuery({
    queryKey: ['sedes', idIglesia],
    queryFn: () => getSedes(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}

export function useIglesiasEnriquecidas() {
  return useQuery({ queryKey: ['iglesias-enriquecidas'], queryFn: getIglesiasEnriquecidas, staleTime: 5 * 60 * 1000 })
}

export function usePastoresEnriquecidos() {
  return useQuery({ queryKey: ['pastores-enriquecidos'], queryFn: getPastoresEnriquecidos, staleTime: 5 * 60 * 1000 })
}

export function useSedesEnriquecidas(idIglesia?: number) {
  return useQuery({
    queryKey: ['sedes-enriquecidas', idIglesia],
    queryFn: () => getSedesEnriquecidas(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateIglesia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createIglesia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iglesias'] })
      qc.invalidateQueries({ queryKey: ['iglesias-enriquecidas'] })
    },
  })
}

export function useUpdateIglesia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateIglesia>[1] }) =>
      updateIglesia(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iglesias'] })
      qc.invalidateQueries({ queryKey: ['iglesias-enriquecidas'] })
    },
  })
}

export function useToggleIglesiaEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleIglesiaEstado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iglesias'] })
      qc.invalidateQueries({ queryKey: ['iglesias-enriquecidas'] })
    },
  })
}

export function useCreateSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSede,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes'] })
      qc.invalidateQueries({ queryKey: ['sedes-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['iglesias-enriquecidas'] })
    },
  })
}

export function useUpdateSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateSede>[1] }) =>
      updateSede(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes'] })
      qc.invalidateQueries({ queryKey: ['sedes-enriquecidas'] })
    },
  })
}

export function useToggleSedeEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleSedeEstado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes'] })
      qc.invalidateQueries({ queryKey: ['sedes-enriquecidas'] })
    },
  })
}

export function useCreatePastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPastor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pastores'] }),
  })
}

export function useUpdatePastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePastor>[1] }) =>
      updatePastor(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pastores'] }),
  })
}

export function useCreateIglesiaPastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createIglesiaPastor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iglesia-pastores'] }),
  })
}

export function useCloseIglesiaPastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => closeIglesiaPastor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iglesia-pastores'] }),
  })
}

export function useDeleteIglesia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteIglesia(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iglesias'] })
      qc.invalidateQueries({ queryKey: ['iglesias-enriquecidas'] })
    },
  })
}

export function useDeleteSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteSede(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes'] })
      qc.invalidateQueries({ queryKey: ['sedes-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['iglesias-enriquecidas'] })
    },
  })
}

export function useDeletePastor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePastor(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pastores'] })
      qc.invalidateQueries({ queryKey: ['pastores-enriquecidos'] })
    },
  })
}
