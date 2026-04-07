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
