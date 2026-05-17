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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] relative overflow-hidden p-4 sm:p-6">
      
      {/* Floating Back to Home Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/5 hover:border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group hover:-translate-x-0.5 active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        Volver al inicio
      </button>
      {/* Spectacular Cyberpunk/Mesh Gradient Backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-sky-500/10 to-transparent blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] left-[25%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Modern Dotted Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />

      {/* Centered Glassmorphic Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px] backdrop-blur-2xl bg-slate-950/40 border border-white/10 rounded-3xl p-8 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] flex flex-col"
      >
        {/* Glow effect at the card top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-50" />

        {/* Dynamic Logo with pulse glow */}
        <div className="relative mb-6 flex justify-center group">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-700 animate-pulse" />
          <SEILogo className="w-40 h-40 relative z-10 drop-shadow-[0_12px_24px_rgba(56,189,248,0.35)]" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Iniciar Sesión
          </h1>
          <p className="text-slate-400 text-xs">
            Ingresa tus credenciales para acceder a Lumen
          </p>
        </div>

        <motion.form 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit} 
          className="space-y-4"
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
            className="w-full h-11 rounded-xl bg-gradient-to-r from-sky-500 via-sky-400 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-[0_8px_24px_rgba(56,189,248,0.2)] transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 duration-200" 
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

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 tracking-wider">
            © 2026 Lumen &middot; Todos los derechos reservados
          </p>
        </div>
      </motion.div>
    </div>
  )
}