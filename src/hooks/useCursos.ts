import { useQuery } from '@tanstack/react-query'
import {
  getCursos, getModulos, getRecursos, getEvaluaciones,
  getProcesosAsignadoCurso, getDetallesProcesoCurso,
} from '@/services/cursos.service'

export function useCursos(idMinisterio?: number) {
  return useQuery({
    queryKey: ['cursos', idMinisterio],
    queryFn: () => getCursos(idMinisterio),
    staleTime: 5 * 60 * 1000,
  })
}

export function useModulos(idCurso: number) {
  return useQuery({
    queryKey: ['modulos', idCurso],
    queryFn: () => getModulos(idCurso),
    enabled: !!idCurso,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecursos(idModulo: number) {
  return useQuery({
    queryKey: ['recursos', idModulo],
    queryFn: () => getRecursos(idModulo),
    enabled: !!idModulo,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEvaluaciones(idUsuario?: number) {
  return useQuery({
    queryKey: ['evaluaciones', idUsuario],
    queryFn: () => getEvaluaciones(idUsuario),
    staleTime: 5 * 60 * 1000,
  })
}

export function useProcesosAsignadoCurso() {
  return useQuery({
    queryKey: ['procesos-curso'],
    queryFn: getProcesosAsignadoCurso,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDetallesProcesoCurso(idProceso: number) {
  return useQuery({
    queryKey: ['detalles-proceso', idProceso],
    queryFn: () => getDetallesProcesoCurso(idProceso),
    enabled: !!idProceso,
    staleTime: 5 * 60 * 1000,
  })
}
