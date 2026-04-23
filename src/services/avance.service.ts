import { supabase } from '@/lib/supabaseClient'

export interface AvanceModuloRow {
  idAvance: number
  idUsuario: number
  idModulo: number
  idDetalleProcesoCurso: number
  completadoEn: string
}

export interface AvanceCursoDetalle {
  idDetalleProcesoCurso: number
  idProcesoAsignadoCurso: number
  idUsuario: number
  idCurso: number
  modulosPublicados: number
  modulosCompletados: number
}

export async function marcarModuloCompletado(params: {
  idUsuario: number
  idModulo: number
  idDetalleProcesoCurso: number
}): Promise<AvanceModuloRow> {
  const { data, error } = await supabase
    .from('avance_modulo')
    .insert({
      id_usuario: params.idUsuario,
      id_modulo: params.idModulo,
      id_detalle_proceso_curso: params.idDetalleProcesoCurso,
    })
    .select()
    .single()
  if (error) throw error
  return {
    idAvance: data.id_avance,
    idUsuario: data.id_usuario,
    idModulo: data.id_modulo,
    idDetalleProcesoCurso: data.id_detalle_proceso_curso,
    completadoEn: data.completado_en,
  }
}

export async function desmarcarModuloCompletado(idAvance: number): Promise<void> {
  const { error } = await supabase
    .from('avance_modulo')
    .delete()
    .eq('id_avance', idAvance)
  if (error) throw error
}

export async function getAvancesDeDetalle(idDetalle: number): Promise<AvanceModuloRow[]> {
  const { data, error } = await supabase
    .from('avance_modulo')
    .select('*')
    .eq('id_detalle_proceso_curso', idDetalle)
  if (error) throw error
  return (data ?? []).map((r) => ({
    idAvance: r.id_avance,
    idUsuario: r.id_usuario,
    idModulo: r.id_modulo,
    idDetalleProcesoCurso: r.id_detalle_proceso_curso,
    completadoEn: r.completado_en,
  }))
}

export async function getAvanceCursoByUsuario(idUsuario: number): Promise<AvanceCursoDetalle[]> {
  const { data, error } = await supabase
    .from('v_avance_curso_detalle')
    .select('*')
    .eq('id_usuario', idUsuario)
  if (error) throw error
  return (data ?? [])
    .filter((r): r is {
      id_detalle_proceso_curso: number
      id_proceso_asignado_curso: number
      id_usuario: number
      id_curso: number
      modulos_publicados: number
      modulos_completados: number
    } => r.id_detalle_proceso_curso !== null && r.id_curso !== null)
    .map((r) => ({
      idDetalleProcesoCurso: r.id_detalle_proceso_curso,
      idProcesoAsignadoCurso: r.id_proceso_asignado_curso,
      idUsuario: r.id_usuario,
      idCurso: r.id_curso,
      modulosPublicados: r.modulos_publicados ?? 0,
      modulosCompletados: r.modulos_completados ?? 0,
    }))
}

export async function finalizarCicloCurso(idProceso: number): Promise<void> {
  const { error } = await supabase.rpc('finalizar_ciclo', { p_id_proceso: idProceso })
  if (error) throw error
}
