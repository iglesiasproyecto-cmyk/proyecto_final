import { supabase } from '@/lib/supabaseClient'
import type { DetalleProcesoCurso } from '@/types/app.types'

// -------------------------------------------------------------------------
// Tipos del dominio de inscripciones
// -------------------------------------------------------------------------

export interface EnrollmentCandidate {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  ministerioPrincipal: string
  yaInscritoActivoEnCurso: boolean
}

export type EnrollOutcome =
  | 'inscrito'
  | 'reactivado'
  | 'skipped_duplicate'
  | 'skipped_not_eligible'
  | 'skipped_ciclo_cerrado'

export interface EnrollRow {
  idUsuario: number
  estado: EnrollOutcome
  idDetalle: number | null
}

export interface CompaneroCiclo {
  idDetalleProcesoCurso: number
  idProcesoAsignadoCurso: number
  idUsuario: number
  estado: DetalleProcesoCurso['estado']
  nombres: string
  apellidos: string
}

// -------------------------------------------------------------------------
// RPC wrappers
// -------------------------------------------------------------------------

export async function getEnrollmentCandidates(
  idCiclo: number,
  overrideMinisterio: boolean
): Promise<EnrollmentCandidate[]> {
  const { data, error } = await supabase.rpc('get_enrollment_candidates', {
    p_ciclo_id: idCiclo,
    p_override_ministerio: overrideMinisterio,
  })
  if (error) throw error
  return (data ?? []).map((r: {
    id_usuario: number
    nombres: string
    apellidos: string
    correo: string
    ministerio_principal: string
    ya_inscrito_activo_en_curso: boolean
  }) => ({
    idUsuario: r.id_usuario,
    nombres: r.nombres,
    apellidos: r.apellidos,
    correo: r.correo,
    ministerioPrincipal: r.ministerio_principal,
    yaInscritoActivoEnCurso: r.ya_inscrito_activo_en_curso,
  }))
}

export async function enrollUsers(
  idCiclo: number,
  userIds: number[],
  overrideMinisterio: boolean
): Promise<EnrollRow[]> {
  const { data, error } = await supabase.rpc('enroll_users', {
    p_ciclo_id: idCiclo,
    p_user_ids: userIds,
    p_override_ministerio: overrideMinisterio,
  })
  if (error) throw error
  return (data ?? []).map((r: { id_usuario: number; estado: EnrollOutcome; id_detalle: number | null }) => ({
    idUsuario: r.id_usuario,
    estado: r.estado,
    idDetalle: r.id_detalle,
  }))
}

// -------------------------------------------------------------------------
// Retirar / reactivar una fila de detalle_proceso_curso
// -------------------------------------------------------------------------

export async function retirarInscripcion(idDetalle: number): Promise<void> {
  const { error } = await supabase
    .from('detalle_proceso_curso')
    .update({ estado: 'retirado' })
    .eq('id_detalle_proceso_curso', idDetalle)
  if (error) throw error
}

export async function reactivarInscripcion(idDetalle: number): Promise<void> {
  const { error } = await supabase
    .from('detalle_proceso_curso')
    .update({ estado: 'inscrito', fecha_inscripcion: new Date().toISOString() })
    .eq('id_detalle_proceso_curso', idDetalle)
  if (error) throw error
}

// -------------------------------------------------------------------------
// Lecturas
// -------------------------------------------------------------------------

export async function getCompanerosCiclo(idCiclo: number): Promise<CompaneroCiclo[]> {
  const { data, error } = await supabase
    .from('v_companeros_ciclo')
    .select('*')
    .eq('id_proceso_asignado_curso', idCiclo)
    .order('apellidos', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    idDetalleProcesoCurso: r.id_detalle_proceso_curso as number,
    idProcesoAsignadoCurso: r.id_proceso_asignado_curso as number,
    idUsuario: r.id_usuario as number,
    estado: r.estado as DetalleProcesoCurso['estado'],
    nombres: r.nombres as string,
    apellidos: r.apellidos as string,
  }))
}

export interface MiInscripcion extends DetalleProcesoCurso {
  nombreCurso: string
  descripcionCurso: string | null
  fechaInicioCiclo: string
  fechaFinCiclo: string
  estadoCiclo: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
  nombreMinisterio: string
  nombreIglesia: string
  idCurso: number
}

export async function getMisInscripciones(idUsuario: number): Promise<MiInscripcion[]> {
  const { data, error } = await supabase
    .from('detalle_proceso_curso')
    .select(`
      id_detalle_proceso_curso,
      id_proceso_asignado_curso,
      id_usuario,
      fecha_inscripcion,
      estado,
      creado_en,
      updated_at,
      proceso_asignado_curso:proceso_asignado_curso!inner (
        fecha_inicio, fecha_fin, estado, id_curso, id_iglesia,
        curso:curso!inner (
          id_curso, nombre, descripcion,
          ministerio:ministerio!inner ( nombre )
        ),
        iglesia:iglesia!inner ( nombre )
      )
    `)
    .eq('id_usuario', idUsuario)
    .order('fecha_inscripcion', { ascending: false })
  if (error) throw error

  return (data ?? []).map((r) => {
    const pac = (r as unknown as { proceso_asignado_curso: {
      fecha_inicio: string
      fecha_fin: string
      estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
      id_curso: number
      id_iglesia: number
      curso: { id_curso: number; nombre: string; descripcion: string | null; ministerio: { nombre: string } }
      iglesia: { nombre: string }
    } }).proceso_asignado_curso

    return {
      idDetalleProcesoCurso: r.id_detalle_proceso_curso as number,
      idProcesoAsignadoCurso: r.id_proceso_asignado_curso as number,
      idUsuario: r.id_usuario as number,
      fechaInscripcion: r.fecha_inscripcion as string,
      estado: r.estado as DetalleProcesoCurso['estado'],
      creadoEn: r.creado_en as string,
      actualizadoEn: r.updated_at as string,
      nombreCurso: pac.curso.nombre,
      descripcionCurso: pac.curso.descripcion,
      fechaInicioCiclo: pac.fecha_inicio,
      fechaFinCiclo: pac.fecha_fin,
      estadoCiclo: pac.estado,
      nombreMinisterio: pac.curso.ministerio.nombre,
      nombreIglesia: pac.iglesia.nombre,
      idCurso: pac.curso.id_curso,
    }
  })
}
