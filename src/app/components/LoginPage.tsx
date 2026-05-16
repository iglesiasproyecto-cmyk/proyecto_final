import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabaseClient'
import { useApp } from "../store/AppContext"
import { GlobalLoader } from './GlobalLoader'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { SEILogo } from './SEILogo'
import {
  Eye, EyeOff, LogIn, Shield,
  User, Activity, Layers, Globe
} from 'lucide-react'

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
      
      // Mensajes de error más descriptivos
      if (authError.message.includes('Email not confirmed')) {
        setError('Por favor verifica tu email antes de continuar. Revisa tu bandeja de entrada.')
      } else if (authError.message.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos.')
      } else if (authError.message.includes('User not found')) {
        setError('El usuario no existe. Por favor regístrate primero.')
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
    <div className="min-h-screen flex bg-background overflow-hidden selection:bg-primary/30">
      
      {/* ── SECCIÓN IZQUIERDA: Branding & Animaciones ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-center p-12 bg-[#0c2340] overflow-hidden group">
        
        {/* Luces de Fondo Animadas (Orbs) */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex justify-center w-full -mt-40 -mb-20"
        >
          <SEILogo className="w-[750px] h-[750px] xl:w-[950px] xl:h-[950px] filter drop-shadow-[0_0_120px_rgba(255,255,255,0.3)]" />
        </motion.div>

        {/* Contenido Central */}
        <div className="relative z-10 -mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-3xl mx-auto flex flex-col items-center text-center"
          >

            <h2 className="text-white text-6xl xl:text-8xl font-black tracking-tight leading-[0.9] mb-12 text-center">
              Liderazgo con <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-white/40">Visión Técnica.</span>
            </h2>
            <p className="text-slate-400 text-xl leading-relaxed mb-16 max-w-xl text-center">
              La plataforma definitiva para unificar la formación, operaciones y crecimiento de tu iglesia local.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-8">
              {[
                { n: "24/7", l: "Soporte", icon: <Globe className="w-6 h-6" /> },
                { n: "Admin", l: "Módulos", icon: <Layers className="w-6 h-6" /> },
                { n: "Total", l: "Seguridad", icon: <Shield className="w-6 h-6" /> },
              ].map((stat, i) => (
                <motion.div
                  key={stat.l}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  className="bg-white/[0.03] backdrop-blur-md rounded-3xl p-8 border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all group/stat"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover/stat:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  <p className="text-white text-2xl font-bold">{stat.n}</p>
                  <p className="text-slate-500 text-[11px] uppercase font-bold tracking-widest mt-2">{stat.l}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="relative z-10 flex items-center justify-between mt-auto pt-24"
        >
          <p className="text-white/20 text-[11px] font-bold uppercase tracking-widest">IglesiaBD &middot; 2026</p>
          <div className="flex gap-4">
            <div className="w-2 h-2 rounded-full bg-primary/40" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
          </div>
        </motion.div>
      </div>

      {/* ── SECCIÓN DERECHA: Formulario de Login ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[480px] relative z-10"
        >
          
          <div className="mb-12 sm:mb-16 text-center lg:text-left px-2 sm:px-0">
            <motion.h2 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.85] text-foreground"
            >
              Bienvenido<span className="text-primary">.</span><br />
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary/80 to-primary/40 leading-tight">
                Nos alegra verte.
              </span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground text-xl sm:text-2xl mt-8 sm:mt-10 font-medium max-w-md"
            >
              Identifícate para gestionar tu ministerio y equipo hoy.
            </motion.p>
          </div>

          {/* Login Form */}
          <motion.form 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            onSubmit={handleSubmit} 
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-1 py-1 w-10 flex items-center justify-center text-muted-foreground/40 group-focus-within:text-primary transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-accent/30 border-white/5 h-16 sm:h-20 pl-16 rounded-2xl focus:ring-primary/20 transition-all text-xl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-1 py-1 w-10 flex items-center justify-center text-muted-foreground/40 group-focus-within:text-primary transition-colors">
                  <Activity className="w-4 h-4" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-accent/30 border-white/5 h-16 sm:h-20 pl-16 rounded-2xl focus:ring-primary/20 transition-all text-xl"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-white/10 transition-all"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-bold"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" className="w-full h-16 sm:h-20 rounded-2xl shadow-xl shadow-primary/20 font-black text-xl transition-all active:scale-[0.98] mt-4" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando...</span>
                </div>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Acceder al Sistema
                </>
              )}
            </Button>

            {/* Forgot Password Link */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-center pt-2"
            >
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </motion.div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-10 text-center"
          >
            <p className="text-[10px] text-muted-foreground/40 uppercase font-bold tracking-[0.2em]">
              Soporte Estructural &copy; MMXXVI
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
  );
}
