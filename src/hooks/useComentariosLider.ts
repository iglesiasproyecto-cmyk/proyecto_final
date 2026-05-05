import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/types/database.types'

// Hook para obtener retroalimentación de un usuario en un curso
export function useComentariosUsuario(vars: {
  idUsuario: number | null | undefined
  idCurso: number | null | undefined
}) {
  return useQuery({
    queryKey: ['comentarios-usuario', vars.idUsuario, vars.idCurso],
    queryFn: async () => {
      if (!vars.idUsuario || !vars.idCurso) return []

      // First get all activities for this course
      const { data: actividades, error: actividadesError } = await supabase
        .from('aula_actividad')
        .select('id_aula_actividad')
        .eq('id_aula_modulo', vars.idCurso) // Assuming idCurso refers to modulo for now

      if (actividadesError) throw actividadesError

      if (!actividades || actividades.length === 0) return []

      const actividadIds = actividades.map(a => a.id_aula_actividad)

      const { data, error } = await supabase
        .from('aula_retroalimentacion')
        .select(`
          *,
          usuario_lider:usuario!id_usuario_lider(nombres, apellidos),
          actividad:aula_actividad(titulo),
          modulo:aula_modulo(titulo)
        `)
        .eq('id_usuario_servidor', vars.idUsuario)
        .in('id_aula_actividad', actividadIds)
        .order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!vars.idUsuario && !!vars.idCurso,
    staleTime: 30 * 1000,
  })
}

// Hook para obtener retroalimentación de una actividad específica
export function useComentariosActividad(idActividad: number | null | undefined) {
  return useQuery({
    queryKey: ['comentarios-actividad', idActividad],
    queryFn: async () => {
      if (!idActividad) return []

      const { data, error } = await supabase
        .from('aula_retroalimentacion')
        .select(`
          *,
          usuario_lider:usuario!id_usuario_lider(nombres, apellidos)
        `)
        .eq('id_aula_actividad', idActividad)
        .order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!idActividad,
    staleTime: 30 * 1000,
  })
}

// Hook para crear retroalimentación del líder
export function useCrearComentarioLider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (retroalimentacion: {
      comentario: string
      id_aula_actividad: number
      id_usuario_lider: number
      id_usuario_servidor: number
    }) => {
      const { data, error } = await supabase
        .from('aula_retroalimentacion')
        .insert({
          comentario: retroalimentacion.comentario,
          id_aula_actividad: retroalimentacion.id_aula_actividad,
          id_usuario_lider: retroalimentacion.id_usuario_lider,
          id_usuario_servidor: retroalimentacion.id_usuario_servidor
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['comentarios-usuario', vars.id_usuario_servidor] })
      qc.invalidateQueries({ queryKey: ['comentarios-actividad', vars.id_aula_actividad] })
    },
  })
}

// Hook para actualizar comentario del líder
export function useActualizarComentarioLider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      idComentario: number
      comentario: Tables<'comentario_lider'>['Update']
    }) => {
      const { data, error } = await supabase
        .from('comentario_lider')
        .update(vars.comentario)
        .eq('id_comentario', vars.idComentario)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['comentarios-usuario'] })
      qc.invalidateQueries({ queryKey: ['comentarios-actividad'] })
    },
  })
}

// Hook para eliminar retroalimentación del líder
export function useEliminarComentarioLider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (idRetroalimentacion: number) => {
      const { error } = await supabase
        .from('aula_retroalimentacion')
        .delete()
        .eq('id_aula_retroalimentacion', idRetroalimentacion)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comentarios-usuario'] })
      qc.invalidateQueries({ queryKey: ['comentarios-actividad'] })
    },
  })
}