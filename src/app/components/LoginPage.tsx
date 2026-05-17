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
import { Eye, EyeOff, LogIn, User, AlertCircle } from 'lucide-react'

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
    <div className="min-h-screen flex bg-background">
      
      {/* Left Panel - Simple Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-[#0c2340] relative flex-col justify-center items-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <SEILogo className="w-48 h-48 xl:w-64 xl:h-64" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center max-w-md"
        >
          <h2 className="text-2xl xl:text-3xl font-black text-white mb-3">
            Sistema de Gestión
          </h2>
          <p className="text-slate-400 text-sm">
            Plataforma unificada para tu iglesia
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <SEILogo className="w-20 h-20" />
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Bienvenido
            </h1>
            <p className="text-muted-foreground text-sm">
              Ingresa tus credenciales
            </p>
          </div>

          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit} 
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground ml-1 block mb-1.5">Correo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center text-muted-foreground/50">
                  <User className="w-4 h-4" />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="bg-accent/50 border-border h-11 pl-10 rounded-lg text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground ml-1 block mb-1.5">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-accent/50 border-border h-11 pr-10 rounded-lg text-sm"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-lg font-medium text-sm" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                className="text-xs text-muted-foreground hover:text-primary"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </motion.form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-muted-foreground/40">
              © 2026 Lumen
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}