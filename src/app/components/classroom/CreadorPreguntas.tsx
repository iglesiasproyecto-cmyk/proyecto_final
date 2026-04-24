import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/app/components/ui/dialog'
import {
  useCrearPregunta,
  useCrearOpcion,
  useEliminarPregunta,
  useEliminarOpcion,
  usePreguntasPorEvaluacion
} from '@/hooks/useEvaluaciones'
import type { Pregunta, OpcionRespuesta, PreguntaConOpciones } from '@/types/app.types'
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react'

interface CreadorPreguntasProps {
  idEvaluacion: number
}

export function CreadorPreguntas({ idEvaluacion }: CreadorPreguntasProps) {
  const [preguntaEditando, setPreguntaEditando] = useState<Pregunta | null>(null)
  const [showDialogPregunta, setShowDialogPregunta] = useState(false)
  const [showDialogOpciones, setShowDialogOpciones] = useState(false)
  const [expandedPregunta, setExpandedPregunta] = useState<number | null>(null)

  const { data: preguntasData, isLoading } = usePreguntasPorEvaluacion(idEvaluacion)
  const preguntas = preguntasData || []

  const crearPregunta = useCrearPregunta()
  const crearOpcion = useCrearOpcion()
  const eliminarPregunta = useEliminarPregunta()
  const eliminarOpcion = useEliminarOpcion()

  const {
    register: registerPregunta,
    handleSubmit: handleSubmitPregunta,
    reset: resetPregunta,
    control: controlPregunta
  } = useForm({
    defaultValues: {
      titulo: '',
      descripcion: '',
      tipo: 'multiple_choice'
    }
  })

  const {
    register: registerOpcion,
    handleSubmit: handleSubmitOpcion,
    reset: resetOpcion,
    control: controlOpcion
  } = useForm({
    defaultValues: {
      textoOpcion: '',
      esCorrecta: false,
      puntos: '10',
      orden: '1'
    }
  })

  const onGuardarPregunta = (data: any) => {
    crearPregunta.mutate(
      {
        idEvaluacion,
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        orden: preguntas.length + 1
      },
      {
        onSuccess: () => {
          resetPregunta()
          setShowDialogPregunta(false)
        }
      }
    )
  }

  const onGuardarOpcion = (data: any) => {
    if (!preguntaEditando) return
    crearOpcion.mutate(
      {
        idPregunta: preguntaEditando.idPregunta,
        textoOpcion: data.textoOpcion,
        esCorrecta: data.esCorrecta === true,
        puntos: parseFloat(data.puntos),
        orden: parseInt(data.orden)
      },
      {
        onSuccess: () => {
          resetOpcion()
        }
      }
    )
  }

  if (isLoading) {
    return <div className="text-center py-4">Cargando preguntas...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Preguntas de la Evaluación</h3>
          <p className="text-sm text-gray-600">Total: {preguntas.length} preguntas</p>
        </div>
        <Button
          onClick={() => setShowDialogPregunta(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 w-4 h-4" /> Nueva Pregunta
        </Button>
      </div>

      {/* Lista de preguntas */}
      {preguntas.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No hay preguntas aún. Crea la primera.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {preguntas.map((item, idx) => {
            const pregunta = item.pregunta
            const opciones = item.opciones
            const isExpanded = expandedPregunta === pregunta.idPregunta

            return (
              <Card key={pregunta.idPregunta} className="overflow-hidden">
                {/* Header de pregunta */}
                <div
                  className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition"
                  onClick={() =>
                    setExpandedPregunta(
                      isExpanded ? null : pregunta.idPregunta
                    )
                  }
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                        <span className="font-semibold text-primary">
                          Pregunta {idx + 1}
                        </span>
                      </div>
                      <p className="font-semibold mt-1">{pregunta.titulo}</p>
                      {pregunta.descripcion && (
                        <p className="text-sm text-gray-600 mt-1">
                          {pregunta.descripcion}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {opciones.length} opciones • Tipo: {pregunta.tipo}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreguntaEditando(pregunta)
                          setShowDialogOpciones(true)
                        }}
                        title="Agregar opción"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          eliminarPregunta.mutate(pregunta.idPregunta)
                        }}
                        disabled={eliminarPregunta.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Opciones expandidas */}
                {isExpanded && (
                  <div className="p-4 space-y-2">
                    {opciones.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">
                        Sin opciones aún
                      </p>
                    ) : (
                      opciones.map((opcion) => (
                        <div
                          key={opcion.idOpcion}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {String.fromCharCode(64 + opcion.orden)}) {opcion.textoOpcion}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {opcion.esCorrecta && (
                                <span className="text-green-600 font-semibold">
                                  ✓ Correcta
                                </span>
                              )}
                              {opcion.puntos > 0 && (
                                <span className="ml-2">
                                  {opcion.puntos} pts
                                </span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              eliminarOpcion.mutate(opcion.idOpcion)
                            }
                            disabled={eliminarOpcion.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3"
                      onClick={() => {
                        setPreguntaEditando(pregunta)
                        setShowDialogOpciones(true)
                      }}
                    >
                      <Plus className="mr-2 w-4 h-4" /> Agregar Opción
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog: Crear Pregunta */}
      <Dialog open={showDialogPregunta} onOpenChange={setShowDialogPregunta}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Pregunta</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmitPregunta(onGuardarPregunta)}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                {...registerPregunta('titulo', { required: true })}
                placeholder="¿Cuál es la capital de Francia?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción (opcional)</label>
              <Input
                {...registerPregunta('descripcion')}
                placeholder="Contexto adicional..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select
                {...registerPregunta('tipo')}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="multiple_choice">Opción Múltiple</option>
                <option value="verdadero_falso">Verdadero/Falso</option>
                <option value="abierta">Abierta</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialogPregunta(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={crearPregunta.isPending}>
                {crearPregunta.isPending ? 'Creando...' : 'Crear Pregunta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Agregar Opción */}
      {preguntaEditando && (
        <Dialog open={showDialogOpciones} onOpenChange={setShowDialogOpciones}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Opción</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Para: {preguntaEditando.titulo}
              </p>
            </DialogHeader>
            <form
              onSubmit={handleSubmitOpcion(onGuardarOpcion)}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium">Texto de la Opción</label>
                <Input
                  {...registerOpcion('textoOpcion', { required: true })}
                  placeholder="París"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Orden (A, B, C, D)</label>
                <select
                  {...registerOpcion('orden', { required: true })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="1">A</option>
                  <option value="2">B</option>
                  <option value="3">C</option>
                  <option value="4">D</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Puntos</label>
                <Input
                  type="number"
                  step="0.01"
                  {...registerOpcion('puntos', { required: true })}
                  placeholder="10"
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...registerOpcion('esCorrecta')}
                  />
                  ¿Es la respuesta correcta?
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialogOpciones(false)
                    setPreguntaEditando(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={crearOpcion.isPending}>
                  {crearOpcion.isPending ? 'Agregando...' : 'Agregar Opción'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
