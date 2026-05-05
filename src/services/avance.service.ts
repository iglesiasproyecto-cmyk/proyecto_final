// TODO: Este archivo usa tablas del esquema viejo (avance_modulo, detalle_proceso_curso)
// que no existen en el nuevo esquema de aula. Necesita una revisión completa
// para usar aula_progreso_actividad y aula_inscripcion en su lugar.
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
  // Module completion is calculated dynamically, no table to insert
  // Return dummy data
  return {
    idAvance: 0,
    idUsuario: params.idUsuario,
    idModulo: params.idModulo,
    idDetalleProcesoCurso: params.idDetalleProcesoCurso,
    completadoEn: new Date().toISOString(),
  }
}

export async function desmarcarModuloCompletado(idAvance: number): Promise<void> {
  // No table to delete from
}

export async function getAvancesDeDetalle(idDetalle: number): Promise<AvanceModuloRow[]> {
  // Calculate completed modules for the inscription
  // For now, return empty
  return []
}

export async function getAvanceCursoByUsuario(idUsuario: number): Promise<AvanceCursoDetalle[]> {
  // Get inscriptions for the user
  const { data: inscriptions, error } = await supabase
    .from('aula_inscripcion')
    .select(`
      id_aula_inscripcion,
      id_aula_curso,
      aula_curso:aula_curso(
        aula_modulo(count)
      )
    `)
    .eq('id_usuario', idUsuario)
    .eq('activo', true)

  if (error) throw error

  return (inscriptions ?? []).map((inscription) => ({
    idDetalleProcesoCurso: inscription.id_aula_inscripcion,
    idProcesoAsignadoCurso: 0, // not used
    idUsuario: idUsuario,
    idCurso: inscription.id_aula_curso,
    modulosPublicados: Array.isArray(inscription.aula_curso?.aula_modulo) ? inscription.aula_curso.aula_modulo[0]?.count ?? 0 : 0,
    modulosCompletados: 0, // TODO: calculate based on completed activities
  }))
}

export async function finalizarCicloCurso(idProceso: number): Promise<void> {
  // RPC not implemented in new schema
  console.log('finalizarCicloCurso not implemented')
}
