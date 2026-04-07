import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCursos, getModulos, getRecursos, getEvaluaciones,
  getProcesosAsignadoCurso, getDetallesProcesoCurso,
  getCursosEnriquecidos, getEvaluacionesEnriquecidas,
  createCurso, createModulo,
  updateCurso, deleteCurso, updateModulo, deleteModulo,
  createEvaluacion, updateEvaluacion,
  createRecurso, updateRecurso, deleteRecurso,
  updateProcesoAsignadoCurso,
  deleteEvaluacion, deleteProcesoAsignadoCurso,
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

export function useCursosEnriquecidos(idSede?: number) {
  return useQuery({
    queryKey: ['cursos-enriquecidos', idSede],
    queryFn: () => getCursosEnriquecidos(idSede),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEvaluacionesEnriquecidas(idModulo?: number) {
  return useQuery({
    queryKey: ['evaluaciones-enriquecidas', idModulo],
    queryFn: () => getEvaluacionesEnriquecidas(idModulo),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCurso,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cursos'] }),
  })
}

export function useCreateModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createModulo,
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['modulos', variables.idCurso] }),
  })
}

export function useDeleteEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEvaluacion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluaciones'] }),
  })
}

export function useDeleteProcesoAsignadoCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProcesoAsignadoCurso(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procesos-curso'] }),
  })
}

export function useUpdateCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateCurso>[1] }) =>
      updateCurso(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cursos'] })
      qc.invalidateQueries({ queryKey: ['cursos-enriquecidos'] })
    },
  })
}

export function useDeleteCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCurso(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cursos'] })
      qc.invalidateQueries({ queryKey: ['cursos-enriquecidos'] })
    },
  })
}

export function useUpdateModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateModulo>[1] }) =>
      updateModulo(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modulos'] })
      qc.invalidateQueries({ queryKey: ['cursos-enriquecidos'] })
    },
  })
}

export function useDeleteModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteModulo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modulos'] })
      qc.invalidateQueries({ queryKey: ['cursos-enriquecidos'] })
    },
  })
}

export function useCreateEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createEvaluacion>[0]) => createEvaluacion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluaciones'] })
      qc.invalidateQueries({ queryKey: ['evaluaciones-enriquecidas'] })
    },
  })
}

export function useUpdateEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateEvaluacion>[1] }) =>
      updateEvaluacion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluaciones'] })
      qc.invalidateQueries({ queryKey: ['evaluaciones-enriquecidas'] })
    },
  })
}

export function useCreateRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createRecurso>[0]) => createRecurso(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recursos'] })
    },
  })
}

export function useUpdateRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateRecurso>[1] }) =>
      updateRecurso(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recursos'] })
    },
  })
}

export function useDeleteRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteRecurso(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recursos'] })
    },
  })
}

export function useUpdateProcesoAsignadoCurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateProcesoAsignadoCurso>[1] }) =>
      updateProcesoAsignadoCurso(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procesos-curso'] })
    },
  })
}
