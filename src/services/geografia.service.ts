import { supabase } from '@/lib/supabaseClient'
import type { Pais, DepartamentoGeo, Ciudad } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type PaisRow = Database['public']['Tables']['pais']['Row']
type DeptoRow = Database['public']['Tables']['departamento']['Row']
type CiudadRow = Database['public']['Tables']['ciudad']['Row']

function mapPais(r: PaisRow): Pais {
  return {
    idPais: r.id_pais,
    nombre: r.nombre,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapDepto(r: DeptoRow): DepartamentoGeo {
  return {
    idDepartamentoGeo: r.id_departamento,
    nombre: r.nombre,
    idPais: r.id_pais,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapCiudad(r: CiudadRow): Ciudad {
  return {
    idCiudad: r.id_ciudad,
    nombre: r.nombre,
    idDepartamentoGeo: r.id_departamento,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getPaises(): Promise<Pais[]> {
  const { data, error } = await supabase.from('pais').select('*').order('nombre')
  if (error) throw error
  return data.map(mapPais)
}

export async function getDepartamentos(idPais?: number): Promise<DepartamentoGeo[]> {
  let q = supabase.from('departamento').select('*').order('nombre')
  if (idPais !== undefined) q = q.eq('id_pais', idPais)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapDepto)
}

export async function getCiudades(idDepartamento?: number): Promise<Ciudad[]> {
  let q = supabase.from('ciudad').select('*').order('nombre')
  if (idDepartamento !== undefined) q = q.eq('id_departamento', idDepartamento)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapCiudad)
}
