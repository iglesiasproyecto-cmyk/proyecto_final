import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export interface NotificacionMapped {
  idNotificacion: number
  idUsuario: number
  titulo: string
  mensaje: string
  tipo: string
  leida: boolean
  creadoEn: string
  fechaLectura: string | null
  idIglesia: number | null
  idSede: number | null
  idMinisterio: number | null
  referenciaId: number | null
  referenciaTipo: string | null
}

export async function getNotificaciones(idUsuario: number, idIglesia?: number): Promise<NotificacionMapped[]> {
  let query = supabase
    .from('notificacion')
    .select('*')
    .eq('id_usuario', idUsuario)
    .order('creado_en', { ascending: false })

  // Filter by iglesia context: show notifications for this iglesia + global (null iglesia)
  if (idIglesia) {
    query = query.or(`id_iglesia.eq.${idIglesia},id_iglesia.is.null`)
  }

  const { data, error } = await query

  if (error) throw error
  
  return data?.map(n => ({
    idNotificacion: n.id_notificacion,
    idUsuario: n.id_usuario,
    titulo: n.titulo,
    mensaje: n.mensaje,
    tipo: n.tipo,
    leida: n.leida,
    creadoEn: n.creado_en,
    fechaLectura: n.fecha_lectura,
    idIglesia: n.id_iglesia ?? null,
    idSede: n.id_sede ?? null,
    idMinisterio: n.id_ministerio ?? null,
    referenciaId: n.referencia_id ?? null,
    referenciaTipo: n.referencia_tipo ?? null,
  })) || []
}

export async function markNotificacionRead(idNotificacion: number) {
  const { error } = await supabase
    .from('notificacion')
    .update({
      leida: true,
      fecha_lectura: new Date().toISOString()
    })
    .eq('id_notificacion', idNotificacion)

  if (error) throw error
}

export async function markAllNotificacionesRead(idUsuario: number) {
  const { error } = await supabase
    .from('notificacion')
    .update({
      leida: true,
      fecha_lectura: new Date().toISOString()
    })
    .eq('id_usuario', idUsuario)
    .eq('leida', false)

  if (error) throw error
}

export async function createNotificacion(notificacion: any) {
  const { data, error } = await supabase
    .from('notificacion')
    .insert(notificacion)
    .select()
    .single()

  if (error) throw error
  return data
}

export function extractTaskIdFromNotificationMessage(message: string): number | null {
  const match = message.match(/\[TASK_ID:(\d+)\]/)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

export function stripTaskMetadata(message: string | null | undefined): string {
  return (message ?? '').replace(/\s*\[TASK_ID:\d+\]/g, '')
}

/**
 * Notifica a todos los inscritos de un curso sobre nuevo contenido.
 * Usa RPC SECURITY DEFINER para bypass de RLS (permite notificar a otros usuarios).
 */
export async function crearNotificacionNuevoContenido(
  idCurso: number,
  tipoContenido: 'actividad' | 'evaluacion' | 'modulo',
  tituloContenido: string
) {
  try {
    const { data: count, error } = await supabase.rpc('rpc_notificar_contenido_curso', {
      p_id_curso: idCurso,
      p_tipo_contenido: tipoContenido,
      p_titulo_contenido: tituloContenido,
    })

    if (error) throw error

    if (count && count > 0) {
      toast.success(`Notificaciones enviadas a ${count} servidores`)
    }
  } catch (error) {
    console.error('Error creating notifications:', error)
    // No mostrar error al usuario ya que es funcionalidad secundaria
  }
}
