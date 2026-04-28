import { useState } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { BookOpen, Award, Clock, Bell, MessageSquare } from 'lucide-react'
import { CursosServidorList } from './CursosServidorList'
import { CertificadosServidor } from './CertificadosServidor'
import { ComentariosServidor } from './ComentariosSistema'
import { NotificacionesAula } from './NotificacionesAula'

export function ServidorAulaPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Mis Cursos</h2>
        <p className="text-muted-foreground">
          Continúa tu formación y obtén certificados
        </p>
      </div>

      <Tabs defaultValue="cursos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cursos">
            <BookOpen className="h-4 w-4 mr-2" />
            Cursos
          </TabsTrigger>
          <TabsTrigger value="notificaciones">
            <Bell className="h-4 w-4 mr-2" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="comentarios">
            <MessageSquare className="h-4 w-4 mr-2" />
            Comentarios
          </TabsTrigger>
          <TabsTrigger value="certificados">
            <Award className="h-4 w-4 mr-2" />
            Certificados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cursos">
          <CursosServidorList />
        </TabsContent>

        <TabsContent value="notificaciones">
          <NotificacionesAula />
        </TabsContent>

        <TabsContent value="comentarios">
          <ComentariosServidor />
        </TabsContent>

        <TabsContent value="certificados">
          <CertificadosServidor />
        </TabsContent>
      </Tabs>
    </div>
  )
}