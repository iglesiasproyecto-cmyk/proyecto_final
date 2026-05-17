import React, { useState } from 'react'
import { CrearModuloDialog } from './CrearModuloDialog'
import { ModuloEditorPanel } from './ModuloEditorPanel'
import { Card, CardContent } from '@/app/components/ui/card'
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
  ChevronDown,
  FileText,
  HelpCircle,
  Lock,
  Unlock,
} from 'lucide-react'
import { motion } from 'motion/react'
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
  const [moduloEditando, setModuloEditando] = useState<{ id: number; titulo: string } | null>(null)

  React.useEffect(() => {
    setModulosOrdenados(modulos.sort((a, b) => a.orden - b.orden))
  }, [modulos])

  const togglePublicacion = async (idModulo: number, publicadoActual: boolean) => {
    const nuevoEstado = !publicadoActual

    try {
      const { error } = await supabase
        .from('aula_modulo')
        .update({ publicado: nuevoEstado })
        .eq('id_aula_modulo', idModulo)

      if (error) throw error

      toast.success(`Módulo ${nuevoEstado ? 'publicado' : 'despublicado'}`)

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
        .from('aula_modulo')
        .delete()
        .eq('id_aula_modulo', idModulo)

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
          .from('aula_modulo')
          .update({ orden: item.orden })
          .eq('id_aula_modulo', item.id_aula_modulo)
      }

      toast.success('Orden actualizado')
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Error al actualizar el orden')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-card/55 p-5 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estructura del curso</p>
          <h3 className="mt-1 text-xl font-black tracking-tight">Módulos del Curso</h3>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {desbloqueoSecuencial ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                <Lock className="w-3 h-3 mr-1" /> Desbloqueo secuencial activado
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                <Unlock className="w-3 h-3 mr-1" /> Todos los módulos disponibles
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={() => setShowCrearModulo(true)} className="h-11 rounded-2xl bg-[#4682b4] px-6 font-bold text-white shadow-md shadow-blue-900/10 hover:bg-[#4682b4]/90">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Módulo
        </Button>
      </div>

      {modulosOrdenados.length === 0 ? (
        <Card className="rounded-[28px] border border-dashed border-border/70 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No hay módulos aún</h3>
            <p className="mb-4 text-center text-muted-foreground">
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
                  <Draggable key={modulo.id_aula_modulo} draggableId={modulo.id_aula_modulo.toString()} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="mb-3"
                      >
                          <Card className="overflow-hidden rounded-[24px] border border-border/50 bg-card/40 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-sm">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-start gap-4">
                              <div {...provided.dragHandleProps} className="mt-1 cursor-grab rounded-xl bg-muted/30 p-2 hover:bg-muted/50 transition-colors">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>

                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Módulo {modulo.orden}</Badge>
                                  <h4 className="font-bold text-lg">{modulo.titulo}</h4>
                                  <Badge variant={modulo.publicado ? 'default' : 'secondary'} className={modulo.publicado ? "bg-emerald-500/10 text-emerald-600 border-none" : "bg-muted text-muted-foreground border-none"}>
                                    {modulo.publicado ? 'Publicado' : 'Borrador'}
                                  </Badge>
                                </div>

                                {modulo.descripcion && (
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {modulo.descripcion}
                                  </p>
                                )}

                                <div className="mt-3 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                  <span className="flex items-center bg-accent/30 px-2 py-1 rounded-md">
                                    <FileText className="h-3 w-3 mr-1 text-blue-500" />
                                    Contenido
                                  </span>
                                  <span className="flex items-center bg-accent/30 px-2 py-1 rounded-md">
                                    <HelpCircle className="h-3 w-3 mr-1 text-amber-500" />
                                    Evaluación
                                  </span>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <Button
                                  variant={moduloEditando?.id === modulo.id_aula_modulo ? 'default' : 'outline'}
                                  size="sm"
                                  className={moduloEditando?.id === modulo.id_aula_modulo ? "bg-primary text-primary-foreground rounded-xl" : "bg-background/50 rounded-xl"}
                                  onClick={() =>
                                    setModuloEditando(
                                      moduloEditando?.id === modulo.id_aula_modulo
                                        ? null
                                        : { id: modulo.id_aula_modulo, titulo: modulo.titulo }
                                    )
                                  }
                                >
                                  {moduloEditando?.id === modulo.id_aula_modulo
                                    ? <ChevronDown className="h-4 w-4" />
                                    : <Edit className="h-4 w-4" />}
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-background/50 rounded-xl"
                                  onClick={() => togglePublicacion(modulo.id_aula_modulo, modulo.publicado)}
                                >
                                  {modulo.publicado ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-emerald-500" />
                                  )}
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="bg-background/50 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl border-red-500/20">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-[28px] border-border/50 bg-card/95 backdrop-blur-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Eliminar módulo?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Se eliminará el módulo y todo su contenido.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => eliminarModulo(modulo.id_aula_modulo)} className="rounded-xl bg-red-500 hover:bg-red-600 text-white">
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {moduloEditando?.id === modulo.id_aula_modulo && (
                          <div className="mt-2 rounded-[24px] border border-white/10 bg-background/35 p-4">
                            <ModuloEditorPanel
                              idModulo={modulo.id_aula_modulo}
                              tituloModulo={modulo.titulo}
                              onClose={() => setModuloEditando(null)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <CrearModuloDialog
        open={showCrearModulo}
        onOpenChange={setShowCrearModulo}
        idCurso={idCurso}
      />
    </div>
  )
}
