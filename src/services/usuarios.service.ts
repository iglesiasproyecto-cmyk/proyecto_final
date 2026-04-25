import { supabase } from '@/lib/supabaseClient'
import type { Rol, Usuario, UsuarioRol } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type RolRow = Database['public']['Tables']['rol']['Row']
type UsuarioRow = Database['public']['Tables']['usuario']['Row']
type UsuarioRolRow = Database['public']['Tables']['usuario_rol']['Row']

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

export async function getRoles(): Promise<Rol[]> {
  const { data, error } = await supabase.from('rol').select('*').order('nombre')
  if (error) throw error
  return data.map(mapRol)
}

export async function getUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase.rpc('get_all_usuarios_enriquecidos')
  if (error) throw error
  return ((data as any[]) || []).map(mapUsuario)
}

export async function getUsuarioRoles(idUsuario: number): Promise<UsuarioRol[]> {
  const { data, error } = await supabase
    .from('usuario_rol')
    .select('*')
    .eq('id_usuario', idUsuario)
    .is('fecha_fin', null)
  if (error) throw error
  return data.map(mapUsuarioRol)
}

export interface UsuarioEnriquecido extends Usuario {
  roleNames: {
    idUsuarioRol: number
    idRol: number
    idIglesia: number
    rolNombre: string
    iglesiaNombre: string
    fechaFin: string | null
  }[]
  minNames: { nombre: string; rol: string }[]
}

export async function getUsuariosEnriquecidos(): Promise<UsuarioEnriquecido[]> {
  const { data, error } = await supabase.rpc('get_all_usuarios_enriquecidos')
  if (error) throw error

  return ((data as any[]) || []).map(r => ({
    ...mapUsuario(r),
    roleNames: ((r.roles as any[]) || [])
      .filter((ur: any) => ur.fecha_fin === null)
      .map((ur: any) => ({
        idUsuarioRol: ur.id_usuario_rol,
        idRol: ur.id_rol,
        idIglesia: ur.id_iglesia,
        rolNombre: ur.rol_nombre ?? '',
        iglesiaNombre: ur.iglesia_nombre ?? '',
        fechaFin: ur.fecha_fin,
      })),
    minNames: ((r.ministerios as any[]) || [])
      .filter((mm: any) => mm.fecha_salida === null)
      .map((mm: any) => ({
        nombre: mm.ministerio_nombre ?? '',
        rol: mm.rol_en_ministerio ?? '',
      })),
  }))
}

// ── Usuario mutations ──

export async function updateUsuario(
  id: number,
  data: {
    nombres?: string
    apellidos?: string
    telefono?: string | null
  }
): Promise<Usuario> {
  const patch: Record<string, unknown> = {}
  if (data.nombres !== undefined) patch.nombres = data.nombres
  if (data.apellidos !== undefined) patch.apellidos = data.apellidos
  if (data.telefono !== undefined) patch.telefono = data.telefono
  const { data: result, error } = await supabase
    .from('usuario')
    .update(patch)
    .eq('id_usuario', id)
    .select()
    .single()
  if (error) throw error
  return mapUsuario(result)
}

export async function assignRol(data: {
  idUsuario: number
  idRol: number
  idIglesia: number
  idSede?: number | null
}): Promise<void> {
  const { error } = await supabase
    .from('usuario_rol')
    .insert({
      id_usuario: data.idUsuario,
      id_rol: data.idRol,
      id_iglesia: data.idIglesia,
      id_sede: data.idSede ?? null,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: null,
    })
  if (error) throw error
}

export async function removeRol(idUsuarioRol: number): Promise<void> {
  const { error } = await supabase
    .from('usuario_rol')
    .update({ fecha_fin: new Date().toISOString().split('T')[0] })
    .eq('id_usuario_rol', idUsuarioRol)
  if (error) throw error
}

export async function inviteUser(data: {
  correo: string
  nombres: string
  apellidos: string
  idIglesia: number
  idRol: number
}): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[inviteUser] Starting invitation process for:', data.correo)

    // Paso 1: Verificar permisos usando función RPC
    const { data: permissionCheck, error: permError } = await supabase.rpc('invite_user_rpc', {
      p_correo: data.correo,
      p_nombres: data.nombres,
      p_apellidos: data.apellidos,
      p_id_iglesia: data.idIglesia,
      p_id_rol: data.idRol,
    })

    if (permError) {
      console.error('[inviteUser] Permission check error:', permError)
      throw new Error('Error al verificar permisos')
    }

    // Si la función indica que necesita invitación desde frontend
    if (permissionCheck?.needsFrontendInvite) {
      console.log('[inviteUser] User does not exist, sending invitation from frontend')

      // Enviar invitación usando Supabase Auth desde el cliente
      const { data: inviteData, error: inviteError } = await supabase.auth.signInWithOtp({
        email: data.correo,
        options: {
          data: {
            nombres: data.nombres,
            apellidos: data.apellidos,
          },
        }
      })

      if (inviteError) {
        console.error('[inviteUser] Invitation error:', inviteError)
        throw new Error('Error al enviar invitación: ' + inviteError.message)
      }

      console.log('[inviteUser] Invitation sent via OTP')

      // Nota: En un sistema real, aquí usarías inviteUserByEmail con permisos de admin
      // Pero para desarrollo, usamos signInWithOtp que envía un código
      return {
        success: true,
        message: 'Invitación enviada correctamente. El usuario recibirá un código de verificación.',
      }
    }

    // Si la función RPC manejó todo (usuario ya existía)
    if (permissionCheck?.success) {
      return {
        success: true,
        message: permissionCheck.message || 'Usuario procesado correctamente.',
      }
    }

    // Si hay error de permisos
    throw new Error(permissionCheck?.message || 'Error de permisos')

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
