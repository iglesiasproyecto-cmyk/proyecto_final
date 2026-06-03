import { useState } from 'react'
import { useAuth, useApp } from '@/app/store/AppContext'
import { useCertificadosUsuario } from '@/hooks/useCertificados'
import { useMiAvanceCurso } from '@/hooks/useAvance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { BookOpen, Award, Clock, Bell, MessageSquare, Loader2, GraduationCap, Sparkles, TrendingUp, Star, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { CursosServidorList } from './CursosServidorList'
import { CertificadosServidor } from './CertificadosServidor'
import { ComentariosServidor } from './ComentariosSistema'
import { NotificacionesAula } from './NotificacionesAula'

export function ServidorAulaPage() {
  const { user } = useAuth()
  const { usuarioActual } = useApp()
  const { data: certificados = [] } = useCertificadosUsuario(usuarioActual?.idUsuario)
  const { data: avanceCursos = [] } = useMiAvanceCurso(usuarioActual?.idUsuario)

  if (!user) return null

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 shadow-[0_20px_60px_rgb(0,0,0,0.06)]"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen className="h-40 w-40 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-primary/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                <Sparkles className="mr-1 h-3 w-3" />
                ¡Bienvenido a tu crecimiento!
              </Badge>
              <Badge variant="outline" className="border-white/15 bg-background/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                Ruta de aprendizaje
              </Badge>
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Tu Ruta de <span className="text-primary">Aprendizaje</span></h2>
              <p className="mt-3 max-w-2xl text-sm sm:text-base font-medium leading-relaxed text-muted-foreground">
                Aquí encontrarás todos tus cursos asignados, certificados obtenidos y la retroalimentación de tus líderes. ¡Sigue avanzando en tu propósito!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/55 px-4 py-2 backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs font-bold">Progreso Constante</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/55 px-4 py-2 backdrop-blur-sm">
              <Award className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold">Certificaciones Oficiales</span>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="cursos" className="w-full">
        <div className="mb-6 flex items-center justify-between overflow-x-auto pb-2 no-scrollbar">
          <TabsList className="inline-flex rounded-2xl border border-border/50 bg-muted/50 p-1.5 backdrop-blur-md">
            <TabsTrigger value="cursos" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
              <BookOpen className="h-4 w-4 mr-2" />
              Cursos
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
              <Bell className="h-4 w-4 mr-2" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="comentarios" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comentarios
            </TabsTrigger>
            <TabsTrigger value="certificados" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
              <Award className="h-4 w-4 mr-2" />
              Certificados
            </TabsTrigger>
            <TabsTrigger value="logros" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
              <Star className="h-4 w-4 mr-2" />
              Mis Logros
            </TabsTrigger>
          </TabsList>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TabsContent value="cursos" className="mt-0 ring-offset-background focus-visible:outline-none">
            <CursosServidorList />
          </TabsContent>

          <TabsContent value="notificaciones" className="mt-0 ring-offset-background focus-visible:outline-none">
            <NotificacionesAula />
          </TabsContent>

          <TabsContent value="comentarios" className="mt-0 ring-offset-background focus-visible:outline-none">
            <ComentariosServidor />
          </TabsContent>

          <TabsContent value="certificados" className="mt-0 ring-offset-background focus-visible:outline-none">
            <CertificadosServidor />
          </TabsContent>

          <TabsContent value="logros" className="mt-0 ring-offset-background focus-visible:outline-none">
            <div className="space-y-6">
              {/* Certificados */}
              <div className="p-10 rounded-[40px] bg-card/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="flex items-center gap-4 mb-2 pb-6 border-b border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg text-white">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-foreground/90 uppercase italic">Certificados Obtenidos</h3>
                    <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">Logros y reconocimientos</p>
                  </div>
                </div>

                {certificados && certificados.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {certificados.map((cert: any) => (
                      <div key={cert.id_aula_certificado} className="p-6 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 hover:border-yellow-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Star className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-[14px] uppercase tracking-tight text-foreground line-clamp-2">{cert.curso?.titulo || 'Curso sin nombre'}</h4>
                            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(cert.emitido_en).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No hay certificados aún. Completa un curso al 100% para obtener tu certificado.</p>
                  </div>
                )}
              </div>

              {/* Cursos en Progreso */}
              <div className="p-10 rounded-[40px] bg-card/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="flex items-center gap-4 mb-2 pb-6 border-b border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg text-white">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-foreground/90 uppercase italic">Progreso en Cursos</h3>
                    <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">Avance de aprendizaje actual</p>
                  </div>
                </div>

                {avanceCursos && avanceCursos.length > 0 ? (
                  <div className="space-y-4">
                    {avanceCursos.map((avance: any) => {
                      const porcentajeModulos = avance.modulosPublicados > 0 
                        ? Math.round((avance.modulosCompletados / avance.modulosPublicados) * 100)
                        : 0;
                      const completado = porcentajeModulos === 100;

                      return (
                        <div key={avance.idAulaInscripcion} className="group p-6 rounded-3xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 hover:border-[#4682b4]/40 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              {completado && <Star className="w-5 h-5 text-yellow-400 animate-pulse" />}
                              <span className="font-black text-[14px] uppercase tracking-tight text-foreground">Módulo {avance.modulosCompletados}/{avance.modulosPublicados}</span>
                            </div>
                            <Badge className={`${completado ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white' : 'bg-[#4682b4]/20 text-[#4682b4]'} font-black`}>
                              {porcentajeModulos}%
                            </Badge>
                          </div>
                          
                          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              className={`h-full rounded-full transition-all duration-1000 ${completado ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-[#709dbd] to-[#4682b4]'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${porcentajeModulos}%` }}
                            />
                          </div>

                          {completado && (
                            <div className="mt-4 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-[11px] font-black uppercase tracking-widest text-yellow-600">¡Curso Completado!</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No estás inscrito en cursos aún.</p>
                  </div>
                )}
              </div>

              {/* Resumen Estadístico */}
              {(certificados.length > 0 || avanceCursos.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">Certificados</p>
                    <p className="text-3xl font-black text-blue-600">{certificados.length}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">Cursos Activos</p>
                    <p className="text-3xl font-black text-purple-600">{avanceCursos.length}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">Promedio Progreso</p>
                    <p className="text-3xl font-black text-green-600">
                      {avanceCursos.length > 0 
                        ? Math.round(
                            avanceCursos.reduce((sum: number, c: any) => sum + (c.modulosPublicados > 0 ? (c.modulosCompletados / c.modulosPublicados) * 100 : 0), 0) / 
                            avanceCursos.length
                          )
                        : 0
                      }%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  )
}
