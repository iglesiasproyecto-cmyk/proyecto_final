import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Tables } from '@/types/database.types';
import { toast } from 'sonner';

export function useCursosGlobal(idIglesia: number | undefined) {
  return useQuery({
    queryKey: ['cursos-global', idIglesia],
    queryFn: async () => {
      if (!idIglesia) return [];

      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          descripcion,
          estado,
          id_iglesia,
          id_ministerio,
          creado_en,
          updated_at,
          usuario_creador:id_usuario_creador(nombres, apellidos)
        `)
        .eq('id_iglesia', idIglesia)
        .is('id_ministerio', null)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: idIglesia !== undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCursosPorMinisterio(idMinisterio: number | undefined) {
  return useQuery({
    queryKey: ['cursos-ministerio', idMinisterio],
    queryFn: async () => {
      if (!idMinisterio) return [];

      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          descripcion,
          estado,
          id_iglesia,
          id_ministerio,
          creado_en,
          updated_at,
          usuario_creador:id_usuario_creador(nombres, apellidos)
        `)
        .eq('id_ministerio', idMinisterio)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: idMinisterio !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCursoDetalle(idCurso: number | undefined) {
  return useQuery({
    queryKey: ['curso-detalle', idCurso],
    queryFn: async () => {
      if (!idCurso) return null;

      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          descripcion,
          estado,
          id_iglesia,
          id_ministerio,
          id_usuario_creador,
          creado_en,
          updated_at,
          usuario_creador:id_usuario_creador(id_usuario, nombres, apellidos),
          iglesia:id_iglesia(id_iglesia, nombre),
          ministerio:id_ministerio(id_ministerio, nombre),
          inscripciones:aula_inscripcion(
            id_usuario,
            inscrito_en,
            activo,
            usuario:id_usuario(id_usuario, nombres, apellidos, correo)
          )
        `)
        .eq('id_aula_curso', idCurso)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: idCurso !== undefined,
  });
}

export function useEditCurso(idCurso: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { titulo: string; descripcion: string | null; estado: 'borrador' | 'activo' | 'archivado' }) => {
      const { data, error } = await supabase
        .from('aula_curso')
        .update({
          titulo: params.titulo,
          descripcion: params.descripcion,
          estado: params.estado,
          updated_at: new Date().toISOString(),
        })
        .eq('id_aula_curso', idCurso)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curso-detalle', idCurso] });
      queryClient.invalidateQueries({ queryKey: ['cursos-global'] });
      queryClient.invalidateQueries({ queryKey: ['cursos-ministerio'] });
      toast.success('Curso actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar curso: ${error.message}`);
    },
  });
}

export function useManageEnrollments(idCurso: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { action: 'add' | 'remove'; idUsuario: number }) => {
      if (params.action === 'add') {
        // Check if already enrolled
        const { data: existing } = await supabase
          .from('aula_inscripcion')
          .select('id_aula_inscripcion')
          .eq('id_aula_curso', idCurso)
          .eq('id_usuario', params.idUsuario)
          .single();

        if (existing) {
          throw new Error('Usuario ya está inscrito en este curso');
        }

        const { data, error } = await supabase
          .from('aula_inscripcion')
          .insert({
            id_aula_curso: idCurso,
            id_usuario: params.idUsuario,
            inscrito_en: new Date().toISOString(),
            activo: true,
          })
          .select();

        if (error) throw error;
        return data;
      } else {
        // Remove
        const { error } = await supabase
          .from('aula_inscripcion')
          .delete()
          .eq('id_aula_curso', idCurso)
          .eq('id_usuario', params.idUsuario);

        if (error) throw error;
        return null;
      }
    },
    onSuccess: (data, params) => {
      queryClient.invalidateQueries({ queryKey: ['curso-detalle', idCurso] });
      if (params.action === 'add') {
        toast.success('Usuario agregado al curso');
      } else {
        toast.success('Usuario removido del curso');
      }
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
