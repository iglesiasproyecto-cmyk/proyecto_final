import React from 'react'
import { useParams, useNavigate } from 'react-router'
import { useAuth } from '@/app/store/AppContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Progress } from '@/app/components/ui/progress'
import {
  ArrowLeft,
  BookOpen,
  Users,
  Award,
  Settings,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useCursos } from '@/hooks/useCursos'
import { useProgresoGrupoCurso } from '@/hooks/useProgreso'
import { ModulosGestion } from './ModulosGestion'
import { CrearModuloDialog } from './CrearModuloDialog'

export function CursoDetallePage() {
  const { idCurso } = useParams<{ idCurso: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showCrearModulo, setShowCrearModulo] = React.useState(false)

  // Obtener información detallada del curso
  const { data: curso } = useQuery({
    queryKey: ['curso-detalle-lider', idCurso],
    queryFn: async () => {
      if (!idCurso) return null

      const { data, error } = await supabase
        .from('curso')
        .select(`
          *,
          ministerio:ministerio(nombre),
          modulos:modulo(
            id_modulo,
            titulo,
            orden,
            estado,
            descripcion,
            creado_en
          )
        `)
        .eq('id_curso', parseInt(idCurso))
        .single()

      if (error) throw error
      return data
    },
    enabled: !!idCurso,
  })

  // Obtener progreso del grupo
  const { data: progresoGrupo } = useProgresoGrupoCurso(idCurso ? parseInt(idCurso) : undefined)

  // Verificar si el usuario es líder de este curso
  const isLider = curso?.id_usuario_creador === user?.id

  // Calcular estadísticas
  const modulosPublicados = curso?.modulos?.filter(m => m.estado === 'publicado').length || 0
  const totalModulos = curso?.modulos?.length || 0
  const miembrosActivos = progresoGrupo?.filter(p => p.porcentaje > 0).length || 0
  const miembrosAtrasados = progresoGrupo?.filter(p => p.porcentaje < 25).length || 0
  const promedioProgreso = progresoGrupo && progresoGrupo.length > 0
    ? Math.round(progresoGrupo.reduce((sum, p) => sum + p.porcentaje, 0) / progresoGrupo.length)
    : 0

  if (!curso) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Curso no encontrado</h3>
          <Button onClick={() => navigate('/app/aula')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Aula
          </Button>
        </div>
      </div>
    )
  }

  if (!isLider) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Acceso denegado</h3>
          <p className="text-muted-foreground mb-4">No tienes permisos para ver este curso.</p>
          <Button onClick={() => navigate('/app/aula')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Aula
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/app/aula')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{curso.nombre}</h1>
            <p className="text-muted-foreground">{curso.ministerio?.nombre}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={curso.estado === 'activo' ? 'default' : 'secondary'}>
            {curso.estado}
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalModulos}</p>
                <p className="text-xs text-muted-foreground">Módulos totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{modulosPublicados}</p>
                <p className="text-xs text-muted-foreground">Publicados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{miembrosActivos}</p>
                <p className="text-xs text-muted-foreground">Servidores activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{promedioProgreso}%</p>
                <p className="text-xs text-muted-foreground">Progreso promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido Principal */}
      <Tabs defaultValue="modulos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modulos">
            <BookOpen className="h-4 w-4 mr-2" />
            Módulos
          </TabsTrigger>
          <TabsTrigger value="progreso">
            <BarChart3 className="h-4 w-4 mr-2" />
            Progreso
          </TabsTrigger>
          <TabsTrigger value="servidores">
            <Users className="h-4 w-4 mr-2" />
            Servidores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modulos">
          <ModulosGestion
            idCurso={parseInt(idCurso!)}
            modulos={curso.modulos || []}
            desbloqueoSecuencial={curso.desbloqueo_secuencial}
          />
        </TabsContent>

        <TabsContent value="progreso">
          <ProgresoCursoTab progresoGrupo={progresoGrupo || []} />
        </TabsContent>

        <TabsContent value="servidores">
          <ServidoresCursoTab progresoGrupo={progresoGrupo || []} />
        </TabsContent>
      </Tabs>

      <CrearModuloDialog
        open={showCrearModulo}
        onOpenChange={setShowCrearModulo}
        idCurso={parseInt(idCurso!)}
      />
    </div>
  )
}

// Componente para la pestaña de progreso
function ProgresoCursoTab({ progresoGrupo }: { progresoGrupo: any[] }) {
  const miembrosActivos = progresoGrupo.filter(p => p.porcentaje > 0).length
  const miembrosCompletaron = progresoGrupo.filter(p => p.completado).length
  const promedioProgreso = progresoGrupo.length > 0
    ? Math.round(progresoGrupo.reduce((sum, p) => sum + p.porcentaje, 0) / progresoGrupo.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{miembrosActivos}</div>
            <p className="text-sm text-muted-foreground">Servidores activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{miembrosCompletaron}</div>
            <p className="text-sm text-muted-foreground">Completaron curso</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{promedioProgreso}%</div>
            <p className="text-sm text-muted-foreground">Progreso promedio</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de Progreso</CardTitle>
          <CardDescription>Progreso de todos los servidores inscritos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progresoGrupo
              .sort((a, b) => b.porcentaje - a.porcentaje)
              .slice(0, 10)
              .map((servidor, index) => (
                <div key={servidor.idUsuario} className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{servidor.nombre}</p>
                    <Progress value={servidor.porcentaje} className="h-2 mt-1" />
                  </div>
                  <Badge variant={servidor.completado ? "default" : "secondary"}>
                    {servidor.porcentaje}%
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para la pestaña de servidores
function ServidoresCursoTab({ progresoGrupo }: { progresoGrupo: any[] }) {
  const navigate = useNavigate()
  const { idCurso } = useParams<{ idCurso: string }>()
  const servidoresAtrasados = progresoGrupo.filter(p => p.porcentaje < 25)

  return (
    <div className="space-y-6">
      {servidoresAtrasados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Servidores que necesitan atención
            </CardTitle>
            <CardDescription>
              Servidores con menos del 25% de progreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {servidoresAtrasados.map((servidor) => (
                <div
                  key={servidor.idUsuario}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/app/aula/curso/${idCurso}/servidor/${servidor.idUsuario}`)}
                >
                  <div>
                    <p className="font-medium">{servidor.nombre}</p>
                    <p className="text-sm text-muted-foreground">{servidor.correo}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">{servidor.porcentaje}%</Badge>
                    <div className="w-24">
                      <Progress value={servidor.porcentaje} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Todos los Servidores</CardTitle>
          <CardDescription>
            Lista completa de servidores inscritos en el curso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {progresoGrupo.map((servidor) => (
              <div
                key={servidor.idUsuario}
                className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/app/aula/curso/${idCurso}/servidor/${servidor.idUsuario}`)}
              >
                <div>
                  <p className="font-medium">{servidor.nombre}</p>
                  <p className="text-sm text-muted-foreground">{servidor.correo}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={servidor.completado ? "default" : servidor.porcentaje > 50 ? "secondary" : "outline"}
                    className="mb-1"
                  >
                    {servidor.porcentaje}%
                  </Badge>
                  <div className="w-24">
                    <Progress value={servidor.porcentaje} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}