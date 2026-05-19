import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsuariosSede, getSedesDeUsuario,
  createUsuarioSede, deleteUsuarioSede,
} from '@/services/usuarioSede.service'

export function useUsuariosSede(idSede: number) {
  return useQuery({
    queryKey: ['usuarios-sede', idSede],
    queryFn: () => getUsuariosSede(idSede),
    enabled: idSede > 0,
    staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnWindowFocus: false,
  })
}

export function useSedesDeUsuario(idUsuario?: number) {
  return useQuery({
    queryKey: ['sedes-usuario', idUsuario],
    queryFn: () => getSedesDeUsuario(idUsuario as number),
    enabled: !!idUsuario,
    staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnWindowFocus: false,
  })
}

export function useCreateUsuarioSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createUsuarioSede,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['usuarios-sede', variables.idSede] })
      qc.invalidateQueries({ queryKey: ['sedes-usuario'] })
    },
  })
}

export function useDeleteUsuarioSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteUsuarioSede(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios-sede'] })
      qc.invalidateQueries({ queryKey: ['sedes-usuario'] })
    },
  })
}
