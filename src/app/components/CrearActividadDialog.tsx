import React, { useState } from 'react'
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
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useCrearActividad } from '@/hooks/useActividades'

interface CrearActividadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idModulo: number
}

interface FormData {
  titulo: string
  tipo: 'lectura' | 'video' | 'recurso' | 'evaluacion'
  contenido?: string
  url_video?: string
  orden?: number
}

export function CrearActividadDialog({ open, onOpenChange, idModulo }: CrearActividadDialogProps) {
  const [loading, setLoading] = useState(false)
  const crearActividad = useCrearActividad()

  const form = useForm<FormData>({
    defaultValues: {
      titulo: '',
      tipo: 'lectura',
      contenido: '',
      url_video: '',
      orden: 1,
    },
  })

  // Obtener el orden siguiente
  React.useEffect(() => {
    const getNextOrder = async () => {
      const { data: actividades } = await supabase
        .from('actividad')
        .select('orden')
        .eq('id_modulo', idModulo)
        .order('orden', { ascending: false })
        .limit(1)

      const nextOrder = (actividades?.[0]?.orden || 0) + 1
      form.setValue('orden', nextOrder)
    }

    if (open) {
      getNextOrder()
    }
  }, [open, idModulo, form])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await crearActividad.mutateAsync({
        titulo: data.titulo,
        tipo: data.tipo,
        contenido: data.contenido,
        url_video: data.url_video,
        orden: data.orden,
        id_modulo: idModulo,
        estado: 'pendiente',
      })

      toast.success('Actividad creada exitosamente')
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating activity:', error)
      toast.error('Error al crear la actividad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Actividad</DialogTitle>
          <DialogDescription>
            Agrega una actividad al módulo. Las actividades pueden ser lecturas, videos o recursos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              rules={{ required: 'El título es requerido' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título de la Actividad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Introducción a la oración" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo"
              rules={{ required: 'El tipo es requerido' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Actividad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lectura">Lectura</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="recurso">Recurso</SelectItem>
                      <SelectItem value="evaluacion">Evaluación</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('tipo') === 'lectura' && (
              <FormField
                control={form.control}
                name="contenido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenido de Lectura</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe el contenido de la lectura..."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch('tipo') === 'video' && (
              <FormField
                control={form.control}
                name="url_video"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Video</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Puedes usar YouTube, Vimeo u otras plataformas de video
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch('tipo') === 'recurso' && (
              <>
                <FormField
                  control={form.control}
                  name="contenido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción del Recurso</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe el recurso..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="url_video"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL del Recurso</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://ejemplo.com/recurso.pdf"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        URL donde se encuentra el recurso (PDF, documento, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="orden"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormDescription>
                    Orden en que aparecerá la actividad en el módulo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Actividad'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}