import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { supabase } from '@/lib/supabaseClient'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Edit, Users, Eye, EyeOff, Trash2, Plus, BookOpen } from 'lucide-react'
import { motion } from 'motion/react'
import { CrearModuloDialog } from './CrearModuloDialog'
import { toast } from 'sonner'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Skeleton } from '@/app/components/ui/skeleton';
import { AulaSkeleton } from '@/app/components/loading/skeletons';

export function CursosLiderList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCrearModulo, setShowCrearModulo] = useState(false)
  const [cursoSeleccionado, setCursoSeleccionado] = useState<number | null>(null)
  const [confirmDeleteCurso, setConfirmDeleteCurso] = useState<{ isOpen: boolean; id: number; titulo: string }>({ isOpen: false, id: 0, titulo: "" })

  const { data: cursos, isLoading } = useQuery({
    queryKey: ['cursos-lider', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // Obtener el ID interno del usuario
      const internalUserId = await getInternalUserId(user.id)
      if (!internalUserId) return []

      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          *,
          ministerio:ministerio(nombre),
          modulos:aula_modulo(id_aula_modulo)
        `)
        .eq('id_usuario_creador', internalUserId)
        .order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const togglePublicacion = async (idCurso: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'activo' ? 'borrador' : 'activo'

    try {
      const { error } = await supabase
        .from('aula_curso')
        .update({ estado: nuevoEstado })
        .eq('id_aula_curso', idCurso)

      if (error) throw error

      // Invalidate the courses list cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['cursos-lider', user?.id] })

      toast.success(`Curso ${nuevoEstado === 'activo' ? 'publicado' : 'despublicado'}`)
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Error al actualizar el curso')
    }
  }

  const ejecutarEliminarCurso = async (idCurso: number) => {
    try {
      const { error } = await supabase
        .from('aula_curso')
        .delete()
        .eq('id_aula_curso', idCurso)

      if (error) throw error

      // Invalidate the courses list cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['cursos-lider', user?.id] })

      toast.success('Curso eliminado')
    } catch (error) {
      console.error('Error deleting course:', error)
      toast.error('Error al eliminar el curso')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4">
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

  if (!cursos || cursos.length === 0) {
    return (
      <Card className="rounded-[28px] border border-dashed border-border/70 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No tienes cursos aún</h3>
          <p className="mb-4 text-center text-muted-foreground">
            Crea tu primer curso para comenzar a formar a tus servidores
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cursos.map((curso, index) => (
            <motion.div
              key={curso.id_aula_curso}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <Card className="h-full overflow-hidden rounded-[28px] border border-white/10 bg-card/55 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-card/75 hover:shadow-2xl hover:shadow-primary/10">
                <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-5 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
                  <BookOpen className="h-24 w-24" />
                </div>

                <CardHeader className="pb-4">
                  <div className="mb-2 flex items-start justify-between">
                    <Badge
                      variant={curso.estado === 'activo' ? 'default' : 'secondary'}
                      className={`rounded-full border-none px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        curso.estado === 'activo'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}
                    >
                      {curso.estado}
                    </Badge>
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {curso.modulos?.length || 0} módulos
                    </div>
                  </div>
                  <CardTitle className="line-clamp-1 text-xl font-black transition-colors group-hover:text-primary">
                    {curso.titulo}
                  </CardTitle>
                  <CardDescription className="text-xs font-bold uppercase tracking-tighter text-primary/70">
                    {curso.ministerio?.nombre}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <p className="min-h-[40px] line-clamp-2 text-sm font-medium text-muted-foreground">
                    {curso.descripcion || 'Sin descripción detallada para este curso de formación ministerial.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate(`/app/aula/curso/${curso.id_aula_curso}`)}
                      className="h-10 flex-1 rounded-2xl bg-[#4682b4] font-bold text-white shadow-md shadow-blue-900/10 hover:bg-[#4682b4]/90"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Gestionar
                    </Button>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-2xl border-white/10 bg-background/55 transition-all hover:bg-background hover:text-primary"
                        title="Editar Curso"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => togglePublicacion(curso.id_aula_curso, curso.estado)}
                        className={`h-10 w-10 rounded-2xl border-white/10 bg-background/55 transition-all ${
                          curso.estado === 'activo' ? 'hover:text-amber-500' : 'hover:text-emerald-500'
                        }`}
                        title={curso.estado === 'activo' ? 'Despublicar' : 'Publicar'}
                      >
                        {curso.estado === 'activo' ? <EyeOff className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setConfirmDeleteCurso({ isOpen: true, id: curso.id_aula_curso, titulo: curso.titulo })}
                        className="h-10 w-10 rounded-2xl border-white/10 bg-background/55 transition-all hover:bg-destructive/10 hover:text-destructive"
                        title="Eliminar Curso"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <CrearModuloDialog
        open={showCrearModulo}
        onOpenChange={setShowCrearModulo}
        idCurso={cursoSeleccionado || 0}
      />

      <ConfirmDialog
        isOpen={confirmDeleteCurso.isOpen}
        onClose={() => setConfirmDeleteCurso({ isOpen: false, id: 0, titulo: "" })}
        onConfirm={() => ejecutarEliminarCurso(confirmDeleteCurso.id)}
        title="¿Eliminar Curso?"
        description={`¿Estás seguro de que quieres eliminar el curso "${confirmDeleteCurso.titulo}"? Esta acción es irreversible.`}
      />
    </>
  )
}
