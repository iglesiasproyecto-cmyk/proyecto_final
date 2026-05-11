// TODO: Consolidar el progreso con aula_progreso_actividad y aula_inscripcion.
// Nota: algunas columnas en aula_* mantienen nombres legacy (id_detalle_proceso_curso).
import { supabase } from '@/lib/supabaseClient'

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
    idAulaInscripcion: inscription.id_aula_inscripcion,
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
