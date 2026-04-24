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
}

export interface MiembroMinisterioEnriquecido extends MiembroMinisterio {
  usuarioNombre: string
  usuarioCorreo: string
  telefono: string | null
  ministerioNombre: string
}

export async function getMinisteriosEnriquecidos(idSede?: number): Promise<MinisterioEnriquecido[]> {
  let q = supabase
    .from('ministerio')
    .select('*, miembro_ministerio(count), sede(nombre)')
    .order('nombre')
  if (idSede !== undefined) q = q.eq('id_sede', idSede)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapMinisterio(r),
    cantidadMiembros: Array.isArray(r.miembro_ministerio) ? r.miembro_ministerio[0]?.count ?? 0 : 0,
    sedeNombre: r.sede?.nombre ?? '',
  }))
}

export async function getMiembrosMinisterioEnriquecidos(idMinisterio?: number): Promise<MiembroMinisterioEnriquecido[]> {
  let q = supabase
    .from('miembro_ministerio')
    .select('*, usuario(nombres, apellidos, correo, telefono), ministerio(nombre)')
    .order('creado_en', { ascending: false })
  if (idMinisterio !== undefined) q = q.eq('id_ministerio', idMinisterio)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapMiembro(r),
    usuarioNombre: `${r.usuario?.nombres ?? ''} ${r.usuario?.apellidos ?? ''}`.trim(),
    usuarioCorreo: r.usuario?.correo ?? '',
    telefono: r.usuario?.telefono ?? null,
    ministerioNombre: r.ministerio?.nombre ?? '',
  }))
}

export async function getMinisterios(idSede?: number): Promise<Ministerio[]> {
  let q = supabase.from('ministerio').select('*').order('nombre')
  if (idSede !== undefined) q = q.eq('id_sede', idSede)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapMinisterio)
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
  const liderRows = rows.filter((r) => r.rol_en_ministerio === 'lider')
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
  const { error } = await supabase.from('ministerio').delete().eq('id_ministerio', id)
  if (error) throw error
}

export async function deleteMiembroMinisterio(id: number): Promise<void> {
  const { error } = await supabase.from('miembro_ministerio').delete().eq('id_miembro_ministerio', id)
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
