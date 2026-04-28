import { useAuth } from '@/app/store/AppContext'
import { supabase } from '@/lib/supabaseClient'
import { getInternalUserId } from '@/lib/userHelpers'
import { useQuery } from '@tanstack/react-query'
import { useProgresoCurso } from '@/hooks/useProgreso'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Plus, BookOpen, TrendingUp, GraduationCap, ShieldCheck, Sparkles, Users, Clock, ArrowRight } from 'lucide-react'
import { BarraProgreso } from './BarraProgreso'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

export function CursosServidorList() {
  const { user } = useAuth()

  const { data: cursos, isLoading } = useQuery({
    queryKey: ['cursos-servidor', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const internalUserId = await getInternalUserId(user.id)
      if (!internalUserId) return []

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
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[280px] rounded-3xl bg-muted/50 animate-pulse border border-border/50" />
        ))}
      </div>
    )
  }

  if (!cursos || cursos.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border"
      >
        <div className="p-4 bg-background rounded-2xl shadow-sm mb-4">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold mb-2">No tienes cursos asignados</h3>
        <p className="text-muted-foreground text-center max-w-sm font-medium">
          Cuando tu líder publique un curso para tu ministerio, aparecerá aquí automáticamente.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cursos.map((curso, index) => (
        <CursoCard key={curso.id_curso} curso={curso} userId={user?.id} index={index} />
      ))}
    </div>
  )
}

function CursoCard({ curso, userId, index }: { curso: any, userId?: string, index: number }) {
  const navigate = useNavigate()
  const { data: progreso } = useProgresoCurso({
    idUsuario: userId,
    idCurso: curso.id_curso
  })

  const colors = [
    'from-blue-500/20 to-indigo-500/10',
    'from-emerald-500/20 to-teal-500/10',
    'from-amber-500/20 to-orange-500/10',
    'from-purple-500/20 to-pink-500/10',
  ]
  const colorClass = colors[index % colors.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      onClick={() => navigate(`/app/aula/curso/${curso.id_curso}`)}
      className="group cursor-pointer relative"
    >
      <Card className="h-full overflow-hidden border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/10 group-hover:border-primary/30 rounded-3xl">
        <div className={`h-32 bg-gradient-to-br ${colorClass} relative overflow-hidden`}>
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-md border-none text-[10px] font-bold uppercase tracking-tight">
              {curso.ministerio?.nombre || 'General'}
            </Badge>
          </div>
          <div className="absolute -bottom-6 -left-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
            <BookOpen className="h-32 w-32" />
          </div>
          {progreso?.porcentaje === 100 && (
            <div className="absolute top-4 left-4">
              <div className="p-1.5 bg-green-500 rounded-full shadow-lg">
                <Award className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
        </div>
        
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-black group-hover:text-primary transition-colors leading-tight">
            {curso.nombre}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-sm font-medium h-10">
            {curso.descripcion || 'Inicia hoy tu camino de formación en este curso especializado.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Progreso Actual
              </span>
              <span className="text-sm font-bold text-primary">
                {progreso?.porcentaje || 0}%
              </span>
            </div>
            <BarraProgreso
              porcentaje={progreso?.porcentaje || 0}
              actividadesCompletadas={progreso?.actividadesCompletadas || 0}
              evaluacionesAprobadas={progreso?.evaluacionesAprobadas || 0}
              totalElementos={progreso?.totalElementos || 0}
              showDetails={false}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
              <Clock className="h-3 w-3 mr-1 text-primary" />
              {new Date(curso.fecha_inscripcion).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1 text-primary font-bold text-xs group-hover:translate-x-1 transition-transform">
              Continuar <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}