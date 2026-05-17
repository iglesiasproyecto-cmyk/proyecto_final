import { useQuery } from '@tanstack/react-query'
import {
  obtenerEvaluacionModulo,
  obtenerCertificadosUsuario,
} from '@/services/evaluaciones.service'

export function useEvaluacionModulo(idModulo?: number) {
  return useQuery({
    queryKey: ['evaluacion-modulo', idModulo],
    queryFn: () => obtenerEvaluacionModulo(idModulo!),
    enabled: !!idModulo,
  })
}

export function useCertificadosUsuario(idUsuario?: number) {
  return useQuery({
    queryKey: ['certificados-usuario', idUsuario],
    queryFn: () => obtenerCertificadosUsuario(idUsuario!),
    enabled: !!idUsuario,
    staleTime: 60 * 1000, // 1 minute
  })
}
