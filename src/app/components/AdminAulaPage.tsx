import { useState, useEffect } from 'react'
import { useApp } from '@/app/store/AppContext'
import { useAuth } from '@/app/store/AppContext'
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
  const { iglesiaActual } = useApp()
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
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4682b4]/15 via-[#709dbd]/5 to-transparent border border-[#4682b4]/20 p-8"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <GraduationCap className="h-40 w-40 -rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="bg-[#4682b4]/20 text-[#4682b4] hover:bg-[#4682b4]/30 border-none px-3 py-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest">
                <GraduationCap className="h-3.5 w-3.5" />
                Gestión Académica
              </Badge>
              {iglesiaActual?.nombre && (
                <Badge variant="outline" className="border-white/20 text-foreground/60 text-[11px] px-3 py-1 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  {iglesiaActual.nombre}
                </Badge>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-2 text-foreground">
              Aula <span className="text-[#4682b4]">Virtual</span>
            </h2>
            <p className="text-muted-foreground font-medium leading-relaxed text-sm">
              Gestiona cursos, módulos, inscripciones y progreso de todos los servidores de tu iglesia.
            </p>
          </div>
          <Button
            onClick={() => setShowCrearCurso(true)}
            disabled={ministeriosDisponibles.length === 0}
            className="bg-gradient-to-r from-[#4682b4] to-[#709dbd] hover:from-[#3b6d96] hover:to-[#5b84a1] text-white rounded-2xl px-6 py-6 h-auto shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="font-bold">Crear Nuevo Curso</span>
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="cursos" className="w-full">
        <div className="flex items-center mb-6 overflow-x-auto pb-2">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md inline-flex">
            <TabsTrigger
              value="cursos"
              className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-[#4682b4] transition-all"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Todos los Cursos
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-[#4682b4] transition-all"
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
