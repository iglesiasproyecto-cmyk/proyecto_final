import { Button } from '@/app/components/ui/button'
import { useCanApproveTask } from '@/hooks/useTaskPermissions'
import type { TareaEnriquecida } from '@/services/eventos.service'
import { CheckCircle2, XCircle } from 'lucide-react'

interface TaskApprovalSectionProps {
  task: TareaEnriquecida
  onApprove?: () => void
  onReject?: () => void
  isLoading?: boolean
}

export function TaskApprovalSection({
  task,
  onApprove,
  onReject,
  isLoading = false,
}: TaskApprovalSectionProps) {
  const canApprove = useCanApproveTask()

  // Only render if in revision AND user can approve
  if (task.estado !== 'en_revision' || !canApprove) {
    return null
  }

  return (
    <div className="border-t border-white/10 pt-4 mt-4">
      <h3 className="text-sm font-semibold mb-3 text-white/80">Aprobar o Rechazar</h3>
      <div className="flex gap-2">
        <Button
          onClick={onApprove}
          disabled={isLoading}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Aprobar
        </Button>
        <Button
          onClick={onReject}
          disabled={isLoading}
          variant="destructive"
          className="flex-1"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Rechazar
        </Button>
      </div>
    </div>
  )
}
