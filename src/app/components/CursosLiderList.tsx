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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cursos.map((curso) => (
        <Card key={curso.id_aula_curso}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{curso.titulo}</CardTitle>
                <CardDescription>{curso.ministerio?.nombre}</CardDescription>
              </div>
              <Badge variant={curso.estado === 'activo' ? 'default' : 'secondary'}>
                {curso.estado}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {curso.descripcion || 'Sin descripción'}
            </p>

            <div className="flex items-center text-sm text-muted-foreground mb-4">
              <Users className="h-4 w-4 mr-1" />
              {curso.modulos?.[0]?.count || 0} módulos
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate(`/app/aula/curso/${curso.id_aula_curso}`)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Gestionar
              </Button>

              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => togglePublicacion(curso.id_aula_curso, curso.estado)}
              >
                {curso.estado === 'activo' ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Despublicar
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Publicar
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => eliminarCurso(curso.id_aula_curso)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      </div>

      <CrearModuloDialog
        open={showCrearModulo}
        onOpenChange={setShowCrearModulo}
        idCurso={cursoSeleccionado || 0}
      />
    </>
  )
}