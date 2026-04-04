import { supabase } from '@/lib/supabaseClient'
import type { Ministerio, MiembroMinisterio } from '@/types/app.types'
import type { Database } from '@/types/database.types'

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
  }
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
  return mapMiembro(result)
}
