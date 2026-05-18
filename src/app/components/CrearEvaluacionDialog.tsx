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
import { Card, CardContent } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Plus, Trash2, HelpCircle, Check, BookOpen, AlertCircle, Settings } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'

interface CrearEvaluacionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idModulo: number
  onSuccess?: () => void
}

interface PreguntaForm {
  pregunta: string
  tipo: 'multiple_choice' | 'verdadero_falso' | 'respuesta_corta'
  respuesta_correcta: string
  opciones?: string[]
}

interface FormData {
  titulo: string
  descripcion?: string
  intentos_permitidos: number
  puntaje_minimo_aprobacion: number
  preguntas: PreguntaForm[]
}

export function CrearEvaluacionDialog({ open, onOpenChange, idModulo, onSuccess }: CrearEvaluacionDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    defaultValues: {
      titulo: '',
      descripcion: '',
      intentos_permitidos: 3,
      puntaje_minimo_aprobacion: 70,
      preguntas: [{ pregunta: '', tipo: 'multiple_choice', respuesta_correcta: 'A', opciones: ['', '', '', ''] }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'preguntas',
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const preguntas = data.preguntas.map((pregunta, i) => {
        const tipoMapeado = pregunta.tipo === 'multiple_choice' ? 'opcion_multiple' :
                           pregunta.tipo === 'verdadero_falso' ? 'verdadero_falso' :
                           'respuesta_corta'

        const opciones = pregunta.tipo === 'multiple_choice' && pregunta.opciones
          ? pregunta.opciones.map((opcion, idx) => ({
              texto: opcion,
              es_correcta: String.fromCharCode(65 + idx) === pregunta.respuesta_correcta.toUpperCase(),
              orden: idx + 1
            }))
          : pregunta.tipo === 'verdadero_falso'
          ? [
              { texto: 'Verdadero', es_correcta: pregunta.respuesta_correcta === 'Verdadero', orden: 1 },
              { texto: 'Falso', es_correcta: pregunta.respuesta_correcta === 'Falso', orden: 2 }
            ]
          : []

        return {
          enunciado: pregunta.pregunta,
          tipo: tipoMapeado,
          orden: i + 1,
          opciones,
          respuesta_correcta: pregunta.tipo === 'respuesta_corta' ? pregunta.respuesta_correcta : null
        }
      })

      const { error } = await supabase.rpc('crear_evaluacion', {
        p_id_aula_modulo: idModulo,
        p_titulo: data.titulo,
        p_descripcion: data.descripcion || null,
        p_puntaje_minimo: data.puntaje_minimo_aprobacion,
        p_reintentos_permitidos: data.intentos_permitidos > 1,
        p_max_intentos: data.intentos_permitidos,
        p_preguntas: preguntas,
      })

      if (error) throw error

      toast.success('Evaluación creada exitosamente')
      form.reset()
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error creating evaluation:', error)
      toast.error(error.message || 'Error al crear la evaluación')
    } finally {
      setLoading(false)
    }
  }

  const agregarPregunta = () => {
    append({ pregunta: '', tipo: 'multiple_choice', respuesta_correcta: 'A', opciones: ['', '', '', ''] })
  }

  const eliminarPregunta = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[850px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-3xl bg-card border border-border/80 backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <BookOpen className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight italic">Crear Nueva Evaluación</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configura los detalles generales y agrega las preguntas para evaluar el aprendizaje de los servidores.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Información General */}
              <div className="space-y-4 rounded-2xl bg-muted/20 border border-border/40 p-5">
                <div className="flex items-center gap-2 border-b border-border/20 pb-3 mb-2">
                  <Settings className="w-4 h-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Configuración General</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="titulo"
                    rules={{ required: 'El título es requerido' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título de la Evaluación</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Evaluación Módulo 1" className="rounded-xl border-border bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="puntaje_minimo_aprobacion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">% Mín. Aprobación</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              className="rounded-xl border-border bg-background"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 70)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="intentos_permitidos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Máx. Intentos</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              className="rounded-xl border-border bg-background"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instrucciones o Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escribe las instrucciones para los servidores..."
                          className="rounded-xl border-border bg-background resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Listado de Preguntas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Preguntas Evaluativas ({fields.length})
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={agregarPregunta}
                    size="sm"
                    className="rounded-xl bg-primary hover:opacity-95 text-primary-foreground font-bold flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Agregar Pregunta
                  </Button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {fields.map((field, index) => {
                      const tipoPregunta = form.watch(`preguntas.${index}.tipo`)
                      const respuestaCorrecta = form.watch(`preguntas.${index}.respuesta_correcta`)

                      return (
                        <motion.div
                          key={field.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card className="border border-border/60 bg-background/50 rounded-2xl overflow-hidden shadow-sm relative">
                            {/* Card Header con index y borrar */}
                            <div className="p-4 border-b border-border/20 bg-muted/10 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-2 py-0.5 rounded-lg text-xs">
                                  #{index + 1}
                                </Badge>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pregunta</span>
                              </div>
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarPregunta(index)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <CardContent className="p-5 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Tipo de Pregunta */}
                                <div className="sm:col-span-1">
                                  <FormField
                                    control={form.control}
                                    name={`preguntas.${index}.tipo`}
                                    render={({ field: tipoField }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</FormLabel>
                                        <Select
                                          onValueChange={(val) => {
                                            tipoField.onChange(val)
                                            // Reset respuesta_correcta a valor predeterminado seguro al cambiar tipo
                                            if (val === 'multiple_choice') {
                                              form.setValue(`preguntas.${index}.respuesta_correcta`, 'A')
                                            } else if (val === 'verdadero_falso') {
                                              form.setValue(`preguntas.${index}.respuesta_correcta`, 'Verdadero')
                                            } else {
                                              form.setValue(`preguntas.${index}.respuesta_correcta`, '')
                                            }
                                          }}
                                          value={tipoField.value}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="rounded-xl border-border bg-background">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent className="rounded-xl">
                                            <SelectItem value="multiple_choice" className="rounded-lg">Opción Múltiple</SelectItem>
                                            <SelectItem value="verdadero_falso" className="rounded-lg">Verdadero/Falso</SelectItem>
                                            <SelectItem value="respuesta_corta" className="rounded-lg">Respuesta Corta</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                {/* Pregunta / Enunciado */}
                                <div className="sm:col-span-2">
                                  <FormField
                                    control={form.control}
                                    name={`preguntas.${index}.pregunta`}
                                    rules={{ required: 'La pregunta es requerida' }}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enunciado de la Pregunta</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Escribe la pregunta..." className="rounded-xl border-border bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Opciones de respuesta para Opción Múltiple */}
                              {tipoPregunta === 'multiple_choice' && (
                                <div className="space-y-3 p-4 rounded-2xl bg-muted/10 border border-border/30">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                                    Opciones y Respuestas
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[0, 1, 2, 3].map((optIdx) => {
                                      const letra = String.fromCharCode(65 + optIdx)
                                      return (
                                        <FormField
                                          key={optIdx}
                                          control={form.control}
                                          name={`preguntas.${index}.opciones.${optIdx}`}
                                          rules={{ required: 'Esta opción es obligatoria' }}
                                          render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0">
                                                  {letra}
                                                </Badge>
                                                <FormControl>
                                                  <Input placeholder={`Escribe la opción ${letra}...`} className="rounded-xl border-border bg-background h-9 text-xs" {...field} />
                                                </FormControl>
                                              </div>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      )
                                    })}
                                  </div>

                                  {/* RESPUESTA CORRECTA INTERACTIVA (SIN MANUAL INPUT!) */}
                                  <div className="pt-3 border-t border-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block">
                                        Selecciona la Respuesta Correcta:
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                                        Los servidores deberán elegir esta opción para obtener el puntaje.
                                      </span>
                                    </div>
                                    <div className="flex gap-2">
                                      {['A', 'B', 'C', 'D'].map((letra) => {
                                        const activa = respuestaCorrecta === letra
                                        return (
                                          <button
                                            key={letra}
                                            type="button"
                                            onClick={() => form.setValue(`preguntas.${index}.respuesta_correcta`, letra)}
                                            className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center border transition-all duration-300 ${
                                              activa
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-md shadow-emerald-500/5'
                                                : 'bg-background border-border/60 text-muted-foreground hover:border-primary/40'
                                            }`}
                                          >
                                            {letra}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Respuesta correcta para Verdadero/Falso interactiva */}
                              {tipoPregunta === 'verdadero_falso' && (
                                <div className="p-4 rounded-2xl bg-muted/10 border border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block">
                                      Respuesta Correcta:
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                                      Marca la alternativa que se considera correcta para esta pregunta.
                                    </span>
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    {['Verdadero', 'Falso'].map((vfOption) => {
                                      const activa = respuestaCorrecta === vfOption
                                      return (
                                        <button
                                          key={vfOption}
                                          type="button"
                                          onClick={() => form.setValue(`preguntas.${index}.respuesta_correcta`, vfOption)}
                                          className={`px-5 py-2 rounded-xl font-bold text-xs border transition-all duration-300 ${
                                            activa
                                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-md shadow-emerald-500/5'
                                              : 'bg-background border-border/60 text-muted-foreground hover:border-primary/40'
                                          }`}
                                        >
                                          {vfOption}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Respuesta correcta para Respuesta Corta */}
                              {tipoPregunta === 'respuesta_corta' && (
                                <div className="p-4 rounded-2xl bg-muted/10 border border-border/30 space-y-2">
                                  <div>
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block">
                                      Respuesta Correcta Esperada:
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                                      Escribe el texto exacto que el estudiante debe escribir para aprobar (Sensible a mayúsculas y minúsculas).
                                    </span>
                                  </div>
                                  <FormField
                                    control={form.control}
                                    name={`preguntas.${index}.respuesta_correcta`}
                                    rules={{ required: 'La respuesta es requerida' }}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input placeholder="Escribe la respuesta correcta exacta..." className="rounded-xl border-border bg-background text-xs" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer shrink-0 */}
            <DialogFooter className="p-5 border-t border-border/40 bg-muted/10 shrink-0 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-2xl border-border/60 font-semibold px-5"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10 px-6"
              >
                {loading ? 'Creando...' : 'Crear Evaluación'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}