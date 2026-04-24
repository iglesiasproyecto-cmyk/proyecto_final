import { supabase } from '@/lib/supabaseClient'
import type { Rol, Usuario, UsuarioRol } from '@/types/app.types'
import type { Database } from '@/types/database.types'
import { sendEmail } from './email.service'

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
}): Promise<{
  success: boolean
  inviteSent: boolean
  profileReconciled: boolean
  roleAssigned: boolean
  userAlreadyExisted: boolean
}> {
  const payload = {
    ...data,
    correo: data.correo.trim().toLowerCase(),
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  let res: Response;
  try {
    res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    )
  } catch (error: any) {
    console.error("[inviteUser] Fetch error:", error);
    throw new Error(error.message === "Failed to fetch" ? "Error de red o CORS al contactar Edge Function. Verifica que invite-user esté desplegada y tenga CORS habilitado." : error.message);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Error al invitar usuario')
  }

  const result = await res.json()

  if (result.success) {
    // Enviar notificación por correo
    await sendEmail({
      to: payload.correo,
      subject: '¡Bienvenido al sistema de gestión!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #4682b4;">¡Hola, ${payload.nombres}!</h2>
          <p>Has sido agregado exitosamente al sistema de la iglesia.</p>
          <p>Tu cuenta ya está configurada para que puedas acceder y gestionar tus actividades.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Este es un correo generado automáticamente. Por favor, no respondas a este mensaje.</p>
        </div>
      `
    });
  }

  return result
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
