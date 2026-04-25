import { supabase } from '@/lib/supabaseClient'
import type { Iglesia, Pastor, IglesiaPastor, SedePastor, Sede } from '@/types/app.types'
import type { Database } from '@/types/database.types'
import type { UsuarioEnriquecido } from './usuarios.service'

type IglesiaRow = Database['public']['Tables']['iglesia']['Row']
type PastorRow = Database['public']['Tables']['pastor']['Row']
type IglesiaPastorRow = Database['public']['Tables']['iglesia_pastor']['Row']
type SedePastorRow = Database['public']['Tables']['sede_pastor']['Row']
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

function mapSedePastor(r: SedePastorRow): SedePastor {
  return {
    idSedePastor: r.id_sede_pastor,
    idSede: r.id_sede,
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
  paisNombre: string
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
    .select('*, sede(count)')
    .eq('id_iglesia', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return {
    ...mapIglesia(data),
    cantidadSedes: Array.isArray(data.sede) ? data.sede[0]?.count ?? 0 : 0,
    ciudadNombre: '',
    departamentoNombre: '',
    paisNombre: '',
  }
}

export async function getPastoresPorIglesia(idIglesia: number): Promise<Pastor[]> {
  // Obtener pastores asignados directamente a la iglesia
  const { data: directData, error: directError } = await supabase
    .from('iglesia_pastor')
    .select('pastor(*)')
    .eq('id_iglesia', idIglesia)
    .is('fecha_fin', null)

  if (directError) throw directError

  // Obtener IDs de sedes de esta iglesia
  const { data: sedesData, error: sedesError } = await supabase
    .from('sede')
    .select('id_sede')
    .eq('id_iglesia', idIglesia)

  if (sedesError) throw sedesError

  const sedeIds = sedesData.map(s => s.id_sede)

  // Obtener pastores asignados a sedes de esta iglesia
  const { data: sedeData, error: sedeError } = await supabase
    .from('sede_pastor')
    .select('pastor(*)')
    .in('id_sede', sedeIds)
    .is('fecha_fin', null)

  if (sedeError) throw sedeError

  // Combinar y eliminar duplicados
  const directPastores = (directData as any[]).map((r: any) => mapPastor(r.pastor))
  const sedePastores = (sedeData as any[]).map((r: any) => mapPastor(r.pastor))

  // Unir arrays y eliminar duplicados por id_pastor
  const allPastores = [...directPastores, ...sedePastores]
  const uniquePastores = allPastores.filter((pastor, index, self) =>
    index === self.findIndex(p => p.idPastor === pastor.idPastor)
  )

  return uniquePastores
}

export async function getAdminsPorIglesia(idIglesia: number): Promise<UsuarioEnriquecido[]> {
  const { data, error } = await supabase
    .from('usuario_rol')
    .select(`
      id_usuario,
      fecha_fin,
      usuario:usuario!inner(
        id_usuario,
        nombres,
        apellidos,
        correo,
        telefono,
        activo,
        ultimo_acceso,
        auth_user_id,
        creado_en,
        updated_at
      ),
      rol:rol!inner(nombre)
    `)
    .eq('id_iglesia', idIglesia)
    .eq('rol.nombre', 'Administrador de Iglesia')
    .is('fecha_fin', null)

  if (error) throw error

  return (data as any[]).map((r: any) => ({
    idUsuario: r.usuario.id_usuario,
    nombres: r.usuario.nombres,
    apellidos: r.usuario.apellidos,
    correo: r.usuario.correo,
    telefono: r.usuario.telefono,
    activo: r.usuario.activo,
    ultimoAcceso: r.usuario.ultimo_acceso,
    authUserId: r.usuario.auth_user_id,
    creadoEn: r.usuario.creado_en,
    actualizadoEn: r.usuario.updated_at,
    rol: 'admin_iglesia' as const,
  }))
}

export async function getPastoresPorSede(idSede: number): Promise<Pastor[]> {
  const { data, error } = await supabase
    .from('sede_pastor')
    .select('pastor(*)')
    .eq('id_sede', idSede)
    .is('fecha_fin', null)
  if (error) throw error
  return (data as any[]).map((r: any) => mapPastor(r.pastor))
}



export async function getSedePastores(): Promise<SedePastor[]> {
  const { data, error } = await supabase.from('sede_pastor').select('*')
  if (error) throw error
  return data.map(mapSedePastor)
}

export async function getIglesiasEnriquecidas(): Promise<IglesiaEnriquecida[]> {
  const { data, error } = await supabase
    .from('iglesia')
    .select('*, sede(count), ciudad(nombre, departamento(nombre, pais(nombre)))')
    .order('nombre')
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapIglesia(r),
    cantidadSedes: Array.isArray(r.sede) ? r.sede[0]?.count ?? 0 : 0,
    ciudadNombre: r.ciudad?.nombre ?? '',
    departamentoNombre: r.ciudad?.departamento?.nombre ?? '',
    paisNombre: r.ciudad?.departamento?.pais?.nombre ?? '',
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
  const { data: result, error } = await supabase
    .from('iglesia')
    .update({
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.fechaFundacion !== undefined && { fecha_fundacion: data.fechaFundacion }),
    })
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
  const { data: result, error } = await supabase
    .from('sede')
    .update({
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.direccion !== undefined && { direccion: data.direccion }),
      ...(data.idCiudad !== undefined && { id_ciudad: data.idCiudad }),
      ...(data.idIglesia !== undefined && { id_iglesia: data.idIglesia }),
      ...(data.estado !== undefined && { estado: data.estado }),
    })
    .eq('id_sede', id)
    .select()
    .single()
  if (error) throw error
  return mapSede(result)
}

export async function toggleSedeEstado(id: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('sede').select('estado').eq('id_sede', id).single()
  if (fetchError) throw fetchError
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
  const { data: result, error } = await supabase
    .from('pastor')
    .update({
      ...(data.nombres !== undefined && { nombres: data.nombres }),
      ...(data.apellidos !== undefined && { apellidos: data.apellidos }),
      ...(data.correo !== undefined && { correo: data.correo }),
      ...(data.telefono !== undefined && { telefono: data.telefono }),
      ...(data.idUsuario !== undefined && { id_usuario: data.idUsuario }),
    })
    .eq('id_pastor', id)
    .select()
    .single()
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

// ── SedePastor mutations ──

export async function createSedePastor(
  data: { idSede: number; idPastor: number; esPrincipal: boolean; fechaInicio: string; fechaFin: string | null; observaciones: string | null }
): Promise<SedePastor> {
  const { data: result, error } = await supabase
    .from('sede_pastor')
    .insert([{ id_sede: data.idSede, id_pastor: data.idPastor, es_principal: data.esPrincipal, fecha_inicio: data.fechaInicio, fecha_fin: data.fechaFin, observaciones: data.observaciones }])
    .select()
    .single()
  if (error) throw error
  return mapSedePastor(result)
}

export async function closeSedePastor(id: number): Promise<void> {
  const { error } = await supabase
    .from('sede_pastor')
    .update({ fecha_fin: new Date().toISOString().split('T')[0] })
    .eq('id_sede_pastor', id)
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

