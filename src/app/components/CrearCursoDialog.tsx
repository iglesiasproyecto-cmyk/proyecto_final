import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { useMinisterios, useMinisteriosIdsDeUsuario } from '@/hooks/useMinisterios'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Checkbox } from '@/app/components/ui/checkbox'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabaseClient'
import { getInternalUserId } from '@/lib/userHelpers'
import { toast } from 'sonner'

interface CrearCursoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  nombre: string
  descripcion: string
  id_ministerio: number
  desbloqueo_secuencial: boolean
  duracion_horas?: number
}

export function CrearCursoDialog({ open, onOpenChange }: CrearCursoDialogProps) {
  const { user } = useAuth()
  const { ministerios } = useMinisterios()
  const [loading, setLoading] = useState(false)
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [ministeriosFiltrados, setMinisteriosFiltrados] = useState<any[]>([])

  useEffect(() => {
    const getUserId = async () => {
      if (user?.id) {
        const id = await getInternalUserId(user.id)
        setInternalUserId(id)
      }
    }
    getUserId()
  }, [user?.id])

  const { data: ministeriosIds = [] } = useMinisteriosIdsDeUsuario(internalUserId || undefined)

  useEffect(() => {
    if (ministerios && ministeriosIds) {
      const filtrados = ministerios.filter(m => ministeriosIds.includes(m.id_ministerio))
      setMinisteriosFiltrados(filtrados)
    }
  }, [ministerios, ministeriosIds])

  const form = useForm<FormData>({
    defaultValues: {
      nombre: '',
      descripcion: '',
      id_ministerio: 0,
      desbloqueo_secuencial: true,
      duracion_horas: undefined,
    },
  })

  // Actualizar el valor por defecto del ministerio cuando se carguen
  React.useEffect(() => {
    if (ministeriosFiltrados && ministeriosFiltrados.length > 0 && !form.getValues('id_ministerio')) {
      form.setValue('id_ministerio', ministeriosFiltrados[0].id_ministerio)
    }
  }, [ministeriosFiltrados, form])

  const onSubmit = async (data: FormData) => {
    if (!user?.id) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('aula_curso')
        .insert({
          titulo: data.nombre,
          descripcion: data.descripcion,
          id_ministerio: data.id_ministerio,
          id_usuario_creador: user.id,
          estado: 'borrador',
          orden_secuencial: data.desbloqueo_secuencial,
        })

      if (error) throw error

      toast.success('Curso creado exitosamente')
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating course:', error)
      toast.error('Error al crear el curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Curso</DialogTitle>
          <DialogDescription>
            Crea un nuevo curso para tu ministerio. Podrás agregar módulos y contenido después.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              rules={{ required: 'El nombre es requerido' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Curso</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Liderazgo Cristiano Básico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe brevemente el contenido del curso..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="id_ministerio"
              rules={{ required: 'Debes seleccionar un ministerio' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ministerio</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un ministerio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ministeriosFiltrados?.map((ministerio) => (
                        <SelectItem key={ministerio.id_ministerio} value={ministerio.id_ministerio.toString()}>
                          {ministerio.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duracion_horas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración Estimada (horas)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej: 20"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="desbloqueo_secuencial"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Desbloqueo secuencial
                    </FormLabel>
                    <FormDescription>
                      Los servidores deben completar módulos anteriores para acceder a los siguientes
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Curso'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}