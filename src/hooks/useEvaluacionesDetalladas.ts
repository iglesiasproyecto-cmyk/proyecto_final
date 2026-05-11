import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { crearNotificacionNuevoContenido } from '@/services/notificaciones.service'
import type { Tables } from '@/types/database.types'

// Hook para obtener detalles de evaluación de un módulo
export function useEvaluacionDetalleModulo(idModulo: number | null | undefined) {
  return useQuery({
    queryKey: ['evaluacion-detalle-modulo', idModulo],
    queryFn: async () => {
      if (!idModulo) return []

      const { data, error } = await supabase
        .from('evaluacion_detalle')
        .select('*')
        .eq('id_aula_modulo', idModulo)
        .order('orden', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!idModulo,
    staleTime: 30 * 1000,
  })
}

// Hook para obtener intentos de evaluación de un usuario
export function useIntentosEvaluacion(vars: {
  idModulo: number | null | undefined
  idUsuario: number | null | undefined
}) {
  return useQuery({
    queryKey: ['intentos-evaluacion', vars.idModulo, vars.idUsuario],
    queryFn: async () => {
      if (!vars.idModulo || !vars.idUsuario) return []

      // Get evaluaciones for the module
      const { data: evaluaciones } = await supabase
        .from('aula_evaluacion')
        .select('id_aula_evaluacion')
        .eq('id_aula_modulo', vars.idModulo)

      if (!evaluaciones || evaluaciones.length === 0) return []

      const evaluacionIds = evaluaciones.map(e => e.id_aula_evaluacion)

      const { data, error } = await supabase
        .from('aula_intento_evaluacion')
        .select('*')
        .in('id_aula_evaluacion', evaluacionIds)
        .eq('id_usuario', vars.idUsuario)
        .order('iniciado_en', { ascending: false })

      if (error) throw error
      return data?.map(intento => ({
        ...intento,
        estado: intento.aprobado ? 'aprobado' : 'reprobado',
        calificacion_obtenida: intento.puntaje_obtenido
      }))
    },
    enabled: !!vars.idModulo && !!vars.idUsuario,
    staleTime: 30 * 1000,
  })
}

// Hook para crear intento de evaluación
export function useCrearIntentoEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (intento: any) => {
      const { data, error } = await supabase
        .from('aula_intento_evaluacion')
        .insert(intento)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['intentos-evaluacion', null, vars.id_usuario] })
    },
  })
}

// Hook para actualizar intento de evaluación
export function useActualizarIntentoEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idIntento: number
      intento: any
    }) => {
      const { data, error } = await supabase
        .from('aula_intento_evaluacion')
        .update(vars.intento)
        .eq('id_aula_intento_evaluacion', vars.idIntento)
        .select()
        .single()

      if (error) throw error

      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['intentos-evaluacion'] })
    },
  })
}

// Función auxiliar para verificar y marcar módulo completo
async function verificarYMarcarModuloCompleto(idAulaInscripcion: number, idUsuario: number) {
  // Obtener el módulo de la evaluación
  const { data: intento } = await supabase
    .from('aula_intento_evaluacion')
    .select('id_aula_evaluacion')
    .eq('id_detalle_proceso_curso', idAulaInscripcion)
    .eq('id_usuario', idUsuario)
    .single()

  if (!intento?.id_aula_evaluacion) return

  // Get the module from the evaluation
  const { data: evaluacion } = await supabase
    .from('aula_evaluacion')
    .select('id_aula_modulo')
    .eq('id_aula_evaluacion', intento.id_aula_evaluacion)
    .single()

  if (!evaluacion?.id_aula_modulo) return

  const idModulo = evaluacion.id_aula_modulo

  // Contar elementos totales del módulo
  const { data: actividades } = await supabase
    .from('aula_actividad')
    .select('id_aula_actividad')
    .eq('id_aula_modulo', idModulo)

  const { data: evaluaciones } = await supabase
    .from('aula_evaluacion')
    .select('id_aula_evaluacion')
    .eq('id_aula_modulo', idModulo)

  const totalElementos = (actividades?.length || 0) + (evaluaciones?.length || 0)

  // Contar elementos completados
  const { data: actividadesCompletadas } = await supabase
    .from('aula_progreso_actividad')
    .select('id_aula_progreso_actividad')
    .eq('id_detalle_proceso_curso', idAulaInscripcion)
    .in('id_aula_actividad', actividades?.map(a => a.id_aula_actividad) || [])
    .not('completada_en', 'is', null)

  const { data: evaluacionesAprobadas } = await supabase
    .from('aula_intento_evaluacion')
    .select('id_aula_intento_evaluacion')
    .eq('id_detalle_proceso_curso', idAulaInscripcion)
    .eq('estado', 'aprobado')

  const elementosCompletados = (actividadesCompletadas?.length || 0) + (evaluacionesAprobadas?.length || 0)

  // Si está completo, marcar el módulo
  if (elementosCompletados === totalElementos && totalElementos > 0) {
    // Note: aula system calculates module completion dynamically from activity/evaluation progress
    // No separate module completion table exists
    console.log(`Módulo ${idModulo} completado por usuario ${idUsuario}`)
  }
}

// Hook para crear pregunta de evaluación
export function useCrearPreguntaEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pregunta: any) => {
      // Obtener información del módulo y curso para las notificaciones
      const { data: modulo } = await supabase
        .from('aula_modulo')
        .select('id_aula_curso, titulo')
        .eq('id_aula_modulo', pregunta.id_aula_modulo)
        .single()

      const { data, error } = await supabase
        .from('aula_pregunta')
        .insert(pregunta)
        .select()
        .single()

      if (error) throw error

      // Enviar notificación de nueva evaluación (solo una vez por módulo)
      if (modulo) {
        const { data: curso } = await supabase
          .from('aula_curso')
          .select('estado')
          .eq('id_aula_curso', modulo.id_aula_curso)
          .single()

        if (curso?.estado === 'activo') {
          // Verificar si ya existe alguna evaluación en este módulo
          const { data: evaluacionesExistentes } = await supabase
            .from('evaluacion_detalle')
            .select('id_evaluacion_detalle')
            .eq('id_aula_modulo', pregunta.id_aula_modulo)

          // Solo enviar notificación si es la primera pregunta de evaluación
          if (!evaluacionesExistentes || evaluacionesExistentes.length === 0) {
            await crearNotificacionNuevoContenido(
              modulo.id_aula_curso,
              'evaluacion',
              `Evaluación del módulo ${modulo.titulo}`
            )
          }
        }
      }

      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['evaluacion-detalle-modulo', vars.id_aula_modulo] })
    },
  })
}

// Hook para actualizar pregunta de evaluación
export function useActualizarPreguntaEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idPregunta: number
      pregunta: any
    }) => {
      const { data, error } = await supabase
        .from('aula_pregunta')
        .update(vars.pregunta)
        .eq('id_aula_pregunta', vars.idPregunta)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['evaluacion-detalle-modulo'] })
    },
  })
}

// Hook para eliminar pregunta de evaluación
export function useEliminarPreguntaEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (idPregunta: number) => {
      const { error } = await supabase
        .from('aula_pregunta')
        .delete()
        .eq('id_aula_pregunta', idPregunta)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion-detalle-modulo'] })
    },
  })
}