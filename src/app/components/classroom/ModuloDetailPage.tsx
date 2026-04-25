import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useApp } from '../../store/AppContext'
import { useModulo } from '@/hooks/useModulo'
import { useCreateRecurso, useCursos, useDeleteRecurso, useModulos, useRecursos, useEvaluacionesEnriquecidas } from '@/hooks/useCursos'
import { uploadRecursoArchivo, getRecursoSignedUrl, validateRecursoFile, createEvaluacion } from '@/services/cursos.service'
import { useMisInscripciones } from '@/hooks/useInscripciones'
import { useMinisteriosIdsDeUsuario } from '@/hooks/useMinisterios'
import {
  useAvancesDetalle,
  useMarcarModuloCompletado,
  useDesmarcarModuloCompletado,
} from '@/hooks/useAvance'
import { ModuloBreadcrumb } from './ModuloBreadcrumb'
import { ModuloNavegacion } from './ModuloNavegacion'
import { ModuloContenidoEditor } from './ModuloContenidoEditor'
import { ModuloContenidoView } from './ModuloContenidoView'
import { CreadorPreguntas } from './CreadorPreguntas'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Link as LinkIcon, FileText, Trash2, Plus, CheckCircle2, Circle, ClipboardCheck } from 'lucide-react'

export function ModuloDetailPage() {
  const { idCurso: idCursoStr, idModulo: idModuloStr } = useParams()
  const idCurso = Number(idCursoStr)
  const idModulo = Number(idModuloStr)
  const navigate = useNavigate()
  const { rolActual, usuarioActual } = useApp()

  const { data: modulo, isLoading: loadingModulo, error: errorModulo } = useModulo(idModulo)
  const { data: recursos = [], isLoading: loadingRecursos } = useRecursos(idModulo)
  const { data: modulos = [] } = useModulos(idCurso)
  const { data: cursos = [], isLoading: loadingCursos } = useCursos()
  const curso = cursos.find((c) => c.idCurso === idCurso)

  const { data: evaluaciones = [] } = useEvaluacionesEnriquecidas(idModulo)

  const { data: misInscripciones = [], isLoading: loadingInscripciones } = useMisInscripciones(usuarioActual?.idUsuario)
  const { isLoading: loadingMinisterios } = useMinisteriosIdsDeUsuario(usuarioActual?.idUsuario)
  const createRecursoMutation = useCreateRecurso()
  const deleteRecursoMutation = useDeleteRecurso()
  const [recursoForm, setRecursoForm] = useState({ nombre: '', tipo: 'archivo' as 'archivo' | 'enlace', url: '' })
  const [recursoFile, setRecursoFile] = useState<File | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  // Estado para evaluaciones
  const [showCreateEvaluacion, setShowCreateEvaluacion] = useState(false)
  const [showCreadorPreguntas, setShowCreadorPreguntas] = useState(false)
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState<number | null>(null)
  const [evaluacionForm, setEvaluacionForm] = useState({
    titulo: '',
    descripcion: '',
    puntajeMinimo: 60,
    maxIntentos: 3,
    activo: true
  })

  const canEdit = useMemo(() => {
    // Si lider pudo leer el modulo por RLS, su scope le permite gestionarlo.
    if (rolActual === 'lider' && !!modulo) return true
    return false
  }, [rolActual, modulo])

  const inscripcionActiva = useMemo(
    () =>
      misInscripciones.find(
        (i) => i.idCurso === idCurso && (i.estado === 'inscrito' || i.estado === 'en_progreso')
      ),
    [misInscripciones, idCurso],
  )

  const canReadAsStudent = useMemo(() => {
    if (canEdit) return true
    return !!inscripcionActiva
  }, [canEdit, inscripcionActiva])

  const idDetalleInscripcion = inscripcionActiva?.idDetalleProcesoCurso ?? null
  const { data: avancesDetalle = [] } = useAvancesDetalle(idDetalleInscripcion)
  const avanceActual = avancesDetalle.find((a) => a.idModulo === idModulo) ?? null
  const marcarMutation = useMarcarModuloCompletado()
  const desmarcarMutation = useDesmarcarModuloCompletado()

  const puedeMarcarProgreso =
    !canEdit &&
    !!inscripcionActiva &&
    !!modulo &&
    modulo.estado === 'publicado' &&
    !!usuarioActual

  const handleToggleCompletado = async () => {
    if (!puedeMarcarProgreso || !inscripcionActiva || !usuarioActual) return
    try {
      if (avanceActual) {
        await desmarcarMutation.mutateAsync({
          idAvance: avanceActual.idAvance,
          idDetalleProcesoCurso: inscripcionActiva.idDetalleProcesoCurso,
          idUsuario: usuarioActual.idUsuario,
        })
        toast.success('Modulo desmarcado')
      } else {
        await marcarMutation.mutateAsync({
          idUsuario: usuarioActual.idUsuario,
          idModulo,
          idDetalleProcesoCurso: inscripcionActiva.idDetalleProcesoCurso,
        })
        toast.success('Modulo marcado como completado')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar el progreso'
      toast.error(msg)
    }
  }

  const accessLoading = loadingModulo || loadingCursos || loadingInscripciones || loadingMinisterios

  useEffect(() => {
    if (!Number.isInteger(idCurso) || idCurso <= 0 || !Number.isInteger(idModulo) || idModulo <= 0) {
      navigate('/app/mis-cursos')
      return
    }
    if (accessLoading) return
    if (errorModulo || (modulo && !canReadAsStudent) || (modulo && !canEdit && modulo.estado !== 'publicado')) {
      toast.error('No tienes acceso a este módulo.')
      navigate('/app/mis-cursos')
    }
  }, [idCurso, idModulo, accessLoading, errorModulo, modulo, canReadAsStudent, canEdit, navigate])

  if (accessLoading || !modulo) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Cargando módulo...
      </div>
    )
  }

  const handleCreateRecurso = async () => {
    if (!canEdit) return
    const nombre = recursoForm.nombre.trim()

    if (recursoForm.tipo === 'enlace' && (!nombre || !recursoForm.url.trim())) {
      toast.error('Completa nombre y URL del recurso.')
      return
    }

    if (recursoForm.tipo === 'archivo' && !recursoFile) {
      toast.error('Selecciona un archivo para subir.')
      return
    }

    if (recursoForm.tipo === 'archivo' && recursoFile) {
      const err = validateRecursoFile(recursoFile)
      if (err) {
        toast.error(err)
        return
      }
    }

    try {
      let finalUrl = recursoForm.url.trim()
      const finalNombre = nombre || recursoFile?.name || 'Archivo'

      if (recursoForm.tipo === 'archivo' && recursoFile) {
        setIsUploadingFile(true)
        finalUrl = await uploadRecursoArchivo({ idModulo: modulo.idModulo, file: recursoFile })
      }

      await createRecursoMutation.mutateAsync({
        idModulo: modulo.idModulo,
        nombre: finalNombre,
        tipo: recursoForm.tipo,
        url: finalUrl,
      })

      setRecursoForm({ nombre: '', tipo: 'archivo', url: '' })
      setRecursoFile(null)
      toast.success('Recurso agregado')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error creando recurso'
      toast.error(msg)
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleDeleteRecurso = (idRecurso: number, nombre: string) => {
    if (!canEdit) return
    if (!confirm(`¿Eliminar recurso "${nombre}"?`)) return
    deleteRecursoMutation.mutate(idRecurso, {
      onSuccess: () => toast.success('Recurso eliminado'),
      onError: (e) => {
        const msg = e instanceof Error ? e.message : 'Error eliminando recurso'
        toast.error(msg)
      },
    })
  }

  const handleCreateEvaluacion = async () => {
    if (!usuarioActual || !evaluacionForm.titulo.trim()) {
      toast.error('Completa el título de la evaluación')
      return
    }

    try {
      // Crear la evaluación primero
      const nuevaEvaluacion = await createEvaluacion({
        idModulo: idModulo,
        titulo: evaluacionForm.titulo.trim(),
        descripcion: evaluacionForm.descripcion.trim() || null,
        puntajeMinimo: evaluacionForm.puntajeMinimo,
        maxIntentos: evaluacionForm.maxIntentos,
        activo: evaluacionForm.activo,
        idUsuario: usuarioActual.idUsuario
      })

      toast.success('Evaluación creada exitosamente')

      // Reset form y mostrar creador de preguntas
      setEvaluacionForm({
        titulo: '',
        descripcion: '',
        puntajeMinimo: 60,
        maxIntentos: 3,
        activo: true
      })
      setShowCreateEvaluacion(false)
      setEvaluacionSeleccionada(nuevaEvaluacion.idEvaluacion)
      setShowCreadorPreguntas(true)

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error creando evaluación')
    }
  }

  const handleEditarPreguntas = (idEvaluacion: number) => {
    setEvaluacionSeleccionada(idEvaluacion)
    setShowCreadorPreguntas(true)
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <ModuloBreadcrumb
        cursoNombre={curso?.nombre ?? `Curso ${idCurso}`}
        idCurso={idCurso}
        moduloOrden={modulo.orden}
        moduloTitulo={modulo.titulo}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold leading-tight">{modulo.titulo}</h1>
            {modulo.descripcion && <p className="text-xs text-muted-foreground mt-1">{modulo.descripcion}</p>}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg bg-accent/40 shrink-0">
            {modulo.estado}
          </span>
        </div>
        {puedeMarcarProgreso && (
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant={avanceActual ? 'outline' : 'default'}
              onClick={handleToggleCompletado}
              disabled={marcarMutation.isPending || desmarcarMutation.isPending}
              className="rounded-xl"
            >
              {avanceActual ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" />
                  Completado · desmarcar
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 mr-1" />
                  Marcar como completado
                </>
              )}
            </Button>
          </div>
        )}
      </motion.div>

      <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-3xl p-5">
        {canEdit ? (
          <ModuloContenidoEditor
            idModulo={modulo.idModulo}
            idCurso={idCurso}
            contenidoInicial={modulo.contenidoMd}
          />
        ) : (
          <ModuloContenidoView contenidoMd={modulo.contenidoMd} />
        )}
      </Card>

      <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recursos del módulo</h2>
          {loadingRecursos && <span className="text-xs text-muted-foreground">Cargando...</span>}
        </div>

        {recursos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay recursos (PDF, enlaces, etc.).</p>
        ) : (
          <ul className="space-y-2">
            {recursos.map((r) => (
              <li
                key={r.idRecurso}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-background/40 px-3 py-2"
              >
                {r.tipo === 'archivo' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const url = await getRecursoSignedUrl(r.url)
                        window.open(url, '_blank', 'noopener,noreferrer')
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'No se pudo abrir el archivo')
                      }
                    }}
                    className="min-w-0 flex-1 text-left hover:underline"
                  >
                    <span className="flex items-center gap-2 text-sm truncate">
                      <FileText className="w-4 h-4" />
                      {r.nombre}
                    </span>
                  </button>
                ) : (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 hover:underline"
                  >
                    <span className="flex items-center gap-2 text-sm truncate">
                      <LinkIcon className="w-4 h-4" />
                      {r.nombre}
                    </span>
                  </a>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteRecurso(r.idRecurso, r.nombre)}
                    disabled={deleteRecursoMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-2 border-t border-white/10">
            <Input
              className="md:col-span-4"
              placeholder="Nombre del recurso"
              value={recursoForm.nombre}
              onChange={(e) => setRecursoForm((p) => ({ ...p, nombre: e.target.value }))}
            />
            <select
              className="md:col-span-2 h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={recursoForm.tipo}
              onChange={(e) => {
                const tipo = e.target.value as 'archivo' | 'enlace'
                setRecursoForm((p) => ({ ...p, tipo }))
                if (tipo === 'enlace') setRecursoFile(null)
                if (tipo === 'archivo') setRecursoForm((p) => ({ ...p, url: '' }))
              }}
            >
              <option value="archivo">Archivo adjunto (PDF/Docs)</option>
              <option value="enlace">Enlace externo (opcional)</option>
            </select>
            {recursoForm.tipo === 'enlace' ? (
              <Input
                key="recurso-url"
                className="md:col-span-4"
                placeholder="https://..."
                value={recursoForm.url}
                onChange={(e) => setRecursoForm((p) => ({ ...p, url: e.target.value }))}
              />
            ) : (
              <Input
                key="recurso-file"
                className="md:col-span-4"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.zip"
                onChange={(e) => setRecursoFile(e.target.files?.[0] ?? null)}
              />
            )}
            <Button
              className="md:col-span-2"
              onClick={handleCreateRecurso}
              disabled={createRecursoMutation.isPending || isUploadingFile}
            >
              <Plus className="w-4 h-4 mr-1" /> {isUploadingFile ? 'Subiendo...' : 'Agregar'}
            </Button>
          </div>
        )}
      </Card>

      {/* Sección de Evaluaciones */}
      <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Evaluaciones del módulo
          </h2>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => setShowCreateEvaluacion(true)}
              className="rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nueva Evaluación
            </Button>
          )}
        </div>

        {evaluaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canEdit
              ? 'Aún no hay evaluaciones. Crea la primera para agregar preguntas y opciones.'
              : 'No hay evaluaciones disponibles para este módulo.'
            }
          </p>
        ) : (
          <div className="space-y-3">
            {evaluaciones.map((evaluacion) => (
              <div
                key={evaluacion.idEvaluacion}
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-background/40"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{evaluacion.titulo}</h3>
                  {evaluacion.descripcion && (
                    <p className="text-sm text-muted-foreground mt-1">{evaluacion.descripcion}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Puntaje mín: {evaluacion.puntajeMinimo}%</span>
                    <span>Máx intentos: {evaluacion.maxIntentos}</span>
                    <span className={`px-2 py-1 rounded ${evaluacion.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {evaluacion.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditarPreguntas(evaluacion.idEvaluacion)}
                      className="rounded-xl"
                    >
                      Editar Preguntas
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dialog: Crear Evaluación */}
      {canEdit && (
        <Dialog open={showCreateEvaluacion} onOpenChange={setShowCreateEvaluacion}>
          <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                Nueva Evaluación
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Crea una evaluación con preguntas para el módulo: {modulo?.titulo}
              </p>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Título de la Evaluación *
                </label>
                <Input
                  value={evaluacionForm.titulo}
                  onChange={(e) => setEvaluacionForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ej: Evaluación de Conceptos Básicos"
                  className="h-11 bg-background/50 border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Descripción (opcional)
                </label>
                <textarea
                  value={evaluacionForm.descripcion}
                  onChange={(e) => setEvaluacionForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Describe el propósito de esta evaluación..."
                  className="w-full h-20 rounded-xl border border-white/10 bg-background/50 p-3 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Puntaje Mínimo (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={evaluacionForm.puntajeMinimo}
                    onChange={(e) => setEvaluacionForm(p => ({ ...p, puntajeMinimo: Number(e.target.value) }))}
                    className="h-11 bg-background/50 border-white/10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Máximo de Intentos
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={evaluacionForm.maxIntentos}
                    onChange={(e) => setEvaluacionForm(p => ({ ...p, maxIntentos: Number(e.target.value) }))}
                    className="h-11 bg-background/50 border-white/10 rounded-xl"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => {
                  setShowCreateEvaluacion(false)
                  setEvaluacionForm({
                    titulo: '',
                    descripcion: '',
                    puntajeMinimo: 60,
                    maxIntentos: 3,
                    activo: true
                  })
                }}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-xl px-8"
                onClick={handleCreateEvaluacion}
              >
                Crear Evaluación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Creador de Preguntas */}
      {canEdit && evaluacionSeleccionada && (
        <Dialog open={showCreadorPreguntas} onOpenChange={setShowCreadorPreguntas}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                Editor de Preguntas
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[70vh]">
              <CreadorPreguntas idEvaluacion={evaluacionSeleccionada} />
            </div>
            <DialogFooter className="gap-2 border-t border-white/10 pt-4">
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => {
                  setShowCreadorPreguntas(false)
                  setEvaluacionSeleccionada(null)
                }}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ModuloNavegacion
        modulos={modulos}
        idModuloActual={modulo.idModulo}
        idCurso={idCurso}
        soloPublicados={!canEdit}
      />
    </div>
  )
}
