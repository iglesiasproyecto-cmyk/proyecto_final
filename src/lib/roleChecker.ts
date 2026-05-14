// Role-based permission checking for task operations

export type UserRole = 'super_admin' | 'admin_iglesia' | 'lider' | 'admin_sede' | 'servidor';

export interface TaskPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canApprove: boolean;
  canReject: boolean;
  canArchive: boolean;
  canBulkUpdate: boolean;
}

export function getTaskPermissions(
  userRole: UserRole,
  isTaskCreator: boolean,
  isTaskLider: boolean,
  isAdminOfTaskMinisterio: boolean
): TaskPermissions {
  const canEdit =
    userRole === 'super_admin' ||
    userRole === 'admin_iglesia' ||
    (userRole === 'lider' && isTaskLider);

  const canDelete = userRole === 'super_admin' || userRole === 'admin_iglesia';

  const canAssign =
    userRole === 'super_admin' ||
    userRole === 'admin_iglesia' ||
    (userRole === 'lider' && isTaskLider);

  const canApprove = userRole === 'super_admin' || userRole === 'admin_iglesia';

  const canReject = userRole === 'super_admin' || userRole === 'admin_iglesia';

  const canArchive = userRole === 'super_admin' || userRole === 'admin_iglesia';

  const canBulkUpdate = userRole === 'super_admin' || userRole === 'admin_iglesia';

  return {
    canEdit,
    canDelete,
    canAssign,
    canApprove,
    canReject,
    canArchive,
    canBulkUpdate,
  };
}

export function canUserEditTask(
  userRole: UserRole,
  isTaskLider: boolean
): boolean {
  const perms = getTaskPermissions(
    userRole,
    false,
    isTaskLider,
    false
  );
  return perms.canEdit;
}

export function canUserApproveTask(userRole: UserRole): boolean {
  return userRole === 'super_admin' || userRole === 'admin_iglesia';
}

export function canUserBulkUpdate(userRole: UserRole): boolean {
  return userRole === 'super_admin' || userRole === 'admin_iglesia';
}
