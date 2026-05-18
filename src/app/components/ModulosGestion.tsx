import React, { useState } from 'react'
import { CrearModuloDialog } from './CrearModuloDialog'
import { ModuloEditorPanel } from './ModuloEditorPanel'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
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

  const handleReorderModulos = async (draggedId: number, targetIndex: number) => {
    const items = Array.from(modulosOrdenados)
    const draggedIndex = items.findIndex(m => m.id_aula_modulo === draggedId)

    if (draggedIndex === -1) return

    // Remove dragged item and insert at target
    const [reorderedItem] = items.splice(draggedIndex, 1)
    items.splice(targetIndex, 0, reorderedItem)

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

  // Draggable module card component
  function DraggableModuloCard({ modulo, index }: { modulo: any; index: number }) {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: 'modulo',
      item: { id: modulo.id_aula_modulo, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }), [modulo.id_aula_modulo, index])

    const [{ isOver }, drop] = useDrop(() => ({
      accept: 'modulo',
      drop: (item: any) => {
        if (item.index !== index) {
          handleReorderModulos(item.id, index)
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }), [index, handleReorderModulos])

    return (
      <div
        ref={(ref) => {
          drag(drop(ref))
        }}
        className={`mb-3 ${isDragging ? 'opacity-50' : ''} ${isOver ? 'border-b-2 border-primary' : ''}`}
      >
        <Card className="overflow-hidden rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="mt-1 cursor-grab rounded-xl bg-muted/30 p-2">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">#{modulo.orden}</Badge>
                  <h4 className="font-semibold">{modulo.titulo}</h4>
                  <Badge variant={modulo.publicado ? 'default' : 'secondary'}>
                    {modulo.publicado ? 'publicado' : 'borrador'}
                  </Badge>
                </div>

                {modulo.descripcion && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {modulo.descripcion}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
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

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant={moduloEditando?.id === modulo.id_aula_modulo ? 'default' : 'outline'}
                  size="sm"
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
                  onClick={() => togglePublicacion(modulo.id_aula_modulo, modulo.publicado)}
                >
                  {modulo.publicado ? (
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
                      <AlertDialogAction onClick={() => eliminarModulo(modulo.id_aula_modulo)}>
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
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-card/55 p-5 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estructura del curso</p>
            <h3 className="mt-1 text-xl font-black tracking-tight">Módulos del Curso</h3>
            <p className="text-sm font-medium text-muted-foreground">
              {desbloqueoSecuencial ? '🔒 Desbloqueo secuencial activado' : '🔓 Todos los módulos disponibles'}
            </p>
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
          <div className="space-y-3">
            {modulosOrdenados.map((modulo, index) => (
              <DraggableModuloCard key={modulo.id_aula_modulo} modulo={modulo} index={index} />
            ))}
          </div>
        )}

        <CrearModuloDialog
          open={showCrearModulo}
          onOpenChange={setShowCrearModulo}
          idCurso={idCurso}
        />
      </div>
    </DndProvider>
  )
}
