import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { supabase } from '@/lib/supabaseClient'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Edit, Users, Eye, EyeOff, Trash2, Plus, BookOpen } from 'lucide-react'
import { motion } from 'motion/react'
import { CrearModuloDialog } from './CrearModuloDialog'
import { toast } from 'sonner'

export function CursosLiderList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showCrearModulo, setShowCrearModulo] = useState(false)
  const [cursoSeleccionado, setCursoSeleccionado] = useState<number | null>(null)

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
          modulos:aula_modulo(count)
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

      toast.success(`Curso ${nuevoEstado === 'activo' ? 'publicado' : 'despublicado'}`)
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Error al actualizar el curso')
    }
  }

  const eliminarCurso = async (idCurso: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este curso?')) return

    try {
      const { error } = await supabase
        .from('aula_curso')
        .delete()
        .eq('id_aula_curso', idCurso)

      if (error) throw error

      toast.success('Curso eliminado')
    } catch (error) {
      console.error('Error deleting course:', error)
      toast.error('Error al eliminar el curso')
    }
  }

  if (isLoading) {
    return <div>Cargando cursos...</div>
  }

  if (!cursos || cursos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tienes cursos aún</h3>
          <p className="text-muted-foreground text-center mb-4">
            Crea tu primer curso para comenzar a formar a tus servidores
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {cursos.map((curso, index) => (
            <motion.div
              key={curso.id_aula_curso}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <Card className="h-full overflow-hidden border-white/20 bg-card/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:bg-card/60 rounded-3xl">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
                  <BookOpen className="h-24 w-24" />
                </div>

                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge
                      variant={curso.estado === 'activo' ? 'default' : 'secondary'}
                      className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest border-none ${
                        curso.estado === 'activo'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}
                    >
                      {curso.estado}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg">
                      <Users className="h-3 w-3" />
                      {curso.modulos?.[0]?.count || 0} módulos
                    </div>
                  </div>
                  <CardTitle className="text-xl font-black group-hover:text-primary transition-colors line-clamp-1">
                    {curso.titulo}
                  </CardTitle>
                  <CardDescription className="font-bold text-primary/70 text-xs uppercase tracking-tighter">
                    {curso.ministerio?.nombre}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground font-medium line-clamp-2 min-h-[40px]">
                    {curso.descripcion || 'Sin descripción detallada para este curso de formación ministerial.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/40">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate(`/app/aula/curso/${curso.id_aula_curso}`)}
                      className="flex-1 bg-[#4682b4] hover:bg-[#4682b4]/90 text-white rounded-xl shadow-md shadow-blue-900/10 h-10 font-bold"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Gestionar
                    </Button>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl border-white/10 bg-background/50 hover:bg-background hover:text-primary transition-all"
                        title="Editar Curso"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => togglePublicacion(curso.id_aula_curso, curso.estado)}
                        className={`h-10 w-10 rounded-xl border-white/10 bg-background/50 transition-all ${
                          curso.estado === 'activo' ? 'hover:text-amber-500' : 'hover:text-emerald-500'
                        }`}
                        title={curso.estado === 'activo' ? 'Despublicar' : 'Publicar'}
                      >
                        {curso.estado === 'activo' ? <EyeOff className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => eliminarCurso(curso.id_aula_curso)}
                        className="h-10 w-10 rounded-xl border-white/10 bg-background/50 hover:bg-destructive/10 hover:text-destructive transition-all"
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
    </>
  )
}