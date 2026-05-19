import { ROLE_IDS } from '@/app/constants/roles'

type RoleOption = {
  idRol: number
  nombre: string
}

type UsuarioMinisterio = {
  idMinisterio: number
  nombre: string
  rol: string
}

type UsuarioWithMinisterios = {
  idUsuario: number
  nombres: string
  apellidos: string
  minNames: UsuarioMinisterio[]
}

function normalizeRoleText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

export function roleOptionsForScope(
  roles: RoleOption[],
  options: { selectedSedeId?: number | null; canAssignRole: (idRol: number) => boolean }
): RoleOption[] {
  return roles.filter((role) => {
    if (!options.canAssignRole(role.idRol)) return false
    if (options.selectedSedeId && role.idRol === ROLE_IDS.SUPER_ADMIN) return false
    return true
  })
}

export function findActiveLeaderConflict(
  users: UsuarioWithMinisterios[],
  idRol: number,
  idMinisterio?: number | null,
  targetUserId?: number | null
): { idUsuario: number; leaderName: string; ministerioName: string } | null {
  if (idRol !== ROLE_IDS.LIDER || !idMinisterio) return null

  for (const user of users) {
    if (targetUserId && user.idUsuario === targetUserId) continue

    const ministerio = user.minNames.find((min) => (
      min.idMinisterio === idMinisterio && normalizeRoleText(min.rol).includes('lider')
    ))

    if (ministerio) {
      return {
        idUsuario: user.idUsuario,
        leaderName: `${user.nombres} ${user.apellidos}`.trim(),
        ministerioName: ministerio.nombre,
      }
    }
  }

  return null
}

export function formatLeaderConflictMessage(conflict: { leaderName: string; ministerioName: string }): string {
  return `Este ministerio ya tiene un líder activo: ${conflict.leaderName}. Remueve ese líder antes de asignar otro.`
}

export function formatUsuarioMutationError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error ?? '')
  const message = rawMessage.toLowerCase()

  if (message.includes('líder activo') || message.includes('lider activo') || message.includes('active leader')) {
    return 'Este ministerio ya tiene un líder activo. Remueve ese líder antes de asignar otro.'
  }

  if (message.includes('no autorizado') || message.includes('not authorized') || message.includes('permission denied')) {
    return 'No tienes permiso para realizar esta acción en la iglesia, sede o ministerio seleccionado.'
  }

  if (message.includes('duplicate') || message.includes('duplicado') || message.includes('unique')) {
    return 'El usuario ya tiene una asignación activa con esos datos.'
  }

  return rawMessage || 'No se pudo completar la acción. Intenta nuevamente.'
}
