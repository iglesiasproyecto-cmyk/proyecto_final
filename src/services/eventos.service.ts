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
