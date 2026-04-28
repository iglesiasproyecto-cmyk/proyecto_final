import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

// Función auxiliar para emitir certificado automáticamente
async function emitirCertificadoAutomatico(idUsuario: number, idCurso: number) {
  // Verificar si ya tiene certificado
  const { data: certificadoExistente } = await supabase
    .from('aula_certificado')
    .select('id_aula_certificado')
    .eq('id_usuario', idUsuario)
    .eq('id_aula_curso', idCurso)
    .single()

  if (certificadoExistente) return // Ya tiene certificado

  // Crear certificado (codigo_verificacion se genera automáticamente)
  const { error } = await supabase
    .from('aula_certificado')
    .insert({
      id_usuario: idUsuario,
      id_aula_curso: idCurso,
      emitido_en: new Date().toISOString()
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

      // Verificar que el usuario esté inscrito en el curso
      const { data: inscripcion, error: inscripcionError } = await supabase
        .from('aula_inscripcion')
        .select('id_aula_inscripcion')
        .eq('id_usuario', vars.idUsuario)
        .eq('id_aula_curso', vars.idCurso)
        .eq('activo', true)
        .single()

      if (inscripcionError || !inscripcion) {
        return { porcentaje: 0, actividadesCompletadas: 0, evaluacionesAprobadas: 0, totalElementos: 0 }
      }

      // Contar total de elementos (actividades + evaluaciones)
      const { data: modulos, error: modulosError } = await supabase
        .from('aula_modulo')
        .select(`
          id_aula_modulo,
          actividades:aula_actividad(count),
          evaluaciones:aula_evaluacion(count)
        `)
        .eq('id_aula_curso', vars.idCurso)

      if (modulosError) throw modulosError

      const totalElementos = modulos?.reduce((total, modulo) => {
        return total + (modulo.actividades?.[0]?.count || 0) + (modulo.evaluaciones?.[0]?.count || 0)
      }, 0) || 0

      if (totalElementos === 0) {
        return { porcentaje: 0, actividadesCompletadas: 0, evaluacionesAprobadas: 0, totalElementos: 0 }
      }

      // Contar actividades completadas
      const { data: actividadesCompletadas, error: actividadesError } = await supabase
        .from('aula_progreso_actividad')
        .select('id_aula_progreso_actividad')
        .eq('id_usuario', vars.idUsuario)
        .in('id_aula_actividad', 
          (await supabase
            .from('aula_actividad')
            .select('id_aula_actividad')
            .in('id_aula_modulo', modulos.map(m => m.id_aula_modulo))
          ).data?.map(a => a.id_aula_actividad) || []
        )
        .eq('completada', true)

      if (actividadesError) throw actividadesError

      // Contar evaluaciones aprobadas (último intento aprobado por evaluación)
      const { data: evaluacionesAprobadas, error: evaluacionesError } = await supabase
        .from('aula_intento_evaluacion')
        .select('id_aula_evaluacion')
        .eq('id_usuario', vars.idUsuario)
        .eq('aprobado', true)
        .in('id_aula_evaluacion',
          modulos.flatMap(m => m.evaluaciones?.map(e => e.id_aula_evaluacion) || [])
        )

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
        .from('aula_inscripcion')
        .select(`
          id_aula_inscripcion,
          inscrito_en,
          activo,
          usuario:usuario(nombres, apellidos, correo)
        `)
        .eq('activo', true)
        .eq('id_aula_curso', idCurso)

      if (error) throw error

      // Calcular progreso para cada usuario
      const progresoGrupo = await Promise.all(
        data.map(async (inscripcion) => {
          // Obtener total de elementos del curso
          const { data: modulos } = await supabase
            .from('aula_modulo')
            .select(`
              actividades:aula_actividad(count),
              evaluaciones:aula_evaluacion(count)
            `)
            .eq('id_aula_curso', idCurso)

          const totalElementos = modulos?.reduce((total, modulo) => {
            return total + (modulo.actividades?.[0]?.count || 0) + (modulo.evaluaciones?.[0]?.count || 0)
          }, 0) || 0

          // Contar actividades completadas
          const { data: actividadesCompletadas } = await supabase
            .from('aula_progreso_actividad')
            .select('id_aula_progreso_actividad', { count: 'exact' })
            .eq('id_usuario', inscripcion.usuario.id_usuario)
            .in('id_aula_actividad',
              modulos.flatMap(m => m.actividades?.map(a => a.id_aula_actividad) || [])
            )
            .eq('completada', true)

          const actividadesCount = actividadesCompletadas?.length || 0

          // Contar evaluaciones aprobadas
          const { data: evaluacionesAprobadas } = await supabase
            .from('aula_intento_evaluacion')
            .select('id_aula_evaluacion', { distinct: true })
            .eq('id_usuario', inscripcion.usuario.id_usuario)
            .in('id_aula_evaluacion',
              modulos.flatMap(m => m.evaluaciones?.map(e => e.id_aula_evaluacion) || [])
            )
            .eq('aprobado', true)

          const evaluacionesCount = evaluacionesAprobadas?.length || 0

          const elementosCompletados = actividadesCount + evaluacionesCount
          const porcentaje = totalElementos > 0 ? Math.round((elementosCompletados / totalElementos) * 100) : 0

          return {
            idUsuario: inscripcion.usuario.id_usuario,
            nombre: `${inscripcion.usuario.nombres} ${inscripcion.usuario.apellidos}`,
            correo: inscripcion.usuario.correo,
            fechaInscripcion: inscripcion.inscrito_en,
            porcentaje,
            actividadesCompletadas: actividadesCount,
            evaluacionesAprobadas: evaluacionesCount,
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