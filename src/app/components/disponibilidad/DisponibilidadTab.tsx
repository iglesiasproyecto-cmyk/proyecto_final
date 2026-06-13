// src/app/components/disponibilidad/DisponibilidadTab.tsx
import { useState } from 'react'
import { Plus, Repeat2, Trash2, ToggleLeft, ToggleRight, CalendarX } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { toast } from 'sonner'
import { CalendarioMensual } from './CalendarioMensual'
import { ReglaForm } from './ReglaForm'
import { PatronRecurrenteForm } from './PatronRecurrenteForm'
import {
  useDisponibilidadUsuario,
  useCreateDisponibilidadRegla,
  useToggleDisponibilidadRegla,
  useDeleteDisponibilidadRegla,
  estaDisponible,
} from '@/hooks/useDisponibilidad'
import type { DisponibilidadRegla } from '@/types/app.types'

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const SEMANAS_LABEL: Record<number, string> = { 1:'1ª',2:'2ª',3:'3ª',4:'4ª',-1:'Última' }

interface Props {
  usuarioId: number
}

export function DisponibilidadTab({ usuarioId }: Props) {
  const [subTab, setSubTab] = useState<'fechas' | 'recurrentes'>('fechas')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showReglaForm, setShowReglaForm] = useState(false)
  const [showPatronForm, setShowPatronForm] = useState(false)

  const { data: reglas = [] } = useDisponibilidadUsuario(usuarioId)
  const createRegla = useCreateDisponibilidadRegla()
  const toggleRegla = useToggleDisponibilidadRegla()
  const deleteRegla = useDeleteDisponibilidadRegla()

  const pad = (n: number) => String(n).padStart(2, '0')
  const localDateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth()+1)}-${pad(selectedDate.getDate())}`
    : ''

  async function handleSaveRegla(data: Pick<DisponibilidadRegla, 'tipo' | 'fecha' | 'fechaFin' | 'nota'>) {
    try {
      await createRegla.mutateAsync({ ...data, usuarioId, activo: true })
      toast.success('Regla guardada')
      setShowReglaForm(false)
      setSelectedDate(null)
    } catch { toast.error('Error al guardar') }
  }

  async function handleSavePatron(data: Pick<DisponibilidadRegla, 'tipo' | 'patron' | 'nota'>) {
    try {
      await createRegla.mutateAsync({ ...data, usuarioId, activo: true })
      toast.success('Patrón guardado')
      setShowPatronForm(false)
    } catch { toast.error('Error al guardar') }
  }

  async function handleToggle(regla: DisponibilidadRegla) {
    try {
      await toggleRegla.mutateAsync({ id: regla.id, activo: !regla.activo })
    } catch { toast.error('Error al actualizar') }
  }

  async function handleDelete(id: number) {
    try {
      await deleteRegla.mutateAsync(id)
      toast.success('Regla eliminada')
    } catch { toast.error('Error al eliminar') }
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date)
    setShowReglaForm(true)
  }

  const reglasFecha = reglas.filter(r => r.tipo === 'fecha_especifica')
  const reglasRecurrentes = reglas.filter(r => r.tipo === 'recurrente')

  function describePatron(r: DisponibilidadRegla): string {
    if (!r.patron) return ''
    const dias = (r.patron.diasSemana ?? []).map(d => DIAS[d]).join(', ')
    if (r.patron.tipo === 'semanal') return `Todos los ${dias}`
    const sem = SEMANAS_LABEL[r.patron.semanaDelMes ?? 1]
    return `${sem} semana — ${dias}`
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(['fechas','recurrentes'] as const).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              subTab === t
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            {t === 'fechas' ? 'Fechas' : 'Recurrentes'}
          </button>
        ))}
      </div>

      {subTab === 'fechas' && (
        <div className="space-y-4">
          {/* Calendar */}
          <div className="p-4 rounded-2xl bg-background/30 border border-white/10">
            <CalendarioMensual
              onDayClick={handleDayClick}
              renderDay={({ date, isCurrentMonth }) => {
                if (!isCurrentMonth) return null
                const { disponible } = estaDisponible(usuarioId, date, reglas)
                if (disponible) return null
                return (
                  <div className="absolute inset-0 rounded-xl bg-rose-500/15 border border-rose-500/30 pointer-events-none" />
                )
              }}
            />
          </div>

          {/* Form on day click */}
          {showReglaForm && selectedDate && (
            <ReglaForm
              initialDate={localDateStr}
              onSave={handleSaveRegla}
              onCancel={() => { setShowReglaForm(false); setSelectedDate(null) }}
              isSaving={createRegla.isPending}
            />
          )}

          {/* List of specific-date rules */}
          {reglasFecha.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fechas marcadas</p>
              {reglasFecha.map(r => (
                <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${
                  r.activo ? 'bg-rose-500/5 border-rose-500/20' : 'bg-background/20 border-white/5 opacity-50'
                }`}>
                  <CalendarX className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">
                      {r.fecha}{r.fechaFin ? ` → ${r.fechaFin}` : ''}
                    </p>
                    {r.nota && <p className="text-[10px] text-muted-foreground truncate">{r.nota}</p>}
                  </div>
                  <button onClick={() => handleToggle(r)} className="shrink-0 text-muted-foreground hover:text-foreground">
                    {r.activo ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="shrink-0 text-muted-foreground hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showReglaForm && (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border-dashed border-white/20 text-muted-foreground hover:text-foreground"
              onClick={() => setShowReglaForm(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Marcar día como no disponible
            </Button>
          )}
        </div>
      )}

      {subTab === 'recurrentes' && (
        <div className="space-y-3">
          {reglasRecurrentes.length === 0 && !showPatronForm && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No hay patrones recurrentes. Agrega uno para no repetir el mismo día cada semana.
            </p>
          )}

          {reglasRecurrentes.map(r => (
            <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${
              r.activo ? 'bg-background/30 border-white/10' : 'bg-background/10 border-white/5 opacity-50'
            }`}>
              <Repeat2 className="w-4 h-4 text-primary/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">{describePatron(r)}</p>
                {r.nota && <p className="text-[10px] text-muted-foreground truncate">{r.nota}</p>}
              </div>
              <button onClick={() => handleToggle(r)} className="shrink-0 text-muted-foreground hover:text-foreground">
                {r.activo ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => handleDelete(r.id)} className="shrink-0 text-muted-foreground hover:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {showPatronForm ? (
            <PatronRecurrenteForm
              onSave={handleSavePatron}
              onCancel={() => setShowPatronForm(false)}
              isSaving={createRegla.isPending}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border-dashed border-white/20 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPatronForm(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Agregar patrón recurrente
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
