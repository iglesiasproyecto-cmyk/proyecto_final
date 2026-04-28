import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Users, BookOpen, TrendingUp, Award } from 'lucide-react'

export function DashboardLider() {
  // Placeholder data - en una implementación real, estos vendrían de queries
  const stats = {
    totalCursos: 0,
    cursosActivos: 0,
    totalInscritos: 0,
    certificadosEmitidos: 0,
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total de Cursos
          </CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCursos}</div>
          <p className="text-xs text-muted-foreground">
            Cursos creados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Cursos Activos
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.cursosActivos}</div>
          <p className="text-xs text-muted-foreground">
            Disponibles para servidores
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Inscritos
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalInscritos}</div>
          <p className="text-xs text-muted-foreground">
            Servidores inscritos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Certificados
          </CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.certificadosEmitidos}</div>
          <p className="text-xs text-muted-foreground">
            Emitidos este mes
          </p>
        </CardContent>
      </Card>
    </div>
  )
}