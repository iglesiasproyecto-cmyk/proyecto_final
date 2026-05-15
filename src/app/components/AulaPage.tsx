import { useAuth } from '@/app/store/AppContext'
import { LiderAulaPage } from './LiderAulaPage'
import { ServidorAulaPage } from './ServidorAulaPage'
import { AdminAulaPage } from './AdminAulaPage'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { GraduationCap, Sparkles, ShieldCheck, BookOpenCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Skeleton } from '@/app/components/ui/skeleton';
import { AulaSkeleton } from './loading/skeletons';

export function AulaPage() {
  const { user, rolActual, isHydrated, isClaimsReady } = useAuth()

  const stableRole = useMemo(() => {
    if (!isHydrated || !isClaimsReady || !rolActual) return null
    return rolActual
  }, [isHydrated, isClaimsReady, rolActual])

  if (!isHydrated || (!isClaimsReady && !user)) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <AulaSkeleton courses={3} columns={3} />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Alert variant="destructive" className="max-w-md mx-auto border-destructive/20 bg-destructive/5 backdrop-blur-sm">
          <AlertDescription className="text-center font-medium">
            Debes iniciar sesión para acceder al aula de formación.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const renderContent = () => {
    if (!stableRole) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      )
    }
    if (stableRole === "admin_iglesia" || stableRole === "super_admin") {
      return <AdminAulaPage />
    }
    if (stableRole === "lider") {
      return <LiderAulaPage />
    }
    return <ServidorAulaPage />
  }

  return (
    <div className="relative min-h-full">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-[#4682b4]/10 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-[#709dbd]/10 rounded-full blur-[80px]" />
      </div>

      <motion.div
        className="container mx-auto py-2 sm:py-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Plataforma de Formación
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Aula <span className="text-primary">Virtual</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl font-medium">
              Potenciando el crecimiento espiritual y técnico de nuestros ministerios a través del conocimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-[280px]">
            <div className="rounded-2xl border border-primary/15 bg-card/60 backdrop-blur-sm px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Acceso</p>
              <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {stableRole ? stableRole.replace('_', ' ') : 'Validando rol...'}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-card/60 backdrop-blur-sm px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Enfoque</p>
              <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-2">
                <BookOpenCheck className="h-4 w-4 text-primary" />
                Progreso continuo
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

// Helper components for consistency
function Badge({ children, className, variant = 'default' }: any) {
  const variants: any = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-border text-foreground',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
