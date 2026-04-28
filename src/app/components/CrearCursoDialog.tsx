import React, { useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { getUserMinisterios } from '@/lib/userHelpers'
import { useQuery } from '@tanstack/react-query'
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
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface CrearCursoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  internalUserId: number | null
}

interface FormData {
  nombre: string
  descripcion: string
  id_ministerio: number
  desbloqueo_secuencial: boolean
  duracion_horas?: number
}

export function CrearCursoDialog({ open, onOpenChange, internalUserId }: CrearCursoDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const { data: miembriaMinisterios = [] } = useQuery({
    queryKey: ['ministerios-lider', internalUserId],
    queryFn: () => getUserMinisterios(internalUserId!),
    enabled: !!internalUserId,
    staleTime: 5 * 60 * 1000,
  })

  const ministeriosFiltrados = miembriaMinisterios
    .filter(m => m.rol_en_ministerio === 'Líder de Ministerio')
    .map(m => (m.ministerio as any))
    .filter(Boolean)

  const form = useForm<FormData>({
    defaultValues: {
      nombre: '',
      descripcion: '',
      id_ministerio: 0,
      desbloqueo_secuencial: true,
      duracion_horas: undefined,
    },
  })

  useEffect(() => {
    if (ministeriosFiltrados.length > 0 && !form.getValues('id_ministerio')) {
      form.setValue('id_ministerio', ministeriosFiltrados[0].id_ministerio)
    }
  }, [ministeriosFiltrados.length])

  const onSubmit = async (data: FormData) => {
    if (!user?.id || !internalUserId) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('aula_curso')
        .insert({
          titulo: data.nombre,
          descripcion: data.descripcion,
          id_ministerio: data.id_ministerio,
          id_usuario_creador: internalUserId,
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
                  {ministeriosFiltrados.length <= 1 ? (
                    <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                      {ministeriosFiltrados.length === 1
                        ? ministeriosFiltrados[0].nombre
                        : 'Cargando ministerio...'}
                    </div>
                  ) : (
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un ministerio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ministeriosFiltrados.map((ministerio) => (
                          <SelectItem key={ministerio.id_ministerio} value={ministerio.id_ministerio.toString()}>
                            {ministerio.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
              <Button type="submit" disabled={loading || ministeriosFiltrados.length === 0}>
                {loading ? 'Creando...' : 'Crear Curso'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}