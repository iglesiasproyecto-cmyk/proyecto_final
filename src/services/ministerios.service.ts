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
