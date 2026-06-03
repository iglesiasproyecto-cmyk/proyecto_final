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
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'


interface CrearEvaluacionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idModulo: number
}

interface PreguntaForm {
  pregunta: string
  tipo: 'multiple_choice' | 'verdadero_falso' | 'respuesta_corta'
  respuesta_correcta: string
  opciones?: string[]
  puntaje_minimo?: number
}

interface FormData {
  titulo: string
  descripcion?: string
  intentos_permitidos: number
  puntaje_minimo_aprobacion: number
  preguntas: PreguntaForm[]
}

export function CrearEvaluacionDialog({ open, onOpenChange, idModulo }: CrearEvaluacionDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    defaultValues: {
      titulo: '',
      descripcion: '',
      intentos_permitidos: 1,
      puntaje_minimo_aprobacion: 70,
      preguntas: [{ pregunta: '', tipo: 'multiple_choice', respuesta_correcta: '', opciones: ['', '', '', ''] }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'preguntas',
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      // 1. Crear la evaluación padre en aula_evaluacion
      const { data: evaluacion, error: evaluacionError } = await supabase
        .from('aula_evaluacion')
        .insert({
          id_aula_modulo: idModulo,
          titulo: data.titulo,
          descripcion: data.descripcion || null,
          puntaje_minimo: data.puntaje_minimo_aprobacion,
          reintentos_permitidos: data.intentos_permitidos > 1,
          max_intentos: data.intentos_permitidos,
        })
        .select()
        .single()

      if (evaluacionError) throw evaluacionError

      // 2. Crear cada pregunta asociada a la evaluación
      for (let i = 0; i < data.preguntas.length; i++) {
        const pregunta = data.preguntas[i]

        // Mapear tipos de pregunta al formato de la BD
        const tipoMapeado = pregunta.tipo === 'multiple_choice' ? 'opcion_multiple' :
                           pregunta.tipo === 'verdadero_falso' ? 'verdadero_falso' :
                           pregunta.tipo === 'respuesta_corta' ? 'respuesta_corta' :
                           'respuesta_corta' // fallback

        // Crear la pregunta — columnas reales: enunciado, tipo, orden, respuesta_correcta
        const { data: preguntaCreada, error: preguntaError } = await supabase
          .from('aula_pregunta')
          .insert({
            id_aula_evaluacion: evaluacion.id_aula_evaluacion,
            enunciado: pregunta.pregunta,
            tipo: tipoMapeado,
            orden: i + 1,
            respuesta_correcta: pregunta.tipo === 'verdadero_falso'
              ? pregunta.respuesta_correcta
              : null,
          })
          .select()
          .single()

        if (preguntaError) throw preguntaError

        // Para opciones múltiples: insertar en aula_opcion (texto, es_correcta, orden)
        if (pregunta.tipo === 'multiple_choice' && pregunta.opciones) {
          const opcionesValidas = pregunta.opciones.filter(o => o.trim() !== '')
          if (opcionesValidas.length > 0) {
            const opciones = opcionesValidas.map((opcion, idx) => ({
              id_aula_pregunta: preguntaCreada.id_aula_pregunta,
              texto: opcion,
              es_correcta: String.fromCharCode(65 + idx) === pregunta.respuesta_correcta.toUpperCase(),
              orden: idx + 1,
            }))

            const { error: opcionesError } = await supabase
              .from('aula_opcion')
              .insert(opciones)

            if (opcionesError) throw opcionesError
          }
        }

        // Para verdadero/falso: crear las 2 opciones fijas
        if (pregunta.tipo === 'verdadero_falso') {
          const { error: opcionesError } = await supabase
            .from('aula_opcion')
            .insert([
              { id_aula_pregunta: preguntaCreada.id_aula_pregunta, texto: 'Verdadero', es_correcta: pregunta.respuesta_correcta.toLowerCase() === 'verdadero', orden: 1 },
              { id_aula_pregunta: preguntaCreada.id_aula_pregunta, texto: 'Falso',     es_correcta: pregunta.respuesta_correcta.toLowerCase() === 'falso',     orden: 2 },
            ])
          if (opcionesError) throw opcionesError
        }
      }

      toast.success('Evaluación creada exitosamente')
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating evaluation:', error)
      toast.error('Error al crear la evaluación')
    } finally {
      setLoading(false)
    }
  }

  const agregarPregunta = () => {
    append({ pregunta: '', tipo: 'multiple_choice', respuesta_correcta: '', opciones: ['', '', '', ''] })
  }

  const eliminarPregunta = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Evaluación</DialogTitle>
          <DialogDescription>
            Crea una evaluación con preguntas para evaluar el aprendizaje de los servidores.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="titulo"
                rules={{ required: 'El título es requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título de la Evaluación</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Evaluación Módulo 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="puntaje_minimo_aprobacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntaje Mínimo de Aprobación (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 70)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instrucciones para la evaluación..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Preguntas</h3>
                <Button type="button" onClick={agregarPregunta} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Pregunta
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Pregunta {index + 1}</CardTitle>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => eliminarPregunta(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`preguntas.${index}.tipo`}
                      render={({ field: tipoField }) => (
                        <FormItem>
                          <FormLabel>Tipo de Pregunta</FormLabel>
                          <Select onValueChange={tipoField.onChange} value={tipoField.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="multiple_choice">Opción Múltiple</SelectItem>
                              <SelectItem value="verdadero_falso">Verdadero/Falso</SelectItem>
                              <SelectItem value="respuesta_corta">Respuesta Corta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`preguntas.${index}.pregunta`}
                      rules={{ required: 'La pregunta es requerida' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pregunta</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Escribe la pregunta..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch(`preguntas.${index}.tipo`) === 'multiple_choice' && (
                      <div className="space-y-2">
                        <FormLabel>Opciones</FormLabel>
                        {[0, 1, 2, 3].map((optionIndex) => (
                          <FormField
                            key={optionIndex}
                            control={form.control}
                            name={`preguntas.${index}.opciones.${optionIndex}`}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{String.fromCharCode(65 + optionIndex)}</Badge>
                                  <FormControl>
                                    <Input placeholder={`Opción ${optionIndex + 1}`} {...field} />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name={`preguntas.${index}.respuesta_correcta`}
                      rules={{ required: 'La respuesta correcta es requerida' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Respuesta Correcta</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={
                                form.watch(`preguntas.${index}.tipo`) === 'multiple_choice'
                                  ? "A, B, C, o D"
                                  : "Respuesta correcta"
                              }
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {form.watch(`preguntas.${index}.tipo`) === 'multiple_choice'
                              ? "Ingresa la letra de la opción correcta (A, B, C, o D)"
                              : "Ingresa la respuesta correcta exacta"
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Evaluación'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}