import { useApp } from '@/app/store/AppContext'
import { getTaskPermissions, canUserApproveTask, canUserBulkUpdate } from '@/lib/roleChecker'
import type { TareaEnriquecida } from '@/services/eventos.service'

export interface TaskActionPermissions {
  canEdit: boolean
  canDelete: boolean
  canAssign: boolean
  canApprove: boolean
  canReject: boolean
  canArchive: boolean
  canBulkUpdate: boolean
  canCreateTask: boolean
}

export function useTaskPermissions(task?: TareaEnriquecida): TaskActionPermissions {
  const { rolActual, usuarioActual } = useApp()

  const isTaskCreator = task?.idUsuarioCreador === usuarioActual?.idUsuario
  const isTaskLider = false // Will be enriched from task context if needed

  const basePerms = getTaskPermissions(
    rolActual as any,
    isTaskCreator,
    isTaskLider,
    false
  )

  return {
    ...basePerms,
    canCreateTask:
      rolActual === 'super_admin' ||
      rolActual === 'admin_iglesia' ||
      rolActual === 'lider',
  }
}

export function useCanApproveTask(): boolean {
  const { rolActual } = useApp()
  return canUserApproveTask(rolActual as any)
}

export function useCanBulkUpdate(): boolean {
  const { rolActual } = useApp()
  return canUserBulkUpdate(rolActual as any)
}
