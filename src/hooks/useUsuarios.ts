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
  deleteUsuarioAsSuperAdmin,
  fetchAdminSedesAsignaciones,
  assignAdminSede,
  removeAdminSede,
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
      qc.invalidateQueries({ queryKey: ['usuarios-enriquecidos'] })
    },
  })
}

export function useAssignRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof assignRol>[0]) => assignRol(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['usuarios-enriquecidos'] })
      qc.invalidateQueries({ queryKey: ['usuario-rol'] })
    },
  })
}

export function useRemoveRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idUsuarioRol: number) => removeRol(idUsuarioRol),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['usuarios-enriquecidos'] })
      qc.invalidateQueries({ queryKey: ['usuario-rol'] })
    },
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof inviteUser>[0]) => inviteUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['usuarios-enriquecidos'] })
    },
  })
}

export function useDeleteUsuarioAsSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idUsuario: number) => deleteUsuarioAsSuperAdmin(idUsuario),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['usuarios-enriquecidos'] })
      qc.invalidateQueries({ queryKey: ['usuario-rol'] })
    },
  })
}

// ── Admin Sede Hooks ──

export function useAdminSedesAsignaciones(idIglesia?: number) {
  return useQuery({
    queryKey: ['admin-sedes-asignaciones', idIglesia],
    queryFn: () => fetchAdminSedesAsignaciones(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAssignAdminSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof assignAdminSede>[0]) => assignAdminSede(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sedes-asignaciones'] })
      qc.invalidateQueries({ queryKey: ['sedes-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['usuarios-enriquecidos'] })
    },
  })
}

export function useRemoveAdminSede() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idAdminSedeAsignacion: number) => removeAdminSede(idAdminSedeAsignacion),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sedes-asignaciones'] })
      qc.invalidateQueries({ queryKey: ['sedes-enriquecidas'] })
    },
  })
}
