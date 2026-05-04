import { useAuth } from '@/app/store/AppContext'
import { supabase } from '@/lib/supabaseClient'
import { getInternalUserId } from '@/lib/userHelpers'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Bell, Check, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

export function NotificacionesAula() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)

  // Get internal user ID
  useEffect(() => {
    const getUserId = async () => {
      if (user?.id) {
        const id = await getInternalUserId(user.id)
        setInternalUserId(id)
      }
    }
    getUserId()
  }, [user?.id])

  const { data: notificaciones, isLoading } = useQuery({
    queryKey: ['notificaciones-aula', internalUserId],
    queryFn: async () => {
      if (!internalUserId) return []

      const { data, error } = await supabase
        .from('notificacion')
        .select('*')
        .eq('id_usuario', internalUserId)
        .or('tipo.eq.curso,tipo.eq.tarea,tipo.eq.evento') // Include aula-related notification types
        .order('creado_en', { ascending: false })
        .limit(10)

      if (error) throw error
      return data
    },
    enabled: !!internalUserId,
  })

  const marcarComoLeida = useMutation({
    mutationFn: async (idNotificacion: number) => {
      const { error } = await supabase
        .from('notificacion')
        .update({
          leida: true,
          fecha_lectura: new Date().toISOString()
        })
        .eq('id_notificacion', idNotificacion)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones-aula'] })
    }
  })

  const marcarTodasComoLeidas = useMutation({
    mutationFn: async () => {
      if (!internalUserId) throw new Error('Usuario no identificado')

      const { error } = await supabase
        .from('notificacion')
        .update({
          leida: true,
          fecha_lectura: new Date().toISOString()
        })
        .eq('id_usuario', internalUserId)
        .or('tipo.eq.curso,tipo.eq.tarea,tipo.eq.evento')
        .eq('leida', false)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones-aula'] })
      toast.success('Todas las notificaciones marcadas como leídas')
    },
    enabled: !!internalUserId,
  })

  const notificacionesNoLeidas = notificaciones?.filter(n => !n.leida) || []

  if (isLoading) {
    return <div>Cargando notificaciones...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notificaciones de Aula</CardTitle>
            {notificacionesNoLeidas.length > 0 && (
              <Badge variant="destructive">{notificacionesNoLeidas.length}</Badge>
            )}
          </div>
          {notificacionesNoLeidas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => marcarTodasComoLeidas.mutate()}
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}
        </div>
        <CardDescription>
          Actualizaciones sobre tus cursos y nuevo contenido disponible
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!notificaciones || notificaciones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tienes notificaciones de aula</p>
            <p className="text-sm">Las notificaciones aparecerán aquí cuando haya nuevo contenido disponible</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificaciones.map((notificacion) => (
              <div
                key={notificacion.id_notificacion}
                className={`p-4 border rounded-lg transition-colors ${
                  notificacion.leida ? 'bg-muted/50' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <p className="font-medium text-sm">{notificacion.titulo}</p>
                      {!notificacion.leida && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notificacion.mensaje}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notificacion.creado_en).toLocaleString()}
                    </p>
                  </div>
                  {!notificacion.leida && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => marcarComoLeida.mutate(notificacion.id_notificacion)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}