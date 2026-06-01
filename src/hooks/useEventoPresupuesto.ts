import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getItemsByEvento,
  getItemsByIglesia,
  createItem,
  updateItem,
  deleteItem,
  type CreateItemPayload,
  type UpdateItemPayload,
  type ResumenFilters,
} from '@/services/evento-presupuesto.service'
import { toast } from 'sonner'

export function useEventoPresupuestoItems(idEvento?: number) {
  return useQuery({
    queryKey: ['presupuesto-items', idEvento],
    queryFn: () => getItemsByEvento(idEvento!),
    enabled: !!idEvento,
    staleTime: 60 * 1000,
  })
}

export function usePresupuestoResumenIglesia(idIglesia?: number, filters?: ResumenFilters) {
  return useQuery({
    queryKey: ['presupuesto-iglesia', idIglesia, filters],
    queryFn: () => getItemsByIglesia(idIglesia!, filters),
    enabled: !!idIglesia,
    staleTime: 60 * 1000,
  })
}

export function useCreatePresupuestoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateItemPayload) => createItem(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['presupuesto-items', variables.idEvento] })
      qc.invalidateQueries({ queryKey: ['presupuesto-iglesia'] })
      toast.success('Ítem agregado')
    },
    onError: () => toast.error('Error al agregar el ítem'),
  })
}

export function useUpdatePresupuestoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; idEvento: number; payload: UpdateItemPayload }) =>
      updateItem(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['presupuesto-items', variables.idEvento] })
      qc.invalidateQueries({ queryKey: ['presupuesto-iglesia'] })
      toast.success('Ítem actualizado')
    },
    onError: () => toast.error('Error al actualizar el ítem'),
  })
}

export function useDeletePresupuestoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: number; idEvento: number }) => deleteItem(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['presupuesto-items', variables.idEvento] })
      qc.invalidateQueries({ queryKey: ['presupuesto-iglesia'] })
      toast.success('Ítem eliminado')
    },
    onError: () => toast.error('Error al eliminar el ítem'),
  })
}
