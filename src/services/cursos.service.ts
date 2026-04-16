import { supabase } from '@/lib/supabaseClient'
import type {
  Curso, Modulo, Recurso, Evaluacion,
  ProcesoAsignadoCurso, DetalleProcesoCurso,
} from '@/types/app.types'
import type { Database } from '@/types/database.types'

type CursoRow = Database['public']['Tables']['curso']['Row']
type ModuloRow = Database['public']['Tables']['modulo']['Row']
type RecursoRow = Database['public']['Tables']['recurso']['Row']
type EvaluacionRow = Database['public']['Tables']['evaluacion']['Row']
type ProcesoRow = Database['public']['Tables']['proceso_asignado_curso']['Row']
type DetalleRow = Database['public']['Tables']['detalle_proceso_curso']['Row']

function mapCurso(r: CursoRow): Curso {
  return {
    idCurso: r.id_curso,
    nombre: r.nombre,
    descripcion: r.descripcion,
    duracionHoras: r.duracion_horas,
    estado: r.estado as Curso['estado'],
    idMinisterio: r.id_ministerio,
    idUsuarioCreador: r.id_usuario_creador,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapModulo(r: ModuloRow): Modulo {
  return {
    idModulo: r.id_modulo,
    titulo: r.titulo,
    descripcion: r.descripcion,
    orden: r.orden,
    estado: r.estado as Modulo['estado'],
    idCurso: r.id_curso,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapRecurso(r: RecursoRow): Recurso {
  return {
    idRecurso: r.id_recurso,
    idModulo: r.id_modulo,
    nombre: r.nombre,
    tipo: r.tipo as Recurso['tipo'],
    url: r.url,
  }
}

function mapEvaluacion(r: EvaluacionRow): Evaluacion {
  return {
    idEvaluacion: r.id_evaluacion,
    idModulo: r.id_modulo,
    idUsuario: r.id_usuario,
    calificacion: r.calificacion,
    estado: r.estado as Evaluacion['estado'],
    observaciones: r.observaciones,
    fechaEvaluacion: r.fecha_evaluacion,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapProceso(r: ProcesoRow): ProcesoAsignadoCurso {
  return {
    idProcesoAsignadoCurso: r.id_proceso_asignado_curso,
    idCurso: r.id_curso,
    idIglesia: r.id_iglesia,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    estado: r.estado as ProcesoAsignadoCurso['estado'],
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapDetalle(r: DetalleRow): DetalleProcesoCurso {
  return {
    idDetalleProcesoCurso: r.id_detalle_proceso_curso,
    idProcesoAsignadoCurso: r.id_proceso_asignado_curso,
    idUsuario: r.id_usuario,
    fechaInscripcion: r.fecha_inscripcion,
    estado: r.estado as DetalleProcesoCurso['estado'],
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export interface CursoEnriquecido extends Curso {
  cantidadModulos: number
  cantidadInscritos: number
}

export interface EvaluacionEnriquecida extends Evaluacion {
  moduloNombre: string
  cursoNombre: string
}

export async function getCursosEnriquecidos(idSede?: number): Promise<CursoEnriquecido[]> {
  let q = supabase
    .from('curso')
    .select('*, modulo(count), proceso_asignado_curso(count)')
    .order('nombre')
  if (idSede !== undefined) q = q.eq('id_sede', idSede)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapCurso(r),
    cantidadModulos: Array.isArray(r.modulo) ? r.modulo[0]?.count ?? 0 : 0,
    cantidadInscritos: Array.isArray(r.proceso_asignado_curso) ? r.proceso_asignado_curso[0]?.count ?? 0 : 0,
  }))
}

export async function getEvaluacionesEnriquecidas(idModulo?: number): Promise<EvaluacionEnriquecida[]> {
  let q = supabase
    .from('evaluacion')
    .select('*, modulo(titulo, curso(titulo))')
    .order('created_at', { ascending: false })
  if (idModulo !== undefined) q = q.eq('id_modulo', idModulo)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapEvaluacion(r),
    moduloNombre: r.modulo?.titulo ?? '',
    cursoNombre: r.modulo?.curso?.titulo ?? '',
  }))
}

export async function getCursos(idMinisterio?: number): Promise<Curso[]> {
  let q = supabase
    .from('curso')
    .select('*, modulo(*)')
    .order('nombre')
  if (idMinisterio !== undefined) q = q.eq('id_ministerio', idMinisterio)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapCurso(r),
    modulos: Array.isArray(r.modulo)
      ? (r.modulo as any[]).map(mapModulo)
      : [],
  }))
}

export async function getModulos(idCurso: number): Promise<Modulo[]> {
  const { data, error } = await supabase
    .from('modulo')
    .select('*')
    .eq('id_curso', idCurso)
    .order('orden')
  if (error) throw error
  return data.map(mapModulo)
}

export async function getRecursos(idModulo: number): Promise<Recurso[]> {
  const { data, error } = await supabase
    .from('recurso')
    .select('*')
    .eq('id_modulo', idModulo)
  if (error) throw error
  return data.map(mapRecurso)
}

export async function getEvaluaciones(idUsuario?: number): Promise<Evaluacion[]> {
  let q = supabase.from('evaluacion').select('*')
  if (idUsuario !== undefined) q = q.eq('id_usuario', idUsuario)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapEvaluacion)
}

export async function getProcesosAsignadoCurso(): Promise<ProcesoAsignadoCurso[]> {
  const { data, error } = await supabase
    .from('proceso_asignado_curso')
    .select('*')
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data.map(mapProceso)
}

export async function getDetallesProcesoCurso(idProceso: number): Promise<DetalleProcesoCurso[]> {
  const { data, error } = await supabase
    .from('detalle_proceso_curso')
    .select('*')
    .eq('id_proceso_asignado_curso', idProceso)
  if (error) throw error
  return data.map(mapDetalle)
}

// ── Curso mutations ──

export async function createCurso(
  data: { nombre: string; descripcion: string | null; duracionHoras: number | null; idUsuarioCreador: number; idMinisterio: number }
): Promise<Curso> {
  const { data: result, error } = await supabase
    .from('curso')
    .insert([{
      nombre: data.nombre,
      descripcion: data.descripcion,
      duracion_horas: data.duracionHoras,
      estado: 'activo' as const,
      id_usuario_creador: data.idUsuarioCreador,
      id_ministerio: data.idMinisterio,
    }])
    .select()
    .single()
  if (error) throw error
  return mapCurso(result)
}

export async function updateCurso(
  id: number,
  data: { titulo?: string; descripcion?: string | null; estado?: string }
): Promise<Curso> {
  const patch: Record<string, unknown> = {}
  if (data.titulo !== undefined) patch.titulo = data.titulo
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.estado !== undefined) patch.estado = data.estado
  const { data: result, error } = await supabase
    .from('curso')
    .update(patch)
    .eq('id_curso', id)
    .select()
    .single()
  if (error) throw error
  return mapCurso(result)
}

export async function deleteCurso(id: number): Promise<void> {
  const { error } = await supabase.from('curso').delete().eq('id_curso', id)
  if (error) throw error
}

export async function createModulo(
  data: { titulo: string; descripcion: string | null; orden: number; idCurso: number }
): Promise<Modulo> {
  const { data: result, error } = await supabase
    .from('modulo')
    .insert([{
      titulo: data.titulo,
      descripcion: data.descripcion,
      orden: data.orden,
      estado: 'borrador' as const,
      id_curso: data.idCurso,
    }])
    .select()
    .single()
  if (error) throw error
  return mapModulo(result)
}

export async function updateModulo(
  id: number,
  data: { titulo?: string; descripcion?: string | null; orden?: number }
): Promise<Modulo> {
  const patch: Record<string, unknown> = {}
  if (data.titulo !== undefined) patch.titulo = data.titulo
  if (data.descripcion !== undefined) patch.descripcion = data.descripcion
  if (data.orden !== undefined) patch.orden = data.orden
  const { data: result, error } = await supabase
    .from('modulo')
    .update(patch)
    .eq('id_modulo', id)
    .select()
    .single()
  if (error) throw error
  return mapModulo(result)
}

export async function deleteModulo(id: number): Promise<void> {
  const { error } = await supabase.from('modulo').delete().eq('id_modulo', id)
  if (error) throw error
}

export async function createEvaluacion(data: {
  idModulo: number
  pregunta: string
  opcionA: string
  opcionB: string
  opcionC: string
  opcionD: string
  respuestaCorrecta: string
}): Promise<Evaluacion> {
  const { data: result, error } = await supabase
    .from('evaluacion')
    .insert({
      id_modulo: data.idModulo,
      pregunta: data.pregunta,
      opcion_a: data.opcionA,
      opcion_b: data.opcionB,
      opcion_c: data.opcionC,
      opcion_d: data.opcionD,
      respuesta_correcta: data.respuestaCorrecta,
    })
    .select()
    .single()
  if (error) throw error
  return mapEvaluacion(result)
}

export async function updateEvaluacion(
  id: number,
  data: {
    pregunta?: string
    opcionA?: string
    opcionB?: string
    opcionC?: string
    opcionD?: string
    respuestaCorrecta?: string
  }
): Promise<Evaluacion> {
  const patch: Record<string, unknown> = {}
  if (data.pregunta !== undefined) patch.pregunta = data.pregunta
  if (data.opcionA !== undefined) patch.opcion_a = data.opcionA
  if (data.opcionB !== undefined) patch.opcion_b = data.opcionB
  if (data.opcionC !== undefined) patch.opcion_c = data.opcionC
  if (data.opcionD !== undefined) patch.opcion_d = data.opcionD
  if (data.respuestaCorrecta !== undefined) patch.respuesta_correcta = data.respuestaCorrecta
  const { data: result, error } = await supabase
    .from('evaluacion')
    .update(patch)
    .eq('id_evaluacion', id)
    .select()
    .single()
  if (error) throw error
  return mapEvaluacion(result)
}

export async function createRecurso(data: {
  idModulo: number
  titulo: string
  tipo: string
  url: string
}): Promise<Recurso> {
  const { data: result, error } = await supabase
    .from('recurso')
    .insert({
      id_modulo: data.idModulo,
      titulo: data.titulo,
      tipo: data.tipo,
      url: data.url,
    })
    .select()
    .single()
  if (error) throw error
  return mapRecurso(result)
}

export async function updateRecurso(
  id: number,
  data: { titulo?: string; tipo?: string; url?: string }
): Promise<Recurso> {
  const patch: Record<string, unknown> = {}
  if (data.titulo !== undefined) patch.titulo = data.titulo
  if (data.tipo !== undefined) patch.tipo = data.tipo
  if (data.url !== undefined) patch.url = data.url
  const { data: result, error } = await supabase
    .from('recurso')
    .update(patch)
    .eq('id_recurso', id)
    .select()
    .single()
  if (error) throw error
  return mapRecurso(result)
}

export async function deleteRecurso(id: number): Promise<void> {
  const { error } = await supabase.from('recurso').delete().eq('id_recurso', id)
  if (error) throw error
}

export async function updateProcesoAsignadoCurso(
  id: number,
  data: { estado?: string; progreso?: number; fechaFin?: string | null }
): Promise<ProcesoAsignadoCurso> {
  const patch: Record<string, unknown> = {}
  if (data.estado !== undefined) patch.estado = data.estado
  if (data.progreso !== undefined) patch.progreso = data.progreso
  if (data.fechaFin !== undefined) patch.fecha_fin = data.fechaFin
  const { data: result, error } = await supabase
    .from('proceso_asignado_curso')
    .update(patch)
    .eq('id_proceso_asignado_curso', id)
    .select()
    .single()
  if (error) throw error
  return mapProceso(result)
}

export async function deleteEvaluacion(id: number): Promise<void> {
  const { error } = await supabase
    .from('evaluacion').delete().eq('id_evaluacion', id)
  if (error) throw error
}

export async function deleteProcesoAsignadoCurso(id: number): Promise<void> {
  const { error } = await supabase
    .from('proceso_asignado_curso').delete().eq('id_proceso_asignado_curso', id)
  if (error) throw error
}
