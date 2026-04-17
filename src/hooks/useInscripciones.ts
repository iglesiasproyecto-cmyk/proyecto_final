import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEnrollmentCandidates,
  enrollUsers,
  retirarInscripcion,
  reactivarInscripcion,
  getCompanerosCiclo,
  getMisInscripciones,
} from '@/services/inscripciones.service'

export function useEnrollmentCandidates(idCiclo: number | null, overrideMinisterio: boolean) {
  return useQuery({
    queryKey: ['enrollment-candidates', idCiclo, overrideMinisterio],
    queryFn: () => getEnrollmentCandidates(idCiclo as number, overrideMinisterio),
    enabled: !!idCiclo,
    staleTime: 60 * 1000,
  })
}

export function useEnrollUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { idCiclo: number; userIds: number[]; overrideMinisterio: boolean }) =>
      enrollUsers(vars.idCiclo, vars.userIds, vars.overrideMinisterio),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['detalles-proceso', vars.idCiclo] }),
        qc.invalidateQueries({ queryKey: ['enrollment-candidates', vars.idCiclo] }),
        qc.invalidateQueries({ queryKey: ['mis-inscripciones'] }),
        qc.invalidateQueries({ queryKey: ['companeros-ciclo', vars.idCiclo] }),
      ])
    },
  })
}

export function useRetirarInscripcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idDetalle: number) => retirarInscripcion(idDetalle),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['detalles-proceso'] }),
        qc.invalidateQueries({ queryKey: ['mis-inscripciones'] }),
        qc.invalidateQueries({ queryKey: ['companeros-ciclo'] }),
      ])
    },
  })
}

export function useReactivarInscripcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idDetalle: number) => reactivarInscripcion(idDetalle),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['detalles-proceso'] }),
        qc.invalidateQueries({ queryKey: ['mis-inscripciones'] }),
        qc.invalidateQueries({ queryKey: ['companeros-ciclo'] }),
      ])
    },
  })
}

export function useCompanerosCiclo(idCiclo: number | null) {
  return useQuery({
    queryKey: ['companeros-ciclo', idCiclo],
    queryFn: () => getCompanerosCiclo(idCiclo as number),
    enabled: !!idCiclo,
    staleTime: 2 * 60 * 1000,
  })
}

export function useMisInscripciones(idUsuario: number | null | undefined) {
  return useQuery({
    queryKey: ['mis-inscripciones', idUsuario],
    queryFn: () => getMisInscripciones(idUsuario as number),
    enabled: !!idUsuario,
    staleTime: 2 * 60 * 1000,
  })
}
