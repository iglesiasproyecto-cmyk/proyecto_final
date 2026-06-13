// src/app/components/disponibilidad/ReglaForm.tsx
import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import type { DisponibilidadRegla } from '@/types/app.types'

interface Props {
  initialDate?: string   // 'YYYY-MM-DD'
  onSave: (data: Pick<DisponibilidadRegla, 'tipo' | 'fecha' | 'fechaFin' | 'nota'>) => void
  onCancel: () => void
  isSaving?: boolean
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
      {children}
    </label>
  )
}

export function ReglaForm({ initialDate, onSave, onCancel, isSaving }: Props) {
  const [fecha, setFecha] = useState(initialDate ?? '')
  const [usarRango, setUsarRango] = useState(false)
  const [fechaFin, setFechaFin] = useState('')
  const [nota, setNota] = useState('')

  function handleSave() {
    if (!fecha) return
    onSave({
      tipo: 'fecha_especifica',
      fecha,
      fechaFin: usarRango && fechaFin ? fechaFin : undefined,
      nota: nota.trim() || undefined,
    })
  }

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-background/50 border border-white/10">
      <div>
        <FieldLabel>Fecha</FieldLabel>
        <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="h-9 bg-background/50 border-white/10 rounded-xl text-sm" />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={usarRango}
          onChange={e => setUsarRango(e.target.checked)}
          className="rounded"
        />
        <span className="text-xs text-muted-foreground">Es un rango de días</span>
      </label>

      {usarRango && (
        <div>
          <FieldLabel>Fecha fin</FieldLabel>
          <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            min={fecha}
            className="h-9 bg-background/50 border-white/10 rounded-xl text-sm" />
        </div>
      )}

      <div>
        <FieldLabel>Motivo <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span></FieldLabel>
        <Input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Ej: Trabajo, Viaje, Médico..."
          className="h-9 bg-background/50 border-white/10 rounded-xl text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" className="rounded-xl" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={!fecha || isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
