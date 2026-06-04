import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { useProgresoGrupoCurso } from '@/hooks/useProgreso'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { Skeleton } from '@/app/components/ui/skeleton';
import { CardSkeleton } from './loading/skeletons';
import { Users, BookOpen, TrendingUp, Award, UserCheck, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useQuery } from '@tanstack/react-query'

interface DashboardLiderProps {
  idCurso?: number
}

export function DashboardLider({ idCurso }: DashboardLiderProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Estadísticas del líder en un solo query: cursos creados, miembros activos de sus
  // ministerios, certificados emitidos e inscripciones activas. Antes vivían en dos queries
  // acoplados por closure (sin el query de cursos en el queryKey), por lo que las tarjetas
  // quedaban en 0 al renderizar antes de que cargara el otro query.
  const { data: stats } = useQuery({
    queryKey: ['dashboard-lider-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const internalUserId = await getInternalUserId(user.id)
      if (!internalUserId) return null

      const { data: cursosData, error } = await supabase
        .from('aula_curso')
        .select('id_aula_curso, titulo, estado, id_ministerio, modulos:aula_modulo(id_aula_modulo)')
        .eq('id_usuario_creador', internalUserId)
        .order('creado_en', { ascending: false })
      if (error) throw error

      const cursos = cursosData ?? []
      const totalCursos = cursos.length
      const cursosActivos = cursos.filter(c => c.estado === 'activo').length
      const cursoIds = cursos.map(c => c.id_aula_curso)
      const ministerioIds = [...new Set(
        cursos.map(c => c.id_ministerio).filter((id): id is number => id != null)
      )]

      // Miembros activos (sin fecha de salida) en los ministerios de esos cursos.
      let totalMiembros = 0
      if (ministerioIds.length) {
        const { count } = await supabase
          .from('miembro_ministerio')
          .select('id_miembro_ministerio', { count: 'exact', head: true })
          .in('id_ministerio', ministerioIds)
          .is('fecha_salida', null)
        totalMiembros = count ?? 0
      }

      // Certificados emitidos para los cursos del líder.
      let certificadosEmitidos = 0
      if (cursoIds.length) {
        const { count } = await supabase
          .from('aula_certificado')
          .select('id_aula_certificado', { count: 'exact', head: true })
          .in('id_aula_curso', cursoIds)
        certificadosEmitidos = count ?? 0
      }

      // Inscripciones activas en los cursos del líder.
      let inscripcionesActivas = 0
      if (cursoIds.length) {
        const { count } = await supabase
          .from('aula_inscripcion')
          .select('id_aula_inscripcion', { count: 'exact', head: true })
          .in('id_aula_curso', cursoIds)
          .eq('activo', true)
        inscripcionesActivas = count ?? 0
      }

      return { totalCursos, cursosActivos, totalMiembros, certificadosEmitidos, inscripcionesActivas, cursos }
    },
    enabled: !!user?.id,
  })

  const cursos = stats?.cursos

  // Progreso del grupo para un curso específico
  const { data: progresoGrupo } = useProgresoGrupoCurso(idCurso)

  if (!stats) return (
    <div className="space-y-6">
      <CardSkeleton items={4} columns={4} />
    </div>
  )

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
        <Card className="relative overflow-hidden rounded-[28px] border border-white/10 bg-card/55 shadow-sm backdrop-blur-2xl group">
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

        <Card className="relative overflow-hidden rounded-[28px] border border-white/10 bg-card/55 shadow-sm backdrop-blur-2xl group">
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

        <Card className="relative overflow-hidden rounded-[28px] border border-white/10 bg-card/55 shadow-sm backdrop-blur-2xl group">
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

        <Card className="relative overflow-hidden rounded-[28px] border border-white/10 bg-card/55 shadow-sm backdrop-blur-2xl group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
            <TrendingUp className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Inscripciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{stats.inscripcionesActivas}</div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
              Inscripciones activas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas del Grupo (solo si hay un curso específico) */}
      {idCurso && progresoGrupo && progresoGrupo.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
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

          <Card className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
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

          <Card className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ranking de Avance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cursos?.slice(0, 3).map((curso: any) => (
                  <div
                    key={curso.id_curso}
                    className="cursor-pointer rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 to-primary/10 p-3 transition-colors hover:bg-primary/10"
                    onClick={() => navigate(`/app/aula/curso/${curso.id_curso}`)}
                  >
                    <p className="text-sm font-medium truncate">{curso.titulo}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant={curso.estado === 'activo' ? 'default' : 'secondary'} className="text-xs">
                        {curso.estado}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {curso.modulos?.length || 0} módulos
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
        <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Miembros que necesitan atención</CardTitle>
            <CardDescription>
              Servidores con menos del 25% de progreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progresoGrupo?.filter(p => p.porcentaje < 25).map((miembro) => (
                <div key={miembro.idUsuario} className="flex items-center justify-between rounded-2xl border border-white/10 p-3">
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
