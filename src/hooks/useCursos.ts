import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/types/database.types'

// Hook para obtener cursos por ministerio (para líderes)
export function useCursos(idMinisterio?: number) {
  return useQuery({
    queryKey: ['cursos', idMinisterio],
    queryFn: async () => {
      let query = supabase
        .from('aula_curso')
        .select(`
          *,
          ministerio:ministerio(nombre),
          modulos:aula_modulo(id_aula_modulo),
          usuario_creador:usuario(nombres, apellidos)
        `)

      if (idMinisterio) {
        query = query.eq('id_ministerio', idMinisterio)
      }

      const { data, error } = await query.order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: idMinisterio !== undefined,
  })
}

export function useAulaMinisterioStats(idMinisterio?: number) {
  return useQuery({
    queryKey: ['aula-ministerio-stats', idMinisterio],
    queryFn: async () => {
      if (!idMinisterio) {
        return { cursosActivos: 0, inscritos: 0, certificados: 0 }
      }

      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          estado,
          inscripciones:aula_inscripcion(id_aula_inscripcion, activo),
          certificados:aula_certificado(id_aula_certificado)
        `)
        .eq('id_ministerio', idMinisterio)

      if (error) throw error

      const cursos = data ?? []
      const cursosActivos = cursos.filter((curso) => curso.estado === 'activo')

      return {
        cursosActivos: cursosActivos.length,
        inscritos: cursosActivos.reduce(
          (total, curso) => total + (curso.inscripciones?.filter((inscripcion) => inscripcion.activo).length ?? 0),
          0,
        ),
        certificados: cursosActivos.reduce(
          (total, curso) => total + (curso.certificados?.length ?? 0),
          0,
        ),
      }
    },
    enabled: idMinisterio !== undefined,
  })
}

// Hook para obtener cursos disponibles para un servidor
export function useCursosDisponibles(idUsuario: number | null | undefined) {
  return useQuery({
    queryKey: ['cursos-disponibles', idUsuario],
    queryFn: async () => {
      if (!idUsuario) return []

      // Obtener cursos a través de ministerios donde el usuario está inscrito
      const { data: miembroMinisterios, error: miembroError } = await supabase
        .from('miembro_ministerio')
        .select('id_ministerio')
        .eq('id_usuario', idUsuario)
        .eq('fecha_salida', null)

      if (miembroError) throw miembroError

      if (!miembroMinisterios || miembroMinisterios.length === 0) return []

      const ministerioIds = miembroMinisterios.map(m => m.id_ministerio)

      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          *,
          ministerio:ministerio(nombre)
        `)
        .in('id_ministerio', ministerioIds)
        .eq('estado', 'activo')
        .order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!idUsuario,
  })
}
