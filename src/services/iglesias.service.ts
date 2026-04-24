import { supabase } from '@/lib/supabaseClient'
import type { Iglesia, Pastor, IglesiaPastor, Sede } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type IglesiaRow = Database['public']['Tables']['iglesia']['Row']
type PastorRow = Database['public']['Tables']['pastor']['Row']
type IglesiaPastorRow = Database['public']['Tables']['iglesia_pastor']['Row']
type SedeRow = Database['public']['Tables']['sede']['Row']

function mapIglesia(r: IglesiaRow): Iglesia {
  return {
    idIglesia: r.id_iglesia,
    nombre: r.nombre,
    fechaFundacion: r.fecha_fundacion,
    estado: r.estado as Iglesia['estado'],
    idCiudad: r.id_ciudad,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapPastor(r: PastorRow): Pastor {
  return {
    idPastor: r.id_pastor,
    nombres: r.nombres,
    apellidos: r.apellidos,
    correo: r.correo,
    telefono: r.telefono,
    idUsuario: r.id_usuario,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapIglesiaPastor(r: IglesiaPastorRow): IglesiaPastor {
  return {
    idIglesiaPastor: r.id_iglesia_pastor,
    idIglesia: r.id_iglesia,
    idPastor: r.id_pastor,
    esPrincipal: r.es_principal,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    observaciones: r.observaciones,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapSede(r: SedeRow): Sede {
  return {
    idSede: r.id_sede,
    nombre: r.nombre,
    direccion: r.direccion,
    idCiudad: r.id_ciudad,
    idIglesia: r.id_iglesia,
    estado: r.estado as Sede['estado'],
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export interface IglesiaEnriquecida extends Iglesia {
  cantidadSedes: number
  ciudadNombre: string
  departamentoNombre: string
}

export interface PastorEnriquecido extends Pastor {
  iglesiasActivas: string[]
}

export interface SedeEnriquecida extends Sede {
  cantidadMinisterios: number
  ciudadNombre: string
}

export interface IglesiaDetalle extends IglesiaEnriquecida {
  sedes: Sede[]
  pastores: Pastor[]
}

export async function getIglesiaEnriquecidaById(id: number): Promise<IglesiaEnriquecida | null> {
  const { data, error } = await supabase
    .from('iglesia')
    .select('*, sede(count), ciudad(nombre, departamento(nombre), pais(nombre))')
    .eq('id_iglesia', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return {
    ...mapIglesia(data),
    cantidadSedes: Array.isArray(data.sede) ? data.sede[0]?.count ?? 0 : 0,
    ciudadNombre: data.ciudad?.nombre ?? '',
    departamentoNombre: data.ciudad?.departamento?.nombre ?? '',
    paisNombre: data.ciudad?.pais?.nombre ?? '',
  }
}

export async function getPastoresPorIglesia(idIglesia: number): Promise<Pastor[]> {
  const { data, error } = await supabase
    .from('iglesia_pastor')
    .select('pastor(*)')
    .eq('id_iglesia', idIglesia)
    .is('fecha_fin', null)
  if (error) throw error
  return (data as any[]).map((r: any) => mapPastor(r.pastor))
}

export async function getIglesiasEnriquecidas(): Promise<IglesiaEnriquecida[]> {
  const { data, error } = await supabase
    .from('iglesia')
    .select('*, sede(count), ciudad(nombre, departamento(nombre))')
    .order('nombre')
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapIglesia(r),
    cantidadSedes: Array.isArray(r.sede) ? r.sede[0]?.count ?? 0 : 0,
    ciudadNombre: r.ciudad?.nombre ?? '',
    departamentoNombre: r.ciudad?.departamento?.nombre ?? '',
  }))
}

export async function getPastoresEnriquecidos(): Promise<PastorEnriquecido[]> {
  const { data, error } = await supabase
    .from('pastor')
    .select('*, iglesia_pastor(fecha_fin, iglesia(nombre))')
    .order('apellidos')
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapPastor(r),
    iglesiasActivas: ((r.iglesia_pastor as any[]) || [])
      .filter((ip: any) => ip.fecha_fin === null)
      .map((ip: any) => ip.iglesia?.nombre ?? ''),
  }))
}

export async function getSedesEnriquecidas(idIglesia?: number): Promise<SedeEnriquecida[]> {
  let q = supabase
    .from('sede')
    .select('*, ministerio(count), ciudad(nombre)')
    .order('nombre')
  if (idIglesia !== undefined) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapSede(r),
    cantidadMinisterios: Array.isArray(r.ministerio) ? r.ministerio[0]?.count ?? 0 : 0,
    ciudadNombre: r.ciudad?.nombre ?? '',
  }))
}

export async function getIglesias(): Promise<Iglesia[]> {
  const { data, error } = await supabase.from('iglesia').select('*').order('nombre')
  if (error) throw error
  return data.map(mapIglesia)
}

export async function getPastores(): Promise<Pastor[]> {
  const { data, error } = await supabase.from('pastor').select('*').order('apellidos')
  if (error) throw error
  return data.map(mapPastor)
}

export async function getIglesiaPastores(): Promise<IglesiaPastor[]> {
  const { data, error } = await supabase.from('iglesia_pastor').select('*')
  if (error) throw error
  return data.map(mapIglesiaPastor)
}

export async function getSedes(idIglesia?: number): Promise<Sede[]> {
  let q = supabase.from('sede').select('*').order('nombre')
  if (idIglesia !== undefined) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapSede)
}

// ── Iglesia mutations ──

export async function createIglesia(
  data: { nombre: string; fechaFundacion: string | null; idCiudad: number; estado: Iglesia['estado'] }
): Promise<void> {
  const { error } = await supabase
    .from('iglesia')
    .insert([{ nombre: data.nombre, fecha_fundacion: data.fechaFundacion, id_ciudad: data.idCiudad, estado: data.estado }])
  if (error) throw error
}

export async function updateIglesia(
  id: number,
  data: { nombre?: string; fechaFundacion?: string | null }
): Promise<Iglesia> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.fechaFundacion !== undefined) patch.fecha_fundacion = data.fechaFundacion
  const { data: result, error } = await supabase
    .from('iglesia')
    .update(patch)
    .eq('id_iglesia', id)
    .select()
    .single()
  if (error) throw error
  return mapIglesia(result)
}

export async function toggleIglesiaEstado(id: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('iglesia').select('estado').eq('id_iglesia', id).single()
  if (fetchError) throw fetchError
  const next = current.estado === 'activa' ? 'inactiva' : 'activa'
  const { error } = await supabase.from('iglesia').update({ estado: next }).eq('id_iglesia', id)
  if (error) throw error
}

// ── Sede mutations ──

export async function createSede(
  data: { nombre: string; direccion: string | null; idCiudad: number; idIglesia: number; estado: Sede['estado'] }
): Promise<Sede> {
  const { data: result, error } = await supabase
    .from('sede')
    .insert([{ nombre: data.nombre, direccion: data.direccion, id_ciudad: data.idCiudad, id_iglesia: data.idIglesia, estado: data.estado }])
    .select()
    .single()
  if (error) throw error
  return mapSede(result)
}

export async function updateSede(
  id: number,
  data: { nombre?: string; direccion?: string | null; idCiudad?: number; idIglesia?: number; estado?: Sede['estado'] }
): Promise<Sede> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.direccion !== undefined) patch.direccion = data.direccion
  if (data.idCiudad !== undefined) patch.id_ciudad = data.idCiudad
  if (data.idIglesia !== undefined) patch.id_iglesia = data.idIglesia
  if (data.estado !== undefined) patch.estado = data.estado
  const { data: result, error } = await supabase
    .from('sede').update(patch).eq('id_sede', id).select().single()
  if (error) throw error
  return mapSede(result)
}

export async function toggleSedeEstado(id: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('sede').select('estado').eq('id_sede', id).single()
  if (fetchError) throw fetchError
  // Toggles between 'activa' and 'inactiva'. If estado is 'en_construccion', activates the sede.
  const next = current.estado === 'activa' ? 'inactiva' : 'activa'
  const { error } = await supabase.from('sede').update({ estado: next }).eq('id_sede', id)
  if (error) throw error
}

// ── Pastor mutations ──

export async function createPastor(
  data: { nombres: string; apellidos: string; correo: string; telefono: string | null; idUsuario: number | null }
): Promise<Pastor> {
  const { data: result, error } = await supabase
    .from('pastor')
    .insert([{ nombres: data.nombres, apellidos: data.apellidos, correo: data.correo, telefono: data.telefono, id_usuario: data.idUsuario }])
    .select()
    .single()
  if (error) throw error
  return mapPastor(result)
}

export async function updatePastor(
  id: number,
  data: { nombres?: string; apellidos?: string; correo?: string; telefono?: string | null; idUsuario?: number | null }
): Promise<Pastor> {
  const patch: Record<string, unknown> = {}
  if (data.nombres !== undefined) patch.nombres = data.nombres
  if (data.apellidos !== undefined) patch.apellidos = data.apellidos
  if (data.correo !== undefined) patch.correo = data.correo
  if (data.telefono !== undefined) patch.telefono = data.telefono
  if (data.idUsuario !== undefined) patch.id_usuario = data.idUsuario
  const { data: result, error } = await supabase
    .from('pastor').update(patch).eq('id_pastor', id).select().single()
  if (error) throw error
  return mapPastor(result)
}

// ── IglesiaPastor mutations ──

export async function createIglesiaPastor(
  data: { idIglesia: number; idPastor: number; esPrincipal: boolean; fechaInicio: string; fechaFin: string | null; observaciones: string | null }
): Promise<IglesiaPastor> {
  const { data: result, error } = await supabase
    .from('iglesia_pastor')
    .insert([{ id_iglesia: data.idIglesia, id_pastor: data.idPastor, es_principal: data.esPrincipal, fecha_inicio: data.fechaInicio, fecha_fin: data.fechaFin, observaciones: data.observaciones }])
    .select()
    .single()
  if (error) throw error
  return mapIglesiaPastor(result)
}

export async function closeIglesiaPastor(id: number): Promise<void> {
  const { error } = await supabase
    .from('iglesia_pastor')
    .update({ fecha_fin: new Date().toISOString().split('T')[0] })
    .eq('id_iglesia_pastor', id)
  if (error) throw error
}

export async function deleteIglesia(id: number): Promise<void> {
  const { error } = await supabase.from('iglesia').delete().eq('id_iglesia', id)
  if (error) throw error
}

export async function deleteSede(id: number): Promise<void> {
  const { error } = await supabase.from('sede').delete().eq('id_sede', id)
  if (error) throw error
}

export async function deletePastor(id: number): Promise<void> {
  const { error } = await supabase.from('pastor').delete().eq('id_pastor', id)
  if (error) throw error
}
