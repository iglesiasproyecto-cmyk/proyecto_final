// TODO: Consolidar el progreso con aula_progreso_actividad y aula_inscripcion.
// Nota: algunas columnas en aula_* mantienen nombres legacy (id_detalle_proceso_curso).
import { supabase } from '@/lib/supabaseClient'
import { debugLog } from '@/lib/debug'

export interface AvanceModuloRow {
  idAvance: number
  idUsuario: number
  idModulo: number
  idAulaInscripcion: number
  completadoEn: string
}

export interface AvanceCursoDetalle {
  idAulaInscripcion: number
  idUsuario: number
  idCurso: number
  modulosPublicados: number
  modulosCompletados: number
}

export async function marcarModuloCompletado(params: {
  idUsuario: number
  idModulo: number
  idAulaInscripcion: number
}): Promise<AvanceModuloRow> {
  // Module completion is calculated dynamically, no table to insert
  // Return dummy data
  return {
    idAvance: 0,
    idUsuario: params.idUsuario,
    idModulo: params.idModulo,
    idAulaInscripcion: params.idAulaInscripcion,
    completadoEn: new Date().toISOString(),
  }
}

export async function desmarcarModuloCompletado(idAvance: number): Promise<void> {
  // No table to delete from
}

export async function getAvancesDeDetalle(idAulaInscripcion: number): Promise<AvanceModuloRow[]> {
  // Calculate completed modules for the inscription
  // For now, return empty
  return []
}

export async function getAvanceCursoByUsuario(idUsuario: number): Promise<AvanceCursoDetalle[]> {
  // Get inscriptions with course and module information
  const { data: inscriptions, error } = await supabase
    .from('aula_inscripcion')
    .select(`
      id_aula_inscripcion,
      id_aula_curso,
      aula_curso:aula_curso(
        aula_modulo(
          id_aula_modulo,
          aula_actividad(id_aula_actividad)
        )
      )
    `)
    .eq('id_usuario', idUsuario)
    .eq('activo', true)

  if (error) throw error

  // For each inscription, calculate completed modules by checking activity progress
  const results = await Promise.all(
    (inscriptions ?? []).map(async (inscription) => {
      const modules = Array.isArray(inscription.aula_curso?.aula_modulo)
        ? inscription.aula_curso.aula_modulo
        : []

      // Count modules where all activities are completed
      let modulosCompletados = 0
      for (const module of modules) {
        const activities = Array.isArray(module.aula_actividad) ? module.aula_actividad : []
        if (activities.length === 0) continue

        // Check if all activities in this module are completed
        const { data: completedActivities, error: progError } = await supabase
          .from('aula_progreso_actividad')
          .select('id_aula_actividad')
          .eq('id_usuario', idUsuario)
          .eq('completada', true)
          .in('id_aula_actividad', activities.map(a => a.id_aula_actividad))

        if (!progError && completedActivities?.length === activities.length) {
          modulosCompletados++
        }
      }

      return {
        idAulaInscripcion: inscription.id_aula_inscripcion,
        idUsuario: idUsuario,
        idCurso: inscription.id_aula_curso,
        modulosPublicados: modules.length,
        modulosCompletados,
      }
    })
  )

  return results
}

export async function finalizarCicloCurso(idProceso: number): Promise<void> {
  // RPC not implemented in new schema
  debugLog('avanceService', 'finalizarCicloCurso not implemented')
}
