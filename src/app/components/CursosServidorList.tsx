import { useAuth } from '@/app/store/AppContext'
import { supabase } from '@/lib/supabaseClient'
import { getInternalUserId } from '@/lib/userHelpers'
import { useQuery } from '@tanstack/react-query'
import { useProgresoCurso } from '@/hooks/useProgreso'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Clock, BookOpen, Award } from 'lucide-react'
import { BarraProgreso } from './BarraProgreso'

export function CursosServidorList() {
  const { user } = useAuth()

  const { data: cursos, isLoading } = useQuery({
    queryKey: ['cursos-servidor', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // Obtener el id_usuario interno
      const internalUserId = await getInternalUserId(user.id)
      if (!internalUserId) return []

      // Obtener cursos a través de las inscripciones activas en aula_inscripcion
      const { data, error } = await supabase
        .from('aula_inscripcion')
        .select(`
          activo,
          inscrito_en,
          aula_curso:aula_curso(
            id_aula_curso,
            titulo,
            descripcion,
            ministerio:ministerio(nombre)
          )
        `)
        .eq('id_usuario', internalUserId)
        .eq('activo', true)

      if (error) throw error
      return data?.map(item => ({
        id_curso: item.aula_curso?.id_aula_curso,
        nombre: item.aula_curso?.titulo,
        descripcion: item.aula_curso?.descripcion,
        ministerio: item.aula_curso?.ministerio,
        estado_inscripcion: item.activo ? 'inscrito' : 'inactivo',
        fecha_inscripcion: item.inscrito_en,
      })) || []
    },
    enabled: !!user?.id,
  })

  if (isLoading) {
    return <div>Cargando cursos...</div>
  }

  if (!cursos || cursos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tienes cursos asignados</h3>
          <p className="text-muted-foreground text-center">
            Cuando tu líder publique un curso, aparecerá aquí automáticamente
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cursos.map((curso) => (
        <CursoCard key={curso.id_curso} curso={curso} userId={user?.id} />
      ))}
    </div>
  )
}

function CursoCard({ curso, userId }: { curso: any, userId?: number }) {
  const { data: progreso } = useProgresoCurso({
    idUsuario: userId,
    idCurso: curso.id_curso
  })

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{curso.nombre}</CardTitle>
            <CardDescription>{curso.ministerio?.nombre}</CardDescription>
          </div>
          <Badge variant="outline">
            {curso.estado_inscripcion}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {curso.descripcion || 'Sin descripción'}
        </p>

        <BarraProgreso
          porcentaje={progreso?.porcentaje || 0}
          actividadesCompletadas={progreso?.actividadesCompletadas || 0}
          evaluacionesAprobadas={progreso?.evaluacionesAprobadas || 0}
          totalElementos={progreso?.totalElementos || 0}
          showDetails={false}
          size="sm"
        />

        <div className="flex items-center text-sm text-muted-foreground mt-2">
          <Clock className="h-4 w-4 mr-1" />
          Inscrito el {new Date(curso.fecha_inscripcion).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}