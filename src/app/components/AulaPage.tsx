import { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { LiderAulaPage } from './LiderAulaPage'
import { ServidorAulaPage } from './ServidorAulaPage'
import { getInternalUserId, getUserMinisterios } from '@/lib/userHelpers'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { Loader2, GraduationCap, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export function AulaPage() {
  const { user } = useAuth()
  const [isLider, setIsLider] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRole = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const internalUserId = await getInternalUserId(user.id)
        if (!internalUserId) {
          setIsLider(false)
          setLoading(false)
          return
        }

        const ministerios = await getUserMinisterios(internalUserId)
        const isLiderMinisterio = ministerios.some(ministerio => ministerio.rol_en_ministerio === 'Líder de Ministerio')
        setIsLider(isLiderMinisterio)
      } catch (error) {
        console.error('Error checking role:', error)
        setIsLider(false)
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <GraduationCap className="h-12 w-12 text-primary" />
        </motion.div>
        <div className="flex items-center gap-2 text-muted-foreground font-medium animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparando tu aula...
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

  return (
    <div className="relative min-h-full">
      {/* Background Decorative Elements */}
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
        {/* Header Section */}
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
        </div>

        {/* Content Area */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLider ? 'lider' : 'servidor'}
              initial={{ opacity: 0, x: isLider ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLider ? -20 : 20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {isLider ? <LiderAulaPage /> : <ServidorAulaPage />}
            </motion.div>
          </AnimatePresence>
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