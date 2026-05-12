/**
 * Constantes centralizadas de roles del sistema
 * IDs deben sincronizarse con tabla `rol` en Supabase
 */

export const ROLE_IDS = {
  SUPER_ADMIN: 25,
  ADMIN_IGLESIA: 26,
  LIDER: 27,
  SERVIDOR: 28,
  ADMIN_SEDE: 33,
} as const;

export const ROLE_LABELS: Record<keyof typeof ROLE_IDS, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN_IGLESIA: "Administrador de Iglesia",
  ADMIN_SEDE: "Administrador de Sede",
  LIDER: "Líder de Ministerio",
  SERVIDOR: "Servidor",
} as const;

export const ROLE_DESCRIPTIONS: Record<keyof typeof ROLE_IDS, string> = {
  SUPER_ADMIN: "Acceso total al sistema",
  ADMIN_IGLESIA: "Gestiona su iglesia y todas sus operaciones",
  ADMIN_SEDE: "Gestiona una sede específica: ministerios, miembros, eventos y tareas",
  LIDER: "Gestiona su ministerio: miembros, eventos y tareas",
  SERVIDOR: "Acceso limitado: solo sus tareas y formación",
} as const;

/**
 * Tipo para slugs de roles en la UI (lowercase, snake_case)
 */
export type RolSlug = 'super_admin' | 'admin_iglesia' | 'admin_sede' | 'lider' | 'servidor';

/**
 * Mapeo de ID a slug (para convertir entre formatos)
 */
export const ROLE_ID_TO_SLUG: Record<number, RolSlug | undefined> = {
  25: 'super_admin',
  26: 'admin_iglesia',
  27: 'lider',
  28: 'servidor',
  33: 'admin_sede',
} as const;

/**
 * Mapeo de slug a ID (para lookups inversos)
 */
export const ROLE_SLUG_TO_ID: Record<RolSlug, number> = {
  super_admin: ROLE_IDS.SUPER_ADMIN,
  admin_iglesia: ROLE_IDS.ADMIN_IGLESIA,
  admin_sede: ROLE_IDS.ADMIN_SEDE,
  lider: ROLE_IDS.LIDER,
  servidor: ROLE_IDS.SERVIDOR,
} as const;

/**
 * Jerarquía de roles (para validaciones de permisos)
 * Nivel 0 (menos privilegios) → Nivel 4 (máximo)
 */
export const ROLE_HIERARCHY: Record<RolSlug, number> = {
  servidor: 0,
  lider: 1,
  admin_sede: 2,
  admin_iglesia: 3,
  super_admin: 4,
} as const;

/**
 * Obtener label de un rol por ID
 */
export function getRoleLabel(idRol: number | undefined): string {
  if (!idRol) return "Sin rol";
  const slug = ROLE_ID_TO_SLUG[idRol];
  if (!slug) return "Rol desconocido";
  return ROLE_LABELS[slug.toUpperCase().replace(/_/g, '') as keyof typeof ROLE_LABELS] || "Rol desconocido";
}

/**
 * Verificar si un rol tiene permisos superiores a otro
 */
export function hasHigherPrivilege(userRole: RolSlug, requiredRole: RolSlug): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
