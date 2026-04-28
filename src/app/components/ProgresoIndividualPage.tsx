import React from 'react'
import { useParams, useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  BookOpen,
  CheckCircle,
  Clock,
  Lock,
  FileText,
  Video,
  Link,
  HelpCircle,
  Award,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import { useAuth } from '@/app/store/AppContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { ComentariosActividad } from './ComentariosSistema'

export function ProgresoIndividualPage() {
  const { idUsuario, idCurso } = useParams<{ idUsuario: string, idCurso: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Verificar permisos - solo líderes pueden ver progreso de otros
  const isLider = user?.id !== parseInt(idUsuario!)

  // Obtener información del servidor
  const { data: servidor } = useQuery({
    queryKey: ['servidor-info', idUsuario],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuario')
        .select('id_usuario, nombres, apellidos, correo, ultimo_acceso')
        .eq('id_usuario', parseInt(idUsuario!))
        .single()

      if (error) throw error
      return data
    },
    enabled: !!idUsuario,
  })

  // Obtener información del curso
  const { data: curso } = useQuery({
    queryKey: ['curso-info', idCurso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curso')
        .select(`
          id_curso,
          nombre,
          descripcion,
          modulos:modulo(
            id_modulo,
            titulo,
            orden,
            estado,
            descripcion
          )
        `)
        .eq('id_curso', parseInt(idCurso!))
        .single()

      if (error) throw error
      return data
    },
    enabled: !!idCurso,
  })

  // Obtener progreso detallado
  const { data: progreso } = useQuery({
    queryKey: ['progreso-detallado', idUsuario, idCurso],
    queryFn: async () => {
      if (!idUsuario || !idCurso) return null

      // Obtener proceso asignado
      const { data: proceso } = await supabase
        .from('detalle_proceso_curso')
        .select('id_detalle_proceso_curso, fecha_inscripcion')
        .eq('id_usuario', parseInt(idUsuario))
        .eq('proceso_asignado_curso.curso.id_curso', parseInt(idCurso))
        .single()

      if (!proceso) return null

      // Obtener avances por módulo
      const { data: avancesModulos } = await supabase
        .from('avance_modulo')
        .select('id_modulo, completado_en')
        .eq('id_detalle_proceso_curso', proceso.id_detalle_proceso_curso)

      // Obtener progreso de actividades
      const { data: progresoActividades } = await supabase
        .from('progreso_actividad')
        .select(`
          id_actividad,
          vista_en,
          completada_en,
          actividad:actividad(titulo, tipo)
        `)
        .eq('id_detalle_proceso_curso', proceso.id_detalle_proceso_curso)

      // Obtener intentos de evaluaciones
      const { data: intentosEvaluaciones } = await supabase
        .from('intento_evaluacion')
        .select(`
          id_modulo,
          estado,
          calificacion_obtenida,
          creado_en,
          modulo:modulo(titulo)
        `)
        .eq('id_detalle_proceso_curso', proceso.id_detalle_proceso_curso)
        .order('creado_en', { ascending: false })

      return {
        procesoAsignado: proceso,
        avancesModulos: avancesModulos || [],
        progresoActividades: progresoActividades || [],
        intentosEvaluaciones: intentosEvaluaciones || [],
      }
    },
    enabled: !!idUsuario && !!idCurso,
  })

  if (!servidor || !curso) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Cargando información...</h3>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  if (!isLider && user?.id !== parseInt(idUsuario!)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Acceso denegado</h3>
          <p className="text-muted-foreground mb-4">Solo puedes ver tu propio progreso.</p>
          <Button onClick={() => navigate('/app/aula')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ir a Mi Aula
          </Button>
        </div>
      </div>
    )
  }

  // Calcular estadísticas
  const modulosTotales = curso.modulos?.length || 0
  const modulosCompletados = progreso?.avancesModulos?.length || 0
  const actividadesCompletadas = progreso?.progresoActividades?.filter(a => a.completada_en).length || 0
  const evaluacionesAprobadas = progreso?.intentosEvaluaciones?.filter(i => i.estado === 'aprobado').length || 0
  const progresoGeneral = modulosTotales > 0 ? Math.round((modulosCompletados / modulosTotales) * 100) : 0

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {servidor.nombres.charAt(0)}{servidor.apellidos.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {servidor.nombres} {servidor.apellidos}
              </h1>
              <p className="text-muted-foreground">{servidor.correo}</p>
            </div>
          </div>
        </div>
        <Badge variant={progresoGeneral === 100 ? "default" : "secondary"}>
          {progresoGeneral}% Completado
        </Badge>
      </div>

      {/* Información del curso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            {curso.nombre}
          </CardTitle>
          <CardDescription>{curso.descripcion}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{modulosCompletados}</div>
              <div className="text-sm text-muted-foreground">Módulos completados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{actividadesCompletadas}</div>
              <div className="text-sm text-muted-foreground">Actividades completadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{evaluacionesAprobadas}</div>
              <div className="text-sm text-muted-foreground">Evaluaciones aprobadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {progreso?.procesoAsignado?.fecha_inscripcion ?
                  new Date(progreso.procesoAsignado.fecha_inscripcion).toLocaleDateString() :
                  'N/A'
                }
              </div>
              <div className="text-sm text-muted-foreground">Fecha de inscripción</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progreso general</span>
              <span>{progresoGeneral}%</span>
            </div>
            <Progress value={progresoGeneral} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Detalles por pestañas */}
      <Tabs defaultValue="modulos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="actividades">Actividades</TabsTrigger>
          <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
          {isLider && <TabsTrigger value="comentarios">Comentarios</TabsTrigger>}
        </TabsList>

        <TabsContent value="modulos">
          <div className="space-y-4">
            {curso.modulos?.sort((a, b) => a.orden - b.orden).map((modulo: any) => {
              const completado = progreso?.avancesModulos?.some(am => am.id_modulo === modulo.id_modulo)
              return (
                <Card key={modulo.id_modulo}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{modulo.orden}</Badge>
                        <div>
                          <h3 className="font-medium">{modulo.titulo}</h3>
                          <p className="text-sm text-muted-foreground">{modulo.descripcion}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={completado ? "default" : "secondary"}>
                          {completado ? "Completado" : "Pendiente"}
                        </Badge>
                        {completado && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="actividades">
          <div className="space-y-4">
            {progreso?.progresoActividades?.map((actividad: any) => (
              <Card key={actividad.id_actividad}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {actividad.actividad?.tipo === 'lectura' && <FileText className="h-5 w-5 text-blue-600" />}
                      {actividad.actividad?.tipo === 'video' && <Video className="h-5 w-5 text-red-600" />}
                      {actividad.actividad?.tipo === 'recurso' && <Link className="h-5 w-5 text-green-600" />}
                      <div>
                        <h3 className="font-medium">{actividad.actividad?.titulo}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {actividad.actividad?.tipo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {actividad.completada_en && (
                        <Badge variant="default">Completada</Badge>
                      )}
                      {actividad.vista_en && !actividad.completada_en && (
                        <Badge variant="secondary">Vista</Badge>
                      )}
                      {!actividad.vista_en && (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                      {actividad.completada_en && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>
                  {actividad.completada_en && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Completada el {new Date(actividad.completada_en).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )) || (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay actividades registradas</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="evaluaciones">
          <div className="space-y-4">
            {progreso?.intentosEvaluaciones?.map((intento: any, index: number) => (
              <Card key={`${intento.id_modulo}-${index}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <HelpCircle className="h-5 w-5 text-purple-600" />
                      <div>
                        <h3 className="font-medium">Evaluación - {intento.modulo?.titulo}</h3>
                        <p className="text-sm text-muted-foreground">
                          Intentado el {new Date(intento.creado_en).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        intento.estado === 'aprobado' ? 'default' :
                        intento.estado === 'reprobado' ? 'destructive' :
                        'secondary'
                      }>
                        {intento.estado === 'aprobado' ? 'Aprobado' :
                         intento.estado === 'reprobado' ? 'Reprobado' :
                         'En revisión'}
                      </Badge>
                      <span className="font-medium">
                        {intento.calificacion_obtenida}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay evaluaciones registradas</p>
              </div>
            )}
          </div>
        </TabsContent>

        {isLider && (
          <TabsContent value="comentarios">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Sistema de Retroalimentación</h3>
                <p className="text-muted-foreground">
                  Agrega comentarios específicos para actividades completadas por {servidor.nombres}
                </p>
              </div>

              {/* Comentarios por actividad completada */}
              {progreso?.progresoActividades
                ?.filter(act => act.completada_en)
                ?.map((actividad: any) => (
                  <ComentariosActividad
                    key={actividad.id_actividad}
                    idActividad={actividad.id_actividad}
                    idUsuarioServidor={parseInt(idUsuario!)}
                    nombreServidor={`${servidor.nombres} ${servidor.apellidos}`}
                  />
                )) || (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p>No hay actividades completadas para comentar aún</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}