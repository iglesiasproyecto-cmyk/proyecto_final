import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabaseClient'
import { useApp } from "../store/AppContext"
import { GlobalLoader } from './GlobalLoader'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { SEILogo } from './SEILogo'
import { Eye, EyeOff, LogIn, User, AlertCircle, ArrowLeft } from 'lucide-react'

// --- Advanced Visual Systems (Matching Index) ---

const ParticleSystem = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(30)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-[2px] h-[2px] bg-blue-400/30 rounded-full"
        initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%" }}
        animate={{ 
          y: ["0%", "-100%"], 
          opacity: [0, 1, 0],
          scale: [0, 1.5, 0]
        }}
        transition={{ 
          duration: Math.random() * 20 + 10, 
          repeat: Infinity, 
          ease: "linear",
          delay: Math.random() * 10
        }}
      />
    ))}
  </div>
);

const LoginNetworkNodes = () => {
  const nodeCount = 15;
  const nodes = Array.from({ length: nodeCount }).map((_, i) => ({
    x: (i % 3) * 35 + Math.random() * 15,
    y: Math.floor(i / 3) * 20 + Math.random() * 10,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
      <svg className="w-full h-full preserve-3d">
        {nodes.map((node, i) => {
          const connections = [
            nodes[(i + 1) % nodeCount],
            nodes[(i + 3) % nodeCount],
          ];

          return connections.map((target, j) => (
            <motion.line
              key={`${i}-${j}`}
              x1={`${node.x}%`}
              y1={`${node.y}%`}
              x2={`${target.x}%`}
              y2={`${target.y}%`}
              stroke="rgba(59,130,246,0.25)"
              strokeWidth="1.2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1, 0.5, 1],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{ 
                duration: Math.random() * 10 + 10, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
          ));
        })}
        
        {[...Array(6)].map((_, i) => (
          <motion.line
            key={`long-${i}`}
            x1="0%"
            y1={`${i * 20}%`}
            x2="100%"
            y2={`${(i * 20) + (Math.random() * 30 - 15)}%`}
            stroke="rgba(59,130,246,0.15)"
            strokeWidth="0.8"
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              x1: ["-10%", "10%", "-10%"]
            }}
            transition={{ duration: 20, repeat: Infinity }}
          />
        ))}
      </svg>
    </div>
  );
};

const CinematicGlow = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <motion.div 
      animate={{ 
        scale: [1, 1.4, 1],
        opacity: [0.05, 0.15, 0.05],
        x: [0, 50, 0],
        y: [0, 30, 0]
      }}
      transition={{ duration: 15, repeat: Infinity }}
      className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-600/10 blur-[180px] rounded-full" 
    />
    <motion.div 
      animate={{ 
        scale: [1.3, 1, 1.3],
        opacity: [0.05, 0.1, 0.05],
        x: [0, -40, 0],
        y: [0, -20, 0]
      }}
      transition={{ duration: 20, repeat: Infinity }}
      className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-500/10 blur-[180px] rounded-full" 
    />
    <motion.div 
      animate={{ 
        scale: [1, 1.5, 1],
        opacity: [0.03, 0.08, 0.03],
        x: [-30, 30, -30],
        y: [50, -50, 50]
      }}
      transition={{ duration: 25, repeat: Infinity }}
      className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-cyan-400/5 blur-[200px] rounded-full" 
    />
  </div>
);

const FloatingNodes = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(15)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-[1px] h-[1px] bg-blue-500/20"
        initial={{ 
          x: Math.random() * 100 + "%", 
          y: Math.random() * 100 + "%",
          opacity: 0
        }}
        animate={{ 
          x: [null, Math.random() * 100 + "%"],
          y: [null, Math.random() * 100 + "%"],
          opacity: [0, 0.5, 0]
        }}
        transition={{ 
          duration: Math.random() * 30 + 20, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        <div className="absolute w-[200px] h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent rotate-45 transform-gpu" />
      </motion.div>
    ))}
  </div>
);

const AdvancedParticleField = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(40)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: Math.random() * 3 + 1,
          height: Math.random() * 3 + 1,
          background: `radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)`,
          left: Math.random() * 100 + "%",
          top: Math.random() * 100 + "%",
        }}
        animate={{
          y: [0, -100, 0],
          x: [0, Math.random() * 50 - 25, 0],
          opacity: [0, 0.8, 0],
          scale: [0, 1, 0]
        }}
        transition={{
          duration: Math.random() * 15 + 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: Math.random() * 10
        }}
      />
    ))}
  </div>
);

export function LoginPage() {
  const navigate = useNavigate()
  const { session, usuarioActual, authLoading, rolActual, iglesiaActual, authReady } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTransitionLoader, setShowTransitionLoader] = useState(false)

  const handleLoginSuccess = useCallback(() => {
    if (rolActual === "super_admin") {
      navigate('/app')
      return
    }
    if (!iglesiaActual?.id) {
      navigate("/app/sin-iglesia")
      return
    }
    navigate('/app')
  }, [navigate, rolActual, iglesiaActual])

  useEffect(() => {
    if (authReady) {
      setShowTransitionLoader(false)
      handleLoginSuccess()
    }
  }, [authReady, handleLoginSuccess])

  if (showTransitionLoader) {
    return <GlobalLoader show={true} message="Preparando tu experiencia..." fullScreen={true} />
  }

  if ((session || usuarioActual) && !authReady) {
    return <GlobalLoader show={true} message="Cargando..." fullScreen={true} />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Por favor completa todos los campos.')
      return
    }
    
    setIsLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ 
      email: cleanEmail, 
      password 
    })
    
    if (authError) {
      console.error('Login error:', authError)
      
      if (authError.message.includes('Email not confirmed')) {
        setError('Por favor verifica tu email antes de continuar.')
      } else if (authError.message.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos.')
      } else if (authError.message.includes('User not found')) {
        setError('El usuario no existe.')
      } else {
        setError(authError.message || 'Error al iniciar sesión.')
      }
      setIsLoading(false)
    } else {
      toast.success('¡Bienvenido!')
      setShowTransitionLoader(true)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#02060d] relative overflow-hidden p-4 sm:p-6 selection:bg-blue-500/30">
      
      {/* --- BACKGROUND LAYERS (FULL PAGE MATCHING INDEX) --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleSystem />
        <AdvancedParticleField />
        <FloatingNodes />
        <LoginNetworkNodes />
        <CinematicGlow />
      </div>

      {/* Floating Back to Home Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl backdrop-blur-xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/5 hover:border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group hover:-translate-x-0.5 active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span className="hidden sm:inline">Volver al inicio</span>
        <span className="sm:hidden">Volver</span>
      </button>

      {/* Centered Glassmorphic Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[520px] backdrop-blur-2xl bg-slate-950/40 border border-white/10 rounded-[32px] p-6 sm:p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] flex flex-col"
      >
        {/* Glow effect at the card top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-50" />

        {/* Logo (Responsive & Glowing) */}
        <div className="mb-10 flex justify-center items-center">
          <SEILogo 
            variant="dark-bg" 
            className="w-[300px] sm:w-[380px] md:w-[480px] h-20 sm:h-32 md:h-40 drop-shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-all duration-500 hover:scale-[1.03]" 
          />
        </div>

        <div className="mb-5 sm:mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Iniciar Sesión
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Ingresa tus credenciales para acceder a Lumen
          </p>
        </div>

        <motion.form 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit} 
          className="space-y-3 sm:space-y-4"
        >
          <div>
            <label className="text-xs font-semibold text-slate-300 ml-1 block mb-1.5">Correo electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center text-slate-400/60 pointer-events-none">
                <User className="w-4 h-4" />
              </div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="bg-slate-950/60 border-white/5 hover:border-white/10 focus:border-sky-500/50 text-white h-11 pl-10 rounded-xl text-sm placeholder-slate-600 focus:ring-0 transition-all duration-300"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 ml-1 block mb-1.5">Contraseña</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-950/60 border-white/5 hover:border-white/10 focus:border-sky-500/50 text-white h-11 pr-10 rounded-xl text-sm placeholder-slate-600 focus:ring-0 transition-all duration-300"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400/60 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#4682b4] to-[#709dbd] hover:from-[#3b6d96] hover:to-[#5b84a1] text-white font-bold text-sm shadow-[0_8px_24px_rgba(70,130,180,0.35)] border-0 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 duration-200" 
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Iniciar sesión
              </span>
            )}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-xs text-slate-400 hover:text-sky-400 transition-colors font-medium"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </motion.form>

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5 text-center">
          <p className="text-[9px] sm:text-[10px] text-slate-600 tracking-wider">
            © 2026 Lumen &middot; Todos los derechos reservados
          </p>
        </div>
      </motion.div>
    </div>
  )
}