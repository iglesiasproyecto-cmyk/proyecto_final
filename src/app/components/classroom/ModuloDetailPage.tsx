import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useApp } from '../../store/AppContext'
import { useModulo } from '@/hooks/useModulo'
import { useCursos, useModulos } from '@/hooks/useCursos'
import { useMisInscripciones } from '@/hooks/useInscripciones'
import { useMinisteriosIdsDeUsuario } from '@/hooks/useMinisterios'
import { ModuloBreadcrumb } from './ModuloBreadcrumb'
import { ModuloNavegacion } from './ModuloNavegacion'
import { ModuloContenidoEditor } from './ModuloContenidoEditor'
import { ModuloContenidoView } from './ModuloContenidoView'
import { Card } from '../ui/card'

export function ModuloDetailPage() {
  const { idCurso: idCursoStr, idModulo: idModuloStr } = useParams()
  const idCurso = Number(idCursoStr)
  const idModulo = Number(idModuloStr)
  const navigate = useNavigate()
  const { rolActual, usuarioActual } = useApp()

  const { data: modulo, isLoading: loadingModulo, error: errorModulo } = useModulo(idModulo)
  const { data: modulos = [] } = useModulos(idCurso)
  const { data: cursos = [] } = useCursos()
  const curso = cursos.find((c) => c.idCurso === idCurso)

  const { data: misInscripciones = [] } = useMisInscripciones(usuarioActual?.idUsuario)
  const { data: ministeriosIds = [] } = useMinisteriosIdsDeUsuario(usuarioActual?.idUsuario)

  const canEdit = useMemo(() => {
    if (rolActual === 'super_admin') return true
    if (!curso) return false
    if (rolActual === 'admin_iglesia') return true
    if (rolActual === 'lider') return ministeriosIds.includes(curso.idMinisterio)
    return false
  }, [rolActual, curso, ministeriosIds])

  const canReadAsStudent = useMemo(() => {
    if (canEdit) return true
    return misInscripciones.some(
      (i) => i.idCurso === idCurso && (i.estado === 'inscrito' || i.estado === 'en_progreso')
    )
  }, [canEdit, misInscripciones, idCurso])

  useEffect(() => {
    if (errorModulo || (modulo && !canReadAsStudent) || (modulo && !canEdit && modulo.estado !== 'publicado')) {
      toast.error('No tienes acceso a este módulo.')
      navigate('/app/mis-cursos')
    }
  }, [errorModulo, modulo, canReadAsStudent, canEdit, navigate])

  if (loadingModulo || !modulo || !curso) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Cargando módulo...
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <ModuloBreadcrumb
        cursoNombre={curso.nombre}
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

      <ModuloNavegacion
        modulos={modulos}
        idModuloActual={modulo.idModulo}
        idCurso={idCurso}
        soloPublicados={!canEdit}
      />
    </div>
  )
}
