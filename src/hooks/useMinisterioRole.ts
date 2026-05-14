import { useQuery } from '@tanstack/react-query'
import { getMiRolEnMinisterio } from '@/services/usuarioSede.service'
import { useApp } from '@/app/store/AppContext'

export function useMinisterioRole(idMinisterio: number | null | undefined) {
  const { usuarioActual, rolActual } = useApp()

  const isHighPrivilege =
    rolActual === 'super_admin' ||
    rolActual === 'admin_iglesia' ||
    rolActual === 'admin_sede'

  return useQuery({
    queryKey: ['ministerio-role', idMinisterio, usuarioActual?.idUsuario],
    queryFn: () =>
      getMiRolEnMinisterio(idMinisterio as number, usuarioActual!.idUsuario),
    enabled: !isHighPrivilege && !!idMinisterio && !!usuarioActual,
    staleTime: 5 * 60 * 1000,
    select: (data) => data,
    placeholderData: isHighPrivilege ? 'lider' : undefined,
  })
}

export function useCanManageMinisterio(idMinisterio: number | null | undefined): boolean {
  const { rolActual } = useApp()

  const isHighPrivilege =
    rolActual === 'super_admin' ||
    rolActual === 'admin_iglesia' ||
    rolActual === 'admin_sede'

  const { data: rolEnMinisterio } = useMinisterioRole(idMinisterio)

  if (isHighPrivilege) return true
  if (!idMinisterio) return false
  return rolEnMinisterio === 'lider'
}
