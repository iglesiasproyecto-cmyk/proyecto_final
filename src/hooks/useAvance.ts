import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  marcarModuloCompletado,
  desmarcarModuloCompletado,
  getAvancesDeDetalle,
  getAvanceCursoByUsuario,
  finalizarCicloCurso,
} from '@/services/avance.service'

export function useAvancesDetalle(idDetalle: number | null | undefined) {
  return useQuery({
    queryKey: ['avance-detalle', idDetalle],
    queryFn: () => getAvancesDeDetalle(idDetalle as number),
    enabled: !!idDetalle,
    staleTime: 30 * 1000,
  })
}

export function useMiAvanceCurso(idUsuario: number | null | undefined) {
  return useQuery({
    queryKey: ['avance-curso', idUsuario],
    queryFn: () => getAvanceCursoByUsuario(idUsuario as number),
    enabled: !!idUsuario,
    staleTime: 30 * 1000,
  })
}

export function useMarcarModuloCompletado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: marcarModuloCompletado,
    onSuccess: async (_d, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['avance-detalle', vars.idDetalleProcesoCurso] }),
        qc.invalidateQueries({ queryKey: ['avance-curso', vars.idUsuario] }),
        qc.invalidateQueries({ queryKey: ['mis-inscripciones'] }),
      ])
    },
  })
}

export function useDesmarcarModuloCompletado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { idAvance: number; idDetalleProcesoCurso: number; idUsuario: number }) =>
      desmarcarModuloCompletado(vars.idAvance),
    onSuccess: async (_d, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['avance-detalle', vars.idDetalleProcesoCurso] }),
        qc.invalidateQueries({ queryKey: ['avance-curso', vars.idUsuario] }),
        qc.invalidateQueries({ queryKey: ['mis-inscripciones'] }),
      ])
    },
  })
}

export function useFinalizarCiclo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idProceso: number) => finalizarCicloCurso(idProceso),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['detalles-proceso'] }),
        qc.invalidateQueries({ queryKey: ['mis-inscripciones'] }),
        qc.invalidateQueries({ queryKey: ['avance-curso'] }),
        qc.invalidateQueries({ queryKey: ['procesos-curso'] }),
        qc.invalidateQueries({ queryKey: ['cursos-enriquecidos'] }),
      ])
    },
  })
}
