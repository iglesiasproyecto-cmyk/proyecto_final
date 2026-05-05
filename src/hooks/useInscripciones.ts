import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getInscripcionesCurso,
  inscribirUsuariosCurso,
  retirarInscripcion,
  reactivarInscripcion,
  getCandidatosInscripcionCurso,
} from '@/services/inscripciones.service'

export function useInscripcionesCurso(idAulaCurso?: number) {
  return useQuery({
    queryKey: ['aula-inscripciones', idAulaCurso],
    queryFn: () => getInscripcionesCurso(idAulaCurso!),
    enabled: !!idAulaCurso,
  })
}

export function useCandidatosInscripcionCurso(idAulaCurso?: number) {
  return useQuery({
    queryKey: ['aula-candidatos-inscripcion', idAulaCurso],
    queryFn: () => getCandidatosInscripcionCurso(idAulaCurso!),
    enabled: !!idAulaCurso,
  })
}

export function useInscribirUsuariosCurso() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      idAulaCurso,
      userIds,
    }: {
      idAulaCurso: number
      userIds: number[]
    }) => inscribirUsuariosCurso(idAulaCurso, userIds),

    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['aula-inscripciones', variables.idAulaCurso],
      })

      qc.invalidateQueries({
        queryKey: ['aula-candidatos-inscripcion', variables.idAulaCurso],
      })

      qc.invalidateQueries({
        queryKey: ['aula-cursos'],
      })

      qc.invalidateQueries({
        queryKey: ['cursos-servidor'],
      })
    },
  })
}

export function useRetirarInscripcion() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: retirarInscripcion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aula-inscripciones'] })
      qc.invalidateQueries({ queryKey: ['cursos-servidor'] })
    },
  })
}

export function useReactivarInscripcion() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: reactivarInscripcion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aula-inscripciones'] })
      qc.invalidateQueries({ queryKey: ['cursos-servidor'] })
    },
  })
}
