import { useState } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { useIglesias } from '@/hooks/useIglesias'
import { IglesiaAulaRow } from './IglesiaAulaRow'
import { GlobalAulaDetailPanel } from './GlobalAulaDetailPanel'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { GraduationCap, Sparkles, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { Tables } from '@/types/database.types'

export function GlobalAulaPage() {
  const { rolActual } = useAuth()

  // State Management
  const [expandedIglesias, setExpandedIglesias] = useState<Set<number>>(new Set())
  const [expandedMinisterios, setExpandedMinisterios] = useState<Set<number>>(new Set())
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)

  // Fetch iglesias
  const { data: iglesias = [], isLoading, isError } = useIglesias()

  // Permission check
  if (rolActual !== 'super_admin') {
    return (
      <div className="relative min-h-full px-4 sm:px-6 lg:px-8 pb-10">
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Solo super_admin puede acceder a la Aula Global. Tu rol es: {rolActual}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Toggle handlers
  const handleToggleIglesia = (idIglesia: number) => {
    setExpandedIglesias(prev => {
      const newSet = new Set(prev)
      if (newSet.has(idIglesia)) {
        newSet.delete(idIglesia)
      } else {
        newSet.add(idIglesia)
      }
      return newSet
    })
  }

  const handleToggleMinisterio = (idMinisterio: number) => {
    setExpandedMinisterios(prev => {
      const newSet = new Set(prev)
      if (newSet.has(idMinisterio)) {
        newSet.delete(idMinisterio)
      } else {
        newSet.add(idMinisterio)
      }
      return newSet
    })
  }

  const handleSelectCurso = (curso: Tables<'aula_curso'> & {
    usuario_creador?: { nombres: string; apellidos: string } | null;
  }) => {
    setSelectedCursoId(curso.id_aula_curso)
    setDetailPanelOpen(true)
  }

  const handleCloseDetailPanel = () => {
    setDetailPanelOpen(false)
    setSelectedCursoId(null)
  }

  return (
    <div className="relative min-h-full px-4 sm:px-6 lg:px-8 pb-10">
      {/* Background with overlays */}
      <div className="pointer-events-none -z-10 absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-80 w-80 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 h-60 w-60 bg-gradient-to-tr from-primary/15 to-transparent rounded-full blur-3xl opacity-15" />
      </div>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-card/55 backdrop-blur-2xl p-8 sm:p-10 mb-8 shadow-[0_20px_60px_rgb(0,0,0,0.06)]"
      >
        {/* Decorative gradient divs */}
        <div className="absolute top-0 right-0 h-64 w-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 h-48 w-48 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl opacity-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Icon and Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <Badge className="border-none bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Plataforma de Formación
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aula Global
            </Badge>
          </div>

          {/* Title and Subtitle */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
              Aula <span className="text-primary">Global</span>
            </h1>
            <p className="text-sm sm:text-base font-medium text-muted-foreground max-w-3xl leading-relaxed">
              Administra cursos en todas las iglesias y ministerios desde un único lugar.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Content Section */}
      <div className="mx-auto max-w-4xl">
        {/* Error State */}
        {isError && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar iglesias. Intenta recargar la página.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        )}

        {/* Data State */}
        {!isLoading && iglesias && iglesias.length > 0 && (
          <motion.div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {iglesias.map((iglesia, index) => (
                <motion.div
                  key={iglesia.id_iglesia}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <IglesiaAulaRow
                    iglesia={iglesia}
                    onCursoSelect={handleSelectCurso}
                    expandedIglesias={expandedIglesias}
                    onToggleIglesia={handleToggleIglesia}
                    expandedMinisterios={expandedMinisterios}
                    onToggleMinisterio={handleToggleMinisterio}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && (!iglesias || iglesias.length === 0) && !isError && (
          <Card className="p-8 text-center border-dashed">
            <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              No hay iglesias disponibles
            </p>
          </Card>
        )}
      </div>

      {/* Detail Panel */}
      <GlobalAulaDetailPanel
        open={detailPanelOpen}
        cursoId={selectedCursoId}
        onClose={handleCloseDetailPanel}
      />
    </div>
  )
}
