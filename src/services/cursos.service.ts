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
    contenidoMd: r.contenido_md,
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
  evaluadoNombre: string
}

export async function getCursosEnriquecidos(idMinisterio?: number): Promise<CursoEnriquecido[]> {
  let q = supabase
    .from('curso')
    .select('*, modulo(*, recurso(*)), proceso_asignado_curso(detalle_proceso_curso(id_usuario, estado))')
    .order('nombre')
  if (idMinisterio !== undefined) q = q.eq('id_ministerio', idMinisterio)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => {
    // Deduplicar por id_usuario: un usuario inscrito en varios ciclos del mismo curso cuenta 1.
    const inscritosUnicos = new Set<number>()
    if (Array.isArray(r.proceso_asignado_curso)) {
      for (const p of r.proceso_asignado_curso as any[]) {
        if (!Array.isArray(p?.detalle_proceso_curso)) continue
        for (const d of p.detalle_proceso_curso) {
          if (d?.estado !== 'retirado' && typeof d?.id_usuario === 'number') {
            inscritosUnicos.add(d.id_usuario)
          }
        }
      }
    }
    return {
      ...mapCurso(r),
      modulos: Array.isArray(r.modulo)
        ? (r.modulo as any[])
            .map((m) => ({
              ...mapModulo(m),
              recursos: Array.isArray(m.recurso) ? (m.recurso as any[]).map(mapRecurso) : [],
            }))
            .sort((a, b) => a.orden - b.orden)
        : [],
      cantidadModulos: Array.isArray(r.modulo) ? r.modulo.length : 0,
      cantidadInscritos: inscritosUnicos.size,
    }
  })
}

export interface InscritoCurso {
  idUsuario: number
  nombres: string
  apellidos: string
}

// Devuelve inscritos activos (no retirados) de cualquier ciclo del curso,
// deduplicados por usuario. Respeta la RLS del invocador vía v_companeros_ciclo.
export async function getInscritosPorCurso(idCurso: number): Promise<InscritoCurso[]> {
  const { data: ciclos, error: cErr } = await supabase
    .from('proceso_asignado_curso')
    .select('id_proceso_asignado_curso')
    .eq('id_curso', idCurso)
  if (cErr) throw cErr
  if (!ciclos?.length) return []

  const cicloIds = ciclos.map((c) => c.id_proceso_asignado_curso as number)
  const { data, error } = await supabase
    .from('v_companeros_ciclo')
    .select('id_usuario, nombres, apellidos')
    .in('id_proceso_asignado_curso', cicloIds)
    .order('apellidos', { ascending: true })
  if (error) throw error

  const unique = new Map<number, InscritoCurso>()
  for (const r of (data ?? []) as Array<{ id_usuario: number; nombres: string; apellidos: string }>) {
    if (!unique.has(r.id_usuario)) {
      unique.set(r.id_usuario, {
        idUsuario: r.id_usuario,
        nombres: r.nombres,
        apellidos: r.apellidos,
      })
    }
  }
  return Array.from(unique.values())
}

export async function getEvaluacionesEnriquecidas(idModulo?: number): Promise<EvaluacionEnriquecida[]> {
  let q = supabase
    .from('evaluacion')
    .select('*, modulo(titulo, curso(nombre)), usuario(nombres, apellidos)')
    .order('creado_en', { ascending: false })
  if (idModulo !== undefined) q = q.eq('id_modulo', idModulo)
  const { data, error } = await q
  if (error) throw error
  return (data as any[]).map(r => ({
    ...mapEvaluacion(r),
    moduloNombre: r.modulo?.titulo ?? '',
    cursoNombre: r.modulo?.curso?.nombre ?? '',
    evaluadoNombre: r.usuario
      ? `${r.usuario.nombres ?? ''} ${r.usuario.apellidos ?? ''}`.trim()
      : '',
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

export async function getModulo(idModulo: number): Promise<Modulo> {
  const { data, error } = await supabase
    .from('modulo')
    .select('*')
    .eq('id_modulo', idModulo)
    .single()
  if (error) throw error
  return mapModulo(data)
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
  data: { nombre?: string; descripcion?: string | null; estado?: string }
): Promise<Curso> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
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
  data: { titulo: string; descripcion: string | null; idCurso: number; orden?: number | null }
): Promise<Modulo> {
  const { data: result, error } = await supabase
    .from('modulo')
    .insert([{
      titulo: data.titulo,
      descripcion: data.descripcion,
      orden: data.orden ?? null,
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

export async function updateModuloContenido(
  idModulo: number,
  contenidoMd: string | null
): Promise<Modulo> {
  const { data, error } = await supabase
    .from('modulo')
    .update({ contenido_md: contenidoMd })
    .eq('id_modulo', idModulo)
    .select()
    .single()
  if (error) throw error
  return mapModulo(data)
}

export async function deleteModulo(id: number): Promise<void> {
  const { error } = await supabase.from('modulo').delete().eq('id_modulo', id)
  if (error) throw error
}

export async function createEvaluacion(data: {
  idModulo: number
  idUsuario: number
  calificacion?: number | null
  estado?: Evaluacion['estado']
  observaciones?: string | null
  fechaEvaluacion?: string | null
}): Promise<Evaluacion> {
  const { data: result, error } = await supabase
    .from('evaluacion')
    .insert({
      id_modulo: data.idModulo,
      id_usuario: data.idUsuario,
      calificacion: data.calificacion ?? null,
      estado: data.estado ?? 'pendiente',
      observaciones: data.observaciones ?? null,
      fecha_evaluacion: data.fechaEvaluacion ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return mapEvaluacion(result)
}

export async function updateEvaluacion(
  id: number,
  data: {
    calificacion?: number | null
    estado?: Evaluacion['estado']
    observaciones?: string | null
    fechaEvaluacion?: string | null
  }
): Promise<Evaluacion> {
  const patch: Record<string, unknown> = {}
  if (data.calificacion !== undefined) patch.calificacion = data.calificacion
  if (data.estado !== undefined) patch.estado = data.estado
  if (data.observaciones !== undefined) patch.observaciones = data.observaciones
  if (data.fechaEvaluacion !== undefined) patch.fecha_evaluacion = data.fechaEvaluacion
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
  nombre: string
  tipo: string
  url: string
}): Promise<Recurso> {
  const { data: result, error } = await supabase
    .from('recurso')
    .insert({
      id_modulo: data.idModulo,
      nombre: data.nombre,
      tipo: data.tipo,
      url: data.url,
    })
    .select()
    .single()
  if (error) throw error
  return mapRecurso(result)
}

export const AULA_RECURSOS_MAX_BYTES = 25 * 1024 * 1024
export const AULA_RECURSOS_ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
])

export function validateRecursoFile(file: File): string | null {
  if (file.size > AULA_RECURSOS_MAX_BYTES) {
    return `El archivo supera el limite de ${Math.floor(AULA_RECURSOS_MAX_BYTES / (1024 * 1024))} MB.`
  }
  if (file.type && !AULA_RECURSOS_ALLOWED_MIME.has(file.type)) {
    return `Tipo de archivo no permitido (${file.type}).`
  }
  return null
}

// Sube un archivo al bucket privado aula-recursos y devuelve el path relativo
// (p.ej. "modulo-5/...pdf"). El bucket es privado, por lo que el consumo se
// hace con createSignedUrl en tiempo de acceso.
export async function uploadRecursoArchivo(data: {
  idModulo: number
  file: File
}): Promise<string> {
  const err = validateRecursoFile(data.file)
  if (err) throw new Error(err)
  const safeName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
  const objectPath = `modulo-${data.idModulo}/${Date.now()}-${rand}-${safeName}`

  const { data: uploaded, error: uploadError } = await supabase.storage
    .from('aula-recursos')
    .upload(objectPath, data.file, {
      upsert: false,
      contentType: data.file.type || undefined,
      cacheControl: '3600',
    })

  if (uploadError) throw uploadError
  return uploaded.path
}

// Firma un path almacenado en recurso.url. Acepta tambien URLs publicas
// legacy (las reduce al path antes de firmar).
export async function getRecursoSignedUrl(pathOrUrl: string, expiresInSeconds = 3600): Promise<string> {
  const path = pathOrUrl.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/aula-recursos\//, '')
  const { data, error } = await supabase.storage
    .from('aula-recursos')
    .createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  if (!data?.signedUrl) throw new Error('No se pudo generar URL firmada')
  return data.signedUrl
}

export async function createProcesoAsignadoCurso(data: {
  idCurso: number
  idIglesia: number
  fechaInicio: string
  fechaFin: string
  estado?: ProcesoAsignadoCurso['estado']
}): Promise<ProcesoAsignadoCurso> {
  const { data: result, error } = await supabase
    .from('proceso_asignado_curso')
    .insert({
      id_curso: data.idCurso,
      id_iglesia: data.idIglesia,
      fecha_inicio: data.fechaInicio,
      fecha_fin: data.fechaFin,
      estado: data.estado ?? 'programado',
    })
    .select()
    .single()
  if (error) throw error
  return mapProceso(result)
}

export async function createDetalleProcesoCurso(data: {
  idProcesoAsignadoCurso: number
  idUsuario: number
  estado?: DetalleProcesoCurso['estado']
  fechaInscripcion?: string
}): Promise<DetalleProcesoCurso> {
  const payload: Record<string, unknown> = {
    id_proceso_asignado_curso: data.idProcesoAsignadoCurso,
    id_usuario: data.idUsuario,
    estado: data.estado ?? 'inscrito',
  }
  if (data.fechaInscripcion !== undefined) payload.fecha_inscripcion = data.fechaInscripcion

  const { data: result, error } = await supabase
    .from('detalle_proceso_curso')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return mapDetalle(result)
}

export async function updateRecurso(
  id: number,
  data: { nombre?: string; tipo?: string; url?: string }
): Promise<Recurso> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
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
  data: { estado?: string; fechaFin?: string | null }
): Promise<ProcesoAsignadoCurso> {
  const patch: Record<string, unknown> = {}
  if (data.estado !== undefined) patch.estado = data.estado
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
