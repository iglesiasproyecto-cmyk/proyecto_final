import { supabase } from '@/lib/supabaseClient'
import type { Notificacion } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type NotificacionRow = Database['public']['Tables']['notificacion']['Row']

function mapNotificacion(r: NotificacionRow): Notificacion {
  return {
    idNotificacion: r.id_notificacion,
    idUsuario: r.id_usuario,
    titulo: r.titulo,
    mensaje: r.mensaje,
    leida: r.leida,
    fechaLectura: r.fecha_lectura,
    tipo: r.tipo as Notificacion['tipo'],
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getNotificaciones(idUsuario: number): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from('notificacion')
    .select('*')
    .eq('id_usuario', idUsuario)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data.map(mapNotificacion)
}

export async function markNotificacionRead(id: number): Promise<void> {
  const { error } = await supabase
    .from('notificacion')
    .update({ leida: true, fecha_lectura: new Date().toISOString() })
    .eq('id_notificacion', id)
  if (error) throw error
}

export async function markAllNotificacionesRead(idUsuario: number): Promise<void> {
  const { error } = await supabase
    .from('notificacion')
    .update({ leida: true, fecha_lectura: new Date().toISOString() })
    .eq('id_usuario', idUsuario)
    .eq('leida', false)
  if (error) throw error
}

export async function createNotificacion(data: {
  titulo: string
  mensaje: string
  tipo: Notificacion['tipo']
  idUsuario: number
}): Promise<Notificacion> {
  const { data: result, error } = await supabase
    .from('notificacion')
    .insert({
      titulo: data.titulo,
      mensaje: data.mensaje,
      tipo: data.tipo,
      id_usuario: data.idUsuario,
      leida: false,
    })
    .select()
    .single()

  if (error) throw error
  return mapNotificacion(result)
}
