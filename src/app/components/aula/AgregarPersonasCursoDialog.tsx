import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Checkbox } from '@/app/components/ui/checkbox'
import {
  useCandidatosInscripcionCurso,
  useInscribirUsuariosCurso,
} from '@/hooks/useInscripciones'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  idAulaCurso: number
}

export function AgregarPersonasCursoDialog({
  open,
  onOpenChange,
  idAulaCurso,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: candidatos = [], isLoading } =
    useCandidatosInscripcionCurso(idAulaCurso)

  const inscribirMutation = useInscribirUsuariosCurso()

  const toggleUsuario = (idUsuario: number) => {
    setSelectedIds((prev) =>
      prev.includes(idUsuario)
        ? prev.filter((id) => id !== idUsuario)
        : [...prev, idUsuario]
    )
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos una persona')
      return
    }

    try {
      const result = await inscribirMutation.mutateAsync({
        idAulaCurso,
        userIds: selectedIds,
      })

      toast.success(
        `Inscripción finalizada: ${result.inscritos ?? 0} nuevos, ${result.reactivados ?? 0} reactivados`
      )

      setSelectedIds([])
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message ?? 'No se pudieron inscribir usuarios')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[28px] border-white/10 bg-card/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">Agregar personas al curso</DialogTitle>
        </DialogHeader>

        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {isLoading && (
            <p className="text-sm text-muted-foreground">
              Cargando candidatos...
            </p>
          )}

          {!isLoading && candidatos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay personas disponibles para inscribir.
            </p>
          )}

          {candidatos.map((usuario: any) => (
            <label
              key={usuario.id_usuario}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 p-3 transition-colors hover:bg-muted/50"
            >
              <Checkbox
                checked={selectedIds.includes(usuario.id_usuario)}
                onCheckedChange={() => toggleUsuario(usuario.id_usuario)}
              />

              <div>
                <p className="font-medium">
                  {usuario.nombres} {usuario.apellidos}
                </p>
                <p className="text-sm text-muted-foreground">
                  {usuario.correo}
                </p>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl">
            Cancelar
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={inscribirMutation.isPending || selectedIds.length === 0}
            className="rounded-2xl bg-[#4682b4] text-white hover:bg-[#4682b4]/90"
          >
            Agregar seleccionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
