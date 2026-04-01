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
