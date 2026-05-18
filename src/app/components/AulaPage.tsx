import { useAuth, useApp } from '@/app/store/AppContext'
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
  const { sedesDelUsuario } = useApp()

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
    if (stableRole === "admin_sede") {
      const sedeIds = sedesDelUsuario.map(s => s.id)
      const sedeName = sedesDelUsuario.length === 1 ? sedesDelUsuario[0].nombre : undefined
      return <AdminAulaPage sedeIds={sedeIds} sedeName={sedeName} />
    }
    if (stableRole === "lider") {
      return <LiderAulaPage />
    }
    return <ServidorAulaPage />
  }

  return (
    <div className="relative min-h-full px-4 sm:px-6 lg:px-8 pb-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[12%] -right-[5%] w-[42%] h-[42%] bg-[#4682b4]/10 rounded-full blur-[120px]" />
        <div className="absolute top-[18%] -left-[12%] w-[32%] h-[32%] bg-[#709dbd]/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        className="container mx-auto py-4 sm:py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        

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
