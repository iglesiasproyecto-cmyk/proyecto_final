import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useApp } from '../../store/AppContext'
import { useModulo } from '@/hooks/useModulo'
import { useCreateRecurso, useCursos, useDeleteRecurso, useModulos, useRecursos } from '@/hooks/useCursos'
import { uploadRecursoArchivo, getRecursoSignedUrl, validateRecursoFile } from '@/services/cursos.service'
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
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Link as LinkIcon, FileText, Trash2, Plus, CheckCircle2, Circle } from 'lucide-react'

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

  const { data: misInscripciones = [], isLoading: loadingInscripciones } = useMisInscripciones(usuarioActual?.idUsuario)
  const { isLoading: loadingMinisterios } = useMinisteriosIdsDeUsuario(usuarioActual?.idUsuario)
  const createRecursoMutation = useCreateRecurso()
  const deleteRecursoMutation = useDeleteRecurso()
  const [recursoForm, setRecursoForm] = useState({ nombre: '', tipo: 'archivo' as 'archivo' | 'enlace', url: '' })
  const [recursoFile, setRecursoFile] = useState<File | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  const canEdit = useMemo(() => {
    if (rolActual === 'super_admin') return true
    if (rolActual === 'admin_iglesia') return true
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

      <ModuloNavegacion
        modulos={modulos}
        idModuloActual={modulo.idModulo}
        idCurso={idCurso}
        soloPublicados={!canEdit}
      />
    </div>
  )
}
