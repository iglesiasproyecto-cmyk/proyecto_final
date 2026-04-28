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
        .eq('id_modulo', idModulo)
        .order('creado_en', { ascending: true })

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
  idDetalleProcesoCurso: number | null | undefined
  idUsuario: number | null | undefined
}) {
  return useQuery({
    queryKey: ['intentos-evaluacion', vars.idModulo, vars.idDetalleProcesoCurso, vars.idUsuario],
    queryFn: async () => {
      if (!vars.idModulo || !vars.idDetalleProcesoCurso || !vars.idUsuario) return []

      const { data, error } = await supabase
        .from('intento_evaluacion')
        .select('*')
        .eq('id_modulo', vars.idModulo)
        .eq('id_detalle_proceso_curso', vars.idDetalleProcesoCurso)
        .eq('id_usuario', vars.idUsuario)
        .order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!vars.idModulo && !!vars.idDetalleProcesoCurso && !!vars.idUsuario,
    staleTime: 30 * 1000,
  })
}

// Hook para crear intento de evaluación
export function useCrearIntentoEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (intento: Tables<'intento_evaluacion'>['Insert']) => {
      const { data, error } = await supabase
        .from('intento_evaluacion')
        .insert(intento)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['intentos-evaluacion', vars.id_modulo, vars.id_detalle_proceso_curso, vars.id_usuario] })
      qc.invalidateQueries({ queryKey: ['avance-detalle', vars.id_detalle_proceso_curso] })
    },
  })
}

// Hook para actualizar intento de evaluación
export function useActualizarIntentoEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idIntento: number
      intento: Tables<'intento_evaluacion'>['Update']
    }) => {
      const { data, error } = await supabase
        .from('intento_evaluacion')
        .update(vars.intento)
        .eq('id_intento', vars.idIntento)
        .select()
        .single()

      if (error) throw error

      // Verificar si el módulo está completo después de aprobar la evaluación
      if (vars.intento.estado === 'aprobado') {
        await verificarYMarcarModuloCompleto(vars.intento.id_detalle_proceso_curso!, vars.intento.id_usuario!)
      }

      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['intentos-evaluacion'] })
      qc.invalidateQueries({ queryKey: ['avance-detalle', vars.intento.id_detalle_proceso_curso] })
      qc.invalidateQueries({ queryKey: ['progreso-curso'] })
    },
  })
}

// Función auxiliar para verificar y marcar módulo completo
async function verificarYMarcarModuloCompleto(idDetalleProcesoCurso: number, idUsuario: number) {
  // Obtener el módulo de la evaluación
  const { data: intento } = await supabase
    .from('intento_evaluacion')
    .select('id_modulo')
    .eq('id_detalle_proceso_curso', idDetalleProcesoCurso)
    .eq('id_usuario', idUsuario)
    .single()

  if (!intento?.id_modulo) return

  const idModulo = intento.id_modulo

  // Contar elementos totales del módulo
  const { data: actividades } = await supabase
    .from('actividad')
    .select('id_actividad')
    .eq('id_modulo', idModulo)

  const { data: evaluaciones } = await supabase
    .from('evaluacion_detalle')
    .select('id_evaluacion_detalle')
    .eq('id_modulo', idModulo)

  const totalElementos = (actividades?.length || 0) + (evaluaciones?.length || 0)

  // Contar elementos completados
  const { data: actividadesCompletadas } = await supabase
    .from('progreso_actividad')
    .select('id_progreso')
    .eq('id_detalle_proceso_curso', idDetalleProcesoCurso)
    .in('id_actividad', actividades?.map(a => a.id_actividad) || [])
    .not('completada_en', 'is', null)

  const { data: evaluacionesAprobadas } = await supabase
    .from('intento_evaluacion')
    .select('id_intento')
    .eq('id_detalle_proceso_curso', idDetalleProcesoCurso)
    .eq('id_modulo', idModulo)
    .eq('estado', 'aprobado')

  const elementosCompletados = (actividadesCompletadas?.length || 0) + (evaluacionesAprobadas?.length || 0)

  // Si está completo, marcar el módulo
  if (elementosCompletados === totalElementos && totalElementos > 0) {
    const { data: moduloExistente } = await supabase
      .from('avance_modulo')
      .select('id_avance')
      .eq('id_detalle_proceso_curso', idDetalleProcesoCurso)
      .eq('id_modulo', idModulo)
      .single()

    if (!moduloExistente) {
      await supabase
        .from('avance_modulo')
        .insert({
          id_detalle_proceso_curso: idDetalleProcesoCurso,
          id_modulo: idModulo,
          id_usuario: idUsuario,
          completado_en: new Date().toISOString()
        })
    }
  }
}

// Hook para crear pregunta de evaluación
export function useCrearPreguntaEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pregunta: Tables<'evaluacion_detalle'>['Insert']) => {
      // Obtener información del módulo y curso para las notificaciones
      const { data: modulo } = await supabase
        .from('modulo')
        .select('id_curso, titulo')
        .eq('id_modulo', pregunta.id_modulo)
        .single()

      const { data, error } = await supabase
        .from('evaluacion_detalle')
        .insert(pregunta)
        .select()
        .single()

      if (error) throw error

      // Enviar notificación de nueva evaluación (solo una vez por módulo)
      if (modulo) {
        const { data: curso } = await supabase
          .from('curso')
          .select('estado')
          .eq('id_curso', modulo.id_curso)
          .single()

        if (curso?.estado === 'activo') {
          // Verificar si ya existe alguna evaluación en este módulo
          const { data: evaluacionesExistentes } = await supabase
            .from('evaluacion_detalle')
            .select('id_evaluacion_detalle')
            .eq('id_modulo', pregunta.id_modulo)

          // Solo enviar notificación si es la primera pregunta de evaluación
          if (!evaluacionesExistentes || evaluacionesExistentes.length === 0) {
            await crearNotificacionNuevoContenido(
              modulo.id_curso,
              'evaluacion',
              `Evaluación del módulo ${modulo.titulo}`
            )
          }
        }
      }

      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['evaluacion-detalle-modulo', vars.id_modulo] })
    },
  })
}

// Hook para actualizar pregunta de evaluación
export function useActualizarPreguntaEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idPregunta: number
      pregunta: Tables<'evaluacion_detalle'>['Update']
    }) => {
      const { data, error } = await supabase
        .from('evaluacion_detalle')
        .update(vars.pregunta)
        .eq('id_evaluacion_detalle', vars.idPregunta)
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
        .from('evaluacion_detalle')
        .delete()
        .eq('id_evaluacion_detalle', idPregunta)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion-detalle-modulo'] })
    },
  })
}