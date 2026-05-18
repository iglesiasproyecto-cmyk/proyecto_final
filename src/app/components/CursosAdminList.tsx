import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useApp } from '@/app/store/AppContext'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import { AnimatedCard } from '@/app/components/ui/AnimatedCard'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Eye, EyeOff, Trash2, ChevronRight, Inbox, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { getCursosParaUsuario, AulaCursoEnriquecido } from '@/services/aula.service'
import { Skeleton } from '@/app/components/ui/skeleton';
import { AulaSkeleton } from '@/app/components/loading/skeletons';

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
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-card/50 p-4 backdrop-blur-2xl">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <AulaSkeleton courses={3} columns={3} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-card/55 p-4 backdrop-blur-2xl lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors" />
          <Input
            placeholder="Buscar curso..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-300 pl-9 text-sm"
          />
        </div>
        <select
          value={ministerioFilter}
          onChange={e => setMinisterioFilter(Number(e.target.value))}
          className="h-11 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-300 px-3 text-sm text-foreground/80 outline-none cursor-pointer"
        >
          <option value={0}>Todos los ministerios</option>
          {ministerios.map(m => (
            <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {(['todos', 'iglesia', 'ministerio'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`h-11 px-4 rounded-2xl text-xs font-semibold capitalize transition-all border ${
                tipoFilter === t
                  ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-primary/30 dark:hover:border-primary/40 hover:text-primary dark:hover:text-white'
              }`}
            >
              {t === 'todos' ? 'Todos' : t === 'iglesia' ? 'Iglesia' : 'Ministerio'}
            </button>
          ))}
        </div>
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          className="h-11 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-300 px-3 text-sm text-foreground/80 outline-none cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="borrador">Borradores</option>
        </select>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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

              <h3 className="mb-2 line-clamp-2 text-sm font-bold uppercase italic leading-snug tracking-tight transition-colors group-hover:text-primary">
                {curso.titulo}
              </h3>
              {curso.descripcion && (
                <p className="mb-4 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {curso.descripcion}
                </p>
              )}

              <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                <Button
                  size="sm"
                  className="h-9 flex-1 rounded-2xl text-xs"
                  onClick={() => {
                    if (!iglesiaActual?.id) return
                    navigate(`/app/${iglesiaActual.id}/aula/curso/${curso.idAulaCurso}`)
                  }}
                >
                  <ChevronRight className="w-3.5 h-3.5 mr-1" /> Ver detalle
                </Button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-2xl text-muted-foreground/50 transition-all hover:bg-primary/10 hover:text-primary"
                  onClick={() => togglePublicacion(curso.idAulaCurso, curso.estado)}
                  title={curso.estado === 'activo' ? 'Despublicar' : 'Publicar'}
                >
                  {curso.estado === 'activo' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-2xl text-muted-foreground/50 transition-all hover:bg-rose-500/10 hover:text-rose-400"
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
          className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-border bg-muted/20 py-16 text-muted-foreground"
        >
          <Inbox className="h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">
            {cursos.length === 0 ? 'No hay cursos en esta iglesia todavía.' : 'Ningún curso coincide con los filtros.'}
          </p>
        </motion.div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={open => setDeleteConfirm(p => ({ ...p, open }))}>
        <DialogContent className="sm:max-w-sm rounded-[28px] border-white/10 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
                <Trash2 className="h-7 w-7 text-rose-400" />
              </div>
              <DialogTitle className="text-center text-lg font-bold">¿Eliminar curso?</DialogTitle>
              <p className="text-center text-sm text-muted-foreground">
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
