import { useState } from 'react'
import { getCursosEnriquecidos } from '@/services/cursos.service'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { motion } from 'motion/react'
import { GraduationCap, BookOpen, TrendingUp, Building2, ChevronDown } from 'lucide-react'
import { CursosAdminList } from './CursosAdminList'

export function GlobalAulaPage() {
  const [expandedIglesia, setExpandedIglesia] = useState<number | null>(null)

  // Fetch all courses globally (no iglesia filter)
  const { data: allCursos = [], isLoading } = useQuery({
    queryKey: ['cursos-enriquecidos-global'],
    queryFn: () => getCursosEnriquecidos(undefined),
    staleTime: 5 * 60 * 1000,
  })

  // Group courses by iglesia
  const cursosPorIglesia = allCursos.reduce((acc, curso) => {
    const key = curso.iglesiaNombre || 'Sin iglesia'
    if (!acc[key]) acc[key] = []
    acc[key].push(curso)
    return acc
  }, {} as Record<string, typeof allCursos>)

  const iglesias = Object.entries(cursosPorIglesia)

  // Calculate global stats
  const totalCursos = allCursos.length
  const totalIglesias = iglesias.length
  const cursosActivos = allCursos.filter(c => c.estado !== 'finalizado').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#4682b4]/15 via-[#709dbd]/5 to-transparent p-6 sm:p-8 shadow-[0_20px_60px_rgb(0,0,0,0.06)]"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <GraduationCap className="h-40 w-40 -rotate-12" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-none bg-[#4682b4]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#4682b4]">
              <GraduationCap className="mr-1 h-3.5 w-3.5" />
              Gestión académica global
            </Badge>
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Aula <span className="text-[#4682b4]">Virtual Global</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm sm:text-base font-medium leading-relaxed text-muted-foreground">
              Supervisión de cursos, inscripciones y progreso de aprendizaje en todas las iglesias.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="rounded-xl bg-background/50 border border-border/50 p-4">
              <div className="text-2xl font-bold text-foreground">{totalCursos}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Cursos totales</div>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4">
              <div className="text-2xl font-bold text-foreground">{totalIglesias}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Iglesias</div>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4">
              <div className="text-2xl font-bold text-foreground">{cursosActivos}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Activos</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="iglesias" className="w-full">
        <div className="mb-6 flex items-center overflow-x-auto pb-2 no-scrollbar">
          <TabsList className="inline-flex rounded-2xl border border-border/50 bg-muted/50 p-1.5 backdrop-blur-md">
            <TabsTrigger
              value="iglesias"
              className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-[#4682b4] data-[state=active]:shadow-lg"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Por iglesia
            </TabsTrigger>
            <TabsTrigger
              value="todos"
              className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-[#4682b4] data-[state=active]:shadow-lg"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Todos los cursos
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Por iglesia */}
        <TabsContent value="iglesias" className="space-y-4">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded-xl" />
              ))}
            </div>
          ) : iglesias.length === 0 ? (
            <Card>
              <CardContent className="pt-8">
                <div className="text-center text-muted-foreground">
                  No hay cursos disponibles
                </div>
              </CardContent>
            </Card>
          ) : (
            iglesias.map(([iglesiaNombre, cursos]) => (
              <motion.div
                key={iglesiaNombre}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="cursor-pointer transition-all hover:border-primary/50"
                  onClick={() => setExpandedIglesia(expandedIglesia === iglesias.indexOf([iglesiaNombre, cursos]) ? null : iglesias.indexOf([iglesiaNombre, cursos]))}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">{iglesiaNombre}</CardTitle>
                          <p className="text-xs text-muted-foreground">{cursos.length} cursos</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${
                          expandedIglesia === iglesias.indexOf([iglesiaNombre, cursos]) ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CardHeader>

                  {expandedIglesia === iglesias.indexOf([iglesiaNombre, cursos]) && (
                    <CardContent className="pt-0">
                      <div className="space-y-2 border-t border-border/50 pt-4">
                        {cursos.map(curso => (
                          <div
                            key={curso.idCurso}
                            className="flex items-center justify-between rounded-lg bg-background/50 p-3 text-sm"
                          >
                            <span className="font-medium">{curso.titulo}</span>
                            <Badge variant="outline" className="text-xs">
                              {curso.estado}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Tab: Todos los cursos */}
        <TabsContent value="todos">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded-xl" />
              ))}
            </div>
          ) : (
            <CursosAdminList cursos={allCursos} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
