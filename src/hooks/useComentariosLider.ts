import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/types/database.types'

// Hook para obtener comentarios de un usuario en un curso
export function useComentariosUsuario(vars: {
  idUsuario: number | null | undefined
  idCurso: number | null | undefined
}) {
  return useQuery({
    queryKey: ['comentarios-usuario', vars.idUsuario, vars.idCurso],
    queryFn: async () => {
      if (!vars.idUsuario || !vars.idCurso) return []

      const { data, error } = await supabase
        .from('comentario_lider')
        .select(`
          *,
          usuario_autor:usuario!id_usuario_autor(nombres, apellidos),
          actividad:actividad(titulo),
          modulo:modulo(titulo)
        `)
        .eq('id_usuario_destinatario', vars.idUsuario)
        .in('tipo', ['retroalimentacion'])
        .order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!vars.idUsuario && !!vars.idCurso,
    staleTime: 30 * 1000,
  })
}

// Hook para obtener comentarios de una actividad específica
export function useComentariosActividad(idActividad: number | null | undefined) {
  return useQuery({
    queryKey: ['comentarios-actividad', idActividad],
    queryFn: async () => {
      if (!idActividad) return []

      const { data, error } = await supabase
        .from('comentario_lider')
        .select(`
          *,
          usuario_autor:usuario!id_usuario_autor(nombres, apellidos)
        `)
        .eq('id_actividad', idActividad)
        .order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!idActividad,
    staleTime: 30 * 1000,
  })
}

// Hook para crear comentario del líder
export function useCrearComentarioLider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (comentario: Tables<'comentario_lider'>['Insert']) => {
      const { data, error } = await supabase
        .from('comentario_lider')
        .insert(comentario)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['comentarios-usuario', vars.id_usuario_destinatario] })
      qc.invalidateQueries({ queryKey: ['comentarios-actividad', vars.id_actividad] })
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

// Hook para eliminar comentario del líder
export function useEliminarComentarioLider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (idComentario: number) => {
      const { error } = await supabase
        .from('comentario_lider')
        .delete()
        .eq('id_comentario', idComentario)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comentarios-usuario'] })
      qc.invalidateQueries({ queryKey: ['comentarios-actividad'] })
    },
  })
}