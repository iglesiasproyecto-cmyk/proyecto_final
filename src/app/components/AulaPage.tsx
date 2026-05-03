import { useAuth } from '@/app/store/AppContext'
import { LiderAulaPage } from './LiderAulaPage'
import { ServidorAulaPage } from './ServidorAulaPage'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { GraduationCap, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export function AulaPage() {
  const { user, rolActual } = useAuth()

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
              key={rolActual === "lider" ? 'lider' : 'servidor'}
              initial={{ opacity: 0, x: rolActual === "lider" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: rolActual === "lider" ? -20 : 20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {rolActual === "lider" ? <LiderAulaPage /> : <ServidorAulaPage />}
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