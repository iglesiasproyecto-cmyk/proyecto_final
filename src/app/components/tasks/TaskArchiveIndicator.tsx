import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/app/components/ui/button'
import { Archive } from 'lucide-react'

interface TaskArchiveIndicatorProps {
  archivedAt?: string | null
  onUnarchive?: () => void
  isLoading?: boolean
}

export function TaskArchiveIndicator({
  archivedAt,
  onUnarchive,
  isLoading = false,
}: TaskArchiveIndicatorProps) {
  // Return null if not archived
  if (!archivedAt) {
    return null
  }

  const relativeDate = formatDistanceToNow(new Date(archivedAt), {
    locale: es,
    addSuffix: true,
  })

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-amber-400">
        <Archive className="w-4 h-4" />
        <span className="text-sm font-medium">Archivada {relativeDate}</span>
      </div>
      {onUnarchive && (
        <Button
          onClick={onUnarchive}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
        >
          Restaurar
        </Button>
      )}
    </div>
  )
}
