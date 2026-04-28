import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

// Hook para obtener el estado de acceso a módulos
export function useAccesoModulos(vars: {
  idUsuario: number | null | undefined
  idCurso: number | null | undefined
}) {
  return useQuery({
    queryKey: ['acceso-modulos', vars.idUsuario, vars.idCurso],
    queryFn: async () => {
      if (!vars.idUsuario || !vars.idCurso) return []

      // Obtener configuración del curso
      const { data: curso, error: cursoError } = await supabase
        .from('curso')
        .select('desbloqueo_secuencial')
        .eq('id_curso', vars.idCurso)
        .single()

      if (cursoError) throw cursoError

      // Obtener módulos ordenados
      const { data: modulos, error: modulosError } = await supabase
        .from('modulo')
        .select(`
          id_modulo,
          titulo,
          orden,
          estado,
          actividad:actividad(count),
          evaluacion_detalle:evaluacion_detalle(count)
        `)
        .eq('id_curso', vars.idCurso)
        .eq('estado', 'publicado')
        .order('orden', { ascending: true })

      if (modulosError) throw modulosError

      // Obtener proceso asignado
      const { data: procesoAsignado } = await supabase
        .from('detalle_proceso_curso')
        .select('id_detalle_proceso_curso')
        .eq('id_usuario', vars.idUsuario)
        .eq('estado', 'inscrito')
        .eq('proceso_asignado_curso.curso.id_curso', vars.idCurso)
        .single()

      if (!procesoAsignado) return []

      const accesoModulos = await Promise.all(
        modulos.map(async (modulo, index) => {
          let estadoAcceso: 'bloqueado' | 'disponible' | 'completado' = 'bloqueado'

          if (!curso.desbloqueo_secuencial) {
            // Si no es secuencial, todos están disponibles
            estadoAcceso = 'disponible'
          } else {
            // Si es secuencial, verificar módulos anteriores
            if (index === 0) {
              // Primer módulo siempre disponible
              estadoAcceso = 'disponible'
            } else {
              // Verificar si el módulo anterior está completado
              const moduloAnterior = modulos[index - 1]
              const completado = await verificarModuloCompletado(
                procesoAsignado.id_detalle_proceso_curso,
                moduloAnterior.id_modulo
              )
              estadoAcceso = completado ? 'disponible' : 'bloqueado'
            }
          }

          // Verificar si este módulo está completado
          const completado = await verificarModuloCompletado(
            procesoAsignado.id_detalle_proceso_curso,
            modulo.id_modulo
          )

          if (completado) {
            estadoAcceso = 'completado'
          }

          return {
            idModulo: modulo.id_modulo,
            titulo: modulo.titulo,
            orden: modulo.orden,
            estadoAcceso,
            totalElementos: (modulo.actividad?.[0]?.count || 0) + (modulo.evaluacion_detalle?.[0]?.count || 0),
            completado
          }
        })
      )

      return accesoModulos
    },
    enabled: !!vars.idUsuario && !!vars.idCurso,
    staleTime: 30 * 1000,
  })
}

// Función auxiliar para verificar si un módulo está completado
async function verificarModuloCompletado(idDetalleProcesoCurso: number, idModulo: number): Promise<boolean> {
  // Contar actividades del módulo
  const { data: actividades } = await supabase
    .from('actividad')
    .select('id_actividad')
    .eq('id_modulo', idModulo)

  // Contar evaluaciones del módulo
  const { data: evaluaciones } = await supabase
    .from('evaluacion_detalle')
    .select('id_evaluacion_detalle')
    .eq('id_modulo', idModulo)

  const totalElementos = (actividades?.length || 0) + (evaluaciones?.length || 0)

  if (totalElementos === 0) return false

  // Contar actividades completadas
  const { data: actividadesCompletadas } = await supabase
    .from('progreso_actividad')
    .select('id_progreso')
    .eq('id_detalle_proceso_curso', idDetalleProcesoCurso)
    .in('id_actividad', actividades?.map(a => a.id_actividad) || [])
    .not('completada_en', 'is', null)

  // Contar evaluaciones aprobadas
  const { data: evaluacionesAprobadas } = await supabase
    .from('intento_evaluacion')
    .select('id_intento')
    .eq('id_detalle_proceso_curso', idDetalleProcesoCurso)
    .eq('id_modulo', idModulo)
    .eq('estado', 'aprobado')

  const elementosCompletados = (actividadesCompletadas?.length || 0) + (evaluacionesAprobadas?.length || 0)

  return elementosCompletados === totalElementos
}