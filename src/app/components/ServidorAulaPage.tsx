import { useState } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { BookOpen, Award, Clock, Bell, MessageSquare, Loader2, GraduationCap, Sparkles, TrendingUp } from 'lucide-react'
import { CursosServidorList } from './CursosServidorList'
import { CertificadosServidor } from './CertificadosServidor'
import { ComentariosServidor } from './ComentariosSistema'
import { NotificacionesAula } from './NotificacionesAula'
import { motion, AnimatePresence } from 'motion/react'

export function ServidorAulaPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="space-y-8">
      {/* Hero Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen className="h-40 w-40 rotate-12" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <Badge className="mb-4 bg-primary/20 text-primary hover:bg-primary/30 border-none px-4 py-1">
            <Sparkles className="h-3 w-3 mr-2" />
            ¡Bienvenido a tu crecimiento!
          </Badge>
          <h2 className="text-2xl md:text-3xl font-black mb-3">Tu Ruta de <span className="text-primary">Aprendizaje</span></h2>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Aquí encontrarás todos tus cursos asignados, certificados obtenidos y la retroalimentación de tus líderes. 
            ¡Sigue avanzando en tu propósito!
          </p>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-sm rounded-2xl border border-border/50">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs font-bold">Progreso Constante</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-sm rounded-2xl border border-border/50">
              <Award className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold">Certificaciones Oficiales</span>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="cursos" className="w-full">
        <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2 no-scrollbar">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md inline-flex">
            <TabsTrigger value="cursos" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
              <BookOpen className="h-4 w-4 mr-2" />
              Cursos
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
              <Bell className="h-4 w-4 mr-2" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="comentarios" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comentarios
            </TabsTrigger>
            <TabsTrigger value="certificados" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
              <Award className="h-4 w-4 mr-2" />
              Certificados
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
        </motion.div>
      </Tabs>
    </div>
  )
}