import React, { useState } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import type { MinisterioEnriquecido } from '@/services/ministerios.service'

export const ESTADOS = ['pendiente', 'en_progreso', 'en_revision', 'completada', 'cancelada', 'archived']
export const PRIORIDADES = ['baja', 'media', 'alta', 'urgente']

interface TasksFilterProps {
  ministerios: MinisterioEnriquecido[]
  onFilterChange: (filters: {
    busqueda?: string
    idMinisterio?: number
    estado?: string
    prioridad?: string
  }) => void
  isLoading?: boolean
}

export function TasksFilter({ ministerios, onFilterChange, isLoading = false }: TasksFilterProps) {
  const [busqueda, setBusqueda] = useState('')
  const [idMinisterio, setIdMinisterio] = useState<number | undefined>()
  const [estado, setEstado] = useState<string | undefined>()
  const [prioridad, setPrioridad] = useState<string | undefined>()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const hasActiveFilters = busqueda || idMinisterio || estado || prioridad

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBusqueda(value)
    onFilterChange({
      busqueda: value || undefined,
      idMinisterio,
      estado,
      prioridad,
    })
  }

  const handleMinisterioChange = (value: string) => {
    const numValue = value ? Number(value) : undefined
    setIdMinisterio(numValue)
    onFilterChange({
      busqueda: busqueda || undefined,
      idMinisterio: numValue,
      estado,
      prioridad,
    })
  }

  const handleEstadoChange = (value: string) => {
    setEstado(value || undefined)
    onFilterChange({
      busqueda: busqueda || undefined,
      idMinisterio,
      estado: value || undefined,
      prioridad,
    })
  }

  const handlePrioridadChange = (value: string) => {
    setPrioridad(value || undefined)
    onFilterChange({
      busqueda: busqueda || undefined,
      idMinisterio,
      estado,
      prioridad: value || undefined,
    })
  }

  const handleClear = () => {
    setBusqueda('')
    setIdMinisterio(undefined)
    setEstado(undefined)
    setPrioridad(undefined)
    setShowAdvanced(false)
    onFilterChange({})
  }

  return (
    <div className="p-4 rounded-2xl bg-card/40 border border-white/5">
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tareas..."
            value={busqueda}
            onChange={handleSearchChange}
            disabled={isLoading}
            className="pl-9 h-9 bg-background/50 border-white/10 rounded-xl text-xs"
          />
        </div>

        {/* Advanced Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={isLoading}
          className="h-9 px-3 rounded-xl border-white/10"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </Button>

        {/* Clear Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={isLoading}
            className="h-9 px-2"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Ministerio Select */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Ministerio
            </label>
            <Select
              value={idMinisterio?.toString() || ''}
              onValueChange={handleMinisterioChange}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background/50 border-white/10">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {ministerios.map((m) => (
                  <SelectItem key={m.idMinisterio} value={m.idMinisterio.toString()}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado Select */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Estado
            </label>
            <Select
              value={estado || ''}
              onValueChange={handleEstadoChange}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background/50 border-white/10">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e.charAt(0).toUpperCase() + e.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridad Select */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Prioridad
            </label>
            <Select
              value={prioridad || ''}
              onValueChange={handlePrioridadChange}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background/50 border-white/10">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {PRIORIDADES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
