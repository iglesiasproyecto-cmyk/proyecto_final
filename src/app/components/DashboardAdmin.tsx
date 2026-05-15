import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { motion } from 'motion/react'
import { BookOpen, Users, Award, TrendingUp, CheckCircle2, FileEdit } from 'lucide-react'
import { Skeleton } from '@/app/components/ui/skeleton';
import { CardSkeleton } from './loading/skeletons';

interface DashboardAdminProps {
  idIglesia: number
}

export function DashboardAdmin({ idIglesia }: DashboardAdminProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-admin-aula', idIglesia],
    queryFn: async () => {
      const { data: cursos, error: cursosError } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          estado,
          ministerio!inner(nombre, sede!inner(id_iglesia)),
          aula_inscripcion(id_aula_inscripcion),
          aula_modulo(id_aula_modulo)
        `)
        .eq('ministerio.sede.id_iglesia', idIglesia)

      if (cursosError) throw cursosError

      const activos = (cursos ?? []).filter(c => c.estado === 'activo').length
      const borradores = (cursos ?? []).filter(c => c.estado !== 'activo').length
      const cursoIds = (cursos ?? []).map(c => c.id_aula_curso)

      if (cursoIds.length === 0) {
        return { activos, borradores, uniqueServidores: 0, promedio: 0, topCursos: [], total: 0 }
      }

      const { data: inscripciones, error: inscError } = await supabase
        .from('aula_inscripcion')
        .select('id_usuario')
        .eq('activo', true)
        .in('id_aula_curso', cursoIds)

      if (inscError) throw inscError

      const uniqueServidores = new Set((inscripciones ?? []).map(i => i.id_usuario)).size
      const promedio = 0

      const topCursos = (cursos ?? [])
        .map(c => ({
          id: c.id_aula_curso,
          titulo: c.titulo,
          ministerio: (c.ministerio as any)?.nombre ?? '',
          inscritos: (c.aula_inscripcion as any)?.length ?? 0,
          modulos: (c.aula_modulo as any)?.length ?? 0,
        }))
        .sort((a, b) => b.inscritos - a.inscritos)
        .slice(0, 5)

      return { activos, borradores, uniqueServidores, promedio, topCursos, total: (cursos ?? []).length }
    },
    enabled: !!idIglesia,
    staleTime: 3 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton items={4} columns={4} />
      </div>
    )
  }

  if (!stats) return null

  const kpis = [
    { icon: <BookOpen className="w-5 h-5" />, label: 'Cursos activos', value: stats.activos, color: 'from-emerald-500 to-teal-600' },
    { icon: <FileEdit className="w-5 h-5" />, label: 'Borradores', value: stats.borradores, color: 'from-amber-500 to-orange-500' },
    { icon: <Users className="w-5 h-5" />, label: 'Servidores inscritos', value: stats.uniqueServidores, color: 'from-[#709dbd] to-[#4682b4]' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'Progreso promedio', value: `${stats.promedio}%`, color: 'from-violet-500 to-purple-600' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07 }}
          >
            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-card/55 shadow-sm backdrop-blur-2xl">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                    {kpi.icon}
                  </div>
                  <Badge variant="secondary" className="border-0 bg-primary/10 py-0 text-[10px] uppercase tracking-widest text-primary">KPI</Badge>
                </div>
                <p className="text-4xl font-light tracking-tight text-foreground">{kpi.value}</p>
                <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Top courses table */}
      {stats.topCursos.length > 0 && (
        <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-card/55 shadow-sm backdrop-blur-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-[0.15em] text-foreground/70 flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Cursos con más inscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topCursos.map((curso, idx) => (
                <div key={curso.id} className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-black text-primary shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{curso.titulo}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{curso.ministerio} · {curso.modulos} módulos</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Progress value={Math.min((curso.inscritos / Math.max(stats.uniqueServidores, 1)) * 100, 100)} className="w-20 h-1.5" />
                    <span className="text-xs font-bold text-foreground/60 w-12 text-right">{curso.inscritos} insc.</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.total === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-border bg-muted/20 py-12 text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 opacity-20" />
          <p className="text-sm">No hay cursos en la iglesia todavía. ¡Crea el primero!</p>
        </div>
      )}
    </div>
  )
}
