import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRoles, getUsuarios, getUsuarioRoles, toggleUsuarioActivo } from '@/services/usuarios.service'

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    staleTime: 30 * 60 * 1000,
  })
}

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: getUsuarios,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUsuarioRoles(idUsuario: number) {
  return useQuery({
    queryKey: ['usuario-rol', idUsuario],
    queryFn: () => getUsuarioRoles(idUsuario),
    enabled: !!idUsuario,
    staleTime: 5 * 60 * 1000,
  })
}

export function useToggleUsuarioActivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleUsuarioActivo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}
