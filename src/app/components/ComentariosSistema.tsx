import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import { Badge } from '@/app/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog'
import {
  MessageSquare,
  Send,
  Trash2,
  User,
  Calendar,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/app/store/AppContext'
import { useComentariosActividad, useCrearComentarioLider, useEliminarComentarioLider } from '@/hooks/useComentariosLider'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface ComentariosActividadProps {
  idActividad: number
  idUsuarioServidor: number
  nombreServidor: string
  readonly?: boolean // Para vista de servidor (solo lectura)
}

export function ComentariosActividad({
  idActividad,
  idUsuarioServidor,
  nombreServidor,
  readonly = false
}: ComentariosActividadProps) {
  const { user } = useAuth()
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  const { data: comentarios, isLoading } = useComentariosActividad(idActividad)
  const crearComentario = useCrearComentarioLider()
  const eliminarComentario = useEliminarComentarioLider()

  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim() || !user?.id) return

    setEnviando(true)
    try {
      await crearComentario.mutateAsync({
        comentario: nuevoComentario.trim(),
        id_actividad: idActividad,
        id_usuario_autor: user.id,
        id_usuario_destinatario: idUsuarioServidor,
        tipo: 'retroalimentacion'
      })

      setNuevoComentario('')
      toast.success('Comentario enviado')
    } catch (error) {
      console.error('Error creating comment:', error)
      toast.error('Error al enviar el comentario')
    } finally {
      setEnviando(false)
    }
  }

  const handleEliminarComentario = async (idComentario: number) => {
    try {
      await eliminarComentario.mutateAsync(idComentario)
      toast.success('Comentario eliminado')
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('Error al eliminar el comentario')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>Cargando comentarios...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const comentariosFiltrados = comentarios?.filter(c => c.id_usuario_destinatario === idUsuarioServidor) || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Retroalimentación para {nombreServidor}
        </CardTitle>
        <CardDescription>
          Comentarios y observaciones sobre el desempeño en esta actividad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de comentarios existentes */}
        {comentariosFiltrados.length > 0 ? (
          <div className="space-y-3">
            {comentariosFiltrados.map((comentario: any) => (
              <div key={comentario.id_comentario} className="border rounded-lg p-3 bg-muted/20">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {comentario.usuario_autor?.nombres?.charAt(0) || '?'}
                      {comentario.usuario_autor?.apellidos?.charAt(0) || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">
                        {comentario.usuario_autor?.nombres} {comentario.usuario_autor?.apellidos}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {comentario.tipo === 'retroalimentacion' ? 'Retroalimentación' : 'Observación'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {comentario.comentario}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(comentario.creado_en).toLocaleDateString()}</span>
                      </div>
                      {!readonly && comentario.id_usuario_autor === user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar comentario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleEliminarComentario(comentario.id_comentario)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No hay comentarios aún</p>
            {!readonly && (
              <p className="text-xs">Agrega retroalimentación para ayudar al servidor</p>
            )}
          </div>
        )}

        {/* Formulario para nuevo comentario (solo para líderes) */}
        {!readonly && (
          <div className="border-t pt-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Escribe tu retroalimentación o comentario..."
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                rows={3}
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <ThumbsUp className="h-3 w-3" />
                  <span>Tu comentario será visible para {nombreServidor}</span>
                </div>
                <Button
                  onClick={handleEnviarComentario}
                  disabled={!nuevoComentario.trim() || enviando}
                  size="sm"
                >
                  {enviando ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-1" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente para mostrar comentarios en la vista del servidor
export function ComentariosServidor() {
  const { user } = useAuth()

  const { data: comentarios, isLoading } = React.useQuery({
    queryKey: ['comentarios-servidor', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('comentario_lider')
        .select(`
          *,
          usuario_autor:usuario!id_usuario_autor(nombres, apellidos),
          actividad:actividad(titulo),
          modulo:modulo(titulo)
        `)
        .eq('id_usuario_destinatario', user.id)
        .eq('tipo', 'retroalimentacion')
        .order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>Cargando comentarios...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Retroalimentación de Líderes
        </CardTitle>
        <CardDescription>
          Comentarios y observaciones de tus líderes sobre tu progreso
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!comentarios || comentarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No hay comentarios aún</h3>
            <p className="text-sm">Cuando completes actividades, tus líderes podrán dejarte retroalimentación</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comentarios.map((comentario: any) => (
              <div key={comentario.id_comentario} className="border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {comentario.usuario_autor?.nombres?.charAt(0) || '?'}
                      {comentario.usuario_autor?.apellidos?.charAt(0) || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium">
                        {comentario.usuario_autor?.nombres} {comentario.usuario_autor?.apellidos}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Líder
                      </Badge>
                    </div>

                    <div className="bg-muted/50 rounded p-3 mb-3">
                      <p className="text-sm">{comentario.comentario}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-3">
                        {comentario.actividad && (
                          <span>Actividad: {comentario.actividad.titulo}</span>
                        )}
                        {comentario.modulo && (
                          <span>Módulo: {comentario.modulo.titulo}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(comentario.creado_en).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}