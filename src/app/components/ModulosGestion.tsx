import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  GripVertical,
  BookOpen,
  FileText,
  Video,
  HelpCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface ModulosGestionProps {
  idCurso: number
  modulos: any[]
  desbloqueoSecuencial: boolean
}

export function ModulosGestion({ idCurso, modulos, desbloqueoSecuencial }: ModulosGestionProps) {
  const [showCrearModulo, setShowCrearModulo] = useState(false)
  const [modulosOrdenados, setModulosOrdenados] = useState(modulos.sort((a, b) => a.orden - b.orden))

  React.useEffect(() => {
    setModulosOrdenados(modulos.sort((a, b) => a.orden - b.orden))
  }, [modulos])

  const togglePublicacion = async (idModulo: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'publicado' ? 'borrador' : 'publicado'

    try {
      const { error } = await supabase
        .from('modulo')
        .update({ estado: nuevoEstado })
        .eq('id_modulo', idModulo)

      if (error) throw error

      toast.success(`Módulo ${nuevoEstado === 'publicado' ? 'publicado' : 'despublicado'}`)

      // Refrescar la lista
      window.location.reload()
    } catch (error) {
      console.error('Error updating module:', error)
      toast.error('Error al actualizar el módulo')
    }
  }

  const eliminarModulo = async (idModulo: number) => {
    try {
      const { error } = await supabase
        .from('modulo')
        .delete()
        .eq('id_modulo', idModulo)

      if (error) throw error

      toast.success('Módulo eliminado')
      window.location.reload()
    } catch (error) {
      console.error('Error deleting module:', error)
      toast.error('Error al eliminar el módulo')
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const items = Array.from(modulosOrdenados)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Actualizar órdenes
    const updatedItems = items.map((item, index) => ({
      ...item,
      orden: index + 1
    }))

    setModulosOrdenados(updatedItems)

    // Guardar en la base de datos
    try {
      for (const item of updatedItems) {
        await supabase
          .from('modulo')
          .update({ orden: item.orden })
          .eq('id_modulo', item.id_modulo)
      }

      toast.success('Orden actualizado')
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Error al actualizar el orden')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Módulos del Curso</h3>
          <p className="text-sm text-muted-foreground">
            {desbloqueoSecuencial ? 'Desbloqueo secuencial activado' : 'Todos los módulos disponibles'}
          </p>
        </div>
        <Button onClick={() => setShowCrearModulo(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Módulo
        </Button>
      </div>

      {modulosOrdenados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay módulos aún</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea tu primer módulo para comenzar a agregar contenido al curso
            </p>
            <Button onClick={() => setShowCrearModulo(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Módulo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="modulos">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {modulosOrdenados.map((modulo, index) => (
                  <Draggable key={modulo.id_modulo} draggableId={modulo.id_modulo.toString()} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <div {...provided.dragHandleProps} className="cursor-grab">
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline">#{modulo.orden}</Badge>
                                <h4 className="font-medium">{modulo.titulo}</h4>
                                <Badge variant={modulo.estado === 'publicado' ? 'default' : 'secondary'}>
                                  {modulo.estado}
                                </Badge>
                              </div>

                              {modulo.descripcion && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {modulo.descripcion}
                                </p>
                              )}

                              <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                  <FileText className="h-3 w-3 mr-1" />
                                  Contenido
                                </span>
                                <span className="flex items-center">
                                  <HelpCircle className="h-3 w-3 mr-1" />
                                  Evaluación
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => togglePublicacion(modulo.id_modulo, modulo.estado)}
                              >
                                {modulo.estado === 'publicado' ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar módulo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminará el módulo y todo su contenido.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => eliminarModulo(modulo.id_modulo)}>
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  )
}