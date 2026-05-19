import type { Sede } from '@/types/app.types'
import type { MinisterioEnriquecido } from '@/services/ministerios.service'
import { useApp } from '@/app/store/AppContext'

interface SedeMinisterioSelectorProps {
  sedes: Sede[]
  ministerios: MinisterioEnriquecido[]
  selectedSedeId: number
  selectedMinisterioId: number
  onSedeChange: (idSede: number, clearMinisterio: boolean) => void
  onMinisterioChange: (idMinisterio: number, autoSedeId: number) => void
  sedeReadOnly?: boolean
  ministerioReadOnly?: boolean
  allowNoMinisterio?: boolean
  allowGeneral?: boolean
}

function GlassSelect({
  value,
  onChange,
  disabled,
  children,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className={`w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {children}
    </select>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
      {children}
    </label>
  )
}

export function SedeMinisterioSelector({
  sedes,
  ministerios,
  selectedSedeId,
  selectedMinisterioId,
  onSedeChange,
  onMinisterioChange,
  sedeReadOnly = false,
  ministerioReadOnly = false,
  allowNoMinisterio = false,
  allowGeneral = false,
}: SedeMinisterioSelectorProps) {
  const { rolActual } = useApp()

  const filteredMinisterios = selectedSedeId
    ? ministerios.filter((m) => m.idSede === selectedSedeId)
    : ministerios

  const handleSedeChange = (v: number) => {
    const ministerioStillValid =
      v === 0 ||
      ministerios.find((m) => m.idMinisterio === selectedMinisterioId)?.idSede === v
    onSedeChange(v, !ministerioStillValid)
  }

  const handleMinisterioChange = (v: number) => {
    const selected = ministerios.find((m) => m.idMinisterio === v)
    const autoSedeId = v !== 0 && selected?.idSede ? selected.idSede : selectedSedeId
    onMinisterioChange(v, autoSedeId)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <FieldLabel>
          Sede{' '}
          {!sedeReadOnly && (
            <span className="normal-case tracking-normal font-normal text-muted-foreground/50">
              (opcional)
            </span>
          )}
        </FieldLabel>
        {sedeReadOnly ? (
          <div className="flex h-11 items-center rounded-xl border border-white/5 bg-background/30 px-3 text-sm text-muted-foreground justify-between">
            <span>{sedes.find((s) => s.idSede === selectedSedeId)?.nombre ?? '—'}</span>
            <span className="text-[10px] text-muted-foreground/50">🔒</span>
          </div>
        ) : (
          <GlassSelect value={selectedSedeId} onChange={handleSedeChange}>
            {allowGeneral && <option value={0}>General (toda la iglesia)</option>}
            {!allowGeneral && <option value={0}>Seleccionar sede...</option>}
            {sedes.map((s) => (
              <option key={s.idSede} value={s.idSede}>
                {s.nombre}
              </option>
            ))}
          </GlassSelect>
        )}
      </div>

      <div>
        <FieldLabel>
          Ministerio{' '}
          {allowNoMinisterio && (
            <span className="normal-case tracking-normal font-normal text-muted-foreground/50">
              (opcional)
            </span>
          )}
        </FieldLabel>
        {ministerioReadOnly ? (
          <div className="flex h-11 items-center rounded-xl border border-white/5 bg-background/30 px-3 text-sm text-muted-foreground justify-between">
            <span>
              {ministerios.find((m) => m.idMinisterio === selectedMinisterioId)?.nombre ?? '—'}
            </span>
            <span className="text-[10px] text-muted-foreground/50">🔒</span>
          </div>
        ) : (
          <GlassSelect value={selectedMinisterioId} onChange={handleMinisterioChange}>
            {allowNoMinisterio && <option value={0}>Sin ministerio...</option>}
            {!allowNoMinisterio && <option value={0}>Seleccionar ministerio...</option>}
            {filteredMinisterios.map((m) => (
              <option key={m.idMinisterio} value={m.idMinisterio}>
                {m.nombre}
              </option>
            ))}
          </GlassSelect>
        )}
      </div>
    </div>
  )
}
