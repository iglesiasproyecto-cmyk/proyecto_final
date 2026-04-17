import { useEffect, useState } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { useUpdateModuloContenido } from '@/hooks/useModulo'

const MAX_CHARS = 100_000

interface Props {
  idModulo: number
  idCurso: number
  contenidoInicial: string | null
}

export function ModuloContenidoEditor({ idModulo, idCurso, contenidoInicial }: Props) {
  const [valor, setValor] = useState<string>(contenidoInicial ?? '')
  const [dirty, setDirty] = useState(false)
  const mutation = useUpdateModuloContenido()

  useEffect(() => {
    setValor(contenidoInicial ?? '')
    setDirty(false)
  }, [contenidoInicial, idModulo])

  const onChange = (v: string | undefined) => {
    setValor(v ?? '')
    setDirty(true)
  }

  const onGuardar = async () => {
    if (valor.length > MAX_CHARS) {
      toast.error(`El contenido excede ${MAX_CHARS.toLocaleString()} caracteres. Recortalo antes de guardar.`)
      return
    }
    try {
      await mutation.mutateAsync({
        idModulo,
        idCurso,
        contenidoMd: valor.trim() === '' ? null : valor,
      })
      setDirty(false)
      toast.success('Contenido guardado')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      toast.error(`No se pudo guardar: ${msg}`)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-card/40" data-color-mode="auto">
        <MDEditor value={valor} onChange={onChange} height={480} preview="live" />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {valor.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} caracteres
          {dirty && <span className="ml-2 text-amber-500">· sin guardar</span>}
        </span>
        <Button onClick={onGuardar} disabled={!dirty || mutation.isPending} className="rounded-xl">
          {mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" /> Guardar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
