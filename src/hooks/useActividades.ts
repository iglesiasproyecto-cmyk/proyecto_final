import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { crearNotificacionNuevoContenido } from '@/services/notificaciones.service'
import type { Tables } from '@/types/database.types'

// Hook para obtener actividades de un módulo
export function useActividadesModulo(idModulo: number | null | undefined) {
  return useQuery({
    queryKey: ['actividades-modulo', idModulo],
    queryFn: async () => {
      if (!idModulo) return []

      const { data, error } = await supabase
        .from('aula_actividad')
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

// Hook para obtener progreso de actividades de un usuario en un detalle proceso curso
export function useProgresoActividades(idAulaInscripcion: number | null | undefined) {
  return useQuery({
    queryKey: ['progreso-actividades', idAulaInscripcion],
    queryFn: async () => {
      if (!idAulaInscripcion) return []

      const { data, error } = await supabase
        .from('aula_progreso_actividad')
        .select(`
          *,
          actividad:aula_actividad(*)
        `)
        .eq('id_detalle_proceso_curso', idAulaInscripcion)

      if (error) throw error
      return data
    },
    enabled: !!idAulaInscripcion,
    staleTime: 30 * 1000,
  })
}

// Hook para marcar actividad como vista
export function useMarcarActividadVista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idActividad: number
      idAulaInscripcion: number
      idUsuario: number
    }) => {
      const { data, error } = await supabase
        .from('aula_progreso_actividad')
        .upsert({
          id_aula_actividad: vars.idActividad,
          id_detalle_proceso_curso: vars.idAulaInscripcion,
          id_usuario: vars.idUsuario,
          completada_en: new Date().toISOString(), // Note: aula system uses completada_en for completion
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['progreso-actividades', vars.idAulaInscripcion] })
      qc.invalidateQueries({ queryKey: ['avance-detalle', vars.idAulaInscripcion] })
    },
  })
}

// Hook para marcar actividad como completada
export function useMarcarActividadCompletada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idActividad: number
      idAulaInscripcion: number
      idUsuario: number
    }) => {
      const { data, error } = await supabase
        .from('aula_progreso_actividad')
        .upsert({
          id_aula_actividad: vars.idActividad,
          id_detalle_proceso_curso: vars.idAulaInscripcion,
          id_usuario: vars.idUsuario,
          completada_en: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['progreso-actividades', vars.idAulaInscripcion] })
      qc.invalidateQueries({ queryKey: ['avance-detalle', vars.idAulaInscripcion] })
    },
  })
}

// Función auxiliar para verificar y marcar módulo completo
async function verificarYMarcarModuloCompleto(idAulaInscripcion: number, idUsuario: number) {
  // Obtener el módulo de la actividad
  const { data: actividad } = await supabase
    .from('aula_progreso_actividad')
    .select(`
      actividad:aula_actividad(
        id_aula_modulo,
        modulo:aula_modulo(id_aula_modulo)
      )
    `)
    .eq('id_detalle_proceso_curso', idAulaInscripcion)
    .eq('id_usuario', idUsuario)
    .single()

  if (!actividad?.actividad?.id_aula_modulo) return

  const idModulo = actividad.actividad.id_aula_modulo

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
    // Note: aula system doesn't have a separate module completion table
    // Module completion is calculated dynamically from activity/evaluation progress
    debugLog('useActividades', `Módulo ${idModulo} completado por usuario ${idUsuario}`)
  }
}

// Hook para crear actividad
export function useCrearActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (actividad: any) => {
      // Obtener información del curso para las notificaciones
      const { data: modulo } = await supabase
        .from('aula_modulo')
        .select('id_aula_curso, titulo')
        .eq('id_aula_modulo', actividad.id_aula_modulo!)
        .single()

      const { data, error } = await supabase
        .from('aula_actividad')
        .insert({
          ...actividad,
          id_aula_modulo: actividad.id_aula_modulo
        })
        .select()
        .single()

      if (error) throw error

      // Enviar notificaciones si la actividad se crea en un módulo de un curso activo
      if (modulo && actividad.estado === 'pendiente') {
        const { data: curso } = await supabase
          .from('aula_curso')
          .select('estado')
          .eq('id_aula_curso', modulo.id_aula_curso)
          .single()

        if (curso?.estado === 'activo') {
          await crearNotificacionNuevoContenido(
            modulo.id_aula_curso,
            'actividad',
            actividad.titulo
          )
        }
      }

      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['actividades-modulo', vars.id_modulo] })
    },
  })
}

// Hook para actualizar actividad
export function useActualizarActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idActividad: number
      actividad: any
    }) => {
      const { data, error } = await supabase
        .from('aula_actividad')
        .update(vars.actividad)
        .eq('id_aula_actividad', vars.idActividad)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['actividades-modulo', vars.actividad.id_aula_modulo] })
    },
  })
}

// Hook para eliminar actividad
export function useEliminarActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (idActividad: number) => {
      const { error } = await supabase
        .from('aula_actividad')
        .delete()
        .eq('id_aula_actividad', idActividad)

      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['actividades-modulo'] })
    },
  })
}