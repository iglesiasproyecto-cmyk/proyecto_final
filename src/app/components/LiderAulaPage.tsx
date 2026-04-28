import { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { useMinisteriosIdsDeUsuario } from '@/hooks/useMinisterios'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Badge } from '@/app/components/ui/badge'
import { Plus, BookOpen, TrendingUp, GraduationCap, ShieldCheck } from 'lucide-react'
import { CrearCursoDialog } from './CrearCursoDialog'
import { CursosLiderList } from './CursosLiderList'
import { DashboardLider } from './DashboardLiderActualizado'
import { motion } from 'motion/react'

export function LiderAulaPage() {
  const { user } = useAuth()
  const [showCrearCurso, setShowCrearCurso] = useState(false)
  const [internalUserId, setInternalUserId] = useState<number | null>(null)

  useEffect(() => {
    const getUserId = async () => {
      if (user?.id) {
        const id = await getInternalUserId(user.id)
        setInternalUserId(id)
      }
    }
    getUserId()
  }, [user?.id])

  const { data: ministeriosIds = [] } = useMinisteriosIdsDeUsuario(internalUserId || undefined)

  if (!user) return null

  return (
    <div className="space-y-8">
      {/* Admin Hero Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4682b4]/15 via-[#709dbd]/5 to-transparent border border-[#4682b4]/20 p-8"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="h-40 w-40 -rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-[#4682b4]/20 text-[#4682b4] hover:bg-[#4682b4]/30 border-none px-4 py-1 flex items-center gap-2 w-fit">
              <ShieldCheck className="h-3.5 w-3.5" />
              Panel de Gestión Académica
            </Badge>
            <h2 className="text-2xl md:text-3xl font-black mb-3 text-foreground">Panel de <span className="text-[#4682b4]">Líder</span></h2>
            <p className="text-muted-foreground font-medium leading-relaxed">
              Diseña la formación de tu equipo, monitorea el progreso en tiempo real y empodera a tus servidores con las herramientas necesarias.
            </p>
          </div>
          
          {ministeriosIds.length > 0 && (
            <Button 
              onClick={() => setShowCrearCurso(true)}
              className="bg-gradient-to-r from-[#4682b4] to-[#709dbd] hover:from-[#3b6d96] hover:to-[#5b84a1] text-white rounded-2xl px-6 py-6 h-auto shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="font-bold">Crear Nuevo Curso</span>
            </Button>
          )}
        </div>
      </motion.div>

      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2 no-scrollbar">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md inline-flex">
            <TabsTrigger value="dashboard" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-[#4682b4] transition-all">
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="cursos" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-[#4682b4] transition-all">
              <BookOpen className="h-4 w-4 mr-2" />
              Mis Cursos
            </TabsTrigger>
          </TabsList>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TabsContent value="dashboard" className="mt-0 ring-offset-background focus-visible:outline-none">
            <DashboardLider />
          </TabsContent>

          <TabsContent value="cursos" className="mt-0 ring-offset-background focus-visible:outline-none">
            <CursosLiderList />
          </TabsContent>
        </motion.div>
      </Tabs>

      <CrearCursoDialog
        open={showCrearCurso}
        onOpenChange={setShowCrearCurso}
        internalUserId={internalUserId}
      />
    </div>
  )
}