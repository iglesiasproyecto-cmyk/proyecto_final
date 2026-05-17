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
  ClipboardList,
  FolderOpen
} from 'lucide-react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useCursos } from '@/hooks/useCursos'
import { useProgresoGrupoCurso } from '@/hooks/useProgreso'
import { ModulosGestion } from './ModulosGestion'
import { AgregarPersonasCursoDialog } from '@/app/components/aula/AgregarPersonasCursoDialog'
import { ModulosNavegacion } from './ModulosNavegacion'
import { CrearEvaluacionDialog } from '@/app/components/CrearEvaluacionDialog'

export function CursoDetallePage() {
  const { idCurso } = useParams<{ idCurso: string }>()
  const navigate = useNavigate()
  const { user, rolActual, iglesiaActual } = useAuth()
  const aulaBasePath = iglesiaActual?.id ? `/app/${iglesiaActual.id}/aula` : '/app'
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [showAgregarPersonas, setShowAgregarPersonas] = useState(false)

  console.log('[CursoDetallePage] Loaded with:', { idCurso, rolActual, iglesiaActualId: iglesiaActual?.id, aulaBasePath, userEmail: user?.email })

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

    console.log('[CursoDetallePage] Access check:', {
      isAdmin,
      isCreadorCurso,
      isLiderMinisterio,
      isServidorInscrito,
      isLider,
      puedeAcceder,
      cursoId: curso?.id_aula_curso,
      cursoCreador: curso?.id_usuario_creador,
      internalUserId,
      ministerioId: curso?.id_ministerio
    })

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
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8 pb-10">
      {/* Header Premium */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5"
      >
        <div className="absolute top-0 right-0 w-72 h-48 bg-primary/10 rounded-full blur-[90px] pointer-events-none -z-10" />

        <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(aulaBasePath)}
            className="h-10 w-10 rounded-full bg-background/50 hover:bg-background shadow-sm border border-border/50 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-900/20 shrink-0">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-1">
                {curso.ministerio?.nombre || "Curso Global"}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {curso.titulo}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge 
            variant="outline"
            className={`px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border ${
              curso.estado === 'activo' 
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' 
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
            }`}
          >
            {curso.estado}
          </Badge>
          {(isLider || isAdmin) && (
            <Button
              onClick={() => setShowAgregarPersonas(true)}
              size="sm"
              className="h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Añadir personas</span>
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/50 bg-background/50 hover:bg-accent shadow-sm">
            <Settings className="h-4 w-4 text-primary" />
          </Button>
        </div>
      </motion.div>

      {/* Estadísticas Rápidas */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {[
          { label: "Módulos", value: totalModulos, icon: <BookOpen className="h-5 w-5" />, color: "from-[#4682b4] to-[#709dbd]" },
          { label: "Publicados", value: modulosPublicados, icon: <Eye className="h-5 w-5" />, color: "from-emerald-500 to-emerald-400" },
          { label: "Servidores", value: miembrosActivos, icon: <Users className="h-5 w-5" />, color: "from-indigo-500 to-indigo-400" },
          { label: "Progreso", value: `${promedioProgreso}%`, icon: <TrendingUp className="h-5 w-5" />, color: "from-amber-500 to-amber-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-sm shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {cursoVacio && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-primary/5 border border-primary/20 border-dashed rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6 justify-between"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <FolderOpen className="w-8 h-8 text-primary/60" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/80 mb-1">Curso en preparación</p>
              <h3 className="text-xl font-bold tracking-tight text-foreground">Este curso aún no tiene módulos publicados</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Agrega módulos con objetivos claros, actividades y evaluación para que los servidores puedan iniciar su ruta de aprendizaje.
              </p>
            </div>
          </div>
          {(isLider || isAdmin) && (
            <Button
              onClick={() => setShowAgregarPersonas(true)}
              className="rounded-xl px-5 shadow-sm whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Gestionar participantes
            </Button>
          )}
        </motion.div>
      )}

      {/* Contenido Principal */}
      <Tabs defaultValue="modulos" className="space-y-6">
        <div className="flex items-center justify-between overflow-x-auto pb-2 no-scrollbar">
          <TabsList className="inline-flex h-auto rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-1.5 shadow-sm">
            <TabsTrigger value="modulos" className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Módulos
            </TabsTrigger>
            <TabsTrigger value="evaluaciones" className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Evaluaciones
            </TabsTrigger>
            <TabsTrigger value="progreso" className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Progreso
            </TabsTrigger>
            <TabsTrigger value="servidores" className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
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

        <TabsContent value="evaluaciones" className="mt-6">
          {(isLider || isAdmin) ? (
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-8 text-center shadow-sm">
              <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold">Gestión de Evaluaciones</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Los líderes pueden configurar evaluaciones en cada módulo directamente desde la pestaña "Módulos".
              </p>
            </div>
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
  const [moduloSeleccionado, setModuloSeleccionado] = useState<number | null>(null)
  const [showCrearEvaluacion, setShowCrearEvaluacion] = useState(false)
  const { canCreateModulos } = useEvaluacionPermissions(idCurso)

  const { data: modulos, refetch } = useQuery({
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

  const handleCrearEvaluacion = (idModulo: number) => {
    setModuloSeleccionado(idModulo)
    setShowCrearEvaluacion(true)
  }

  const handleEvaluacionCreada = () => {
    setShowCrearEvaluacion(false)
    setModuloSeleccionado(null)
    refetch()
  }

  if (!modulos || modulos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ClipboardList className="w-12 h-12 opacity-20 mb-4" />
        <p className="text-base font-semibold">No hay módulos aún</p>
        <p className="text-sm">Crea módulos en la pestaña anterior para agregar evaluaciones</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {modulos.map(mod => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={mod.id_aula_modulo}
            className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-5 border-b border-border/40 bg-card/20 flex items-center justify-between">
              <h3 className="font-bold text-lg">{mod.titulo}</h3>
              {canCreateModulos && (
                <button
                  onClick={() => handleCrearEvaluacion(mod.id_aula_modulo)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Crear
                </button>
              )}
            </div>
            <div className="p-5">
              {mod.evaluaciones?.length ? (
                <div className="space-y-3">
                  {mod.evaluaciones.map((ev: any) => (
                    <div key={ev.id_aula_evaluacion} className="flex items-center gap-3 p-3 bg-accent/20 rounded-xl border border-border/30">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{ev.titulo}</p>
                        <p className="text-xs text-muted-foreground">Mínimo para aprobar: {ev.puntaje_minimo}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ClipboardList className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-sm font-semibold mb-2">Sin evaluaciones</p>
                  {canCreateModulos && (
                    <button
                      onClick={() => handleCrearEvaluacion(mod.id_aula_modulo)}
                      className="text-xs font-semibold text-primary hover:underline mt-2"
                    >
                      + Crear evaluación
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {moduloSeleccionado && (
        <CrearEvaluacionDialog
          open={showCrearEvaluacion}
          onOpenChange={setShowCrearEvaluacion}
          idModulo={moduloSeleccionado}
          onSuccess={handleEvaluacionCreada}
        />
      )}
    </>
  )
}

function useEvaluacionPermissions(idCurso: number) {
  const { user } = useAuth()
  const [canCreateModulos, setCanCreateModulos] = useState(false)

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.id) return
      const internalId = await getInternalUserId(user.id)
      if (!internalId) return

      const { data: curso } = await supabase
        .from('aula_curso')
        .select('id_usuario_creador, id_ministerio')
        .eq('id_aula_curso', idCurso)
        .maybeSingle()

      if (!curso) return

      const isCreator = curso.id_usuario_creador === internalId

      let isLider = false
      if (curso.id_ministerio) {
        const { data: liderData } = await supabase
          .from('miembro_ministerio')
          .select('id_usuario')
          .eq('id_ministerio', curso.id_ministerio)
          .eq('id_usuario', internalId)
          .eq('rol_en_ministerio', 'lider')
          .is('fecha_salida', null)
          .maybeSingle()
        isLider = !!liderData
      }

      setCanCreateModulos(isCreator || isLider)
    }

    checkPermissions()
  }, [user?.id, idCurso])

  return { canCreateModulos }
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
        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 text-center shadow-sm hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 mx-auto mb-3 flex items-center justify-center">
            <UserCheck className="h-6 w-6" />
          </div>
          <div className="text-3xl font-black">{miembrosActivos}</div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Servidores activos</p>
        </div>

        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 text-center shadow-sm hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto mb-3 flex items-center justify-center">
            <Award className="h-6 w-6" />
          </div>
          <div className="text-3xl font-black">{miembrosCompletaron}</div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Completaron curso</p>
        </div>

        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 text-center shadow-sm hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 mx-auto mb-3 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="text-3xl font-black">{promedioProgreso}%</div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Progreso promedio</p>
        </div>
      </div>

      <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/40 bg-card/20">
          <h3 className="font-bold text-lg">Distribución de Progreso</h3>
          <p className="text-sm text-muted-foreground">Progreso de todos los servidores inscritos</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {progresoGrupo
              .sort((a, b) => b.porcentaje - a.porcentaje)
              .slice(0, 10)
              .map((servidor, index) => (
                <div key={servidor.idUsuario} className="flex items-center space-x-4 p-3 rounded-2xl hover:bg-accent/30 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] text-white font-bold shadow-sm">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{servidor.nombre}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Progress value={servidor.porcentaje} className="h-2 flex-1 bg-muted/50" />
                      <span className="text-xs font-bold w-10 text-right">{servidor.porcentaje}%</span>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
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
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-amber-500/20 bg-amber-500/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-amber-700 dark:text-amber-500">Servidores que necesitan atención</h3>
              <p className="text-sm text-amber-600/80 dark:text-amber-500/80">Servidores con menos del 25% de progreso</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {servidoresAtrasados.map((servidor) => (
                <div
                  key={servidor.idUsuario}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-amber-500/20 bg-background/50 p-4 transition-all hover:bg-amber-500/10 hover:shadow-md group"
                  onClick={() => navigate(`${aulaBasePath}/curso/${idCurso}/servidor/${servidor.idUsuario}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-500 font-bold group-hover:scale-110 transition-transform">
                      {servidor.nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{servidor.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{servidor.correo}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">{servidor.porcentaje}%</Badge>
                    <div className="w-20 sm:w-24">
                      <Progress value={servidor.porcentaje} className="h-1.5 bg-amber-500/20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/40 bg-card/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">Todos los Servidores</h3>
            <p className="text-sm text-muted-foreground">Lista completa de servidores inscritos</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {progresoGrupo.map((servidor) => (
                <div
                  key={servidor.idUsuario}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-border/50 bg-background/50 p-4 transition-all hover:bg-accent/50 hover:shadow-md group"
                  onClick={() => navigate(`${aulaBasePath}/curso/${idCurso}/servidor/${servidor.idUsuario}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#709dbd]/20 to-[#4682b4]/10 text-[#4682b4] flex items-center justify-center font-bold group-hover:scale-110 transition-transform shadow-sm">
                      {servidor.nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{servidor.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{servidor.correo}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={servidor.completado ? "default" : servidor.porcentaje > 50 ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      {servidor.porcentaje}%
                    </Badge>
                    <div className="w-20 sm:w-24">
                      <Progress value={servidor.porcentaje} className="h-1.5 bg-muted/50" />
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
