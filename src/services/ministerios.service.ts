import { supabase } from '@/lib/supabaseClient'
import type { Ministerio, MiembroMinisterio } from '@/types/app.types'
import type { Database } from '@/types/database.types'
import { sendEmail } from './email.service'

type MinisterioRow = Database['public']['Tables']['ministerio']['Row']
type MiembroRow = Database['public']['Tables']['miembro_ministerio']['Row']

function mapMinisterio(r: MinisterioRow): Ministerio {
  return {
    idMinisterio: r.id_ministerio,
    nombre: r.nombre,
    descripcion: r.descripcion,
    estado: r.estado as Ministerio['estado'],
    idSede: r.id_sede,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapMiembro(r: MiembroRow): MiembroMinisterio {
  return {
    idMiembroMinisterio: r.id_miembro_ministerio,
    idUsuario: r.id_usuario,
    idMinisterio: r.id_ministerio,
    rolEnMinisterio: r.rol_en_ministerio,
    fechaIngreso: r.fecha_ingreso,
    fechaSalida: r.fecha_salida,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
    activo: r.fecha_salida === null,
  }
}

export interface MinisterioEnriquecido extends Ministerio {
  cantidadMiembros: number
  sedeNombre: string
  liderNombre: string
}

export interface MiembroMinisterioEnriquecido extends MiembroMinisterio {
  usuarioNombre: string
  usuarioCorreo: string
  telefono: string | null
  ministerioNombre: string
  nombreCompleto: string
  correo: string
}

export async function getMinisteriosEnriquecidos(idIglesia?: number): Promise<MinisterioEnriquecido[]> {
  let q = supabase
    .from('ministerio')
    .select('*, sede(nombre), miembro_ministerio(rol_en_ministerio, fecha_salida, usuario(nombres, apellidos))')
    .eq('estado', 'activo')
    .order('nombre')

  if (idIglesia !== undefined) {
    const { data: sedesData } = await supabase
      .from('sede')
      .select('id_sede')
      .eq('id_iglesia', idIglesia)
    const sedeIds = (sedesData ?? []).map(s => s.id_sede)
    if (sedeIds.length === 0) return []
    q = q.in('id_sede', sedeIds)
  }

  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => {
    const miembros = Array.isArray(r.miembro_ministerio) ? r.miembro_ministerio : []
    const miembrosActivos = miembros.filter((m: any) => !m.fecha_salida)
    const lider = miembrosActivos.find((m: any) => {
      const raw = `${m.rol_en_ministerio ?? ''}`
      const normalized = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return normalized.includes('lider')
    })
    return {
      ...mapMinisterio(r),
      cantidadMiembros: miembrosActivos.length,
      sedeNombre: r.sede?.nombre ?? '',
      liderNombre: lider?.usuario
        ? `${lider.usuario.nombres ?? ''} ${lider.usuario.apellidos ?? ''}`.trim()
        : '',
    }
  })
}

export async function getMiembrosMinisterioEnriquecidos(idMinisterio?: number): Promise<MiembroMinisterioEnriquecido[]> {
  let q = supabase
    .from('miembro_ministerio')
    .select('*, usuario(nombres, apellidos, correo, telefono), ministerio(nombre)')
    .order('creado_en', { ascending: false })
  if (idMinisterio !== undefined) q = q.eq('id_ministerio', idMinisterio)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => {
    const nombreCompleto = `${r.usuario?.nombres ?? ''} ${r.usuario?.apellidos ?? ''}`.trim()
    return {
      ...mapMiembro(r),
      usuarioNombre: nombreCompleto,
      usuarioCorreo: r.usuario?.correo ?? '',
      telefono: r.usuario?.telefono ?? null,
      ministerioNombre: r.ministerio?.nombre ?? '',
      nombreCompleto,
      correo: r.usuario?.correo ?? '',
    }
  })
}

export async function getMinisterios(idIglesia?: number): Promise<Ministerio[]> {
  let q = supabase.from('ministerio').select('*').eq('estado', 'activo').order('nombre')

  if (idIglesia !== undefined) {
    const { data: sedesData } = await supabase
      .from('sede')
      .select('id_sede')
      .eq('id_iglesia', idIglesia)
    const sedeIds = (sedesData ?? []).map(s => s.id_sede)
    if (sedeIds.length === 0) return []
    q = q.in('id_sede', sedeIds)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapMinisterio)
}

export async function getMiembrosMinisterio(idMinisterio: number): Promise<MiembroMinisterio[]> {
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('*')
    .eq('id_ministerio', idMinisterio)
    .is('fecha_salida', null)
  if (error) throw error
  return data.map(mapMiembro)
}

export async function getMinisteriosIdsDeUsuario(idUsuario: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('id_ministerio, rol_en_ministerio')
    .eq('id_usuario', idUsuario)
    .is('fecha_salida', null)
  if (error) throw error

  const rows = (data as Array<{ id_ministerio: number; rol_en_ministerio: string | null }>) ?? []
  const isLider = (rol: string | null) => {
    const n = (rol ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    return n.includes('lider')
  }
  const liderRows = rows.filter((r) => isLider(r.rol_en_ministerio))
  const source = liderRows.length > 0 ? liderRows : rows
  return Array.from(new Set(source.map((r) => r.id_ministerio)))
}

// ── Ministerio mutations ──

export async function createMinisterio(
  data: { nombre: string; descripcion: string | null; idSede: number; estado: Ministerio['estado'] }
): Promise<Ministerio> {
  const { data: result, error } = await supabase
    .from('ministerio')
    .insert([{ nombre: data.nombre, descripcion: data.descripcion, id_sede: data.idSede, estado: data.estado }])
    .select()
    .single()
  if (error) throw error
  return mapMinisterio(result)
}

export async function updateMinisterio(
  id: number,
  data: { nombre?: string; descripcion?: string | null; estado?: Ministerio['estado'] }
): Promise<Ministerio> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.estado !== undefined) patch.estado = data.estado
  const { data: result, error } = await supabase
    .from('ministerio').update(patch).eq('id_ministerio', id).select().single()
  if (error) throw error
  return mapMinisterio(result)
}

export async function toggleMinisterioEstado(id: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('ministerio').select('estado').eq('id_ministerio', id).single()
  if (fetchError) throw fetchError
  // Toggles between 'activo' and 'inactivo'. If estado is 'suspendido', activates the ministerio.
  const next = current.estado === 'activo' ? 'inactivo' : 'activo'
  const { error } = await supabase.from('ministerio').update({ estado: next }).eq('id_ministerio', id)
  if (error) throw error
}

// ── MiembroMinisterio mutations ──

export async function createMiembroMinisterio(
  data: { idUsuario: number; idMinisterio: number; rolEnMinisterio: string | null; fechaIngreso: string }
): Promise<MiembroMinisterio> {
  const { data: result, error } = await supabase
    .from('miembro_ministerio')
    .insert([{ id_usuario: data.idUsuario, id_ministerio: data.idMinisterio, rol_en_ministerio: data.rolEnMinisterio, fecha_ingreso: data.fechaIngreso }])
    .select()
    .single()
  if (error) throw error

  // Notificar por correo
  try {
    const [{ data: user }, { data: ministerio }] = await Promise.all([
      supabase.from('usuario').select('correo, nombres').eq('id_usuario', data.idUsuario).single(),
      supabase.from('ministerio').select('nombre').eq('id_ministerio', data.idMinisterio).single()
    ])

    if (user && user.correo && ministerio) {
      await sendEmail({
        to: user.correo,
        subject: 'Has sido asignado a un Ministerio',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #4682b4;">¡Hola, ${user.nombres}!</h2>
            <p>Has sido asignado al ministerio <strong>${ministerio.nombre}</strong>.</p>
            <p>Tu rol en este ministerio será: <strong>${data.rolEnMinisterio || 'Miembro'}</strong></p>
            <p>Inicia sesión en el sistema para conocer más detalles sobre tus actividades.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Este es un correo generado automáticamente.</p>
          </div>
        `
      })
    }
  } catch (err) {
    console.error('[createMiembroMinisterio] Error enviando correo:', err)
  }

  return mapMiembro(result)
}

export async function deleteMinisterio(id: number): Promise<void> {
  const { error } = await supabase
    .from('ministerio')
    .update({ estado: 'inactivo' })
    .eq('id_ministerio', id)
  if (error) throw error
}

export async function deleteMiembroMinisterio(id: number): Promise<void> {
  const { error } = await supabase
    .from('miembro_ministerio')
    .update({ fecha_salida: new Date().toISOString().split('T')[0] })
    .eq('id_miembro_ministerio', id)
  if (error) throw error
}

export async function updateMiembroMinisterio(
  id: number,
  data: { rolEnMinisterio?: string | null; activo?: boolean; fechaSalida?: string | null }
): Promise<MiembroMinisterio> {
  const patch: Record<string, unknown> = {}
  if (data.rolEnMinisterio !== undefined) patch.rol_en_ministerio = data.rolEnMinisterio
  if (data.fechaSalida !== undefined) patch.fecha_salida = data.fechaSalida
  if (data.activo !== undefined && data.fechaSalida === undefined) {
    patch.fecha_salida = data.activo ? null : new Date().toISOString().split('T')[0]
  }
  const { data: result, error } = await supabase
    .from('miembro_ministerio')
    .update(patch)
    .eq('id_miembro_ministerio', id)
    .select()
    .single()
  if (error) throw error
  return mapMiembro(result)
}

// ── Servidores del Ministerio (para asignación de tareas) ──

export interface ServidorMinisterio {
  idUsuario: number
  nombreCompleto: string
  rolEnMinisterio: string | null
}

export async function getServidoresMinisterio(idMinisterio: number): Promise<ServidorMinisterio[]> {
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('id_usuario, rol_en_ministerio, usuario(nombres, apellidos)')
    .eq('id_ministerio', idMinisterio)
    .not('rol_en_ministerio', 'ilike', '%lider%')
    .is('fecha_salida', null)
  if (error) throw error
  return (data as any[]).map(r => ({
    idUsuario: r.id_usuario,
    nombreCompleto: `${r.usuario?.nombres ?? ''} ${r.usuario?.apellidos ?? ''}`.trim(),
    rolEnMinisterio: r.rol_en_ministerio,
  }))
}

// ── Usuarios de Iglesia (para asignación de tareas) ──

export interface UsuarioEnriquecido {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  telefono: string | null
  ministerios: string[]
  rol: string | null
}

export async function getUsuariosDeIglesia(idIglesia: number): Promise<UsuarioEnriquecido[]> {
  // Get all sedes for the church
  const { data: sedesData, error: sedesError } = await supabase
    .from('sede')
    .select('id_sede')
    .eq('id_iglesia', idIglesia)

  if (sedesError) throw sedesError
  const sedeIds = (sedesData ?? []).map(s => s.id_sede)
  if (sedeIds.length === 0) return []

  // Get users from miembro_ministerio with active status
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('id_usuario, rol_en_ministerio, usuario(nombres, apellidos, correo, telefono), ministerio(nombre)')
    .in('ministerio.id_sede', sedeIds)
    .is('fecha_salida', null)
    .order('usuario(nombres)', { ascending: true })

  if (error) throw error

  // Group by usuario and collect ministerios
  const usuariosMap = new Map<number, UsuarioEnriquecido>()

  ;(data as any[]).forEach(row => {
    const idUsuario = row.id_usuario
    if (!usuariosMap.has(idUsuario)) {
      usuariosMap.set(idUsuario, {
        idUsuario,
        nombres: row.usuario?.nombres ?? '',
        apellidos: row.usuario?.apellidos ?? '',
        correo: row.usuario?.correo ?? '',
        telefono: row.usuario?.telefono ?? null,
        ministerios: [],
        rol: null,
      })
    }
    const usuario = usuariosMap.get(idUsuario)!
    if (row.ministerio?.nombre && !usuario.ministerios.includes(row.ministerio.nombre)) {
      usuario.ministerios.push(row.ministerio.nombre)
    }
    if (!usuario.rol && row.rol_en_ministerio) {
      usuario.rol = row.rol_en_ministerio
    }
  })

  return Array.from(usuariosMap.values())
}

