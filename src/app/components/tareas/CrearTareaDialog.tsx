import { useState, useEffect } from "react"
import { useCreateTarea, useCreateTareaAsignada, useEventosPorMinisterio } from "@/hooks/useEventos"
import { useMinisteriosEnriquecidos, useServidoresMinisterio } from "@/hooks/useMinisterios"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { toast } from "sonner"
import { Calendar, Link2, Users } from "lucide-react"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
      {children}
    </label>
  )
}

const prioridadConfig = {
  baja:    { label: "Baja",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  media:   { label: "Media",   color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
  alta:    { label: "Alta",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  urgente: { label: "Urgente", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  idUsuarioCreador: number
  onCreated?: (idTarea: number) => void
}

export function CrearTareaDialog({ open, onOpenChange, idUsuarioCreador, onCreated }: Props) {
  const { data: ministerios = [] } = useMinisteriosEnriquecidos()
  const createTarea = useCreateTarea()
  const createAsignada = useCreateTareaAsignada()

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    fechaLimite: "",
    prioridad: "media" as "baja" | "media" | "alta" | "urgente",
    idMinisterio: 0,
    idEvento: 0,
  })
  const [asignadosIds, setAsignadosIds] = useState<number[]>([])

  const { data: servidores = [] } = useServidoresMinisterio(form.idMinisterio)
  const { data: eventos = [] } = useEventosPorMinisterio(form.idMinisterio)

  useEffect(() => {
    if (form.idMinisterio || ministerios.length !== 1) return
    setForm(p => ({ ...p, idMinisterio: ministerios[0].idMinisterio }))
  }, [ministerios, form.idMinisterio])

  const resetForm = () => {
    setForm({ titulo: "", descripcion: "", fechaLimite: "", prioridad: "media", idMinisterio: 0, idEvento: 0 })
    setAsignadosIds([])
  }

  const toggleServidor = (id: number) => {
    setAsignadosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleCreate = async () => {
    if (!form.titulo.trim()) { toast.error("El título es obligatorio"); return }
    if (!form.idMinisterio) { toast.error("Selecciona un ministerio"); return }
    try {
      const tarea = await createTarea.mutateAsync({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        fechaLimite: form.fechaLimite || null,
        prioridad: form.prioridad,
        idUsuarioCreador,
        idMinisterio: form.idMinisterio,
        idEvento: form.idEvento || null,
      })
      if (asignadosIds.length > 0) {
        await Promise.allSettled(
          asignadosIds.map(idUsuario => createAsignada.mutateAsync({ idTarea: tarea.idTarea, idUsuario }))
        )
      }
      toast.success(`Tarea "${tarea.titulo}" creada`)
      onCreated?.(tarea.idTarea)
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error('[CrearTareaDialog] Error:', error)
      toast.error("Error al crear tarea: " + (error?.message ?? "Error desconocido"))
    }
  }

  const isPending = createTarea.isPending || createAsignada.isPending

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) resetForm() }}>
      <DialogContent className="sm:max-w-lg rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Nueva Tarea
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crea una tarea, vincúlala a un evento y asigna servidores.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Ministerio */}
          <div>
            <FieldLabel>Ministerio</FieldLabel>
            <select
              value={form.idMinisterio}
              onChange={e => {
                const id = Number(e.target.value)
                setForm(p => ({ ...p, idMinisterio: id, idEvento: 0 }))
                setAsignadosIds([])
              }}
              className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value={0}>Seleccionar ministerio...</option>
              {ministerios.map(m => (
                <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Evento (opcional) */}
          {form.idMinisterio > 0 && (
            <div>
              <FieldLabel>
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" />
                  Evento
                  <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span>
                </span>
              </FieldLabel>
              <select
                value={form.idEvento}
                onChange={e => setForm(p => ({ ...p, idEvento: Number(e.target.value) }))}
                className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value={0}>Sin evento</option>
                {eventos.map(ev => (
                  <option key={ev.idEvento} value={ev.idEvento}>{ev.nombre}</option>
                ))}
              </select>
              {eventos.length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                  No hay eventos activos en este ministerio.
                </p>
              )}
            </div>
          )}

          {/* Título */}
          <div>
            <FieldLabel>Título</FieldLabel>
            <Input
              value={form.titulo}
              onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder="Ej. Preparar decoración para el culto"
              className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
            />
          </div>

          {/* Descripción */}
          <div>
            <FieldLabel>
              Descripción{" "}
              <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span>
            </FieldLabel>
            <Input
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Detalles de la tarea"
              className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
            />
          </div>

          {/* Fecha + Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />Fecha Límite
                </span>
              </FieldLabel>
              <Input
                type="date"
                value={form.fechaLimite}
                onChange={e => setForm(p => ({ ...p, fechaLimite: e.target.value }))}
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
            <div>
              <FieldLabel>Prioridad</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {(["baja", "media", "alta", "urgente"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setForm(prev => ({ ...prev, prioridad: p }))}
                    className={`h-8 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all ${
                      form.prioridad === p
                        ? `${prioridadConfig[p].color} border-current scale-105`
                        : "bg-background/30 border-white/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {prioridadConfig[p].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Servidores */}
          {form.idMinisterio > 0 && (
            <div>
              <FieldLabel>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  Asignar servidores
                  <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span>
                </span>
              </FieldLabel>
              {servidores.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 bg-background/30 rounded-xl px-3 py-2 border border-white/5">
                  No hay servidores en este ministerio.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {servidores.map(s => {
                    const selected = asignadosIds.includes(s.idUsuario)
                    return (
                      <button
                        key={s.idUsuario}
                        onClick={() => toggleServidor(s.idUsuario)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all ${
                          selected
                            ? "bg-primary/10 border-primary/30 text-foreground"
                            : "bg-background/30 border-white/5 text-foreground/70 hover:border-white/20"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-primary border-primary text-white" : "border-white/20"}`}>
                          {selected && <span className="text-[9px] font-black leading-none">✓</span>}
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-[10px] text-white font-black shrink-0">
                          {s.nombreCompleto.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium truncate">{s.nombreCompleto}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {asignadosIds.length > 0 && (
                <p className="text-[10px] text-primary/70 mt-1.5">
                  {asignadosIds.length} servidor{asignadosIds.length !== 1 ? "es" : ""} seleccionado{asignadosIds.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 mt-2 gap-2">
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={() => { onOpenChange(false); resetForm() }}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl"
            onClick={handleCreate}
            disabled={isPending || !idUsuarioCreador}
          >
            {isPending ? "Creando..." : "Crear Tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
