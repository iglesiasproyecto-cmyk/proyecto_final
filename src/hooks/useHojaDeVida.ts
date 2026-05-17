import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as hojaDeVidaService from '@/services/hojaDeVida.service';
import { supabase } from '@/lib/supabaseClient';

export interface UseHojaDeVidaState {
  hoja: hojaDeVidaService.HojaDeVidaCompleta | null;
  loading: boolean;
  error: string | null;
  isUpdating: boolean;
}

/**
 * Hook para manejar la hoja de vida del usuario actual
 */
export function useHojaDeVida() {
  const [state, setState] = useState<UseHojaDeVidaState>({
    hoja: null,
    loading: true,
    error: null,
    isUpdating: false,
  });

  // Fetch hoja de vida actual
  const fetchHojaDeVida = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const hoja = await hojaDeVidaService.getHojaDeVidaActual();

      if (!hoja) {
        setState((prev) => ({ ...prev, loading: false, hoja: null }));
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        hoja: hoja as hojaDeVidaService.HojaDeVidaCompleta,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error fetching hoja de vida',
      }));
    }
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    fetchHojaDeVida();

    const currentId = state.hoja?.id_usuario;
    if (!currentId) return;

    // Subscribe to realtime updates scoped to the current user
    const newChannel = supabase
      .channel(`hoja_de_vida_usuario_${currentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hoja_de_vida',
          filter: `id_usuario=eq.${currentId}`,
        },
        () => {
          fetchHojaDeVida();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(newChannel);
    };
  }, [fetchHojaDeVida, state.hoja?.id_usuario]);

  // Update hoja de vida
  const actualizarHoja = useCallback(
    async (datos: hojaDeVidaService.HojaDeVidaUpdate) => {
      if (!state.hoja) return null;

      try {
        setState((prev) => ({ ...prev, isUpdating: true, error: null }));
        const updated = await hojaDeVidaService.actualizarHojaDeVida(
          state.hoja.id_hoja_de_vida,
          datos
        );

        if (updated) {
          // Refetch to get complete data with certificados
          await fetchHojaDeVida();
        }

        return updated;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error updating hoja de vida';
        setState((prev) => ({ ...prev, error: errorMsg }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isUpdating: false }));
      }
    },
    [state.hoja, fetchHojaDeVida]
  );

  // Mark as complete
  const marcarCompleta = useCallback(async () => {
    if (!state.hoja) return null;

    try {
      setState((prev) => ({ ...prev, isUpdating: true, error: null }));
      const updated = await hojaDeVidaService.marcarComoCompleta(state.hoja.id_hoja_de_vida);

      if (updated) {
        await fetchHojaDeVida();
      }

      return updated;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error marking as complete';
      setState((prev) => ({ ...prev, error: errorMsg }));
      return null;
    } finally {
      setState((prev) => ({ ...prev, isUpdating: false }));
    }
  }, [state.hoja, fetchHojaDeVida]);

  // Add habilidad
  const agregarHabilidad = useCallback(
    async (habilidad: hojaDeVidaService.Habilidad) => {
      if (!state.hoja) return null;

      try {
        setState((prev) => ({ ...prev, isUpdating: true, error: null }));
        const updated = await hojaDeVidaService.agregarHabilidad(
          state.hoja.id_hoja_de_vida,
          habilidad
        );

        if (updated) {
          await fetchHojaDeVida();
        }

        return updated;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error adding habilidad';
        setState((prev) => ({ ...prev, error: errorMsg }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isUpdating: false }));
      }
    },
    [state.hoja, fetchHojaDeVida]
  );

  // Update habilidad
  const actualizarHabilidad = useCallback(
    async (index: number, habilidad: hojaDeVidaService.Habilidad) => {
      if (!state.hoja) return null;

      try {
        setState((prev) => ({ ...prev, isUpdating: true, error: null }));
        const updated = await hojaDeVidaService.actualizarHabilidad(
          state.hoja.id_hoja_de_vida,
          index,
          habilidad
        );

        if (updated) {
          await fetchHojaDeVida();
        }

        return updated;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error updating habilidad';
        setState((prev) => ({ ...prev, error: errorMsg }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isUpdating: false }));
      }
    },
    [state.hoja, fetchHojaDeVida]
  );

  // Delete habilidad
  const eliminarHabilidad = useCallback(
    async (index: number) => {
      if (!state.hoja) return null;

      try {
        setState((prev) => ({ ...prev, isUpdating: true, error: null }));
        const updated = await hojaDeVidaService.eliminarHabilidad(
          state.hoja.id_hoja_de_vida,
          index
        );

        if (updated) {
          await fetchHojaDeVida();
        }

        return updated;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error deleting habilidad';
        setState((prev) => ({ ...prev, error: errorMsg }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isUpdating: false }));
      }
    },
    [state.hoja, fetchHojaDeVida]
  );

  // Add formación académica
  const agregarFormacion = useCallback(
    async (formacion: hojaDeVidaService.FormacionAcademica) => {
      if (!state.hoja) return null;

      try {
        setState((prev) => ({ ...prev, isUpdating: true, error: null }));
        const updated = await hojaDeVidaService.agregarFormacionAcademica(
          state.hoja.id_hoja_de_vida,
          formacion
        );

        if (updated) {
          await fetchHojaDeVida();
        }

        return updated;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error adding formación';
        setState((prev) => ({ ...prev, error: errorMsg }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isUpdating: false }));
      }
    },
    [state.hoja, fetchHojaDeVida]
  );

  return {
    ...state,
    fetchHojaDeVida,
    actualizarHoja,
    marcarCompleta,
    agregarHabilidad,
    actualizarHabilidad,
    eliminarHabilidad,
    agregarFormacion,
  };
}

/**
 * Hook para obtener la hoja de vida de un usuario específico
 */
export function useHojaDeVidaPorUsuario(idUsuario: number | null) {
  const [state, setState] = useState<UseHojaDeVidaState>({
    hoja: null,
    loading: true,
    error: null,
    isUpdating: false,
  });

  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const fetchHoja = useCallback(async () => {
    if (!idUsuario) {
      setState((prev) => ({ ...prev, loading: false, hoja: null }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const hoja = await hojaDeVidaService.getHojaDeVidaPorUsuario(idUsuario);

      setState((prev) => ({
        ...prev,
        loading: false,
        hoja: hoja as hojaDeVidaService.HojaDeVidaCompleta | null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error fetching hoja de vida',
      }));
    }
  }, [idUsuario]);

  useEffect(() => {
    fetchHoja();

    // Subscribe to realtime updates
    const newChannel = supabase
      .channel(`hoja_de_vida_usuario_${idUsuario}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hoja_de_vida',
          filter: `id_usuario=eq.${idUsuario}`,
        },
        () => {
          fetchHoja();
        }
      )
      .subscribe();

    setChannel(newChannel);

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [idUsuario, fetchHoja]);

  return state;
}

// ── TanStack Query hooks para Perfil Profesional v2 ──

export function usePerfilProfesionalCompletaV2() {
  return useQuery({
    queryKey: ['perfil-profesional-v2', 'me'],
    queryFn: () => hojaDeVidaService.getPerfilProfesionalCompletaV2(),
    staleTime: 2 * 60 * 1000,
  })
}

export function usePerfilProfesionalCompletaV2PorUsuario(idUsuario: number | null | undefined) {
  return useQuery({
    queryKey: ['perfil-profesional-v2', idUsuario],
    queryFn: () => hojaDeVidaService.getPerfilProfesionalCompletaV2PorUsuario(idUsuario!),
    enabled: !!idUsuario,
    staleTime: 2 * 60 * 1000,
  })
}

export function useListarPerfilesProfesionalesScoped(filtros?: Parameters<typeof hojaDeVidaService.listarPerfilesProfesionalesScoped>[0]) {
  return useQuery({
    queryKey: ['perfiles-profesionales-scoped', filtros],
    queryFn: () => hojaDeVidaService.listarPerfilesProfesionalesScoped(filtros),
    staleTime: 2 * 60 * 1000,
  })
}

export function useEtiquetasPerfil() {
  return useQuery({
    queryKey: ['etiquetas-perfil'],
    queryFn: hojaDeVidaService.getEtiquetas,
    staleTime: 10 * 60 * 1000,
  })
}

export function useCrearRevision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hojaDeVidaService.crearRevision,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['perfil-profesional-v2', variables.idHojaDeVida] })
      qc.invalidateQueries({ queryKey: ['perfiles-profesionales-scoped'] })
    },
  })
}

export function useAsignarEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hojaDeVidaService.asignarEtiqueta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil-profesional-v2'] })
      qc.invalidateQueries({ queryKey: ['perfiles-profesionales-scoped'] })
    },
  })
}

export function useRemoverEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hojaDeVidaService.removerEtiqueta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil-profesional-v2'] })
      qc.invalidateQueries({ queryKey: ['perfiles-profesionales-scoped'] })
    },
  })
}

export function useUpsertDisponibilidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hojaDeVidaService.upsertDisponibilidad,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil-profesional-v2'] })
    },
  })
}
