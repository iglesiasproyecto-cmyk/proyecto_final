import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { useEnrollmentCandidates, useEnrollUsers } from '@/hooks/useInscripciones'
import type { ProcesoAsignadoCurso } from '@/types/app.types'
import type { EnrollRow } from '@/services/inscripciones.service'
import { Search, Users } from 'lucide-react'
import { useApp } from '../../store/AppContext'

interface Props {
  ciclo: ProcesoAsignadoCurso
  cursoNombre: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onEnrolled?: (rows: EnrollRow[]) => void
}

export function EnrollmentPickerModal({ ciclo, cursoNombre, open, onOpenChange, onEnrolled }: Props) {
  const { rolActual } = useApp()
  const isAdmin = rolActual === 'super_admin' || rolActual === 'admin_iglesia'
  const [overrideMinisterio, setOverrideMinisterio] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const effectiveOverride = isAdmin ? overrideMinisterio : false

  const candidatesQuery = useEnrollmentCandidates(open ? ciclo.idProcesoAsignadoCurso : null, effectiveOverride)
  const enrollMutation = useEnrollUsers()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = candidatesQuery.data ?? []
    if (!q) return list
    return list.filter((c) => `${c.nombres} ${c.apellidos} ${c.correo}`.toLowerCase().includes(q))
  }, [candidatesQuery.data, query])

  const toggle = (idUsuario: number, disabled: boolean) => {
    if (disabled) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idUsuario)) next.delete(idUsuario)
      else next.add(idUsuario)
      return next
    })
  }

  const reset = () => {
    setSelected(new Set())
    setQuery('')
  }

  const confirm = () => {
    if (selected.size === 0) return
    enrollMutation.mutate(
      {
        idCiclo: ciclo.idProcesoAsignadoCurso,
        userIds: Array.from(selected),
        overrideMinisterio: effectiveOverride,
      },
      {
        onSuccess: (rows) => {
          onEnrolled?.(rows)
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-xl rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Inscribir a "{cursoNombre}"</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ciclo {new Date(ciclo.fechaInicio).toLocaleDateString('es')} - {new Date(ciclo.fechaFin).toLocaleDateString('es')}
          </p>
        </DialogHeader>

        {isAdmin && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 px-3 py-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Pool de candidatos</p>
              <p className="text-[11px] text-muted-foreground">
                {overrideMinisterio ? 'Cualquier usuario de la iglesia' : 'Solo miembros del ministerio'}
              </p>
            </div>
            <Button
              size="sm"
              className="h-8 rounded-lg text-xs bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-md shadow-blue-900/20"
              onClick={() => {
                setOverrideMinisterio((v) => !v)
                setSelected(new Set())
              }}
            >
              Cambiar
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="h-10 pl-9 bg-background/50 border-white/10 rounded-xl text-sm"
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded-xl border border-white/5 divide-y divide-border/30">
          {candidatesQuery.isLoading && (
            <div className="py-10 text-center text-xs text-muted-foreground">Cargando candidatos...</div>
          )}
          {candidatesQuery.isError && (
            <div className="py-6 px-4 text-xs text-rose-400">
              Error cargando candidatos: {String((candidatesQuery.error as Error).message)}
            </div>
          )}
          {!candidatesQuery.isLoading && filtered.length === 0 && (
            <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5 opacity-40" />
              <p className="text-xs">Sin candidatos disponibles.</p>
            </div>
          )}
          {filtered.map((c) => {
            const disabled = c.yaInscritoActivoEnCurso
            const isChecked = selected.has(c.idUsuario)
            return (
              <label
                key={c.idUsuario}
                title={disabled ? 'Ya inscrito activamente en este curso' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/30'}`}
              >
                <Checkbox
                  checked={isChecked}
                  disabled={disabled}
                  onCheckedChange={() => toggle(c.idUsuario, disabled)}
                />
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                  {(c.nombres[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {c.nombres} {c.apellidos}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {c.ministerioPrincipal || '-'} - {c.correo}
                  </p>
                </div>
              </label>
            )
          })}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 mt-2">
          <div className="flex-1 text-xs text-muted-foreground">{selected.size} seleccionados</div>
          <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl"
            disabled={selected.size === 0 || enrollMutation.isPending}
            onClick={confirm}
          >
            {enrollMutation.isPending ? 'Inscribiendo...' : `Inscribir a ${selected.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
