import { supabase } from '@/lib/supabaseClient'
import type { TipoEvento, Evento, Tarea, TareaAsignada } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type TipoEventoRow = Database['public']['Tables']['tipo_evento']['Row']
type EventoRow = Database['public']['Tables']['evento']['Row']
type TareaRow = Database['public']['Tables']['tarea']['Row']
type TareaAsignadaRow = Database['public']['Tables']['tarea_asignada']['Row']

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

export async function getTiposEvento(): Promise<TipoEvento[]> {
  const { data, error } = await supabase.from('tipo_evento').select('*').order('nombre')
  if (error) throw error
  return data.map(mapTipoEvento)
}

export async function getEventos(idIglesia?: number): Promise<Evento[]> {
  let q = supabase.from('evento').select('*').order('fecha_inicio', { ascending: false })
  if (idIglesia !== undefined) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q
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

// ── TipoEvento mutations ──

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

// ── Evento mutations ──

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

// ── Tarea mutations ──

export async function createTarea(
  data: {
    titulo: string
    descripcion: string | null
    fechaLimite: string | null
    prioridad: Tarea['prioridad']
    idUsuarioCreador: number
  }
): Promise<Tarea> {
  const { data: result, error } = await supabase
    .from('tarea')
    .insert([{
      titulo: data.titulo,
      descripcion: data.descripcion,
      fecha_limite: data.fechaLimite,
      estado: 'pendiente',
      prioridad: data.prioridad,
      id_usuario_creador: data.idUsuarioCreador,
    }])
    .select()
    .single()
  if (error) throw error
  return mapTarea(result)
}

export async function updateTareaEstado(id: number, estado: Tarea['estado']): Promise<Tarea> {
  const { data: result, error } = await supabase
    .from('tarea')
    .update({ estado })
    .eq('id_tarea', id)
    .select()
    .single()
  if (error) throw error
  return mapTarea(result)
}

// ── Enriched interfaces ──

export interface EventoEnriquecido extends Evento {
  tipoEventoNombre: string
  cantidadTareas: number
}

export interface TareaEnriquecida extends Tarea {
  eventoNombre: string
  asignadosCount: number
}

// ── Enriched queries ──

export async function getEventosEnriquecidos(idIglesia?: number): Promise<EventoEnriquecido[]> {
  let q = supabase
    .from('evento')
    .select('*, tipo_evento(nombre), tarea(count)')
    .order('fecha_inicio', { ascending: false })
  if (idIglesia !== undefined) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q
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
    .select('*, evento(nombre), tarea_asignada(count)')
    .order('created_at', { ascending: false })
  if (idEvento !== undefined) q = q.eq('id_evento', idEvento)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapTarea(r),
    eventoNombre: r.evento?.nombre ?? '',
    asignadosCount: Array.isArray(r.tarea_asignada) ? r.tarea_asignada[0]?.count ?? 0 : 0,
  }))
}

// ── Evento update/delete ──

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
  const patch: Record<string, unknown> = {}
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

// ── Tarea update/delete ──

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
  const patch: Record<string, unknown> = {}
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
  const { error } = await supabase.from('tarea').delete().eq('id_tarea', id)
  if (error) throw error
}

// ── TareaAsignada CRUD ──

export async function createTareaAsignada(data: {
  idTarea: number
  idUsuario: number
}): Promise<void> {
  const { error } = await supabase
    .from('tarea_asignada')
    .insert({ id_tarea: data.idTarea, id_usuario: data.idUsuario })
  if (error) throw error
}

export async function updateTareaAsignada(
  id: number,
  data: { estado?: string; comentario?: string | null }
): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (data.estado !== undefined) patch.estado = data.estado
  if (data.comentario !== undefined) patch.comentario = data.comentario
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
