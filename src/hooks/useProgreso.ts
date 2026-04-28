import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

// Función auxiliar para emitir certificado automáticamente
async function emitirCertificadoAutomatico(idUsuario: number, idCurso: number) {
  // Verificar si ya tiene certificado
  const { data: certificadoExistente } = await supabase
    .from('certificado')
    .select('id_certificado')
    .eq('id_usuario', idUsuario)
    .eq('id_curso', idCurso)
    .single()

  if (certificadoExistente) return // Ya tiene certificado

  // Generar código único
  const codigoUnico = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

  // Crear certificado
  const { error } = await supabase
    .from('certificado')
    .insert({
      id_usuario: idUsuario,
      id_curso: idCurso,
      fecha_emision: new Date().toISOString(),
      codigo_unico: codigoUnico
    })

  if (!error) {
    toast.success('¡Felicitaciones! Has completado el curso y recibido tu certificado.')
  }
}

// Hook para calcular el progreso de un usuario en un curso
export function useProgresoCurso(vars: {
  idUsuario: number | null | undefined
  idCurso: number | null | undefined
}) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['progreso-curso', vars.idUsuario, vars.idCurso],
    queryFn: async () => {
      if (!vars.idUsuario || !vars.idCurso) {
        return { porcentaje: 0, actividadesCompletadas: 0, evaluacionesAprobadas: 0, totalElementos: 0 }
      }

      // Obtener el proceso asignado curso para el usuario
      const { data: procesoAsignado, error: procesoError } = await supabase
        .from('detalle_proceso_curso')
        .select('id_detalle_proceso_curso')
        .eq('id_usuario', vars.idUsuario)
        .eq('estado', 'inscrito')
        .eq('proceso_asignado_curso.curso.id_curso', vars.idCurso)
        .single()

      if (procesoError || !procesoAsignado) {
        return { porcentaje: 0, actividadesCompletadas: 0, evaluacionesAprobadas: 0, totalElementos: 0 }
      }

      // Contar total de elementos (actividades + evaluaciones)
      const { data: modulos, error: modulosError } = await supabase
        .from('modulo')
        .select(`
          id_modulo,
          actividad:actividad(count),
          evaluacion_detalle:evaluacion_detalle(count)
        `)
        .eq('id_curso', vars.idCurso)

      if (modulosError) throw modulosError

      const totalElementos = modulos?.reduce((total, modulo) => {
        return total + (modulo.actividad?.[0]?.count || 0) + (modulo.evaluacion_detalle?.[0]?.count || 0)
      }, 0) || 0

      if (totalElementos === 0) {
        return { porcentaje: 0, actividadesCompletadas: 0, evaluacionesAprobadas: 0, totalElementos: 0 }
      }

      // Contar actividades completadas
      const { data: actividadesCompletadas, error: actividadesError } = await supabase
        .from('progreso_actividad')
        .select('id_progreso')
        .eq('id_detalle_proceso_curso', procesoAsignado.id_detalle_proceso_curso)
        .not('completada_en', 'is', null)

      if (actividadesError) throw actividadesError

      // Contar evaluaciones aprobadas
      const { data: evaluacionesAprobadas, error: evaluacionesError } = await supabase
        .from('intento_evaluacion')
        .select('id_intento')
        .eq('id_detalle_proceso_curso', procesoAsignado.id_detalle_proceso_curso)
        .eq('estado', 'aprobado')

      if (evaluacionesError) throw evaluacionesError

      const elementosCompletados = (actividadesCompletadas?.length || 0) + (evaluacionesAprobadas?.length || 0)
      const porcentaje = Math.round((elementosCompletados / totalElementos) * 100)

      // Emitir certificado automáticamente si se completó el curso
      if (porcentaje === 100 && vars.idUsuario && vars.idCurso) {
        await emitirCertificadoAutomatico(vars.idUsuario, vars.idCurso)
      }

      return {
        porcentaje,
        actividadesCompletadas: actividadesCompletadas?.length || 0,
        evaluacionesAprobadas: evaluacionesAprobadas?.length || 0,
        totalElementos,
        completado: porcentaje === 100
      }
    },
    enabled: !!vars.idUsuario && !!vars.idCurso,
    staleTime: 30 * 1000,
    onSuccess: (data) => {
      // Invalidar consultas relacionadas cuando el progreso cambie
      if (data?.completado) {
        queryClient.invalidateQueries({ queryKey: ['certificados-usuario', vars.idUsuario] })
        queryClient.invalidateQueries({ queryKey: ['tiene-certificado', vars.idUsuario, vars.idCurso] })
      }
    }
  })
}

// Hook para obtener progreso de todos los usuarios en un curso (para el líder)
export function useProgresoGrupoCurso(idCurso: number | null | undefined) {
  return useQuery({
    queryKey: ['progreso-grupo-curso', idCurso],
    queryFn: async () => {
      if (!idCurso) return []

      const { data, error } = await supabase
        .from('detalle_proceso_curso')
        .select(`
          id_detalle_proceso_curso,
          fecha_inscripcion,
          estado,
          usuario:usuario(nombres, apellidos, correo),
          progreso_actividad(count),
          intento_evaluacion!inner(
            estado
          )
        `)
        .eq('estado', 'inscrito')
        .eq('proceso_asignado_curso.curso.id_curso', idCurso)

      if (error) throw error

      // Calcular progreso para cada usuario
      const progresoGrupo = await Promise.all(
        data.map(async (detalle) => {
          // Obtener total de elementos del curso
          const { data: modulos } = await supabase
            .from('modulo')
            .select(`
              actividad:actividad(count),
              evaluacion_detalle:evaluacion_detalle(count)
            `)
            .eq('id_curso', idCurso)

          const totalElementos = modulos?.reduce((total, modulo) => {
            return total + (modulo.actividad?.[0]?.count || 0) + (modulo.evaluacion_detalle?.[0]?.count || 0)
          }, 0) || 0

          const actividadesCompletadas = detalle.progreso_actividad?.[0]?.count || 0
          const evaluacionesAprobadas = detalle.intento_evaluacion?.filter(i => i.estado === 'aprobado').length || 0

          const elementosCompletados = actividadesCompletadas + evaluacionesAprobadas
          const porcentaje = totalElementos > 0 ? Math.round((elementosCompletados / totalElementos) * 100) : 0

          return {
            idUsuario: detalle.usuario.id_usuario,
            nombre: `${detalle.usuario.nombres} ${detalle.usuario.apellidos}`,
            correo: detalle.usuario.correo,
            fechaInscripcion: detalle.fecha_inscripcion,
            porcentaje,
            actividadesCompletadas,
            evaluacionesAprobadas,
            totalElementos,
            completado: porcentaje === 100
          }
        })
      )

      return progresoGrupo.sort((a, b) => b.porcentaje - a.porcentaje) // Ordenar por progreso descendente
    },
    enabled: !!idCurso,
    staleTime: 30 * 1000,
  })
}