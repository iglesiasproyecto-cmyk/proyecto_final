import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useApp } from '@/app/store/AppContext'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import { AnimatedCard } from '@/app/components/ui/AnimatedCard'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { BookOpen, Eye, EyeOff, Trash2, ChevronRight, Inbox, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { getCursosParaUsuario, AulaCursoEnriquecido } from '@/services/aula.service'

interface CursosAdminListProps {
  ministerios: { idMinisterio: number; nombre: string }[]
}

export function CursosAdminList({ ministerios }: CursosAdminListProps) {
  const { iglesiaActual } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [ministerioFilter, setMinisterioFilter] = useState(0)
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'iglesia' | 'ministerio'>('todos')
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number; titulo: string }>({
    open: false, id: 0, titulo: '',
  })

  const { data: cursos = [], isLoading } = useQuery<AulaCursoEnriquecido[]>({
    queryKey: ['cursos-admin', iglesiaActual?.id],
    queryFn: getCursosParaUsuario,
    enabled: !!iglesiaActual?.id,
    staleTime: 2 * 60 * 1000,
  })

  const visible = useMemo(() => {
    return cursos.filter(curso => {
      if (search && !curso.titulo.toLowerCase().includes(search.toLowerCase())) return false
      if (tipoFilter !== 'todos' && curso.tipo !== tipoFilter) return false
      if (ministerioFilter && ministerios.find(m => m.idMinisterio === ministerioFilter)?.nombre !== curso.ministerioNombre) return false
      if (estadoFilter !== 'todos' && curso.estado !== estadoFilter) return false
      return true
    })
  }, [cursos, search, tipoFilter, ministerioFilter, estadoFilter, ministerios])

  const togglePublicacion = async (id: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'activo' ? 'borrador' : 'activo'
    const { error } = await supabase
      .from('aula_curso')
      .update({ estado: nuevoEstado })
      .eq('id_aula_curso', id)
    if (error) {
      toast.error('Error al cambiar estado del curso')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['cursos-admin', iglesiaActual?.id] })
    toast.success(`Curso ${nuevoEstado === 'activo' ? 'publicado' : 'despublicado'}`)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    const { error } = await supabase
      .from('aula_curso')
      .delete()
      .eq('id_aula_curso', deleteConfirm.id)
    if (error) {
      toast.error('Error al eliminar curso')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['cursos-admin', iglesiaActual?.id] })
    toast.success('Curso eliminado')
    setDeleteConfirm({ open: false, id: 0, titulo: '' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Cargando cursos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card/40 backdrop-blur-xl border border-border/50 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar curso..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 bg-background/50 border-white/10 rounded-xl"
          />
        </div>
        <select
          value={ministerioFilter}
          onChange={e => setMinisterioFilter(Number(e.target.value))}
          className="h-10 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value={0}>Todos los ministerios</option>
          {ministerios.map(m => (
            <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(['todos', 'iglesia', 'ministerio'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`h-10 px-3 rounded-xl text-xs font-semibold capitalize transition-all ${
                tipoFilter === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background/50 border border-white/10 text-foreground/60 hover:text-foreground'
              }`}
            >
              {t === 'todos' ? 'Todos' : t === 'iglesia' ? 'Iglesia' : 'Ministerio'}
            </button>
          ))}
        </div>
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="borrador">Borradores</option>
        </select>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {visible.map((curso, idx) => (
            <AnimatedCard key={curso.idAulaCurso} index={idx} className="p-5 group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase font-black tracking-widest border-0 rounded-lg px-2 py-0.5 ${
                      curso.estado === 'activo'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {curso.estado}
                  </Badge>
                  {curso.tipo === 'iglesia' ? (
                    <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-0 rounded-lg px-2 py-0.5 bg-blue-500/10 text-blue-400">
                      {curso.iglesiaNombre ?? 'Iglesia'}
                    </Badge>
                  ) : curso.ministerioNombre ? (
                    <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-0 rounded-lg px-2 py-0.5 bg-amber-500/10 text-amber-500">
                      {curso.ministerioNombre}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <h3 className="font-bold text-sm leading-snug tracking-tight group-hover:text-primary transition-colors mb-2 uppercase italic line-clamp-2">
                {curso.titulo}
              </h3>
              {curso.descripcion && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                  {curso.descripcion}
                </p>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                <Button
                  size="sm"
                  className="flex-1 h-8 rounded-xl text-xs"
                  onClick={() => navigate(`/app/aula/curso/${curso.idAulaCurso}`)}
                >
                  <ChevronRight className="w-3.5 h-3.5 mr-1" /> Ver detalle
                </Button>
                <button
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all"
                  onClick={() => togglePublicacion(curso.idAulaCurso, curso.estado)}
                  title={curso.estado === 'activo' ? 'Despublicar' : 'Publicar'}
                >
                  {curso.estado === 'activo' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  onClick={() => setDeleteConfirm({ open: true, id: curso.idAulaCurso, titulo: curso.titulo })}
                  title="Eliminar curso"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </AnimatedCard>
          ))}
        </AnimatePresence>
      </div>

      {visible.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
        >
          <Inbox className="w-10 h-10 opacity-20" />
          <p className="text-sm">
            {cursos.length === 0 ? 'No hay cursos en esta iglesia todavía.' : 'Ningún curso coincide con los filtros.'}
          </p>
        </motion.div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={open => setDeleteConfirm(p => ({ ...p, open }))}>
        <DialogContent className="sm:max-w-sm rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-rose-400" />
              </div>
              <DialogTitle className="text-lg font-bold text-center">¿Eliminar curso?</DialogTitle>
              <p className="text-sm text-muted-foreground text-center">
                Estás a punto de eliminar <span className="font-semibold text-foreground">"{deleteConfirm.titulo}"</span>. Esta acción no se puede deshacer.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button variant="ghost" className="rounded-xl w-full" onClick={() => setDeleteConfirm({ open: false, id: 0, titulo: '' })}>
              Cancelar
            </Button>
            <Button className="rounded-xl w-full bg-rose-500 hover:bg-rose-600 text-white" onClick={confirmDelete}>
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
