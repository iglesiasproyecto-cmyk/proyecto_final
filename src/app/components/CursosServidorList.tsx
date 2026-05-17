import React, { useEffect, useState } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { supabase } from '@/lib/supabaseClient'
import { getInternalUserId } from '@/lib/userHelpers'
import { useQuery } from '@tanstack/react-query'
import { useProgresoCurso } from '@/hooks/useProgreso'
import { useCertificadosUsuario } from '@/hooks/useCertificados'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Plus, BookOpen, TrendingUp, GraduationCap, ShieldCheck, Sparkles, Users, Clock, ArrowRight, Award, CheckCircle } from 'lucide-react'
import { BarraProgreso } from './BarraProgreso'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'
import { Skeleton } from '@/app/components/ui/skeleton';
import { AulaSkeleton } from '@/app/components/loading/skeletons';

export function CursosServidorList() {
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [internalUserLoading, setInternalUserLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const resolveInternalUser = async () => {
      if (!user?.id) {
        if (mounted) setInternalUserId(null)
        return
      }

      setInternalUserLoading(true)
      const userId = await getInternalUserId(user.id)
      if (mounted) {
        setInternalUserId(userId)
        setInternalUserLoading(false)
      }
    }

    resolveInternalUser()
    return () => {
      mounted = false
    }
  }, [user?.id])

  const { data: cursos, isLoading } = useQuery({
    queryKey: ['cursos-servidor', internalUserId],
    queryFn: async () => {
      if (!internalUserId) return []

      const { data, error } = await supabase
        .from('aula_inscripcion')
        .select(`
          activo,
          inscrito_en,
          aula_curso:aula_curso!inner(
            id_aula_curso,
            titulo,
            descripcion,
            ministerio:ministerio(nombre)
          )
        `)
        .eq('id_usuario', internalUserId)
        .eq('activo', true)
        .eq('aula_curso.estado', 'activo')

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
    enabled: !!internalUserId,
    staleTime: 30 * 1000,
  })

  if (internalUserLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[280px] rounded-[28px] border border-white/10 bg-muted/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <AulaSkeleton courses={3} columns={3} />
      </div>
    )
  }

  if (!cursos || cursos.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-muted/20 py-20"
      >
        <div className="mb-4 rounded-2xl bg-background p-4 shadow-sm">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-xl font-bold">No tienes cursos asignados</h3>
        <p className="max-w-sm text-center font-medium text-muted-foreground">
          Cuando tu líder publique un curso para tu ministerio, aparecerá aquí automáticamente.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cursos.map((curso, index) => (
        <CursoCard key={curso.id_curso} curso={curso} userId={internalUserId} index={index} />
      ))}
    </div>
  )
}

function CursoCard({ curso, userId, index }: { curso: any, userId?: number, index: number }) {
  const navigate = useNavigate()
  const { data: progreso } = useProgresoCurso({
    idUsuario: userId,
    idCurso: curso.id_curso
  })

  const { data: certificados } = useCertificadosUsuario(userId)
  const tieneCertificado = certificados?.some(c => c.id_aula_curso === curso.id_curso)

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
      className="group relative cursor-pointer"
    >
      <Card className="h-full overflow-hidden rounded-[28px] border border-white/10 bg-background/55 backdrop-blur-2xl transition-all duration-500 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-2xl group-hover:shadow-primary/10">
        <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${colorClass}`}>
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="border-none bg-background/80 text-[10px] font-bold uppercase tracking-tight backdrop-blur-md">
              {curso.ministerio?.nombre || 'General'}
            </Badge>
          </div>
          <div className="absolute -bottom-6 -left-6 opacity-10 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
            <BookOpen className="h-32 w-32" />
          </div>
          {tieneCertificado && (
            <div className="absolute top-4 left-4">
              <div className="p-1.5 bg-amber-500 rounded-full shadow-lg animate-pulse">
                <Award className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
          {progreso?.porcentaje === 100 && !tieneCertificado && (
            <div className="absolute top-4 left-4">
              <div className="p-1.5 bg-green-500 rounded-full shadow-lg">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
        </div>
        
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-black leading-tight transition-colors group-hover:text-primary">
            {curso.nombre}
          </CardTitle>
          <CardDescription className="h-10 line-clamp-2 text-sm font-medium">
            {curso.descripcion || 'Inicia hoy tu camino de formación en este curso especializado.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
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

          <div className="flex items-center justify-between border-t border-border/50 pt-2">
            <div className="flex items-center text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
              <Clock className="h-3 w-3 mr-1 text-primary" />
              {new Date(curso.fecha_inscripcion).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-primary transition-transform group-hover:translate-x-1">
              Continuar <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
