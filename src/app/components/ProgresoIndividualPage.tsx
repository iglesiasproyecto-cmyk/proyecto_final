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
import { Skeleton } from '@/app/components/ui/skeleton';
import { ProfileSkeleton } from './loading/skeletons';

export function ProgresoIndividualPage() {
  const { idUsuario, idCurso } = useParams<{ idUsuario: string, idCurso: string }>()
  const navigate = useNavigate()
  const { user, iglesiaActual } = useAuth()
  const aulaBasePath = iglesiaActual?.id ? `/app/${iglesiaActual.id}/aula` : '/app'

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
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          descripcion,
          modulos:aula_modulo(
            id_aula_modulo,
            titulo,
            orden,
            publicado,
            descripcion
          )
        `)
        .eq('id_aula_curso', parseInt(idCurso!))
        .single()

      if (error) throw error
      return { ...data, id_curso: data.id_aula_curso, nombre: data.titulo, modulos: data.modulos?.map(m => ({ ...m, id_modulo: m.id_aula_modulo, estado: m.publicado ? 'publicado' : 'borrador' })) }
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
        .from('aula_inscripcion')
        .select('id_aula_inscripcion, inscrito_en')
        .eq('id_usuario', parseInt(idUsuario))
        .eq('id_aula_curso', parseInt(idCurso))
        .single()

      if (!proceso) return null

      // Obtener avances por módulo (calculado de actividades completadas)
      const { data: avancesModulos } = await supabase
        .from('aula_modulo')
        .select(`
          id_aula_modulo,
          aula_actividad(count)
        `)
        .eq('aula_modulo.id_aula_curso', parseInt(idCurso))
        .eq('aula_actividad.completada_en', null, false) // only completed activities

      const avancesModulosMapped = avancesModulos?.map(am => ({
        id_modulo: am.id_aula_modulo,
        completado_en: new Date().toISOString() // placeholder
      })) || []

      // Obtener progreso de actividades
      const { data: progresoActividades } = await supabase
        .from('aula_progreso_actividad')
        .select(`
          id_aula_actividad,
          completada_en,
          aula_actividad(titulo, tipo)
        `)
        .eq('id_usuario', parseInt(idUsuario))
        .in('aula_actividad.aula_modulo.id_aula_curso', [parseInt(idCurso)])

      // Obtener intentos de evaluaciones
      const { data: intentosEvaluaciones } = await supabase
        .from('aula_intento_evaluacion')
        .select(`
          id_aula_modulo,
          aprobado,
          puntaje_obtenido,
          iniciado_en,
          aula_modulo(titulo)
        `)
        .eq('id_usuario', parseInt(idUsuario))
        .in('aula_modulo.aula_curso.id_aula_curso', [parseInt(idCurso)])
        .order('iniciado_en', { ascending: false })

      return {
        procesoAsignado: { idAulaInscripcion: proceso.id_aula_inscripcion, fecha_inscripcion: proceso.inscrito_en },
        avancesModulos: [], // TODO: calculate from completed activities
        progresoActividades: progresoActividades?.map(pa => ({
          id_actividad: pa.id_aula_actividad,
          vista_en: pa.completada_en,
          completada_en: pa.completada_en,
          actividad: pa.aula_actividad
        })) || [],
        intentosEvaluaciones: intentosEvaluaciones?.map(ie => ({
          id_modulo: ie.id_aula_modulo,
          estado: ie.aprobado ? 'aprobado' : 'reprobado',
          calificacion_obtenida: ie.puntaje_obtenido,
          creado_en: ie.iniciado_en,
          modulo: ie.aula_modulo
        })) || [],
      }
    },
    enabled: !!idUsuario && !!idCurso,
  })

  if (!servidor || !curso) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-32" />
        </div>
        <ProfileSkeleton showTabs showSections />
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
          <Button onClick={() => navigate(aulaBasePath)}>
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
          <Button variant="outline" size="sm" onClick={() => navigate(`${aulaBasePath}/curso/${idCurso}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al curso
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
                        <h3 className="font-medium">{actividad.titulo}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {actividad.tipo}
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
