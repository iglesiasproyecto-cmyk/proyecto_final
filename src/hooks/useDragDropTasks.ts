import { useUpdateTareaEstado } from './useEventos'
import { toast } from 'sonner'

export function useDragDropTasks() {
  const updateEstadoMutation = useUpdateTareaEstado()

  const handleDropTask = (tareaId: number, nuevoEstado: string) => {
    updateEstadoMutation.mutate(
      { id: tareaId, estado: nuevoEstado },
      {
        onSuccess: () => {
          toast.success(`Tarea movida a ${nuevoEstado.replace('_', ' ')}`)
        },
        onError: (error: any) => {
          toast.error(`Error: ${error?.message || 'No se pudo actualizar'}`)
        }
      }
    )
  }

  return {
    handleDropTask,
    isUpdating: updateEstadoMutation.isPending
  }
}
