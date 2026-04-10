import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRoles,
  getUsuarios,
  getUsuarioRoles,
  getUsuariosEnriquecidos,
  toggleUsuarioActivo,
  updateUsuario,
  assignRol,
  removeRol,
  inviteUser,
} from '@/services/usuarios.service'

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

export function useUsuariosEnriquecidos() {
  return useQuery({
    queryKey: ['usuarios-enriquecidos'],
    queryFn: getUsuariosEnriquecidos,
    staleTime: 60 * 1000,
  })
}

export function useToggleUsuarioActivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleUsuarioActivo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['usuarios-enriquecidos'] })
    },
  })
}

export function useUpdateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateUsuario>[1] }) =>
      updateUsuario(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}

export function useAssignRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof assignRol>[0]) => assignRol(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}

export function useRemoveRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idUsuarioRol: number) => removeRol(idUsuarioRol),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof inviteUser>[0]) => inviteUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}
