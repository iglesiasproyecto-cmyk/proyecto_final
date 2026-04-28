import { useState } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Badge } from '@/app/components/ui/badge'
import { Plus, Users, BookOpen, TrendingUp } from 'lucide-react'
import { CrearCursoDialog } from './CrearCursoDialog'
import { CursosLiderList } from './CursosLiderList'
import { DashboardLider } from './DashboardLiderActualizado'

export function LiderAulaPage() {
  const { user } = useAuth()
  const [showCrearCurso, setShowCrearCurso] = useState(false)

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Panel de Líder de Ministerio</h2>
          <p className="text-muted-foreground">
            Gestiona cursos y sigue el progreso de tus servidores
          </p>
        </div>
        <Button onClick={() => setShowCrearCurso(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Curso
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">
            <TrendingUp className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="cursos">
            <BookOpen className="h-4 w-4 mr-2" />
            Mis Cursos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardLider />
        </TabsContent>

        <TabsContent value="cursos">
          <CursosLiderList />
        </TabsContent>
      </Tabs>

      <CrearCursoDialog
        open={showCrearCurso}
        onOpenChange={setShowCrearCurso}
      />
    </div>
  )
}