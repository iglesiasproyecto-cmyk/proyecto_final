import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Progress } from '@/app/components/ui/progress'
import { Skeleton } from '@/app/components/ui/skeleton'
import { CardSkeleton } from '@/app/components/ContentSkeletons'
import {
  ArrowLeft,
  BookOpen,
  Users,
  Award,
  Settings,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  UserCheck,
  AlertCircle,
  UserPlus,
  ClipboardList
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useCursos } from '@/hooks/useCursos'
import { useProgresoGrupoCurso } from '@/hooks/useProgreso'
import { ModulosGestion } from './ModulosGestion'
import { AgregarPersonasCursoDialog } from '@/app/components/aula/AgregarPersonasCursoDialog'
import { ModulosNavegacion } from './ModulosNavegacion'

export function CursoDetallePage() {
  const { idCurso } = useParams<{ idCurso: string }>()
  const navigate = useNavigate()
  const { user, rolActual, iglesiaActual } = useAuth()
  const aulaBasePath = iglesiaActual?.id ? `/app/${iglesiaActual.id}/aula` : '/app'
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [showAgregarPersonas, setShowAgregarPersonas] = useState(false)

  useEffect(() => {
    if (user?.id) {
      getInternalUserId(user.id).then(setInternalUserId)
    }
  }, [user?.id])

  // OPTIMIZATION: Use comprehensive aula loading to prevent N+1 queries
  // TODO: Replace with useAulaCursoCompleto hook when RPC is available
  const { data: curso, isLoading } = useQuery({
    queryKey: ['curso-detalle-lider', idCurso],
    queryFn: async () => {
      if (!idCurso) return null

      // NOTE: This is a partial load. For full optimization, use:
      // return getAulaCursoCompleto(parseInt(idCurso))
      // which loads modules, activities, evaluations, questions, options, etc. in one query

      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          *,
          ministerio:ministerio(nombre),
          modulos:aula_modulo(
            id_aula_modulo,
            titulo,
            orden,
            publicado,
            descripcion,
            creado_en
          )
        `)
        .eq('id_aula_curso', parseInt(idCurso))
        .single()

      if (error) throw error
      return data
    },
    enabled: !!idCurso,
  })

  // Obtener progreso del grupo
  const { data: progresoGrupo } = useProgresoGrupoCurso(idCurso ? parseInt(idCurso) : undefined)

   // Verificar si el usuario es líder de este curso
   const isCreadorCurso = internalUserId !== null && curso?.id_usuario_creador === internalUserId
   const isAdmin = rolActual === "admin_iglesia" || rolActual === "super_admin"

    // Verificar si el usuario es un servidor inscrito en este curso
    const [isServidorInscrito, setIsServidorInscrito] = useState(false)
    const [isLiderMinisterio, setIsLiderMinisterio] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState(true)
   
    useEffect(() => {
      if (internalUserId !== null && idCurso && curso) {
        setCheckingAccess(true)
        const checkAccess = async () => {
          try {
            // Verificar si es servidor inscrito
            const { data: inscripcion, error: errorInscripcion } = await supabase
              .from('aula_inscripcion')
              .select('id_aula_inscripcion')
              .eq('id_usuario', internalUserId)
              .eq('id_aula_curso', Number(idCurso))
              .eq('activo', true)
              .maybeSingle()

            if (errorInscripcion) {
              console.error('Error checking enrollment:', errorInscripcion)
              setIsServidorInscrito(false)
            } else {
              setIsServidorInscrito(!!inscripcion)
            }

            // Verificar si es líder del ministerio
            if (curso?.id_ministerio) {
              const { data: liderMinisterio, error: errorMinisterio } = await supabase
                .from('miembro_ministerio')
                .select('id_miembro_ministerio')
                .eq('id_usuario', internalUserId)
                .eq('id_ministerio', curso.id_ministerio)
                .eq('rol_en_ministerio', 'lider')
                .is('fecha_salida', null)
                .maybeSingle()

              if (errorMinisterio) {
                console.error('Error checking ministerio leadership:', errorMinisterio)
                setIsLiderMinisterio(false)
              } else {
                setIsLiderMinisterio(!!liderMinisterio)
              }
            }
          } catch (err) {
            console.error('Error checking access:', err)
            setIsServidorInscrito(false)
            setIsLiderMinisterio(false)
          } finally {
            setCheckingAccess(false)
          }
        }

        checkAccess()
      } else {
        setCheckingAccess(false)
      }
    }, [internalUserId, idCurso, curso])

    // Permitir acceso si es: admin, creador del curso, líder del ministerio, o servidor inscrito
    const isLider = isCreadorCurso || isLiderMinisterio
    const puedeAcceder = isAdmin || isLider || isServidorInscrito

    if (checkingAccess) {
      return (
        <div className="space-y-6 max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-32" />
          </div>
          <CardSkeleton items={4} columns={2} showActions />
        </div>
      )
    }

    if (!puedeAcceder) {
     return (
       <div className="flex items-center justify-center min-h-[400px]">
         <div className="text-center">
           <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
           <h3 className="text-lg font-semibold mb-2">Acceso denegado</h3>
           <p className="text-muted-foreground mb-4">No tienes permisos para ver este curso.</p>
           <Button onClick={() => navigate(aulaBasePath)}>
             <ArrowLeft className="h-4 w-4 mr-2" />
             Volver al Aula
           </Button>
         </div>
       </div>
     )
   }

  // Calcular estadísticas del curso
  const modulos = curso?.modulos ?? curso?.aula_modulo ?? []
  const totalModulos = modulos.length
  const modulosPublicados = modulos.filter(
    (modulo: any) => modulo.publicado === true
  ).length
  const totalActividades = modulos.reduce(
    (total: number, modulo: any) =>
      total + (modulo.actividades?.length ?? modulo.aula_actividad?.length ?? 0),
    0
  )
  const totalEvaluaciones = modulos.reduce(
    (total: number, modulo: any) =>
      total + (modulo.evaluaciones?.length ?? modulo.aula_evaluacion?.length ?? 0),
    0
  )

  const inscripciones = curso?.inscripciones ?? curso?.aula_inscripcion ?? []
  const miembrosActivos = inscripciones.filter(
    (inscripcion: any) => inscripcion.activo === true
  ).length

  const progresoInscripciones = inscripciones
    .filter((inscripcion: any) => inscripcion.activo === true)
    .map((inscripcion: any) =>
      Number(
        inscripcion.progreso ??
          inscripcion.porcentaje_progreso ??
          inscripcion.avance ??
          0
      )
    )

  const promedioProgreso =
    progresoInscripciones.length > 0
      ? Math.round(
          progresoInscripciones.reduce(
            (total: number, progreso: number) => total + progreso,
            0
          ) / progresoInscripciones.length
        )
      : 0

  const cursoVacio = totalModulos === 0

  if (isLoading || !curso) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <CardSkeleton items={4} columns={2} showActions />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-[32px] border border-white/10 bg-card/55 p-5 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(aulaBasePath)}
            className="h-10 rounded-2xl border-white/20 bg-background/55 px-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Detalle del curso</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{curso.titulo}</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-primary/70">{curso.ministerio?.nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant={curso.estado === 'activo' ? 'default' : 'secondary'}
            className={`rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest border-none ${
              curso.estado === 'activo' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
            }`}
          >
            {curso.estado}
          </Badge>
          {(isLider || isAdmin) && (
            <Button
              onClick={() => setShowAgregarPersonas(true)}
              size="sm"
              className="h-10 rounded-2xl border-white/20 bg-background/55"
            >
              <UserPlus className="h-4 w-4 mr-2 text-primary" />
              Agregar personas
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-10 rounded-2xl border-white/20 bg-background/55">
            <Settings className="h-4 w-4 mr-2 text-primary" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="group overflow-hidden rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-[#4682b4]/10 text-[#4682b4]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{totalModulos}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Módulos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{modulosPublicados}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Publicados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{miembrosActivos}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Servidores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{promedioProgreso}%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progreso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {cursoVacio && (
        <Card className="rounded-[28px] border border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-8 px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Curso en preparación</p>
                <h3 className="mt-1 text-xl font-black tracking-tight">Este curso aún no tiene módulos publicados</h3>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Agrega módulos con objetivos claros, actividades y evaluación para que los servidores puedan iniciar su ruta de aprendizaje.
                </p>
              </div>
              {(isLider || isAdmin) && (
                <Button
                  onClick={() => setShowAgregarPersonas(true)}
                  className="h-11 rounded-2xl px-5"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Gestionar participantes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenido Principal */}
      <Tabs defaultValue="modulos" className="space-y-6">
        <div className="flex items-center justify-between overflow-x-auto pb-2 no-scrollbar">
          <TabsList className="inline-flex rounded-2xl border border-border/50 bg-muted/50 p-1.5 backdrop-blur-md">
            <TabsTrigger value="modulos" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
              <BookOpen className="h-4 w-4 mr-2" />
              Módulos
            </TabsTrigger>
            <TabsTrigger value="evaluaciones" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
              <ClipboardList className="h-4 w-4 mr-2" />
              Evaluaciones
            </TabsTrigger>
            <TabsTrigger value="progreso" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
              <BarChart3 className="h-4 w-4 mr-2" />
              Progreso
            </TabsTrigger>
            <TabsTrigger value="servidores" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
              <Users className="h-4 w-4 mr-2" />
              Servidores
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="modulos">
          {(isLider || isAdmin) ? (
            <ModulosGestion
              idCurso={parseInt(idCurso!)}
              modulos={curso.modulos || []}
              desbloqueoSecuencial={curso.orden_secuencial}
            />
          ) : (
            <ModulosNavegacion idCurso={parseInt(idCurso!)} />
          )}
        </TabsContent>

        <TabsContent value="evaluaciones">
          {(isLider || isAdmin) ? (
            <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
              <CardContent className="py-8 px-6">
                <p className="text-muted-foreground">
                  Los líderes pueden configurar evaluaciones en cada módulo desde la pestaña "Módulos".
                </p>
              </CardContent>
            </Card>
          ) : (
            <EvaluacionesTab idCurso={parseInt(idCurso!)} />
          )}
        </TabsContent>

        <TabsContent value="progreso">
          <ProgresoCursoTab progresoGrupo={progresoGrupo || []} />
        </TabsContent>

        <TabsContent value="servidores">
          <ServidoresCursoTab progresoGrupo={progresoGrupo || []} aulaBasePath={aulaBasePath} />
        </TabsContent>
      </Tabs>

      {(isLider || isAdmin) && idCurso && (
        <AgregarPersonasCursoDialog
          open={showAgregarPersonas}
          onOpenChange={setShowAgregarPersonas}
          idAulaCurso={Number(idCurso)}
        />
      )}
    </div>
  )
}

// Componente para la pestaña de evaluaciones
function EvaluacionesTab({ idCurso }: { idCurso: number }) {
  const { data: modulos } = useQuery({
    queryKey: ['modulos-evaluaciones', idCurso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aula_modulo')
        .select(`
          id_aula_modulo,
          titulo,
          evaluaciones:aula_evaluacion(
            id_aula_evaluacion,
            titulo,
            puntaje_minimo
          )
        `)
        .eq('id_aula_curso', idCurso)
      if (error) throw error
      return data || []
    }
  })

  return (
    <div className="space-y-4">
      {modulos?.map(mod => (
        <Card key={mod.id_aula_modulo} className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
          <CardHeader>
            <CardTitle className="text-lg">{mod.titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            {mod.evaluaciones?.length ? (
              <div className="space-y-2">
                {mod.evaluaciones.map((ev: any) => (
                  <p key={ev.id_aula_evaluacion} className="text-sm">
                    📝 {ev.titulo} (Mín. {ev.puntaje_minimo}%)
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin evaluaciones</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Componente para la pestaña de progreso
function ProgresoCursoTab({ progresoGrupo }: { progresoGrupo: any[] }) {
  const miembrosActivos = progresoGrupo.filter(p => p.porcentaje > 0).length
  const miembrosCompletaron = progresoGrupo.filter(p => p.completado).length
  const promedioProgreso = progresoGrupo.length > 0
    ? Math.round(progresoGrupo.reduce((sum, p) => sum + p.porcentaje, 0) / progresoGrupo.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{miembrosActivos}</div>
            <p className="text-sm text-muted-foreground">Servidores activos</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{miembrosCompletaron}</div>
            <p className="text-sm text-muted-foreground">Completaron curso</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{promedioProgreso}%</div>
            <p className="text-sm text-muted-foreground">Progreso promedio</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
        <CardHeader>
          <CardTitle>Distribución de Progreso</CardTitle>
          <CardDescription>Progreso de todos los servidores inscritos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progresoGrupo
              .sort((a, b) => b.porcentaje - a.porcentaje)
              .slice(0, 10)
              .map((servidor, index) => (
                <div key={servidor.idUsuario} className="flex items-center space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{servidor.nombre}</p>
                    <Progress value={servidor.porcentaje} className="h-2 mt-1" />
                  </div>
                  <Badge variant={servidor.completado ? "default" : "secondary"}>
                    {servidor.porcentaje}%
                  </Badge>
                </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para la pestaña de servidores
function ServidoresCursoTab({ progresoGrupo, aulaBasePath }: { progresoGrupo: any[]; aulaBasePath: string }) {
  const navigate = useNavigate()
  const { idCurso } = useParams<{ idCurso: string }>()
  const servidoresAtrasados = progresoGrupo.filter(p => p.porcentaje < 25)

  return (
    <div className="space-y-6">
      {servidoresAtrasados.length > 0 && (
        <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Servidores que necesitan atención
            </CardTitle>
            <CardDescription>
              Servidores con menos del 25% de progreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {servidoresAtrasados.map((servidor) => (
                <div
                  key={servidor.idUsuario}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 p-3 transition-colors hover:bg-accent/50"
                  onClick={() => navigate(`${aulaBasePath}/curso/${idCurso}/servidor/${servidor.idUsuario}`)}
                >
                  <div>
                    <p className="font-medium">{servidor.nombre}</p>
                    <p className="text-sm text-muted-foreground">{servidor.correo}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">{servidor.porcentaje}%</Badge>
                    <div className="w-24">
                      <Progress value={servidor.porcentaje} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
        <CardHeader>
          <CardTitle>Todos los Servidores</CardTitle>
          <CardDescription>
            Lista completa de servidores inscritos en el curso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {progresoGrupo.map((servidor) => (
                <div
                  key={servidor.idUsuario}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 p-3 transition-colors hover:bg-accent/50"
                  onClick={() => navigate(`${aulaBasePath}/curso/${idCurso}/servidor/${servidor.idUsuario}`)}
                >
                <div>
                  <p className="font-medium">{servidor.nombre}</p>
                  <p className="text-sm text-muted-foreground">{servidor.correo}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={servidor.completado ? "default" : servidor.porcentaje > 50 ? "secondary" : "outline"}
                    className="mb-1"
                  >
                    {servidor.porcentaje}%
                  </Badge>
                  <div className="w-24">
                    <Progress value={servidor.porcentaje} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
