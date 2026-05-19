import { useApp } from '@/app/store/AppContext'
import { useNotificaciones, useMarkNotificacionRead, useMarkAllNotificacionesRead } from '@/hooks/useNotificaciones'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Bell, Check, BookOpen } from 'lucide-react'
import { Skeleton } from '@/app/components/ui/skeleton'

function NotificationSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="rounded-2xl border p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-4 w-4 mt-0.5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificacionesAula() {
  const { usuarioActual, iglesiaActual } = useApp()

  // Usa el hook centralizado con filtro de iglesia — mismo sistema que el resto de la app
  const { data: todasNotificaciones = [], isLoading } = useNotificaciones(
    usuarioActual?.idUsuario ?? 0,
    iglesiaActual?.id
  )

  const marcarComoLeida = useMarkNotificacionRead()
  const marcarTodasLeidas = useMarkAllNotificacionesRead()

  // Solo notificaciones de aula: tipo curso, tarea, evento
  const notificaciones = todasNotificaciones.filter(n =>
    ['curso', 'tarea', 'evento'].includes(n.tipo)
  )

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida)

  if (isLoading) {
    return (
      <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <NotificationSkeleton items={5} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notificaciones de Aula</CardTitle>
            {notificacionesNoLeidas.length > 0 && (
              <Badge variant="destructive">{notificacionesNoLeidas.length}</Badge>
            )}
          </div>
          {notificacionesNoLeidas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => marcarTodasLeidas.mutate(usuarioActual?.idUsuario ?? 0)}
              disabled={marcarTodasLeidas.isPending}
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
        {notificaciones.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-muted/20 py-10 text-center text-muted-foreground">
            <Bell className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="font-medium">No tienes notificaciones de aula</p>
            <p className="text-sm">Las notificaciones aparecerán aquí cuando haya nuevo contenido disponible</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificaciones.map((notificacion) => (
              <div
                key={notificacion.idNotificacion}
                className={`rounded-2xl border p-4 transition-colors ${
                  notificacion.leida ? 'bg-muted/40' : 'border-primary/15 bg-primary/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">{notificacion.titulo}</p>
                      {!notificacion.leida && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notificacion.mensaje}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notificacion.creadoEn).toLocaleString('es', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!notificacion.leida && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => marcarComoLeida.mutate(notificacion.idNotificacion)}
                      disabled={marcarComoLeida.isPending}
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
