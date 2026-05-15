import { useState, useEffect } from 'react'
import { useApp, useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { useMinisteriosEnriquecidos } from '@/hooks/useMinisterios'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { motion } from 'motion/react'
import { GraduationCap, BookOpen, TrendingUp, Plus, Building2 } from 'lucide-react'
import { CursosAdminList } from './CursosAdminList'
import { DashboardAdmin } from './DashboardAdmin'
import { CrearCursoDialog } from './CrearCursoDialog'

export function AdminAulaPage() {
  const { iglesiaActual, user: appUser } = useApp()
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [showCrearCurso, setShowCrearCurso] = useState(false)

  useEffect(() => {
    if (user?.id) {
      getInternalUserId(user.id).then(id => setInternalUserId(id))
    }
  }, [user?.id])

  const { data: ministerios = [] } = useMinisteriosEnriquecidos(iglesiaActual?.id)

  const ministeriosDisponibles = ministerios.map(m => ({
    id_ministerio: m.idMinisterio,
    nombre: m.nombre,
  }))

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#4682b4]/15 via-[#709dbd]/5 to-transparent p-6 sm:p-8 shadow-[0_20px_60px_rgb(0,0,0,0.06)]"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <GraduationCap className="h-40 w-40 -rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-[#4682b4]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#4682b4]">
                <GraduationCap className="mr-1 h-3.5 w-3.5" />
                Gestión académica
              </Badge>
              {iglesiaActual?.nombre && (
                <Badge variant="outline" className="border-white/15 bg-background/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                  <Building2 className="mr-1 h-3 w-3" />
                  {iglesiaActual.nombre}
                </Badge>
              )}
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Aula <span className="text-[#4682b4]">Virtual</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm sm:text-base font-medium leading-relaxed text-muted-foreground">
                Gestiona cursos, módulos, inscripciones y progreso de todos los servidores de tu iglesia.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowCrearCurso(true)}
            disabled={appUser?.rol !== 'admin_iglesia' && ministeriosDisponibles.length === 0}
            className="h-auto shrink-0 rounded-2xl bg-gradient-to-r from-[#4682b4] to-[#709dbd] px-6 py-4 text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] hover:from-[#3b6d96] hover:to-[#5b84a1] active:scale-[0.98]"
          >
            <Plus className="mr-2 h-5 w-5" />
            <span className="font-bold">Crear nuevo curso</span>
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="cursos" className="w-full">
        <div className="mb-6 flex items-center overflow-x-auto pb-2 no-scrollbar">
          <TabsList className="inline-flex rounded-2xl border border-border/50 bg-muted/50 p-1.5 backdrop-blur-md">
            <TabsTrigger
              value="cursos"
              className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-[#4682b4] data-[state=active]:shadow-lg"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Todos los Cursos
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-[#4682b4] data-[state=active]:shadow-lg"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Estadísticas
            </TabsTrigger>
          </TabsList>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <TabsContent value="cursos" className="mt-0">
            <CursosAdminList ministerios={ministeriosDisponibles.map(m => ({ idMinisterio: m.id_ministerio, nombre: m.nombre }))} />
          </TabsContent>
          <TabsContent value="stats" className="mt-0">
            {iglesiaActual?.id ? (
              <DashboardAdmin idIglesia={iglesiaActual.id} />
            ) : (
              <p className="text-muted-foreground text-sm">No hay iglesia seleccionada.</p>
            )}
          </TabsContent>
        </motion.div>
      </Tabs>

      <CrearCursoDialog
        open={showCrearCurso}
        onOpenChange={setShowCrearCurso}
        internalUserId={internalUserId}
        ministeriosDisponibles={ministeriosDisponibles}
      />
    </div>
  )
}
