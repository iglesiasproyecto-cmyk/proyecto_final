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
        .from('actividad')
        .select('*')
        .eq('id_modulo', idModulo)
        .order('orden', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!idModulo,
    staleTime: 30 * 1000,
  })
}

// Hook para obtener progreso de actividades de un usuario en un detalle proceso curso
export function useProgresoActividades(idDetalleProcesoCurso: number | null | undefined) {
  return useQuery({
    queryKey: ['progreso-actividades', idDetalleProcesoCurso],
    queryFn: async () => {
      if (!idDetalleProcesoCurso) return []

      const { data, error } = await supabase
        .from('progreso_actividad')
        .select(`
          *,
          actividad:actividad(*)
        `)
        .eq('id_detalle_proceso_curso', idDetalleProcesoCurso)

      if (error) throw error
      return data
    },
    enabled: !!idDetalleProcesoCurso,
    staleTime: 30 * 1000,
  })
}

// Hook para marcar actividad como vista
export function useMarcarActividadVista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idActividad: number
      idDetalleProcesoCurso: number
      idUsuario: number
    }) => {
      const { data, error } = await supabase
        .from('progreso_actividad')
        .upsert({
          id_actividad: vars.idActividad,
          id_detalle_proceso_curso: vars.idDetalleProcesoCurso,
          id_usuario: vars.idUsuario,
          vista_en: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['progreso-actividades', vars.idDetalleProcesoCurso] })
      qc.invalidateQueries({ queryKey: ['avance-detalle', vars.idDetalleProcesoCurso] })
    },
  })
}

// Hook para marcar actividad como completada
export function useMarcarActividadCompletada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idActividad: number
      idDetalleProcesoCurso: number
      idUsuario: number
    }) => {
      const { data, error } = await supabase
        .from('progreso_actividad')
        .upsert({
          id_actividad: vars.idActividad,
          id_detalle_proceso_curso: vars.idDetalleProcesoCurso,
          id_usuario: vars.idUsuario,
          completada_en: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Verificar si el módulo está completo y marcarlo automáticamente
      await verificarYMarcarModuloCompleto(vars.idDetalleProcesoCurso, vars.idUsuario)

      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['progreso-actividades', vars.idDetalleProcesoCurso] })
      qc.invalidateQueries({ queryKey: ['avance-detalle', vars.idDetalleProcesoCurso] })
      qc.invalidateQueries({ queryKey: ['progreso-curso'] })
    },
  })
}

// Función auxiliar para verificar y marcar módulo completo
async function verificarYMarcarModuloCompleto(idDetalleProcesoCurso: number, idUsuario: number) {
  // Obtener el módulo de la actividad
  const { data: actividad } = await supabase
    .from('progreso_actividad')
    .select(`
      actividad:actividad(
        id_modulo,
        modulo:modulo(id_modulo)
      )
    `)
    .eq('id_detalle_proceso_curso', idDetalleProcesoCurso)
    .eq('id_usuario', idUsuario)
    .single()

  if (!actividad?.actividad?.id_modulo) return

  const idModulo = actividad.actividad.id_modulo

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

// Hook para crear actividad
export function useCrearActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (actividad: Tables<'actividad'>['Insert']) => {
      // Obtener información del curso para las notificaciones
      const { data: modulo } = await supabase
        .from('modulo')
        .select('id_curso, titulo')
        .eq('id_modulo', actividad.id_modulo!)
        .single()

      const { data, error } = await supabase
        .from('actividad')
        .insert(actividad)
        .select()
        .single()

      if (error) throw error

      // Enviar notificaciones si la actividad se crea en un módulo de un curso activo
      if (modulo && actividad.estado === 'pendiente') {
        const { data: curso } = await supabase
          .from('curso')
          .select('estado')
          .eq('id_curso', modulo.id_curso)
          .single()

        if (curso?.estado === 'activo') {
          await crearNotificacionNuevoContenido(
            modulo.id_curso,
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
      actividad: Tables<'actividad'>['Update']
    }) => {
      const { data, error } = await supabase
        .from('actividad')
        .update(vars.actividad)
        .eq('id_actividad', vars.idActividad)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['actividades-modulo', vars.actividad.id_modulo] })
    },
  })
}

// Hook para eliminar actividad
export function useEliminarActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (idActividad: number) => {
      const { error } = await supabase
        .from('actividad')
        .delete()
        .eq('id_actividad', idActividad)

      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['actividades-modulo'] })
    },
  })
}