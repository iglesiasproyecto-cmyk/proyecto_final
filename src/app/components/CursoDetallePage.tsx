import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
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

export function CursoDetallePage() {
  const { idCurso } = useParams<{ idCurso: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)

  useEffect(() => {
    if (user?.id) {
      getInternalUserId(user.id).then(setInternalUserId)
    }
  }, [user?.id])

  // Obtener información detallada del curso
  const { data: curso } = useQuery({
    queryKey: ['curso-detalle-lider', idCurso],
    queryFn: async () => {
      if (!idCurso) return null

      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          *,
          ministerio:ministerio(nombre),
          modulos:aula_modulo(
            id_aula_modulo,
            titulo,
            orden,
            publicado,
            descripcion,
            creado_en
          )
        `)
        .eq('id_aula_curso', parseInt(idCurso))
        .single()

      if (error) throw error
      return data
    },
    enabled: !!idCurso,
  })

  // Obtener progreso del grupo
  const { data: progresoGrupo } = useProgresoGrupoCurso(idCurso ? parseInt(idCurso) : undefined)

  // Verificar si el usuario es líder de este curso
  const isLider = internalUserId !== null && curso?.id_usuario_creador === internalUserId

  // Calcular estadísticas
  const modulosPublicados = curso?.modulos?.filter(m => m.publicado).length || 0
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/app/aula')}
            className="rounded-xl border-white/20 bg-background/50 h-10 px-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{curso.titulo}</h1>
            <p className="text-primary/70 font-bold text-xs uppercase tracking-widest">{curso.ministerio?.nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant={curso.estado === 'activo' ? 'default' : 'secondary'}
            className={`rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest border-none ${
              curso.estado === 'activo' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
            }`}
          >
            {curso.estado}
          </Badge>
          <Button variant="outline" size="sm" className="rounded-xl border-white/20 bg-background/50 h-10">
            <Settings className="h-4 w-4 mr-2 text-primary" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/20 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-[#4682b4]/10 text-[#4682b4]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{totalModulos}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Módulos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{modulosPublicados}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Publicados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{miembrosActivos}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Servidores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{promedioProgreso}%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progreso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido Principal */}
      <Tabs defaultValue="modulos" className="space-y-6">
        <div className="flex items-center justify-between overflow-x-auto pb-2 no-scrollbar">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md inline-flex">
            <TabsTrigger value="modulos" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
              <BookOpen className="h-4 w-4 mr-2" />
              Módulos
            </TabsTrigger>
            <TabsTrigger value="progreso" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
              <BarChart3 className="h-4 w-4 mr-2" />
              Progreso
            </TabsTrigger>
            <TabsTrigger value="servidores" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
              <Users className="h-4 w-4 mr-2" />
              Servidores
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="modulos">
          <ModulosGestion
            idCurso={parseInt(idCurso!)}
            modulos={curso.modulos || []}
            desbloqueoSecuencial={curso.orden_secuencial}
          />
        </TabsContent>

        <TabsContent value="progreso">
          <ProgresoCursoTab progresoGrupo={progresoGrupo || []} />
        </TabsContent>

        <TabsContent value="servidores">
          <ServidoresCursoTab progresoGrupo={progresoGrupo || []} />
        </TabsContent>
      </Tabs>

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