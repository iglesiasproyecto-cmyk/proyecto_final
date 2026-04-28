import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export async function getNotificaciones(idUsuario: number) {
  const { data, error } = await supabase
    .from('notificacion')
    .select('*')
    .eq('id_usuario', idUsuario)
    .order('creado_en', { ascending: false })

  if (error) throw error
  return data
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

export async function crearNotificacionNuevoContenido(
  idCurso: number,
  tipoContenido: 'actividad' | 'evaluacion' | 'modulo',
  tituloContenido: string
) {
  try {
    // Obtener todos los usuarios inscritos en el curso
    const { data: usuariosInscritos, error } = await supabase
      .from('detalle_proceso_curso')
      .select(`
        id_usuario,
        usuario:usuario(correo, nombres, apellidos)
      `)
      .eq('estado', 'inscrito')
      .eq('proceso_asignado_curso.curso.id_curso', idCurso)

    if (error) throw error

    if (!usuariosInscritos || usuariosInscritos.length === 0) return

    // Crear notificaciones para cada usuario
    const notificaciones = usuariosInscritos.map(usuario => ({
      id_usuario: usuario.id_usuario,
      tipo: 'curso' as const,
      titulo: 'Nuevo contenido disponible',
      mensaje: `Se ha agregado ${tipoContenido === 'actividad' ? 'una nueva actividad' :
                tipoContenido === 'evaluacion' ? 'una nueva evaluación' : 'un nuevo módulo'}: "${tituloContenido}"`,
      leida: false
    }))

    const { error: notifError } = await supabase
      .from('notificacion')
      .insert(notificaciones)

    if (notifError) throw notifError

    // Mostrar toast solo para el líder
    toast.success(`Notificaciones enviadas a ${usuariosInscritos.length} servidores`)
  } catch (error) {
    console.error('Error creating notifications:', error)
    // No mostrar error al usuario ya que es funcionalidad secundaria
  }
}