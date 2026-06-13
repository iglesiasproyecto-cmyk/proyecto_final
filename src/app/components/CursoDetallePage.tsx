import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/app/store/AppContext'
import { debugLog } from '@/lib/debug'
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
  UserMinus,
  AlertCircle,
  UserPlus,
  ClipboardList,
  Loader2,
  Mail
} from 'lucide-react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { useCursos } from '@/hooks/useCursos'
import { useProgresoGrupoCurso } from '@/hooks/useProgreso'
import { ModulosGestion } from './ModulosGestion'
import { AgregarPersonasCursoDialog } from '@/app/components/aula/AgregarPersonasCursoDialog'
import { useInscripcionesCurso, useRetirarInscripcion, useReactivarInscripcion } from '@/hooks/useInscripciones'
import { ModulosNavegacion } from './ModulosNavegacion'
import { CrearEvaluacionDialog } from '@/app/components/CrearEvaluacionDialog'
import { EditarEvaluacionDialog } from '@/app/components/EditarEvaluacionDialog'
import { CalificacionesTab } from '@/app/components/CalificacionesTab'
import { EvaluacionInteractiva } from '@/app/components/EvaluacionInteractiva'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'

export function CursoDetallePage() {
  const { idCurso } = useParams<{ idCurso: string }>()
  const navigate = useNavigate()
  const { user, rolActual, iglesiaActual } = useAuth()
  const aulaBasePath = iglesiaActual?.id ? `/app/${iglesiaActual.id}/aula` : '/app'
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [showAgregarPersonas, setShowAgregarPersonas] = useState(false)
  const [activeTab, setActiveTab] = useState('modulos')

  debugLog('CursoDetallePage', 'Loaded with:', { idCurso, rolActual, iglesiaActualId: iglesiaActual?.id, aulaBasePath, userEmail: user?.email })

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

    debugLog('CursoDetallePage', 'Access check:', {
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
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header - Refined Professional Layout */}
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(aulaBasePath)}
          className="h-9 rounded-lg px-3 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al aula
        </Button>

        {/* Title Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Detalle del curso</p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">{curso.titulo}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 rounded-full px-3 py-1 text-xs font-semibold">
              {curso.ministerio?.nombre}
            </Badge>
            <Badge
              className={`rounded-full px-3 py-1 text-xs font-semibold border-none w-fit ${
                curso.estado === 'activo'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
              }`}
            >
              {curso.estado === 'activo' ? '✓ Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        {(isLider || isAdmin) && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowAgregarPersonas(true)}
              className="h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg shadow-primary/20 transition-all"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar personas
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-primary/30 hover:bg-primary/5 transition-all"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards - Modern Elegant Design */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Modules */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent border border-primary/20 p-5 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300">
          <div className="absolute -right-8 -top-8 w-16 h-16 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all" />
          <div className="relative z-10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{totalModulos}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Módulos</p>
            </div>
          </div>
        </div>

        {/* Published */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border border-emerald-500/20 p-5 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-300">
          <div className="absolute -right-8 -top-8 w-16 h-16 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-all" />
          <div className="relative z-10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Eye className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{modulosPublicados}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Publicados</p>
            </div>
          </div>
        </div>

        {/* Servers */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-transparent to-transparent border border-blue-500/20 p-5 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-300">
          <div className="absolute -right-8 -top-8 w-16 h-16 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-all" />
          <div className="relative z-10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{miembrosActivos}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Servidores</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-transparent border border-amber-500/20 p-5 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all duration-300">
          <div className="absolute -right-8 -top-8 w-16 h-16 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 transition-all" />
          <div className="relative z-10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{promedioProgreso}%</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Progreso</p>
            </div>
          </div>
        </div>
      </div>

      {cursoVacio && (isLider || isAdmin) && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-8">
          <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-primary/10" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Comienza aquí</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Agrega módulos para comenzar</h3>
              <p className="text-sm text-muted-foreground/80 max-w-lg">
                Crea un plan de aprendizaje estructurado. Agrega módulos con objetivos claros, actividades interactivas y evaluaciones para que los servidores puedan avanzar en su ruta de aprendizaje.
              </p>
            </div>
            {(isLider || isAdmin) && (
              <Button
                onClick={() => setActiveTab('modulos')}
                className="h-12 rounded-xl px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg shadow-primary/20 whitespace-nowrap transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar módulos
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Contenido Principal - Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between overflow-x-auto pb-3 no-scrollbar">
          <TabsList className="inline-flex gap-2 rounded-xl border border-white/10 bg-white/5 dark:bg-black/10 p-1 backdrop-blur-md">
            <TabsTrigger
              value="modulos"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-black/30 data-[state=active]:text-primary data-[state=active]:shadow-lg hover:text-primary/80"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Módulos
            </TabsTrigger>
            <TabsTrigger
              value="evaluaciones"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-black/30 data-[state=active]:text-primary data-[state=active]:shadow-lg hover:text-primary/80"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Evaluaciones
            </TabsTrigger>
            {(isLider || isAdmin) && (
              <TabsTrigger
                value="calificaciones"
                className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-black/30 data-[state=active]:text-primary data-[state=active]:shadow-lg hover:text-primary/80"
              >
                <Award className="h-4 w-4 mr-2" />
                Calificaciones
              </TabsTrigger>
            )}
            {(isLider || isAdmin) && (
              <TabsTrigger
                value="progreso"
                className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-black/30 data-[state=active]:text-primary data-[state=active]:shadow-lg hover:text-primary/80"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Progreso
              </TabsTrigger>
            )}
            {(isLider || isAdmin) && (
              <TabsTrigger
                value="servidores"
                className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-black/30 data-[state=active]:text-primary data-[state=active]:shadow-lg hover:text-primary/80"
              >
                <Users className="h-4 w-4 mr-2" />
                Servidores
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
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
              <EvaluacionesTab idCurso={parseInt(idCurso!)} isAdmin={isAdmin} isLider={isLider} />
            </TabsContent>

            {(isLider || isAdmin) && (
              <TabsContent value="calificaciones">
                <CalificacionesTab idCurso={parseInt(idCurso!)} />
              </TabsContent>
            )}

            {(isLider || isAdmin) && (
              <TabsContent value="progreso">
                <ProgresoCursoTab progresoGrupo={progresoGrupo || []} />
              </TabsContent>
            )}

            {(isLider || isAdmin) && (
              <TabsContent value="servidores">
                <ServidoresCursoTab
                  progresoGrupo={progresoGrupo || []}
                  aulaBasePath={aulaBasePath}
                  idCurso={Number(idCurso)}
                  puedeGestionar={isLider || isAdmin}
                  onAgregar={() => setShowAgregarPersonas(true)}
                />
              </TabsContent>
            )}
          </motion.div>
        </AnimatePresence>
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
function EvaluacionesTab({ idCurso, isAdmin, isLider }: { idCurso: number; isAdmin: boolean; isLider: boolean }) {
  const queryClient = useQueryClient()
  const [moduloSeleccionado, setModuloSeleccionado] = useState<number | null>(null)
  const [showCrearEvaluacion, setShowCrearEvaluacion] = useState(false)
  const [evaluacionEditar, setEvaluacionEditar] = useState<any | null>(null)
  const [confirmDelete, setConfirmDelete] = useState({ id: 0, titulo: '', isOpen: false })
  const [evaluacionAbierta, setEvaluacionAbierta] = useState<{ idModulo: number; titulo: string } | null>(null)

  const { data: modulos, isLoading } = useQuery({
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
            descripcion,
            puntaje_minimo,
            max_intentos
          )
        `)
        .eq('id_aula_curso', idCurso)
        .order('orden', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  const deleteEvaluacionMutation = useMutation({
    mutationFn: async (idEvaluacion: number) => {
      const { data, error } = await supabase.rpc('eliminar_evaluacion', { p_id_evaluacion: idEvaluacion })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success("Evaluación eliminada correctamente")
      queryClient.invalidateQueries({ queryKey: ['modulos-evaluaciones', idCurso] })
      setConfirmDelete({ id: 0, titulo: '', isOpen: false })
    },
    onError: (error) => {
      console.error('Error al eliminar evaluación:', error)
      toast.error("Error al eliminar la evaluación")
    }
  })

  if (isLoading) return <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>

  const canEdit = isAdmin || isLider

  return (
    <div className="space-y-6">
      {modulos?.map(mod => (
        <Card key={mod.id_aula_modulo} className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-xl font-bold">{mod.titulo}</CardTitle>
              {canEdit && (
                <Button 
                  size="sm" 
                  className="rounded-xl font-semibold shadow-md"
                  onClick={() => {
                    setModuloSeleccionado(mod.id_aula_modulo)
                    setShowCrearEvaluacion(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Crear Evaluación
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {mod.evaluaciones?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mod.evaluaciones.map((ev: any) => (
                  <div key={ev.id_aula_evaluacion} className="group relative bg-background/50 border border-white/5 rounded-2xl p-4 hover:bg-background/80 transition-all hover:shadow-lg">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-base flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-primary" /> {ev.titulo}
                        </h4>
                        {ev.descripcion && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ev.descripcion}</p>}
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                            Mín. {ev.puntaje_minimo}%
                          </Badge>
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Settings className="w-3 h-3" /> {ev.max_intentos} Intentos
                          </span>
                        </div>
                      </div>
                      
                      {canEdit ? (
                        <div className="flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                            onClick={() => setEvaluacionEditar(ev)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            onClick={() => setConfirmDelete({ id: ev.id_aula_evaluacion, titulo: ev.titulo, isOpen: true })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-xl bg-[#4682b4] text-white hover:bg-[#4682b4]/90 shrink-0"
                          onClick={() => setEvaluacionAbierta(
                            evaluacionAbierta?.idModulo === mod.id_aula_modulo
                              ? null
                              : { idModulo: mod.id_aula_modulo, titulo: ev.titulo }
                          )}
                        >
                          <ClipboardList className="w-4 h-4 mr-1.5" />
                          {evaluacionAbierta?.idModulo === mod.id_aula_modulo ? 'Cerrar' : 'Realizar'}
                        </Button>
                      )}
                    </div>
                    {evaluacionAbierta?.idModulo === mod.id_aula_modulo && !canEdit && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <EvaluacionInteractiva
                          idModulo={mod.id_aula_modulo}
                          onCompletar={() => setEvaluacionAbierta(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p className="text-muted-foreground text-sm font-medium">No hay evaluaciones en este módulo.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {canEdit && showCrearEvaluacion && moduloSeleccionado && (
        <CrearEvaluacionDialog
          open={showCrearEvaluacion}
          onOpenChange={(open) => {
            if (!open) {
              setShowCrearEvaluacion(false)
              setModuloSeleccionado(null)
            }
          }}
          idModulo={moduloSeleccionado}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['modulos-evaluaciones', idCurso] })
            setShowCrearEvaluacion(false)
            setModuloSeleccionado(null)
          }}
        />
      )}

      {canEdit && evaluacionEditar && (
        <EditarEvaluacionDialog
          open={!!evaluacionEditar}
          onOpenChange={(open) => { if (!open) setEvaluacionEditar(null) }}
          idEvaluacion={evaluacionEditar.id_aula_evaluacion}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['modulos-evaluaciones', idCurso] })
            setEvaluacionEditar(null)
          }}
        />
      )}

      {canEdit && confirmDelete.isOpen && (
        <Dialog open={confirmDelete.isOpen} onOpenChange={(open) => !open && setConfirmDelete({ id: 0, titulo: '', isOpen: false })}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-500">
                <AlertCircle className="w-5 h-5" /> Eliminar Evaluación
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que deseas eliminar la evaluación <span className="font-bold text-foreground">"{confirmDelete.titulo}"</span>?
                Esta acción eliminará permanentemente todas sus preguntas, opciones y los intentos registrados de los alumnos. No se puede deshacer.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" className="rounded-xl font-semibold" onClick={() => setConfirmDelete({ id: 0, titulo: '', isOpen: false })}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                className="rounded-xl font-bold px-6 shadow-md"
                disabled={deleteEvaluacionMutation.isPending}
                onClick={() => deleteEvaluacionMutation.mutate(confirmDelete.id)}
              >
                {deleteEvaluacionMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
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
function ServidoresCursoTab({
  progresoGrupo,
  aulaBasePath,
  idCurso,
  puedeGestionar,
  onAgregar,
}: {
  progresoGrupo: any[]
  aulaBasePath: string
  idCurso: number
  puedeGestionar: boolean
  onAgregar: () => void
}) {
  const navigate = useNavigate()
  const { data: inscripciones = [], isLoading } = useInscripcionesCurso(idCurso)
  const retirarMutation = useRetirarInscripcion()
  const reactivarMutation = useReactivarInscripcion()

  // Progreso indexado por id_usuario para enriquecer cada fila
  const progresoPorUsuario = new Map<number, any>(
    progresoGrupo.map((p) => [p.idUsuario, p])
  )

  const activos = inscripciones.filter((i: any) => i.activo)
  const inactivos = inscripciones.filter((i: any) => !i.activo)

  const getUsuario = (i: any) => (Array.isArray(i.usuario) ? i.usuario[0] : i.usuario) ?? {}

  const handleRetirar = (i: any, nombre: string) => {
    retirarMutation.mutate(i.id_aula_inscripcion, {
      onSuccess: () => toast.success(`${nombre} fue retirado del curso`),
      onError: () => toast.error('No se pudo retirar al servidor'),
    })
  }

  const handleReactivar = (i: any, nombre: string) => {
    reactivarMutation.mutate(i.id_aula_inscripcion, {
      onSuccess: () => toast.success(`${nombre} fue reactivado en el curso`),
      onError: () => toast.error('No se pudo reactivar al servidor'),
    })
  }

  const renderFila = (i: any, activo: boolean) => {
    const u = getUsuario(i)
    const nombre = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim() || 'Sin nombre'
    const prog = progresoPorUsuario.get(i.id_usuario)
    const porcentaje = prog?.porcentaje ?? 0
    const isPending = retirarMutation.isPending || reactivarMutation.isPending
    const iniciales = (u.nombres?.[0] ?? '?').toUpperCase() + (u.apellidos?.[0] ?? '').toUpperCase()

    return (
      <div
        key={i.id_aula_inscripcion}
        className={`flex items-center justify-between gap-3 rounded-2xl border border-white/10 p-3 transition-colors hover:bg-accent/50 ${
          activo ? '' : 'opacity-60'
        }`}
      >
        <div
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
          onClick={() => navigate(`${aulaBasePath}/curso/${idCurso}/servidor/${i.id_usuario}`)}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4682b4]/10 text-sm font-black text-[#4682b4]">
            {iniciales}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{nombre}</p>
            <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              {u.correo ?? '—'}
            </p>
          </div>
        </div>

        <div className="hidden w-28 shrink-0 sm:block">
          <div className="mb-1 flex justify-end">
            <Badge
              variant={porcentaje === 100 ? 'default' : porcentaje > 50 ? 'secondary' : 'outline'}
              className="text-[10px]"
            >
              {porcentaje}%
            </Badge>
          </div>
          <Progress value={porcentaje} className="h-2" />
        </div>

        {puedeGestionar && (
          <div className="shrink-0">
            {activo ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => handleRetirar(i, nombre)}
                className="rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              >
                <UserMinus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Quitar</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => handleReactivar(i, nombre)}
                className="rounded-xl text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
              >
                <UserCheck className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Reactivar</span>
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Servidores del curso</CardTitle>
          <CardDescription>
            {activos.length} inscrito{activos.length === 1 ? '' : 's'}
            {inactivos.length > 0 && ` · ${inactivos.length} retirado${inactivos.length === 1 ? '' : 's'}`}
          </CardDescription>
        </div>
        {puedeGestionar && (
          <Button
            onClick={onAgregar}
            size="sm"
            className="h-10 shrink-0 rounded-2xl bg-[#4682b4] text-white hover:bg-[#4682b4]/90"
          >
            <UserPlus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Agregar personas</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando servidores...</span>
          </div>
        ) : inscripciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
            <div className="mb-3 rounded-2xl bg-muted/40 p-3">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold">Aún no hay servidores inscritos</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Usa "Agregar personas" para inscribir miembros del ministerio de este curso.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">{activos.map((i: any) => renderFila(i, true))}</div>
            {inactivos.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Retirados
                </p>
                {inactivos.map((i: any) => renderFila(i, false))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
