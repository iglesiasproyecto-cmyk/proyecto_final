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

      const { data: curso, error: cursoError } = await supabase
        .from('aula_curso')
        .select('orden_secuencial')
        .eq('id_aula_curso', vars.idCurso)
        .single()

      if (cursoError) throw cursoError

      const { data: inscripcion } = await supabase
        .from('aula_inscripcion')
        .select('id_aula_inscripcion')
        .eq('id_usuario', vars.idUsuario)
        .eq('id_aula_curso', vars.idCurso)
        .eq('activo', true)
        .maybeSingle()

      if (!inscripcion) return []

      const { data: modulos, error: modulosError } = await supabase
        .from('aula_modulo')
        .select('id_aula_modulo, titulo, orden, publicado')
        .eq('id_aula_curso', vars.idCurso)
        .eq('publicado', true)
        .order('orden', { ascending: true })

      if (modulosError) throw modulosError
      if (!modulos || modulos.length === 0) return []

      const moduloIds = modulos.map((m) => m.id_aula_modulo)
      const progresoPorModulo = await obtenerProgresoModulosBatch(vars.idUsuario!, moduloIds)

      const accesoModulos = [] as Array<{
        idModulo: number
        titulo: string
        orden: number
        estadoAcceso: 'bloqueado' | 'disponible' | 'completado'
        totalElementos: number
        completado: boolean
      }>

      for (let index = 0; index < modulos.length; index += 1) {
        const modulo = modulos[index]
        let estadoAcceso: 'bloqueado' | 'disponible' | 'completado' = 'bloqueado'

        if (!curso.orden_secuencial) {
          estadoAcceso = 'disponible'
        } else if (index === 0) {
          estadoAcceso = 'disponible'
        } else {
          const moduloAnterior = modulos[index - 1]
          const progresoAnterior = progresoPorModulo.get(moduloAnterior.id_aula_modulo) ?? { completado: false, totalElementos: 0 }
          estadoAcceso = progresoAnterior.completado ? 'disponible' : 'bloqueado'
        }

        const progresoActual = progresoPorModulo.get(modulo.id_aula_modulo) ?? { completado: false, totalElementos: 0 }
        if (progresoActual.completado) {
          estadoAcceso = 'completado'
        }

        accesoModulos.push({
          idModulo: modulo.id_aula_modulo,
          titulo: modulo.titulo,
          orden: modulo.orden,
          estadoAcceso,
          totalElementos: progresoActual.totalElementos,
          completado: progresoActual.completado
        })
      }

      return accesoModulos
    },
    enabled: !!vars.idUsuario && !!vars.idCurso,
    staleTime: 30 * 1000,
  })
}

async function obtenerProgresoModulosBatch(idUsuario: number, moduloIds: number[]) {
  const result = new Map<number, { completado: boolean; totalElementos: number }>()
  if (moduloIds.length === 0) return result

  const { data: modulos } = await supabase
    .from('aula_modulo')
    .select('id_aula_modulo, contenido_md, descripcion')
    .in('id_aula_modulo', moduloIds)

  const { data: actividades } = await supabase
    .from('aula_actividad')
    .select('id_aula_actividad, id_aula_modulo')
    .in('id_aula_modulo', moduloIds)

  const { data: evaluaciones } = await supabase
    .from('aula_evaluacion')
    .select('id_aula_evaluacion, id_aula_modulo')
    .in('id_aula_modulo', moduloIds)

  const actividadIds = (actividades ?? []).map((a) => a.id_aula_actividad)
  const evaluacionIds = (evaluaciones ?? []).map((e) => e.id_aula_evaluacion)

  const { data: actividadesCompletadas } = actividadIds.length
    ? await supabase
        .from('aula_progreso_actividad')
        .select('id_aula_actividad')
        .eq('id_usuario', idUsuario)
        .in('id_aula_actividad', actividadIds)
        .eq('completada', true)
    : { data: [] as Array<{ id_aula_actividad: number }> }

  const { data: evaluacionesAprobadas } = evaluacionIds.length
    ? await supabase
        .from('aula_intento_evaluacion')
        .select('id_aula_evaluacion')
        .eq('id_usuario', idUsuario)
        .in('id_aula_evaluacion', evaluacionIds)
        .eq('aprobado', true)
    : { data: [] as Array<{ id_aula_evaluacion: number }> }

  const actividadesByModulo = new Map<number, number[]>()
  for (const actividad of actividades ?? []) {
    const list = actividadesByModulo.get(actividad.id_aula_modulo) ?? []
    list.push(actividad.id_aula_actividad)
    actividadesByModulo.set(actividad.id_aula_modulo, list)
  }

  const evaluacionesByModulo = new Map<number, number[]>()
  for (const evaluacion of evaluaciones ?? []) {
    const list = evaluacionesByModulo.get(evaluacion.id_aula_modulo) ?? []
    list.push(evaluacion.id_aula_evaluacion)
    evaluacionesByModulo.set(evaluacion.id_aula_modulo, list)
  }

  const completedActividadSet = new Set((actividadesCompletadas ?? []).map((r) => r.id_aula_actividad))
  const approvedEvalSet = new Set((evaluacionesAprobadas ?? []).map((r) => r.id_aula_evaluacion))

  for (const modulo of modulos ?? []) {
    const actividadModuloIds = actividadesByModulo.get(modulo.id_aula_modulo) ?? []
    const evaluacionModuloIds = evaluacionesByModulo.get(modulo.id_aula_modulo) ?? []
    const totalElementos = actividadModuloIds.length + evaluacionModuloIds.length
    const tieneContenido = !!(modulo.contenido_md || modulo.descripcion)

    if (totalElementos === 0 && tieneContenido) {
      result.set(modulo.id_aula_modulo, { completado: true, totalElementos: 1 })
      continue
    }
    if (totalElementos === 0 && !tieneContenido) {
      result.set(modulo.id_aula_modulo, { completado: false, totalElementos: 0 })
      continue
    }

    const actividadesCompletadasCount = actividadModuloIds.filter((id) => completedActividadSet.has(id)).length
    const evaluacionesCompletadasCount = evaluacionModuloIds.filter((id) => approvedEvalSet.has(id)).length
    const elementosCompletados = actividadesCompletadasCount + evaluacionesCompletadasCount

    result.set(modulo.id_aula_modulo, {
      completado: elementosCompletados >= totalElementos,
      totalElementos,
    })
  }

  return result
}
