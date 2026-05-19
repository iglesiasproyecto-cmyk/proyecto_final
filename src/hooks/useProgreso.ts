import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

// Función auxiliar para emitir certificado automáticamente
async function emitirCertificadoAutomatico(idUsuario: number, idCurso: number) {
  // Usar upsert para prevenir duplicados (requiere constraint UNIQUE en BD)
  const { data, error } = await supabase
    .from('aula_certificado')
      .upsert({
        id_usuario: idUsuario,
        id_aula_curso: idCurso,
        emitido_en: new Date().toISOString(),
        fecha_certificacion: new Date().toISOString().slice(0, 10)
      }, {
        onConflict: 'id_usuario,id_aula_curso'
      })

  if (error) {
    // Si hay error de duplicado, es porque ya existe (esperado)
    if (error.code === '23505') {
      debugLog('useProgreso', 'Certificate already exists for user-course:', { idUsuario, idCurso })
      return
    }
    console.error('[AUDIT] Failed to create certificate - audit logging may be affected:', error)
    console.error('Error creando certificado:', error)
    return
  }

  // Solo mostrar toast si se creó un nuevo certificado
  if (data && Array.isArray(data) && data.length > 0) {
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

      const moduloIds = modulos.map(m => m.id_aula_modulo)

      const { data: actividades } = await supabase
        .from('aula_actividad')
        .select('id_aula_actividad')
        .in('id_aula_modulo', moduloIds)

      const actividadIds = actividades?.map(a => a.id_aula_actividad) || []

      // Contar actividades completadas
      const actividadesResponse = actividadIds.length
        ? await supabase
            .from('aula_progreso_actividad')
            .select('id_aula_progreso_actividad')
            .eq('id_usuario', vars.idUsuario)
            .in('id_aula_actividad', actividadIds)
            .eq('completada', true)
        : { data: [] as Array<{ id_aula_progreso_actividad: number }>, error: null }

      if (actividadesResponse.error) throw actividadesResponse.error

      const actividadesCompletadas = actividadesResponse.data

      // Contar evaluaciones aprobadas (último intento aprobado por evaluación)
      const { data: evaluaciones } = await supabase
        .from('aula_evaluacion')
        .select('id_aula_evaluacion')
        .in('id_aula_modulo', moduloIds)

      const evaluacionIds = evaluaciones?.map(e => e.id_aula_evaluacion) || []

      const evaluacionesResponse = evaluacionIds.length
        ? await supabase
            .from('aula_intento_evaluacion')
            .select('id_aula_evaluacion')
            .eq('id_usuario', vars.idUsuario)
            .eq('aprobado', true)
            .in('id_aula_evaluacion', evaluacionIds)
        : { data: [] as Array<{ id_aula_evaluacion: number }>, error: null }

      if (evaluacionesResponse.error) throw evaluacionesResponse.error

      const evaluacionesAprobadas = evaluacionesResponse.data

      const evaluacionesUnicas = new Set(evaluacionesAprobadas?.map(e => e.id_aula_evaluacion))
      const elementosCompletados = (actividadesCompletadas?.length || 0) + evaluacionesUnicas.size
      const porcentaje = Math.round((elementosCompletados / totalElementos) * 100)

      // Emitir certificado automáticamente si se completó el curso
      if (porcentaje === 100 && vars.idUsuario && vars.idCurso) {
        await emitirCertificadoAutomatico(vars.idUsuario, vars.idCurso)
      }

      return {
        porcentaje,
        actividadesCompletadas: actividadesCompletadas?.length || 0,
        evaluacionesAprobadas: evaluacionesUnicas.size,
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
          usuario:usuario(id_usuario, nombres, apellidos, correo)
        `)
        .eq('activo', true)
        .eq('id_aula_curso', idCurso)

      if (error) throw error

      // Calcular progreso para cada usuario
      const { data: modulos } = await supabase
        .from('aula_modulo')
        .select(`
          id_aula_modulo,
          actividades:aula_actividad(count),
          evaluaciones:aula_evaluacion(count)
        `)
        .eq('id_aula_curso', idCurso)

      const totalElementos = modulos?.reduce((total, modulo) => {
        return total + (modulo.actividades?.[0]?.count || 0) + (modulo.evaluaciones?.[0]?.count || 0)
      }, 0) || 0

      const moduloIds = modulos?.map(m => m.id_aula_modulo) || []
      const actividadesResponse = moduloIds.length
        ? await supabase
            .from('aula_actividad')
            .select('id_aula_actividad')
            .in('id_aula_modulo', moduloIds)
        : { data: [] as Array<{ id_aula_actividad: number }>, error: null }

      if (actividadesResponse.error) throw actividadesResponse.error

      const evaluacionesResponse = moduloIds.length
        ? await supabase
            .from('aula_evaluacion')
            .select('id_aula_evaluacion')
            .in('id_aula_modulo', moduloIds)
        : { data: [] as Array<{ id_aula_evaluacion: number }>, error: null }

      if (evaluacionesResponse.error) throw evaluacionesResponse.error

      const actividadIds = actividadesResponse.data?.map(a => a.id_aula_actividad) || []
      const evaluacionIds = evaluacionesResponse.data?.map(e => e.id_aula_evaluacion) || []

      const userIds = data.map((inscripcion) => inscripcion.usuario.id_usuario)

      const actividadesCompletadasResponse = actividadIds.length && userIds.length
        ? await supabase
            .from('aula_progreso_actividad')
            .select('id_usuario, id_aula_actividad')
            .in('id_usuario', userIds)
            .in('id_aula_actividad', actividadIds)
            .eq('completada', true)
        : { data: [] as Array<{ id_usuario: number; id_aula_actividad: number }>, error: null }

      if (actividadesCompletadasResponse.error) throw actividadesCompletadasResponse.error

      const evaluacionesAprobadasResponse = evaluacionIds.length && userIds.length
        ? await supabase
            .from('aula_intento_evaluacion')
            .select('id_usuario, id_aula_evaluacion')
            .in('id_usuario', userIds)
            .in('id_aula_evaluacion', evaluacionIds)
            .eq('aprobado', true)
        : { data: [] as Array<{ id_usuario: number; id_aula_evaluacion: number }>, error: null }

      if (evaluacionesAprobadasResponse.error) throw evaluacionesAprobadasResponse.error

      const actividadesByUser = new Map<number, number>()
      for (const row of actividadesCompletadasResponse.data ?? []) {
        actividadesByUser.set(row.id_usuario, (actividadesByUser.get(row.id_usuario) ?? 0) + 1)
      }

      const evaluacionesByUser = new Map<number, Set<number>>()
      for (const row of evaluacionesAprobadasResponse.data ?? []) {
        const current = evaluacionesByUser.get(row.id_usuario) ?? new Set<number>()
        current.add(row.id_aula_evaluacion)
        evaluacionesByUser.set(row.id_usuario, current)
      }

      const progresoGrupo = data.map((inscripcion) => {
        const idUsuario = inscripcion.usuario.id_usuario
        const actividadesCount = actividadesByUser.get(idUsuario) ?? 0
        const evaluacionesCount = evaluacionesByUser.get(idUsuario)?.size ?? 0
        const elementosCompletados = actividadesCount + evaluacionesCount
        const porcentaje = totalElementos > 0 ? Math.round((elementosCompletados / totalElementos) * 100) : 0

        return {
          idUsuario,
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

      return progresoGrupo.sort((a, b) => b.porcentaje - a.porcentaje) // Ordenar por progreso descendente
    },
    enabled: !!idCurso,
    staleTime: 30 * 1000,
  })
}
