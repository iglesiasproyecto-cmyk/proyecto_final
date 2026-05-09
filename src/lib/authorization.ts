export type AppRole = 'super_admin' | 'admin_iglesia' | 'admin_sede' | 'lider' | 'servidor' | ''

export function canCreateChurchWideCourse(role: AppRole): boolean {
  return role === 'super_admin' || role === 'admin_iglesia'
}

export function canManageCourse(role: AppRole, isOwnerLeader: boolean): boolean {
  if (role === 'super_admin' || role === 'admin_iglesia') return true
  if (role === 'lider' && isOwnerLeader) return true
  return false
}

export function canViewCourseDetail(params: {
  role: AppRole
  isOwnerLeader: boolean
  isEnrolledServer: boolean
}): boolean {
  if (params.role === 'super_admin' || params.role === 'admin_iglesia') return true
  if (params.isOwnerLeader) return true
  return params.isEnrolledServer
}
