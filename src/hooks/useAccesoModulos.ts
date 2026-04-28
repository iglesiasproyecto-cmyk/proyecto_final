import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

// Hook para obtener el estado de acceso a módulos
export function useAccesoModulos(vars: {
  idUsuario: number | null | undefined
  idCurso: number | null | undefined
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

      const progresoCache = new Map<number, { completado: boolean; totalElementos: number }>()

      const obtenerProgreso = async (idModulo: number) => {
        if (progresoCache.has(idModulo)) return progresoCache.get(idModulo)!

        const progreso = await obtenerProgresoModulo(vars.idUsuario!, idModulo)
        progresoCache.set(idModulo, progreso)
        return progreso
      }

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
          const progresoAnterior = await obtenerProgreso(moduloAnterior.id_aula_modulo)
          estadoAcceso = progresoAnterior.completado ? 'disponible' : 'bloqueado'
        }

        const progresoActual = await obtenerProgreso(modulo.id_aula_modulo)
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

async function obtenerProgresoModulo(idUsuario: number, idModulo: number) {
  const { data: actividades } = await supabase
    .from('aula_actividad')
    .select('id_aula_actividad')
    .eq('id_aula_modulo', idModulo)

  const { data: evaluaciones } = await supabase
    .from('aula_evaluacion')
    .select('id_aula_evaluacion')
    .eq('id_aula_modulo', idModulo)

  const actividadIds = actividades?.map(a => a.id_aula_actividad) || []
  const evaluacionIds = evaluaciones?.map(e => e.id_aula_evaluacion) || []
  const totalElementos = actividadIds.length + evaluacionIds.length

  if (totalElementos === 0) {
    return { completado: false, totalElementos }
  }

  const { data: actividadesCompletadas } = await supabase
    .from('aula_progreso_actividad')
    .select('id_aula_actividad')
    .eq('id_usuario', idUsuario)
    .in('id_aula_actividad', actividadIds)
    .eq('completada', true)

  const { data: evaluacionesAprobadas } = await supabase
    .from('aula_intento_evaluacion')
    .select('id_aula_evaluacion')
    .eq('id_usuario', idUsuario)
    .in('id_aula_evaluacion', evaluacionIds)
    .eq('aprobado', true)

  const evaluacionesUnicas = new Set(
    evaluacionesAprobadas?.map(e => e.id_aula_evaluacion)
  )

  const elementosCompletados = (actividadesCompletadas?.length || 0) + evaluacionesUnicas.size

  return {
    completado: elementosCompletados >= totalElementos,
    totalElementos
  }
}