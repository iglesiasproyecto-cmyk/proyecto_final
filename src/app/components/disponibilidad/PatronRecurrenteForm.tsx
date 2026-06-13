// src/app/components/disponibilidad/PatronRecurrenteForm.tsx
import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import type { DisponibilidadRegla } from '@/types/app.types'

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const SEMANAS = [
  { label: '1ª semana', value: 1 },
  { label: '2ª semana', value: 2 },
  { label: '3ª semana', value: 3 },
  { label: '4ª semana', value: 4 },
  { label: 'Última semana', value: -1 },
]

interface Props {
  onSave: (data: Pick<DisponibilidadRegla, 'tipo' | 'patron' | 'nota'>) => void
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

export function PatronRecurrenteForm({ onSave, onCancel, isSaving }: Props) {
  const [tipoPatron, setTipoPatron] = useState<'semanal' | 'mensual'>('semanal')
  const [diasSemana, setDiasSemana] = useState<number[]>([])
  const [semanaDelMes, setSemanaDelMes] = useState<number>(1)
  const [nota, setNota] = useState('')

  function toggleDia(d: number) {
    setDiasSemana(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function handleSave() {
    if (diasSemana.length === 0) return
    onSave({
      tipo: 'recurrente',
      patron: tipoPatron === 'semanal'
        ? { tipo: 'semanal', diasSemana }
        : { tipo: 'mensual', semanaDelMes, diasSemana },
      nota: nota.trim() || undefined,
    })
  }

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-background/50 border border-white/10">
      {/* Tipo */}
      <div>
        <FieldLabel>Tipo de repetición</FieldLabel>
        <div className="flex gap-2">
          {(['semanal', 'mensual'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipoPatron(t)}
              className={`flex-1 h-9 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                tipoPatron === t
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-background/30 border-white/5 text-muted-foreground hover:border-white/20'
              }`}
            >
              {t === 'semanal' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
        </div>
      </div>

      {/* Semana del mes (solo mensual) */}
      {tipoPatron === 'mensual' && (
        <div>
          <FieldLabel>Semana del mes</FieldLabel>
          <select
            value={semanaDelMes}
            onChange={e => setSemanaDelMes(Number(e.target.value))}
            className="w-full h-9 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80"
          >
            {SEMANAS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {/* Días de la semana */}
      <div>
        <FieldLabel>Días</FieldLabel>
        <div className="flex gap-1.5 flex-wrap">
          {DIAS.map((d, i) => (
            <button
              key={i}
              onClick={() => toggleDia(i)}
              className={`w-10 h-10 rounded-xl border text-xs font-bold transition-all ${
                diasSemana.includes(i)
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-background/30 border-white/5 text-muted-foreground hover:border-white/20'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        {diasSemana.length === 0 && (
          <p className="text-[10px] text-rose-400 mt-1">Selecciona al menos un día</p>
        )}
      </div>

      {/* Nota */}
      <div>
        <FieldLabel>Motivo <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span></FieldLabel>
        <Input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Ej: Trabajo, Estudio..."
          className="h-9 bg-background/50 border-white/10 rounded-xl text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" className="rounded-xl" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={diasSemana.length === 0 || isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar patrón'}
        </Button>
      </div>
    </div>
  )
}
