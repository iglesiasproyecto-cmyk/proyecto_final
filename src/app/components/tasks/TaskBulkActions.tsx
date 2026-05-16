import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Archive, X } from 'lucide-react'

const ESTADOS = ['pendiente', 'en_progreso', 'en_revision', 'completada', 'cancelada'] as const

interface TaskBulkActionsProps {
  selectedCount: number
  onBulkUpdateEstado?: (estado: string) => void
  onBulkArchive?: () => void
  onClearSelection: () => void
  isLoading?: boolean
}

export function TaskBulkActions({
  selectedCount,
  onBulkUpdateEstado,
  onBulkArchive,
  onClearSelection,
  isLoading = false,
}: TaskBulkActionsProps) {
  // Return null if no selections
  if (selectedCount === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Count Badge */}
          <Badge variant="secondary" className="whitespace-nowrap">
            {selectedCount} seleccionadas
          </Badge>

          {/* Estado Dropdown */}
          {onBulkUpdateEstado && (
            <Select onValueChange={onBulkUpdateEstado} disabled={isLoading}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Cambiar estado..." />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado.replace('_', ' ').charAt(0).toUpperCase() + estado.replace('_', ' ').slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Archive Button */}
          {onBulkArchive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onBulkArchive}
              disabled={isLoading}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archivar
            </Button>
          )}

          {/* Clear Selection Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isLoading}
            className="ml-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Limpiar
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
