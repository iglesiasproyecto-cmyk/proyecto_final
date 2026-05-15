import React, { useEffect, useState } from 'react'
import { useAuth, useApp } from '@/app/store/AppContext'
import { getUserMinisterios } from '@/lib/userHelpers'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { toast } from 'sonner'
import { crearCurso } from '@/services/aula.service'

interface CrearCursoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  internalUserId: number | null
  ministeriosDisponibles?: { id_ministerio: number; nombre: string }[]
}

interface FormData {
  nombre: string
  descripcion: string
  id_ministerio: number
  desbloqueo_secuencial: boolean
  duracion_horas?: number
}

export function CrearCursoDialog({ open, onOpenChange, internalUserId, ministeriosDisponibles }: CrearCursoDialogProps) {
  const { user } = useAuth()
  const { iglesiaActual, user: appUser } = useApp()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [tipoCurso, setTipoCurso] = useState<'ministerio' | 'iglesia'>('ministerio')

  const { data: miembriaMinisterios = [] } = useQuery({
    queryKey: ['ministerios-lider', internalUserId],
    queryFn: () => getUserMinisterios(internalUserId!),
    enabled: !!internalUserId,
    staleTime: 5 * 60 * 1000,
  })

  const ministeriosFiltrados = ministeriosDisponibles
    ? ministeriosDisponibles
    : miembriaMinisterios
        .filter(m => (m.rol_en_ministerio ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes('lider'))
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
    if (!user?.id || !internalUserId) {
      toast.error('Tu sesión aún se está inicializando. Intenta de nuevo en unos segundos.')
      return
    }

    setLoading(true)
    try {
      await crearCurso({
        titulo: data.nombre,
        descripcion: data.descripcion || undefined,
        idMinisterio: tipoCurso === 'ministerio' ? data.id_ministerio : null,
        idIglesia: tipoCurso === 'iglesia' ? (iglesiaActual?.id ?? null) : null,
        idUsuarioCreador: internalUserId!,
        ordenSecuencial: data.desbloqueo_secuencial,
      })

      queryClient.invalidateQueries({ queryKey: ['cursos-admin', iglesiaActual?.id] })
      toast.success('Curso creado exitosamente')
      form.reset()
      setTipoCurso('ministerio')
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating course:', error)
      const message = error instanceof Error ? error.message : 'Error al crear el curso'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const isAdminIglesia = appUser?.rol === 'admin_iglesia' || appUser?.rol === 'super_admin'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-[28px] border-white/10 bg-card/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">Crear nuevo curso</DialogTitle>
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
                      <Input placeholder="Ej: Liderazgo Cristiano Básico" {...field} className="h-11 rounded-2xl bg-background/60" />
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
                        className="min-h-28 rounded-2xl bg-background/60"
                      />
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAdminIglesia && (
                <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-sm font-medium leading-none">Tipo de curso</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="tipoCurso"
                      value="ministerio"
                      checked={tipoCurso === 'ministerio'}
                      onChange={() => setTipoCurso('ministerio')}
                      className="accent-primary"
                    />
                    Para el Ministerio
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="tipoCurso"
                      value="iglesia"
                      checked={tipoCurso === 'iglesia'}
                      onChange={() => setTipoCurso('iglesia')}
                      className="accent-primary"
                    />
                    Para toda la Iglesia
                  </label>
                </div>
              </div>
            )}

            {tipoCurso === 'ministerio' && (
              <FormField
                control={form.control}
                name="id_ministerio"
                rules={{ required: tipoCurso === 'ministerio' ? 'Debes seleccionar un ministerio' : false }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ministerio</FormLabel>
                    {ministeriosFiltrados.length <= 1 ? (
                      <div className="flex h-11 items-center rounded-2xl border border-input bg-muted px-3 text-sm text-muted-foreground">
                        {ministeriosFiltrados.length === 1
                          ? ministeriosFiltrados[0].nombre
                          : 'Cargando ministerio...'}
                      </div>
                    ) : (
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-2xl bg-background/60">
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
            )}

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
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="h-11 rounded-2xl bg-background/60"
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || (tipoCurso === 'ministerio' && ministeriosFiltrados.length === 0)}
                className="rounded-2xl bg-[#4682b4] text-white hover:bg-[#4682b4]/90"
              >
                {loading ? 'Creando...' : 'Crear Curso'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
