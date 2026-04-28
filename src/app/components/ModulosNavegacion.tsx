import { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { useAccesoModulos } from '@/hooks/useAccesoModulos'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Lock, Unlock, CheckCircle, BookOpen } from 'lucide-react'
import { ModuloEditorPanel } from './ModuloEditorPanel'
import { getInternalUserId } from '@/lib/userHelpers'

interface ModulosNavegacionProps {
  idCurso: number
}

export function ModulosNavegacion({ idCurso }: ModulosNavegacionProps) {
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [moduloAbierto, setModuloAbierto] = useState<{ id: number; titulo: string } | null>(null)

  const { data: modulos, isLoading } = useAccesoModulos({
    idUsuario: internalUserId,
    idCurso,
  })

  useEffect(() => {
    if (!user?.id) return
    getInternalUserId(user.id).then(setInternalUserId)
  }, [user?.id])

  if (isLoading) {
    return <div>Cargando módulos...</div>
  }

  if (!modulos || modulos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay módulos disponibles</h3>
          <p className="text-muted-foreground text-center">
            El líder aún no ha creado módulos para este curso
          </p>
        </CardContent>
      </Card>
    )
  }

  const getEstadoIcon = (estadoAcceso: string) => {
    switch (estadoAcceso) {
      case 'completado': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'disponible': return <Unlock className="h-4 w-4 text-blue-600" />
      case 'bloqueado':  return <Lock className="h-4 w-4 text-gray-400" />
      default: return null
    }
  }

  const getEstadoColor = (estadoAcceso: string) => {
    switch (estadoAcceso) {
      case 'completado': return 'border-green-200 bg-green-50'
      case 'disponible': return 'border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100'
      case 'bloqueado':  return 'border-gray-200 bg-gray-50 opacity-60'
      default: return ''
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Módulos del Curso</h3>

      <div className="grid gap-3">
        {modulos.map((modulo) => (
          <div key={modulo.idModulo}>
            <Card
              className={`transition-all ${getEstadoColor(modulo.estadoAcceso)} ${
                modulo.estadoAcceso === 'disponible' ? 'hover:shadow-md' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getEstadoIcon(modulo.estadoAcceso)}
                    <div>
                      <CardTitle className="text-base">{modulo.titulo}</CardTitle>
                      <CardDescription>Módulo {modulo.orden}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={modulo.estadoAcceso === 'completado' ? 'default' : 'secondary'}>
                    {modulo.estadoAcceso === 'completado' ? 'Completado' :
                     modulo.estadoAcceso === 'disponible' ? 'Disponible' : 'Bloqueado'}
                  </Badge>
                </div>
              </CardHeader>

              {modulo.estadoAcceso === 'disponible' && (
                <CardContent className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setModuloAbierto(
                        moduloAbierto?.id === modulo.idModulo
                          ? null
                          : { id: modulo.idModulo, titulo: modulo.titulo }
                      )
                    }
                  >
                    {moduloAbierto?.id === modulo.idModulo ? 'Cerrar' : 'Ver contenido'}
                  </Button>
                </CardContent>
              )}

              {modulo.estadoAcceso === 'bloqueado' && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Completa los módulos anteriores para desbloquear este contenido
                  </p>
                </CardContent>
              )}
            </Card>

            {moduloAbierto?.id === modulo.idModulo && (
              <div className="mt-2 rounded-2xl border border-white/10 bg-background/30 p-4">
                <ModuloEditorPanel
                  idModulo={modulo.idModulo}
                  tituloModulo={modulo.titulo}
                  readOnly
                  onClose={() => setModuloAbierto(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
