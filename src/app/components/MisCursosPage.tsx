import React, { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useApp } from '../store/AppContext'
import { useMisInscripciones } from '@/hooks/useInscripciones'
import { useMiAvanceCurso } from '@/hooks/useAvance'
import { useEvaluaciones, useCursos, useModulos } from '@/hooks/useCursos'
import { useIntentosUsuario, useIniciarIntento } from '@/hooks/useEvaluaciones'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { EstadoInscripcionBadge } from './classroom/EstadoInscripcionBadge'
import { CompanerosDrawer } from './classroom/CompanerosDrawer'
import { ResolucionEvaluacion } from './classroom/ResolucionEvaluacion'
import { ResultadosEvaluacion } from './classroom/ResultadosEvaluacion'
import { BookOpen, Calendar, GraduationCap, Users, Award, ClipboardCheck, Play, Eye } from 'lucide-react'
import type { Evaluacion } from '@/types/app.types'

const ACTIVOS = new Set(['inscrito', 'en_progreso'] as const)

function ModulosDeCurso({ idCurso }: { idCurso: number }) {
  const { data: modulos = [], isLoading } = useModulos(idCurso)
  const publicados = modulos
    .filter((m) => m.estado === 'publicado')
    .sort((a, b) => a.orden - b.orden)

  if (isLoading) {
    return <p className="text-[11px] text-muted-foreground">Cargando módulos...</p>
  }

  if (publicados.length === 0) {
    return <p className="text-[11px] text-muted-foreground italic">Aún no hay módulos publicados.</p>
  }

  return (
    <ul className="space-y-1">
      {publicados.map((m) => (
        <li key={m.idModulo}>
          <Link
            to={`/app/aula/curso/${idCurso}/modulo/${m.idModulo}`}
            className="flex items-center justify-between gap-2 text-[11px] px-2 py-1 rounded-md hover:bg-accent/40 transition-colors"
          >
            <span className="truncate">
              <span className="font-semibold">{m.orden}.</span> {m.titulo}
            </span>
            <span className="text-primary shrink-0">Abrir →</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function NotaFinal({
  idCurso,
  estadoDetalle,
  evaluaciones,
}: {
  idCurso: number
  estadoDetalle: string
  evaluaciones: Evaluacion[]
}) {
  const { data: modulos = [] } = useModulos(idCurso)
  const idModulosCurso = new Set(modulos.map((m) => m.idModulo))
  const relevantes = evaluaciones.filter(
    (e) =>
      idModulosCurso.has(e.idModulo) &&
      typeof e.calificacion === 'number' &&
      (e.estado === 'aprobado' || e.estado === 'reprobado'),
  )
  if (relevantes.length === 0) return null
  const promedio =
    Math.round(
      (relevantes.reduce((acc, e) => acc + (e.calificacion ?? 0), 0) / relevantes.length) * 10,
    ) / 10
  const aprobado = estadoDetalle === 'completado' && promedio >= 3
  return (
    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Award className="w-3 h-3" /> Nota final
      </span>
      <span
        className={`text-sm font-bold ${
          aprobado ? 'text-emerald-500' : promedio >= 3 ? 'text-foreground' : 'text-destructive'
        }`}
      >
        {promedio.toFixed(1)}
      </span>
    </div>
  )
}

export function MisCursosPage() {
  const { usuarioActual } = useApp()
  const { data: inscripciones = [], isLoading } = useMisInscripciones(usuarioActual?.idUsuario)
  const { data: avances = [] } = useMiAvanceCurso(usuarioActual?.idUsuario)
  const { data: evaluaciones = [] } = useEvaluaciones(usuarioActual?.idUsuario)
  const { data: cursos = [] } = useCursos()
  const [tab, setTab] = useState<'activos' | 'finalizados' | 'evaluaciones'>('activos')
  const [drawerCiclo, setDrawerCiclo] = useState<{ id: number; curso: string } | null>(null)

  // Estado para evaluaciones de cuestionario
  const [evaluacionActual, setEvaluacionActual] = useState<{ idEvaluacion: number; titulo: string } | null>(null)
  const [idIntentoActual, setIdIntentoActual] = useState<number | null>(null)
  const [mostrandoResultado, setMostrandoResultado] = useState(false)

  const iniciarEvaluacion = useIniciarIntento()

  const activos = inscripciones.filter((i) => ACTIVOS.has(i.estado as 'inscrito' | 'en_progreso'))
  const finalizados = inscripciones.filter((i) => !ACTIVOS.has(i.estado as 'inscrito' | 'en_progreso'))
  const visibles = tab === 'activos' ? activos : finalizados

  const progresoPorDetalle = new Map(
    avances.map((a) => [
      a.idDetalleProcesoCurso,
      a.modulosPublicados > 0 ? Math.round((a.modulosCompletados / a.modulosPublicados) * 100) : 0,
    ]),
  )

  // Lógica básica para evaluaciones (placeholder hasta implementar completamente)
  const evaluacionesDisponibles = React.useMemo(() => {
    // Placeholder: retornar array vacío por ahora
    // TODO: Implementar lógica completa para obtener evaluaciones disponibles
    return []
  }, [])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

  const handleIniciarEvaluacion = async (idEvaluacion: number, titulo: string) => {
    if (!usuarioActual) return

    try {
      const result = await iniciarEvaluacion.mutateAsync({
        idEvaluacion,
        idUsuario: usuarioActual.idUsuario
      })

      setEvaluacionActual({ idEvaluacion, titulo })
      setIdIntentoActual(result.idIntento)
      setMostrandoResultado(false)
    } catch (error) {
      toast.error('Error al iniciar la evaluación')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Cargando tus cursos...
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center gap-4"
      >
        <div className="absolute top-0 right-0 w-72 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="flex items-center gap-4 flex-1">
          <div className="w-11 h-11 rounded-2xl bg-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-none">Mis Cursos</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {activos.length} activos · {finalizados.length} finalizados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-xl p-1">
          {(['activos', 'finalizados', 'evaluaciones'] as const).map((t) => (
            <button
              key={t}
              className={`px-4 h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition-all capitalize ${
                tab === t 
                  ? 'bg-[#4682b4] text-white shadow-md shadow-blue-900/20' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </motion.div>

      {tab === 'evaluaciones' ? (
        // Sección de Evaluaciones
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-card/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-sm"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Mis Evaluaciones</h2>
                <p className="text-muted-foreground text-sm">
                  Evalúa tus conocimientos con cuestionarios interactivos
                </p>
              </div>
            </div>

            {evaluacionesDisponibles.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/40 flex items-center justify-center">
                  <ClipboardCheck className="w-7 h-7 opacity-40" />
                </div>
                <p className="font-semibold text-sm">No hay evaluaciones disponibles</p>
                <p className="text-xs">Las evaluaciones aparecerán aquí cuando tus instructores las publiquen.</p>
              </div>
            ) : (
              // Lista de evaluaciones disponibles
              <div className="space-y-4">
                {evaluacionesDisponibles.map((item) => (
                  <Card key={item.evaluacion.idEvaluacion} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.evaluacion.titulo}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.curso.nombre} • {item.modulo.titulo}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Intentos: {item.intentosPrevios}</span>
                          <span>Máx: {item.evaluacion.maxIntentos}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleIniciarEvaluacion(item.evaluacion.idEvaluacion, item.evaluacion.titulo)}
                        disabled={!item.puedeTomar}
                        className="rounded-xl"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {item.intentosPrevios === 0 ? 'Iniciar' : 'Reintentar'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>

          {/* Modales para evaluación y resultados */}
          {evaluacionActual && idIntentoActual && !mostrandoResultado && (
            <ResolucionEvaluacion
              idEvaluacion={evaluacionActual.idEvaluacion}
              idIntento={idIntentoActual}
              onFinalized={(idIntento) => {
                setIdIntentoActual(idIntento)
                setMostrandoResultado(true)
              }}
            />
          )}

          {mostrandoResultado && idIntentoActual && (
            <ResultadosEvaluacion
              idIntento={idIntentoActual}
              onVolver={() => {
                setEvaluacionActual(null)
                setIdIntentoActual(null)
                setMostrandoResultado(false)
              }}
            />
          )}
        </div>
      ) : visibles.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/40 flex items-center justify-center">
            <BookOpen className="w-7 h-7 opacity-40" />
          </div>
          <p className="font-semibold text-sm">
            {tab === 'activos'
              ? 'Aún no estás inscrito en ningún curso.'
              : tab === 'finalizados'
              ? 'Todavía no tienes cursos finalizados.'
              : 'No hay evaluaciones disponibles.'}
          </p>
          {tab === 'activos' && (
            <p className="text-xs">Tu líder o admin te inscribirá cuando haya un ciclo disponible.</p>
          )}
          {tab === 'evaluaciones' && (
            <p className="text-xs">Las evaluaciones aparecerán aquí cuando tus instructores las publiquen.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibles.map((i, idx) => {
            const progreso = progresoPorDetalle.get(i.idDetalleProcesoCurso) ?? 0
            return (
            <motion.div
              key={i.idDetalleProcesoCurso}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm leading-tight truncate">{i.nombreCurso}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {i.nombreMinisterio} · {i.nombreIglesia}
                    </p>
                  </div>
                  <EstadoInscripcionBadge estado={i.estado} />
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(i.fechaInicioCiclo)} - {formatDate(i.fechaFinCiclo)}
                </p>
                <div>
                  <div className="flex items-center justify-between mb-1 text-[11px] text-muted-foreground">
                    <span>Progreso</span>
                    <span>{progreso}%</span>
                  </div>
                  <Progress value={progreso} className="h-1.5 bg-background/50" />
                </div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Módulos</p>
                  <ModulosDeCurso idCurso={i.idCurso} />
                </div>
                <NotaFinal
                  idCurso={i.idCurso}
                  estadoDetalle={i.estado}
                  evaluaciones={evaluaciones}
                />
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-9 rounded-xl text-xs bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-md shadow-blue-900/20"
                    onClick={() => setDrawerCiclo({ id: i.idProcesoAsignadoCurso, curso: i.nombreCurso })}
                  >
                    <Users className="w-3.5 h-3.5 mr-1" /> Compañeros
                  </Button>
                </div>
              </Card>
            </motion.div>
            )
          })}
        </div>
      )}

      <CompanerosDrawer
        idCiclo={drawerCiclo?.id ?? null}
        cursoNombre={drawerCiclo?.curso ?? ''}
        onClose={() => setDrawerCiclo(null)}
      />
    </div>
  )
}
