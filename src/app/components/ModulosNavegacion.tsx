import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { useAccesoModulos } from '@/hooks/useAccesoModulos'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Lock, Unlock, CheckCircle, BookOpen, Plus, FileText, Video, Link, HelpCircle } from 'lucide-react'
import { CrearActividadDialog } from './CrearActividadDialog'
import { CrearEvaluacionDialog } from './CrearEvaluacionDialog'
import { EvaluacionInteractiva } from './EvaluacionInteractiva'
import { supabase } from '@/lib/supabaseClient'

interface ModulosNavegacionProps {
  idCurso: number
}

export function ModulosNavegacion({ idCurso }: ModulosNavegacionProps) {
  const { user } = useAuth()
  const { data: modulos, isLoading } = useAccesoModulos({
    idUsuario: user?.id,
    idCurso
  })

  const [moduloSeleccionado, setModuloSeleccionado] = useState<number | null>(null)
  const [showCrearActividad, setShowCrearActividad] = useState(false)
  const [showCrearEvaluacion, setShowCrearEvaluacion] = useState(false)
  const [isLider, setIsLider] = useState(false)

  // Verificar si el usuario es líder del curso
  useEffect(() => {
    const checkRole = async () => {
      if (!user?.id) return

      const { data: curso } = await supabase
        .from('aula_curso')
        .select('id_usuario_creador')
        .eq('id_aula_curso', idCurso)
        .single()

      setIsLider(curso?.id_usuario_creador === user.id)
    }

    checkRole()
  }, [user?.id, idCurso])

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
      case 'completado':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'disponible':
        return <Unlock className="h-4 w-4 text-blue-600" />
      case 'bloqueado':
        return <Lock className="h-4 w-4 text-gray-400" />
      default:
        return null
    }
  }

  const getEstadoColor = (estadoAcceso: string) => {
    switch (estadoAcceso) {
      case 'completado':
        return 'border-green-200 bg-green-50'
      case 'disponible':
        return 'border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100'
      case 'bloqueado':
        return 'border-gray-200 bg-gray-50 opacity-60'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Módulos del Curso</h3>

      <div className="grid gap-3">
        {modulos.map((modulo) => (
          <Card
            key={modulo.idModulo}
            className={`transition-all ${getEstadoColor(modulo.estadoAcceso)} ${
              modulo.estadoAcceso === 'disponible' ? 'hover:shadow-md' : ''
            }`}
            onClick={() => modulo.estadoAcceso === 'disponible' && setModuloSeleccionado(modulo.idModulo)}
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
                <p className="text-sm text-muted-foreground mb-3">
                  {modulo.totalElementos} elementos para completar
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setModuloSeleccionado(modulo.idModulo)
                    }}
                  >
                    Ver contenido
                  </Button>
                  {isLider && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setModuloSeleccionado(modulo.idModulo)
                          setShowCrearActividad(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Actividad
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setModuloSeleccionado(modulo.idModulo)
                          setShowCrearEvaluacion(true)
                        }}
                      >
                        <HelpCircle className="h-4 w-4 mr-1" />
                        Evaluación
                      </Button>
                    </>
                  )}
                </div>
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
        ))}
      </div>

      {/* Contenido del módulo seleccionado */}
      {moduloSeleccionado && (
        <div className="mt-6">
          <ContenidoModulo
            idModulo={moduloSeleccionado}
            isLider={isLider}
            onCrearActividad={() => setShowCrearActividad(true)}
            onCrearEvaluacion={() => setShowCrearEvaluacion(true)}
          />
        </div>
      )}

      {/* Diálogos para crear actividades */}
      <CrearActividadDialog
        open={showCrearActividad}
        onOpenChange={setShowCrearActividad}
        idModulo={moduloSeleccionado || 0}
      />

      <CrearEvaluacionDialog
        open={showCrearEvaluacion}
        onOpenChange={setShowCrearEvaluacion}
        idModulo={moduloSeleccionado || 0}
      />
    </div>
  )
}

// Componente para contenido del módulo
function ContenidoModulo({
  idModulo,
  isLider,
  onCrearActividad,
  onCrearEvaluacion
}: {
  idModulo: number
  isLider: boolean
  onCrearActividad: () => void
  onCrearEvaluacion: () => void
}) {
  const { user } = useAuth()
  const { data: modulo } = React.useQuery({
    queryKey: ['modulo-detalle', idModulo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modulo')
        .select(`
          *,
          actividad:actividad(*),
          evaluacion_detalle:evaluacion_detalle(*)
        `)
        .eq('id_modulo', idModulo)
        .single()

      if (error) throw error
      return data
    },
  })

  const { data: progresoActividades } = React.useQuery({
    queryKey: ['progreso-actividades-usuario', idModulo, user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // Obtener proceso asignado
      const { data: proceso } = await supabase
        .from('detalle_proceso_curso')
        .select('id_detalle_proceso_curso')
        .eq('id_usuario', user.id)
        .single()

      if (!proceso) return []

      const { data, error } = await supabase
        .from('progreso_actividad')
        .select('id_actividad, vista_en, completada_en')
        .eq('id_detalle_proceso_curso', proceso.id_detalle_proceso_curso)

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'lectura': return <FileText className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'recurso': return <Link className="h-4 w-4" />
      case 'evaluacion': return <HelpCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getProgresoActividad = (idActividad: number) => {
    const progreso = progresoActividades?.find(p => p.id_actividad === idActividad)
    return {
      vista: !!progreso?.vista_en,
      completada: !!progreso?.completada_en
    }
  }

  if (!modulo) return <div>Cargando contenido...</div>

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{modulo.titulo}</CardTitle>
            <CardDescription>{modulo.descripcion}</CardDescription>
          </div>
          {isLider && (
            <div className="flex gap-2">
              <Button onClick={onCrearActividad} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Actividad
              </Button>
              <Button onClick={onCrearEvaluacion} size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                Evaluación
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {modulo.contenido_md && (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: modulo.contenido_md }} />
          </div>
        )}

        {modulo.actividad && modulo.actividad.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Actividades</h3>
            {modulo.actividad.map((actividad: any) => {
              const progreso = getProgresoActividad(actividad.id_actividad)
              return (
                <Card key={actividad.id_actividad} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getTipoIcon(actividad.tipo)}
                      <div className="flex-1">
                        <h4 className="font-medium">{actividad.titulo}</h4>
                        {actividad.contenido && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {actividad.contenido}
                          </p>
                        )}
                        {actividad.url_video && (
                          <p className="text-sm text-blue-600 mt-1">
                            {actividad.url_video}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={progreso.completada ? "default" : progreso.vista ? "secondary" : "outline"}>
                        {progreso.completada ? "Completada" : progreso.vista ? "Vista" : "Pendiente"}
                      </Badge>
                      {!isLider && (
                        <Button size="sm" variant="outline">
                          {progreso.vista ? "Revisar" : "Ver"}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {modulo.evaluacion_detalle && modulo.evaluacion_detalle.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Evaluación</h3>
            {!isLider ? (
              <EvaluacionInteractiva
                idModulo={idModulo}
                onCompletar={() => {
                  // Refrescar el progreso del módulo
                  window.location.reload() // TODO: Mejorar con invalidación de queries
                }}
              />
            ) : (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Evaluación del Módulo</h4>
                    <p className="text-sm text-muted-foreground">
                      {modulo.evaluacion_detalle.length} preguntas configuradas
                    </p>
                  </div>
                  <Badge variant="outline">
                    Vista de Líder
                  </Badge>
                </div>
              </Card>
            )}
          </div>
        )}

        {(!modulo.actividad || modulo.actividad.length === 0) &&
         (!modulo.evaluacion_detalle || modulo.evaluacion_detalle.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4" />
            <p>No hay actividades en este módulo aún.</p>
            {isLider && <p>Agrega actividades o evaluaciones para comenzar.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}