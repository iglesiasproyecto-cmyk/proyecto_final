import { supabase } from '@/lib/supabaseClient'
import { debugLog } from '@/lib/debug'
import { ROLE_IDS } from '@/app/constants/roles'
import type { Rol, Usuario, UsuarioRol, AdminSedeAsignacion } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type RolRow = Database['public']['Tables']['rol']['Row']
type UsuarioRow = Database['public']['Tables']['usuario']['Row']
type UsuarioRolRow = Database['public']['Tables']['usuario_rol']['Row']
type UsuarioRolSedeRow = Database['public']['Tables']['usuario_rol_sede']['Row']

type UsuarioRolSource = 'usuario_rol' | 'usuario_rol_sede'
const PROTECTED_SUPER_EMAIL = 'super@test.dev'

function mapRol(r: RolRow): Rol {
  return {
    idRol: r.id_rol,
    nombre: r.nombre,
    descripcion: r.descripcion,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapUsuario(r: UsuarioRow): Usuario {
  return {
    idUsuario: r.id_usuario,
    nombres: r.nombres,
    apellidos: r.apellidos,
    correo: r.correo,
    contrasenaHash: r.contrasena_hash,
    telefono: r.telefono,
    fechaNacimiento: r.fecha_nacimiento,
    activo: r.activo,
    ultimoAcceso: r.ultimo_acceso,
    authUserId: r.auth_user_id,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapUsuarioRol(r: UsuarioRolRow): UsuarioRol {
  return {
    idUsuarioRol: r.id_usuario_rol,
    idUsuario: r.id_usuario,
    idRol: r.id_rol,
    idIglesia: r.id_iglesia,
    idSede: r.id_sede,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapUsuarioRolSede(r: UsuarioRolSedeRow): UsuarioRol {
  return {
    idUsuarioRol: r.id_usuario_rol_sede,
    idUsuario: r.id_usuario,
    idRol: r.id_rol,
    idIglesia: r.id_iglesia,
    idSede: r.id_sede,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getRoles(): Promise<Rol[]> {
  const { data, error } = await supabase.from('rol').select('*').order('nombre')
  if (error) throw error
  return data.map(mapRol)
}

export async function getUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .order('apellidos')
  if (error) throw error
  return data.map(mapUsuario)
}

export async function getUsuarioRoles(idUsuario: number): Promise<UsuarioRol[]> {
  const { data: rolesLegacy, error: errorLegacy } = await supabase
    .from('usuario_rol')
    .select('*')
    .eq('id_usuario', idUsuario)
    .is('fecha_fin', null)

  if (errorLegacy) {
    console.warn('Error fetching usuario_rol:', errorLegacy)
    return []
  }

  const { data: rolesSede, error: errorSede } = await supabase
    .from('usuario_rol_sede')
    .select('*')
    .eq('id_usuario', idUsuario)
    .is('fecha_fin', null)

  if (errorSede) {
    console.warn('Error fetching usuario_rol_sede:', errorSede)
    return []
  }

  return [...(rolesLegacy ?? []).map(mapUsuarioRol), ...(rolesSede ?? []).map(mapUsuarioRolSede)]
}

export interface UsuarioEnriquecido extends Usuario {
  roleNames: {
    idUsuarioRol: number
    idRol: number
    idIglesia: number
    idSede?: number | null
    rolNombre: string
    iglesiaNombre: string
    sedeNombre?: string
    fechaFin: string | null
    source: UsuarioRolSource
  }[]
  minNames: { idMinisterio: number; nombre: string; rol: string }[]
}

export async function getUsuariosEnriquecidos(): Promise<UsuarioEnriquecido[]> {
  // Use RPC that bypasses RLS for admin users
  const { data, error } = await supabase.rpc('get_all_usuarios_enriquecidos')
  if (error) throw error

  return (data ?? []).map((r: any) => ({
    ...mapUsuario(r),
    roleNames: (r.roles ?? []).map((rol: any) => ({
      idUsuarioRol: rol.id_usuario_rol,
      idRol: rol.id_rol,
      idIglesia: rol.id_iglesia,
      idSede: rol.id_sede ?? null,
      rolNombre: rol.rol_nombre ?? '',
      iglesiaNombre: rol.iglesia_nombre ?? '',
      sedeNombre: rol.sede_nombre ?? '',
      fechaFin: rol.fecha_fin,
      source: rol.source ?? 'usuario_rol',
    })),
    minNames: (r.ministerios ?? []).map((min: any) => ({
      idMinisterio: min.id_ministerio ?? 0,
      nombre: min.ministerio_nombre ?? `Ministerio #${min.id_ministerio}`,
      rol: min.rol_en_ministerio ?? '',
    })),
  }))
}

export async function getUsuariosByIglesia(idIglesia: number): Promise<UsuarioEnriquecido[]> {
  const { data, error } = await supabase.rpc('get_usuarios_by_iglesia', {
    p_id_iglesia: idIglesia,
  })
  if (error) throw error
  return (data ?? []).map((r: any) => ({
    idUsuario: r.id_usuario,
    nombres: r.nombres,
    apellidos: r.apellidos,
    correo: r.correo,
    contrasenaHash: null,
    telefono: r.telefono,
    fechaNacimiento: null,
    activo: r.activo,
    ultimoAcceso: r.ultimo_acceso,
    authUserId: r.auth_user_id,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
    roleNames: (r.roles ?? []).map((rol: any) => ({
      idUsuarioRol: rol.id_usuario_rol,
      idRol: rol.id_rol,
      idIglesia: rol.id_iglesia,
      idSede: rol.id_sede ?? null,
      rolNombre: rol.rol_nombre ?? '',
      iglesiaNombre: rol.iglesia_nombre ?? '',
      sedeNombre: rol.sede_nombre ?? '',
      fechaFin: rol.fecha_fin,
      source: rol.source ?? 'usuario_rol',
    })),
    minNames: (r.ministerios ?? []).map((mm: any) => ({
      idMinisterio: mm.id_ministerio ?? 0,
      nombre: mm.ministerio_nombre ?? '',
      rol: mm.rol_en_ministerio ?? '',
    })),
  }))
}

// ── Cumpleaños por scope ──────────────────────────────────────────────────────

export interface UsuarioCumpleanos {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  telefono: string | null
  fechaNacimiento: string | null
  activo: boolean
}

function rowToUsuarioCumpleanos(u: any): UsuarioCumpleanos {
  return {
    idUsuario: u.id_usuario,
    nombres: u.nombres ?? '',
    apellidos: u.apellidos ?? '',
    correo: u.correo ?? '',
    telefono: u.telefono ?? null,
    fechaNacimiento: u.fecha_nacimiento ?? null,
    activo: u.activo ?? true,
  }
}

function deduplicateByIdUsuario(items: UsuarioCumpleanos[]): UsuarioCumpleanos[] {
  const map = new Map<number, UsuarioCumpleanos>()
  items.forEach((u) => { if (!map.has(u.idUsuario)) map.set(u.idUsuario, u) })
  return Array.from(map.values())
}

/** Super admin: todos los usuarios del sistema */
export async function getCumpleanosAll(): Promise<UsuarioCumpleanos[]> {
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, nombres, apellidos, correo, telefono, fecha_nacimiento, activo')
    .order('apellidos')
  if (error) throw error
  return (data ?? []).map(rowToUsuarioCumpleanos)
}

/** Admin iglesia: usuarios con rol asignado en esa iglesia */
export async function getCumpleanosByIglesia(idIglesia: number): Promise<UsuarioCumpleanos[]> {
  const [r1, r2] = await Promise.all([
    supabase
      .from('usuario_rol')
      .select('usuario(id_usuario, nombres, apellidos, correo, telefono, fecha_nacimiento, activo)')
      .eq('id_iglesia', idIglesia)
      .is('fecha_fin', null),
    supabase
      .from('usuario_rol_sede')
      .select('usuario(id_usuario, nombres, apellidos, correo, telefono, fecha_nacimiento, activo)')
      .eq('id_iglesia', idIglesia)
      .is('fecha_fin', null),
  ])
  const items: UsuarioCumpleanos[] = []
  ;(r1.data ?? []).forEach((row: any) => { if (row.usuario) items.push(rowToUsuarioCumpleanos(row.usuario)) })
  ;(r2.data ?? []).forEach((row: any) => { if (row.usuario) items.push(rowToUsuarioCumpleanos(row.usuario)) })
  return deduplicateByIdUsuario(items)
}

/** Admin sede: miembros de ministerios en esa sede */
export async function getCumpleanosBySede(idSede: number): Promise<UsuarioCumpleanos[]> {
  const { data: mins, error: mErr } = await supabase
    .from('ministerio')
    .select('id_ministerio')
    .eq('id_sede', idSede)
  if (mErr) throw mErr

  const ministerioIds = (mins ?? []).map((m: any) => m.id_ministerio)
  if (ministerioIds.length === 0) return []

  return getCumpleanosByMinisterios(ministerioIds)
}

/** Líder / servidor: miembros de los ministerios dados */
export async function getCumpleanosByMinisterios(ministerioIds: number[]): Promise<UsuarioCumpleanos[]> {
  if (ministerioIds.length === 0) return []
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('usuario(id_usuario, nombres, apellidos, correo, telefono, fecha_nacimiento, activo)')
    .in('id_ministerio', ministerioIds)
    .is('fecha_salida', null)
  if (error) throw error

  const items: UsuarioCumpleanos[] = []
  ;(data ?? []).forEach((row: any) => { if (row.usuario) items.push(rowToUsuarioCumpleanos(row.usuario)) })
  return deduplicateByIdUsuario(items)
}

/** Servidor sin ministerio: solo su propio perfil */
export async function getCumpleanosPropio(idUsuario: number): Promise<UsuarioCumpleanos[]> {
  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario, nombres, apellidos, correo, telefono, fecha_nacimiento, activo')
    .eq('id_usuario', idUsuario)
    .single()
  if (error) throw error
  return data ? [rowToUsuarioCumpleanos(data)] : []
}

// ── Usuario mutations ──

export async function updateUsuario(
  id: number,
  data: {
    nombres?: string
    apellidos?: string
    telefono?: string | null
    fechaNacimiento?: string | null
  }
): Promise<Usuario> {
  const patch: Record<string, unknown> = {}
  if (data.nombres !== undefined) patch.nombres = data.nombres
  if (data.apellidos !== undefined) patch.apellidos = data.apellidos
  if (data.telefono !== undefined) patch.telefono = data.telefono
  if (data.fechaNacimiento !== undefined) patch.fecha_nacimiento = data.fechaNacimiento
  const { data: result, error } = await supabase
    .from('usuario')
    .update(patch)
    .eq('id_usuario', id)
    .select('id_usuario,nombres,apellidos,correo,telefono,fecha_nacimiento,activo,ultimo_acceso,auth_user_id,creado_en,updated_at')
    .single()
  if (error) throw error
  return mapUsuario(result)
}

export async function assignRol(data: {
  idUsuario: number
  idRol: number
  idIglesia: number
  idSede?: number | null
  idMinisterio?: number | null
}): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.rpc('assign_role_with_ministerio', {
    p_id_usuario:    data.idUsuario,
    p_id_rol:        data.idRol,
    p_id_iglesia:    data.idIglesia,
    p_id_sede:       data.idSede ?? null,
    p_id_ministerio: data.idMinisterio ?? null,
  })
  if (error) throw new Error(error.message || 'Error al asignar el rol')
  return { success: true, message: 'Rol asignado correctamente' }
}

export async function removeRol(params: { idUsuarioRol: number; source: UsuarioRolSource }): Promise<void> {
  const table = params.source === 'usuario_rol_sede' ? 'usuario_rol_sede' : 'usuario_rol'
  const idColumn = params.source === 'usuario_rol_sede' ? 'id_usuario_rol_sede' : 'id_usuario_rol'

  const { data: roleAssignment, error: roleAssignmentError } = await supabase
    .from(table)
    .select('id_usuario, rol:rol!inner(nombre), usuario:usuario!inner(correo)')
    .eq(idColumn, params.idUsuarioRol)
    .maybeSingle()

  if (roleAssignmentError) throw roleAssignmentError
  const roleName = String((roleAssignment as any)?.rol?.nombre ?? '').trim().toLowerCase()
  const userEmail = String((roleAssignment as any)?.usuario?.correo ?? '').trim().toLowerCase()
  if (userEmail === PROTECTED_SUPER_EMAIL && roleName === 'super administrador') {
    throw new Error('No se puede remover el rol Super Administrador de la cuenta protegida')
  }

  // Set fecha_fin to yesterday to ensure it's marked as removed
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data, error } = await supabase
    .from(table)
    .update({ fecha_fin: yesterday })
    .eq(idColumn, params.idUsuarioRol)
    .select(idColumn)
    .single()
  if (error) throw error
  if (!data) throw new Error('No se pudo actualizar el rol. Verifica permisos en la base de datos.')
}

export async function inviteUser(data: {
  correo: string
  nombres: string
  apellidos: string
  idIglesia: number
  idRol: number
  idSede?: number | null
  idMinisterio?: number | null
  fechaNacimiento?: string | null
}): Promise<{ success: boolean; message?: string; inviteSent?: boolean; profileReconciled?: boolean; roleAssigned?: boolean; userAlreadyExisted?: boolean }> {
  try {
    debugLog('inviteUser', 'Starting invitation process for:', data.correo)

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      throw new Error('No hay sesión activa')
    }

    const { data: result, error } = await supabase.functions.invoke('invite-user', {
      body: data,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (error) {
      // Extract the actual message from the edge function response body
      try {
        const errData = await (error as any).context?.json?.()
        if (errData?.message) {
          console.error('[inviteUser] Edge function error:', errData)
          throw new Error(errData.message)
        }
      } catch (parseErr) {
        if ((parseErr as Error)?.message && !(parseErr as Error).message.includes('parse')) {
          throw parseErr
        }
      }
      throw error
    }
    if (!result?.success) throw new Error(result?.message ?? 'No se pudo invitar usuario')

    debugLog('inviteUser', 'Invitation result:', result)

    return result

  } catch (error) {
    console.error('[inviteUser] Error:', error)

    if (error instanceof Error) {
      throw new Error(error.message)
    }

    throw new Error('Error desconocido al invitar usuario')
  }
}

export async function toggleUsuarioActivo(id: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('usuario').select('activo').eq('id_usuario', id).single()
  if (fetchError) throw fetchError
  const { error } = await supabase
    .from('usuario').update({ activo: !current.activo }).eq('id_usuario', id)
  if (error) throw error
}

export async function deleteUsuarioAsSuperAdmin(idUsuario: number): Promise<'hard' | 'soft'> {
  const { data, error } = await supabase.rpc('delete_usuario_super_admin', {
    target_usuario_id: idUsuario,
  })
  if (error) throw error
  return data as 'hard' | 'soft'
}

// ── Admin Sede ──

export async function fetchAdminSedesAsignaciones(idIglesia?: number): Promise<AdminSedeAsignacion[]> {
  try {
    let query = supabase
      .from('usuario_rol_sede')
      .select(`
        id_usuario_rol_sede,
        id_usuario,
        id_sede,
        id_iglesia,
        id_rol,
        fecha_inicio,
        fecha_fin,
        creado_en,
        updated_at,
        usuario:id_usuario(nombres, apellidos, correo),
        sede:id_sede(nombre),
        iglesia:id_iglesia(nombre),
        ciudad:sede(ciudad:ciudad(nombre))
      `)
      .eq('id_rol', ROLE_IDS.ADMIN_SEDE)
      .is('fecha_fin', null)

    if (idIglesia) {
      query = query.eq('id_iglesia', idIglesia)
    }

    const { data, error } = await query

    if (error) throw error

    return (data as any[]).map((item: any) => ({
      idAdminSedeAsignacion: item.id_usuario_rol_sede,
      idUsuario: item.id_usuario,
      idSede: item.id_sede,
      idIglesia: item.id_iglesia,
      idRol: item.id_rol,
      fechaInicio: item.fecha_inicio,
      fechaFin: item.fecha_fin,
      creadoEn: item.creado_en,
      actualizadoEn: item.updated_at,
      nombreCompleto: item.usuario ? `${item.usuario.nombres} ${item.usuario.apellidos}` : '',
      correo: item.usuario?.correo ?? '',
      sedeNombre: item.sede?.nombre ?? '',
      iglesiaNombre: item.iglesia?.nombre ?? '',
      ciudadNombre: item.ciudad?.[0]?.nombre ?? '',
    }))
  } catch (error) {
    console.error('Error fetching admin sedes asignaciones:', error)
    throw error
  }
}

export async function assignAdminSede(data: {
  idUsuario: number
  idSede: number
  idIglesia: number
}): Promise<{ success: boolean; message: string; idAdminSedeAsignacion?: number }> {
  try {
    // Insert into usuario_rol_sede
    const { data: result, error } = await supabase
      .from('usuario_rol_sede')
      .insert({
        id_usuario: data.idUsuario,
        id_sede: data.idSede,
        id_iglesia: data.idIglesia,
        id_rol: ROLE_IDS.ADMIN_SEDE,
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error assigning admin sede:', error)
      throw new Error(error.message || 'Error al asignar administrador de sede')
    }

    return {
      success: true,
      message: 'Administrador de sede asignado correctamente',
      idAdminSedeAsignacion: result.id_usuario_rol_sede,
    }
  } catch (error) {
    console.error('Error in assignAdminSede:', error)
    if (error instanceof Error) {
      throw new Error(error.message)
    }
    throw new Error('Error desconocido al asignar administrador de sede')
  }
}

export async function removeAdminSede(idAdminSedeAsignacion: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('usuario_rol_sede')
      .update({ fecha_fin: new Date().toISOString().split('T')[0] })
      .eq('id_usuario_rol_sede', idAdminSedeAsignacion)

    if (error) throw error
  } catch (error) {
    console.error('Error removing admin sede:', error)
    throw error
  }
}
