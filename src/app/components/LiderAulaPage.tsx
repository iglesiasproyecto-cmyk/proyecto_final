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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#4682b4]/15 via-[#709dbd]/5 to-transparent p-6 sm:p-8 shadow-[0_20px_60px_rgb(0,0,0,0.06)]"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="h-40 w-40 -rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-[#4682b4]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#4682b4]">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Panel de gestión académica
              </Badge>
              <Badge variant="outline" className="border-white/15 bg-background/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                Líder ministerial
              </Badge>
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Panel de <span className="text-[#4682b4]">Líder</span></h2>
              <p className="mt-3 max-w-2xl text-sm sm:text-base font-medium leading-relaxed text-muted-foreground">
                Diseña la formación de tu equipo, monitorea el progreso en tiempo real y empodera a tus servidores con las herramientas necesarias.
              </p>
            </div>
          </div>
          
          {ministeriosIds.length > 0 && (
            <Button 
              onClick={() => setShowCrearCurso(true)}
              className="h-auto shrink-0 rounded-2xl bg-gradient-to-r from-[#4682b4] to-[#709dbd] px-6 py-4 text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] hover:from-[#3b6d96] hover:to-[#5b84a1] active:scale-[0.98]"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="font-bold">Crear Nuevo Curso</span>
            </Button>
          )}
        </div>
      </motion.div>

      <Tabs defaultValue="dashboard" className="w-full">
        <div className="mb-6 flex items-center justify-between overflow-x-auto pb-2 no-scrollbar">
          <TabsList className="inline-flex rounded-2xl border border-border/50 bg-muted/50 p-1.5 backdrop-blur-md">
            <TabsTrigger value="dashboard" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-[#4682b4] data-[state=active]:shadow-lg">
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="cursos" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-[#4682b4] data-[state=active]:shadow-lg">
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
