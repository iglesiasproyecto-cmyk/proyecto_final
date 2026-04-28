import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { useProgresoGrupoCurso } from '@/hooks/useProgreso'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { Users, BookOpen, TrendingUp, Award, UserCheck, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useQuery } from '@tanstack/react-query'

interface DashboardLiderProps {
  idCurso?: number
}

export function DashboardLider({ idCurso }: DashboardLiderProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Obtener cursos del líder
  const { data: cursos } = useQuery({
    queryKey: ['cursos-lider-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const internalUserId = await getInternalUserId(user.id)
      if (!internalUserId) return []

      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          estado,
          modulos:aula_modulo(count)
        `)
        .eq('id_usuario_creador', internalUserId)
        .order('creado_en', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // Estadísticas generales
  const { data: stats } = useQuery({
    queryKey: ['stats-lider', user?.id, idCurso],
    queryFn: async () => {
      if (!user?.id) return null

      // Obtener el ID interno del usuario
      const internalUserId = await getInternalUserId(user.id)
      if (!internalUserId) return null

      let query = supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          ministerio:ministerio(
            miembro_ministerio(count)
          )
        `)
        .eq('id_usuario_creador', internalUserId)

      if (idCurso) {
        query = query.eq('id_aula_curso', idCurso)
      }

      const { data, error } = await query

      if (error) throw error

      const totalCursos = cursos?.length || 0
      const cursosActivos = cursos?.filter(c => c.estado === 'activo').length || 0

      // Contar miembros totales en ministerios
      const totalMiembros = data?.reduce((total, curso) => {
        return total + (curso.ministerio?.miembro_ministerio?.[0]?.count || 0)
      }, 0) || 0

      // Obtener certificados emitidos
      const { data: certificados } = await supabase
        .from('aula_certificado')
        .select('id_aula_certificado')
        .in('id_aula_curso', cursos?.map(c => c.id_aula_curso) || [])

      return {
        totalCursos,
        cursosActivos,
        totalMiembros,
        certificadosEmitidos: certificados?.length || 0
      }
    },
    enabled: !!user?.id,
  })

  // Progreso del grupo para un curso específico
  const { data: progresoGrupo } = useProgresoGrupoCurso(idCurso)

  if (!stats) return <div>Cargando estadísticas...</div>

  // Calcular estadísticas del grupo
  const miembrosActivos = progresoGrupo?.filter(p => p.porcentaje > 0).length || 0
  const miembrosAtrasados = progresoGrupo?.filter(p => p.porcentaje < 25).length || 0
  const promedioProgreso = progresoGrupo && progresoGrupo.length > 0
    ? Math.round(progresoGrupo.reduce((sum, p) => sum + p.porcentaje, 0) / progresoGrupo.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Estadísticas Generales */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/20 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
            <BookOpen className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total de Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-[#4682b4]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{stats.totalCursos}</div>
            <p className="text-xs font-bold text-primary mt-1">
              {stats.cursosActivos} activos
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
            <Users className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Miembros Totales</CardTitle>
            <Users className="h-4 w-4 text-[#4682b4]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{stats.totalMiembros}</div>
            <p className="text-xs font-bold text-primary mt-1">
              En tus ministerios
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
            <Award className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Certificados</CardTitle>
            <Award className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{stats.certificadosEmitidos}</div>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              Emitidos totales
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
            <TrendingUp className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Promedio Grupo</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{promedioProgreso}%</div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
              Progreso promedio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas del Grupo (solo si hay un curso específico) */}
      {idCurso && progresoGrupo && progresoGrupo.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{miembrosActivos}</div>
              <p className="text-xs text-muted-foreground">
                Han iniciado el curso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Miembros Atrasados</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{miembrosAtrasados}</div>
              <p className="text-xs text-muted-foreground">
                Menos del 25% completado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ranking de Avance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cursos?.slice(0, 3).map((curso: any) => (
                  <div
                    key={curso.id_curso}
                    className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => navigate(`/app/aula/curso/${curso.id_curso}`)}
                  >
                    <p className="text-sm font-medium truncate">{curso.titulo}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant={curso.estado === 'activo' ? 'default' : 'secondary'} className="text-xs">
                        {curso.estado}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {curso.modulos?.[0]?.count || 0} módulos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de miembros atrasados */}
      {idCurso && miembrosAtrasados > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Miembros que necesitan atención</CardTitle>
            <CardDescription>
              Servidores con menos del 25% de progreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progresoGrupo?.filter(p => p.porcentaje < 25).map((miembro) => (
                <div key={miembro.idUsuario} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{miembro.nombre}</p>
                    <p className="text-sm text-muted-foreground">{miembro.correo}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">{miembro.porcentaje}%</Badge>
                    <div className="w-24">
                      <Progress value={miembro.porcentaje} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}