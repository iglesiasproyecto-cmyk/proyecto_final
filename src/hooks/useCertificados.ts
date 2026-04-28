import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/types/database.types'

// Hook para obtener certificados de un usuario
export function useCertificadosUsuario(idUsuario: number | null | undefined) {
  return useQuery({
    queryKey: ['certificados-usuario', idUsuario],
    queryFn: async () => {
      if (!idUsuario) return []

      const { data, error } = await supabase
        .from('certificado')
        .select(`
          *,
          curso:curso(nombre, descripcion)
        `)
        .eq('id_usuario', idUsuario)
        .order('fecha_emision', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!idUsuario,
    staleTime: 30 * 1000,
  })
}

// Hook para verificar si un usuario tiene certificado para un curso
export function useTieneCertificado(vars: {
  idUsuario: number | null | undefined
  idCurso: number | null | undefined
}) {
  return useQuery({
    queryKey: ['tiene-certificado', vars.idUsuario, vars.idCurso],
    queryFn: async () => {
      if (!vars.idUsuario || !vars.idCurso) return false

      const { data, error } = await supabase
        .from('certificado')
        .select('id_certificado')
        .eq('id_usuario', vars.idUsuario)
        .eq('id_curso', vars.idCurso)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return !!data
    },
    enabled: !!vars.idUsuario && !!vars.idCurso,
    staleTime: 30 * 1000,
  })
}

// Hook para crear certificado
export function useCrearCertificado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (certificado: Tables<'certificado'>['Insert']) => {
      const { data, error } = await supabase
        .from('certificado')
        .insert(certificado)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['certificados-usuario', vars.id_usuario] })
      qc.invalidateQueries({ queryKey: ['tiene-certificado', vars.id_usuario, vars.id_curso] })
    },
  })
}

// Hook para obtener todos los certificados de un curso (para dashboard del líder)
export function useCertificadosCurso(idCurso: number | null | undefined) {
  return useQuery({
    queryKey: ['certificados-curso', idCurso],
    queryFn: async () => {
      if (!idCurso) return []

      const { data, error } = await supabase
        .from('certificado')
        .select(`
          *,
          usuario:usuario(nombres, apellidos, correo)
        `)
        .eq('id_curso', idCurso)
        .order('fecha_emision', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!idCurso,
    staleTime: 30 * 1000,
  })
}