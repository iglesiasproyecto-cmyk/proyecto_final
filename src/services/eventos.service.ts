import { supabase } from '@/lib/supabaseClient'
import type { TipoEvento, Evento, Tarea, TareaAsignada, TareaEvidencia } from '@/types/app.types'
import type { Database } from '@/types/database.types'
import { sendEmail } from './email.service'

type TipoEventoRow = Database['public']['Tables']['tipo_evento']['Row']
type EventoRow = Database['public']['Tables']['evento']['Row']
type TareaRow = Database['public']['Tables']['tarea']['Row']
type TareaAsignadaRow = Database['public']['Tables']['tarea_asignada']['Row']
type TareaEvidenciaRow = Database['public']['Tables']['tarea_evidencia']['Row']

function mapTipoEvento(r: TipoEventoRow): TipoEvento {
  return {
    idTipoEvento: r.id_tipo_evento,
    nombre: r.nombre,
    descripcion: r.descripcion,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapEvento(r: EventoRow): Evento {
  return {
    idEvento: r.id_evento,
    nombre: r.nombre,
    descripcion: r.descripcion,
    idTipoEvento: r.id_tipo_evento,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    estado: r.estado as Evento['estado'],
    idIglesia: r.id_iglesia,
    idSede: r.id_sede,
    idMinisterio: r.id_ministerio,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapTarea(r: TareaRow): Tarea {
  return {
    idTarea: r.id_tarea,
    titulo: r.titulo,
    descripcion: r.descripcion,
    fechaLimite: r.fecha_limite,
    estado: r.estado as Tarea['estado'],
    prioridad: r.prioridad as Tarea['prioridad'],
    idEvento: r.id_evento,
    idUsuarioCreador: r.id_usuario_creador,
    idMinisterio: r.id_ministerio ?? undefined,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapTareaAsignada(r: TareaAsignadaRow): TareaAsignada {
  return {
    idTareaAsignada: r.id_tarea_asignada,
    idTarea: r.id_tarea,
    idUsuario: r.id_usuario,
    fechaAsignacion: r.fecha_asignacion,
    fechaCompletado: r.fecha_completado,
    observaciones: r.observaciones,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapTareaEvidencia(r: TareaEvidenciaRow): TareaEvidencia {
  return {
    idTareaEvidencia: r.id_tarea_evidencia,
    idTareaAsignada: r.id_tarea_asignada,
    idUsuario: r.id_usuario,
    objectPath: r.object_path,
    nombreArchivo: r.nombre_archivo,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getTiposEvento(): Promise<TipoEvento[]> {
  const { data, error } = await supabase.from('tipo_evento').select('*').order('nombre')
  if (error) throw error
  return data.map(mapTipoEvento)
}

export async function getEventos(idIglesia?: number): Promise<Evento[]> {
  let q = supabase.from('evento').select('*').order('fecha_inicio', { ascending: false })
  if (idIglesia !== undefined) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q; if (error) { console.error('[getTareasEnriquecidas ERROR]', error); throw error }
  if (error) throw error
  return data.map(mapEvento)
}

export async function getTareas(): Promise<Tarea[]> {
  const { data, error } = await supabase
    .from('tarea')
    .select('*')
    .order('fecha_limite', { ascending: true })
  if (error) throw error
  return data.map(mapTarea)
}

export async function getTareasAsignadas(idUsuario: number): Promise<TareaAsignada[]> {
  const { data, error } = await supabase
    .from('tarea_asignada')
    .select('*')
    .eq('id_usuario', idUsuario)
  if (error) throw error
  return data.map(mapTareaAsignada)
}

// â”€â”€ TipoEvento mutations â”€â”€

export async function createTipoEvento(
  nombre: string,
  descripcion: string | null
): Promise<TipoEvento> {
  const { data: result, error } = await supabase
    .from('tipo_evento')
    .insert([{ nombre, descripcion }])
    .select()
    .single()
  if (error) throw error
  return mapTipoEvento(result)
}

export async function updateTipoEvento(
  id: number,
  nombre: string,
  descripcion: string | null
): Promise<TipoEvento> {
  const { data: result, error } = await supabase
    .from('tipo_evento')
    .update({ nombre, descripcion })
    .eq('id_tipo_evento', id)
    .select()
    .single()
  if (error) throw error
  return mapTipoEvento(result)
}

export async function deleteTipoEvento(id: number): Promise<void> {
  const { error } = await supabase.from('tipo_evento').delete().eq('id_tipo_evento', id)
  if (error) throw error
}

// â”€â”€ Evento mutations â”€â”€

export async function createEvento(
  data: {
    nombre: string
    descripcion: string | null
    idTipoEvento: number
    fechaInicio: string
    fechaFin: string
    idIglesia: number
    idSede: number | null
    idMinisterio: number | null
  }
): Promise<Evento> {
  const { data: result, error } = await supabase
    .from('evento')
    .insert([{
      nombre: data.nombre,
      descripcion: data.descripcion,
      id_tipo_evento: data.idTipoEvento,
      fecha_inicio: data.fechaInicio,
      fecha_fin: data.fechaFin,
      estado: 'programado',
      id_iglesia: data.idIglesia,
      id_sede: data.idSede,
      id_ministerio: data.idMinisterio,
    }])
    .select()
    .single()
  if (error) throw error
  return mapEvento(result)
}

// â”€â”€ Tarea mutations â”€â”€

export async function createTarea(
  data: {
    titulo: string
    descripcion: string | null
    fechaLimite: string | null
    prioridad: Tarea['prioridad']
    idUsuarioCreador: number
    idMinisterio: number
    idEvento?: number | null
  }
): Promise<Tarea> {
  console.log('[createTarea] Calling RPC with:', data)
  const { data: result, error } = await supabase.rpc('create_tarea', {
    p_titulo: data.titulo,
    p_descripcion: data.descripcion,
    p_fecha_limite: data.fechaLimite,
    p_prioridad: data.prioridad,
    p_id_usuario_creador: data.idUsuarioCreador,
    p_id_ministerio: data.idMinisterio,
    p_id_evento: data.idEvento ?? null,
  })
  console.log('[createTarea] RPC result:', result, 'error:', error)
  if (error) throw error
  if (!result) throw new Error('RPC create_tarea returned no data')
  return mapTarea(result as any)
}

export async function updateTareaEstado(id: number, estado: Tarea['estado']): Promise<Tarea> {
  const { data: result, error } = await supabase.rpc('update_tarea_estado_rpc', {
    p_id_tarea: id,
    p_estado: estado,
  })
  if (error) throw error
  return mapTarea(result as any)
}

// â”€â”€ Enriched interfaces â”€â”€

export interface EventoEnriquecido extends Evento {
  tipoEventoNombre: string
  cantidadTareas: number
}

export interface TareaEnriquecida extends Tarea {
  eventoNombre: string
  asignadosCount: number
  asignados: (TareaAsignada & { nombreCompleto: string })[]
}

// â”€â”€ Enriched queries â”€â”€

export async function getEventosEnriquecidos(idIglesia?: number): Promise<EventoEnriquecido[]> {
  let q = supabase
    .from('evento')
    .select('*, tipo_evento(nombre), tarea(count)')
    .order('fecha_inicio', { ascending: false })
  if (idIglesia !== undefined) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q; if (error) { console.error('[getTareasEnriquecidas ERROR]', error); throw error }
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapEvento(r),
    tipoEventoNombre: r.tipo_evento?.nombre ?? '',
    cantidadTareas: Array.isArray(r.tarea) ? r.tarea[0]?.count ?? 0 : 0,
  }))
}

export async function getTareasEnriquecidas(idEvento?: number): Promise<TareaEnriquecida[]> {
  let q = supabase
    .from('tarea')
    .select('*, evento(nombre), tarea_asignada(*, usuario(nombres, apellidos))')
    .order('creado_en', { ascending: false })
  if (idEvento !== undefined) q = q.eq('id_evento', idEvento)
  const { data, error } = await q
  if (error) {
    console.error('[getTareasEnriquecidas] ERROR fetching tasks:', error.message, error.code, error.details)
    throw error
  }
  if (!data) {
    console.warn('[getTareasEnriquecidas] No data returned')
    return []
  }
  console.log('[getTareasEnriquecidas] Fetched', data.length, 'tasks')
  return (data as any[]).map(r => {
    const asignadosRaw = r.tarea_asignada
    const asignados = (Array.isArray(asignadosRaw) ? asignadosRaw : []).map((ta: any) => ({
      ...mapTareaAsignada(ta),
      nombreCompleto: `${ta.usuario?.nombres ?? ''} ${ta.usuario?.apellidos ?? ''}`.trim(),
    }))
    if (asignados.length === 0 && asignadosRaw && !Array.isArray(asignadosRaw)) {
      console.warn('[getTareasEnriquecidas] Task', r.id_tarea, 'has non-array tarea_asignada:', asignadosRaw)
    }
    return {
      ...mapTarea(r),
      eventoNombre: r.evento?.nombre ?? '',
      asignadosCount: asignados.length,
      asignados,
    }
  })
}

// â”€â”€ Evento update/delete â”€â”€

export async function updateEvento(
  id: number,
  data: {
    nombre?: string
    descripcion?: string | null
    fechaInicio?: string
    fechaFin?: string | null
    idTipoEvento?: number
    estado?: string
  }
): Promise<Evento> {
  const patch: any = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.fechaInicio !== undefined) patch.fecha_inicio = data.fechaInicio
  if (data.fechaFin !== undefined) patch.fecha_fin = data.fechaFin
  if (data.idTipoEvento !== undefined) patch.id_tipo_evento = data.idTipoEvento
  if (data.estado !== undefined) patch.estado = data.estado
  const { data: result, error } = await supabase
    .from('evento')
    .update(patch)
    .eq('id_evento', id)
    .select()
    .single()
  if (error) throw error
  return mapEvento(result)
}

export async function deleteEvento(id: number): Promise<void> {
  const { error } = await supabase.from('evento').delete().eq('id_evento', id)
  if (error) throw error
}

// â”€â”€ Tarea update/delete â”€â”€

export async function updateTarea(
  id: number,
  data: {
    titulo?: string
    descripcion?: string | null
    fechaLimite?: string | null
    estado?: string
    prioridad?: string
  }
): Promise<Tarea> {
  const patch: any = {}
  if (data.titulo !== undefined) patch.titulo = data.titulo
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.fechaLimite !== undefined) patch.fecha_limite = data.fechaLimite
  if (data.estado !== undefined) patch.estado = data.estado
  if (data.prioridad !== undefined) patch.prioridad = data.prioridad
  const { data: result, error } = await supabase
    .from('tarea')
    .update(patch)
    .eq('id_tarea', id)
    .select()
    .single()
  if (error) throw error
  return mapTarea(result)
}

export async function deleteTarea(id: number): Promise<void> {
  const { error } = await supabase.rpc('delete_tarea_rpc', {
    p_id_tarea: id,
  })
  if (error) throw error
}

// â”€â”€ TareaAsignada CRUD â”€â”€

export async function createTareaAsignada(data: {
  idTarea: number
  idUsuario: number
}): Promise<void> {
  const { error } = await supabase
    .from('tarea_asignada')
    .insert({ id_tarea: data.idTarea, id_usuario: data.idUsuario })
  if (error) throw error

  // Notificar por correo
  try {
    const [{ data: user }, { data: task }] = await Promise.all([
      supabase.from('usuario').select('correo, nombres').eq('id_usuario', data.idUsuario).single(),
      supabase.from('tarea').select('titulo').eq('id_tarea', data.idTarea).single()
    ])

    if (user && user.correo && task) {
      await sendEmail({
        to: user.correo,
        subject: 'Nueva tarea asignada',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #4682b4;">¡Hola, ${user.nombres}!</h2>
            <p>Se te ha asignado una nueva tarea en el sistema de la iglesia:</p>
            <p><strong>${task.titulo}</strong></p>
            <p>Por favor, inicia sesión para revisar el panel de tareas y ver más detalles.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Este es un correo generado automáticamente.</p>
          </div>
        `
      })
    }
  } catch (err) {
    console.error('[createTareaAsignada] Error enviando correo:', err)
  }
}

export async function updateTareaAsignada(
  id: number,
  data: { observaciones?: string | null; fechaCompletado?: string | null }
): Promise<void> {
  const patch: any = {}
  if (data.observaciones !== undefined) patch.observaciones = data.observaciones
  if (data.fechaCompletado !== undefined) patch.fecha_completado = data.fechaCompletado
  const { error } = await supabase
    .from('tarea_asignada')
    .update(patch)
    .eq('id_tarea_asignada', id)
  if (error) throw error
}

export async function deleteTareaAsignada(id: number): Promise<void> {
  const { error } = await supabase.from('tarea_asignada').delete().eq('id_tarea_asignada', id)
  if (error) throw error
}

// â”€â”€ TareaEvidencia CRUD â”€â”€

export interface TareaEvidenciaEnriquecida extends TareaEvidencia {
  nombreCompleto?: string
}

export async function getTareaEvidencias(idTarea: number): Promise<TareaEvidenciaEnriquecida[]> {
  const { data, error } = await supabase
    .from('tarea_evidencia')
    .select('*, usuario(nombres, apellidos), tarea_asignada(id_tarea)')
    .eq('tarea_asignada.id_tarea', idTarea)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return (data as any[]).map((row) => ({
    ...mapTareaEvidencia(row as any),
    nombreCompleto: `${row.usuario?.nombres ?? ''} ${row.usuario?.apellidos ?? ''}`.trim(),
  }))
}

export async function createTareaEvidencia(data: {
  idTareaAsignada: number
  idUsuario: number
  file: File
}): Promise<TareaEvidencia> {
  const safeName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const objectPath = `tareas/${data.idTareaAsignada}/${data.idUsuario}/${Date.now()}_${safeName}`

  const { data: row, error: insertError } = await supabase
    .from('tarea_evidencia')
    .insert({
      id_tarea_asignada: data.idTareaAsignada,
      id_usuario: data.idUsuario,
      object_path: objectPath,
      nombre_archivo: safeName,
    })
    .select()
    .single()

  if (insertError) throw insertError

  const { error: uploadError } = await supabase.storage
    .from('tarea-evidencias')
    .upload(objectPath, data.file, { upsert: false })

  if (uploadError) {
    await supabase.from('tarea_evidencia').delete().eq('id_tarea_evidencia', row.id_tarea_evidencia)
    throw uploadError
  }

  return mapTareaEvidencia(row)
}

export async function getTareaEvidenciaSignedUrl(objectPath: string, expiresInSeconds = 600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('tarea-evidencias')
    .createSignedUrl(objectPath, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

// ── Eventos por Ministerio (para vincular tareas) ──

export async function getEventosPorMinisterio(idMinisterio: number): Promise<Evento[]> {
  const { data, error } = await supabase
    .from('evento')
    .select('*')
    .eq('id_ministerio', idMinisterio)
    .neq('estado', 'cancelado')
    .neq('estado', 'finalizado')
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data.map(mapEvento)
}

