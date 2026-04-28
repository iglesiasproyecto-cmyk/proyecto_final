import { useState } from 'react'
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
import React from 'react'

interface CrearModuloDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idCurso: number
}

interface FormData {
  titulo: string
  descripcion: string
  contenido_md: string
}

export function CrearModuloDialog({ open, onOpenChange, idCurso }: CrearModuloDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    defaultValues: {
      titulo: '',
      descripcion: '',
      contenido_md: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      // Obtener el orden del último módulo
      const { data: ultimoModulo } = await supabase
        .from('modulo')
        .select('orden')
        .eq('id_curso', idCurso)
        .order('orden', { ascending: false })
        .limit(1)
        .single()

      const nuevoOrden = (ultimoModulo?.orden || 0) + 1

      const { error } = await supabase
        .from('modulo')
        .insert({
          titulo: data.titulo,
          descripcion: data.descripcion,
          contenido_md: data.contenido_md,
          id_curso: idCurso,
          orden: nuevoOrden,
          estado: 'borrador',
        })

      if (error) throw error

      toast.success('Módulo creado exitosamente')
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating module:', error)
      toast.error('Error al crear el módulo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Módulo</DialogTitle>
          <DialogDescription>
            Crea un nuevo módulo para el curso. Podrás agregar actividades y evaluaciones después.
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
                  <FormLabel>Título del Módulo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Introducción a la fe" {...field} />
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
                      placeholder="Describe brevemente el contenido del módulo..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contenido_md"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido (Markdown)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contenido del módulo en formato Markdown..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Puedes usar Markdown para dar formato al contenido del módulo.
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
                {loading ? 'Creando...' : 'Crear Módulo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}