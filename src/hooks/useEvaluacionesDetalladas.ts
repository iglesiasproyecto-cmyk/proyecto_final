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
        .from('aula_evaluacion')
        .select('*')
        .eq('id_aula_modulo', idModulo)
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
        .from('aula_intento_evaluacion')
        .select('*')
        .eq('id_aula_modulo', vars.idModulo)
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
    mutationFn: async (intento: Tables<'aula_intento_evaluacion'>['Insert']) => {
      const { data, error } = await supabase
        .from('aula_intento_evaluacion')
        .insert(intento)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['intentos-evaluacion', vars.id_aula_modulo, vars.id_usuario] })
    },
  })
}

// Hook para actualizar intento de evaluación
export function useActualizarIntentoEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idIntento: number
      intento: Tables<'aula_intento_evaluacion'>['Update']
    }) => {
      const { data, error } = await supabase
        .from('aula_intento_evaluacion')
        .update(vars.intento)
        .eq('id', vars.idIntento)
        .select()
        .single()

      if (error) throw error

      // TODO: Implementar lógica de completado de módulo con aula_inscripcion
      // La lógica anterior usaba detalle_proceso_curso que ya no existe

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
    .from('aula_intento_evaluacion')
    .select('id_aula_modulo')
    .eq('id_usuario', idUsuario)
    .single()

  if (!intento?.id_modulo) return

  const idModulo = intento.id_modulo

  // Contar elementos totales del módulo
  const { data: actividades } = await supabase
    .from('aula_actividad')
    .select('id')
    .eq('id_aula_modulo', idModulo)

  const { data: evaluaciones } = await supabase
    .from('aula_evaluacion')
    .select('id')
    .eq('id_aula_modulo', idModulo)

  const totalElementos = (actividades?.length || 0) + (evaluaciones?.length || 0)

  // Contar elementos completados
  const { data: actividadesCompletadas } = await supabase
    .from('aula_progreso_actividad')
    .select('id')
    .eq('id_usuario', idUsuario)
    .in('id_aula_actividad', actividades?.map(a => a.id) || [])
    .not('completada_en', 'is', null)

  const { data: evaluacionesAprobadas } = await supabase
    .from('aula_intento_evaluacion')
    .select('id')
    .eq('id_usuario', idUsuario)
    .eq('id_aula_modulo', idModulo)
    .eq('estado', 'aprobado')

  const elementosCompletados = (actividadesCompletadas?.length || 0) + (evaluacionesAprobadas?.length || 0)

  // TODO: Implementar lógica de completado de módulo en el nuevo esquema
  // La tabla 'avance_modulo' ya no existe en el esquema nuevo
}

// Hook para crear pregunta de evaluación
export function useCrearPreguntaEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pregunta: Tables<'aula_evaluacion'>['Insert']) => {
      // Obtener información del módulo y curso para las notificaciones
      const { data: modulo } = await supabase
        .from('aula_modulo')
        .select('id_aula_curso, titulo')
        .eq('id_aula_modulo', pregunta.id_aula_modulo)
        .single()

      const { data, error } = await supabase
        .from('aula_evaluacion')
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
            .from('aula_evaluacion')
            .select('id')
            .eq('id_aula_modulo', pregunta.id_aula_modulo)

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
      pregunta: Tables<'aula_evaluacion'>['Update']
    }) => {
      const { data, error } = await supabase
        .from('aula_evaluacion')
        .update(vars.pregunta)
        .eq('id', vars.idPregunta)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // TODO: Invalidar queries relacionadas con progreso en aula_inscripcion
    },
  })
}

// Hook para eliminar pregunta de evaluación
export function useEliminarPreguntaEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (idPregunta: number) => {
      const { error } = await supabase
        .from('aula_evaluacion')
        .delete()
        .eq('id', idPregunta)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion-detalle-modulo'] })
    },
  })
}