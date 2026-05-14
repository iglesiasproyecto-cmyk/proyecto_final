import { supabase } from '@/lib/supabaseClient'
import type { UsuarioSede } from '@/types/app.types'

function mapUsuarioSede(r: any): UsuarioSede {
  return {
    id: r.id,
    idUsuario: r.id_usuario,
    idSede: r.id_sede,
    fechaIngreso: r.fecha_ingreso,
    estado: r.estado,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
    usuarioNombre: r.usuario
      ? `${r.usuario.nombres ?? ''} ${r.usuario.apellidos ?? ''}`.trim()
      : undefined,
    usuarioCorreo: r.usuario?.correo ?? undefined,
    sedeNombre: r.sede?.nombre ?? undefined,
  }
}

export async function getUsuariosSede(idSede: number): Promise<UsuarioSede[]> {
  const { data, error } = await supabase
    .from('usuario_sede')
    .select('*, usuario(nombres, apellidos, correo), sede(nombre)')
    .eq('id_sede', idSede)
    .eq('estado', 'activo')
    .order('creado_en', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapUsuarioSede)
}

export async function getSedesDeUsuario(idUsuario: number): Promise<UsuarioSede[]> {
  const { data, error } = await supabase
    .from('usuario_sede')
    .select('*, sede(nombre)')
    .eq('id_usuario', idUsuario)
    .eq('estado', 'activo')
  if (error) throw error
  return (data ?? []).map(mapUsuarioSede)
}

export async function createUsuarioSede(data: {
  idUsuario: number
  idSede: number
  fechaIngreso: string
}): Promise<UsuarioSede> {
  const { data: result, error } = await supabase
    .from('usuario_sede')
    .insert([{
      id_usuario: data.idUsuario,
      id_sede: data.idSede,
      fecha_ingreso: data.fechaIngreso,
    }])
    .select('*, usuario(nombres, apellidos, correo), sede(nombre)')
    .single()
  if (error) throw error
  return mapUsuarioSede(result)
}

export async function deleteUsuarioSede(id: number): Promise<void> {
  const { error } = await supabase
    .from('usuario_sede')
    .update({ estado: 'inactivo' })
    .eq('id', id)
  if (error) throw error
}

export async function getMiRolEnMinisterio(
  idMinisterio: number,
  idUsuario: number
): Promise<'lider' | 'servidor' | null> {
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('rol_en_ministerio')
    .eq('id_ministerio', idMinisterio)
    .eq('id_usuario', idUsuario)
    .is('fecha_salida', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const raw = `${data.rol_en_ministerio ?? ''}`
  const norm = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (norm.includes('lider')) return 'lider'
  return 'servidor'
}
