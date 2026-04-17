import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getModulo, updateModuloContenido } from '@/services/cursos.service'

export function useModulo(idModulo: number | null | undefined) {
  return useQuery({
    queryKey: ['modulo', idModulo],
    queryFn: () => getModulo(idModulo as number),
    enabled: !!idModulo,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUpdateModuloContenido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { idModulo: number; idCurso: number; contenidoMd: string | null }) =>
      updateModuloContenido(vars.idModulo, vars.contenidoMd),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['modulo', vars.idModulo] }),
        qc.invalidateQueries({ queryKey: ['modulos', vars.idCurso] }),
      ])
    },
  })
}
