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
  if (idIglesia) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapSede)
}
