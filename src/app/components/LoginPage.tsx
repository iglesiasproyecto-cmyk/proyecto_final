import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabaseClient'
import { useApp } from "../store/AppContext"
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
  const { session, usuarioActual, authLoading } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  useEffect(() => {
    if (!authLoading && session && usuarioActual) navigate("/app")
  }, [authLoading, session, usuarioActual, navigate])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0c2340]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          </div>
        </div>
      </div>
    )
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
      navigate('/app')
    }
  }

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Ingresa tu correo para recuperar la contrasena.')
      return
    }

    setIsResettingPassword(true)
    setError('')

    const redirectTo = `${window.location.origin}/auth/callback?next=/login`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    })

    setIsResettingPassword(false)

    if (resetError) {
      setError('No se pudo enviar el correo de recuperacion. Intenta nuevamente.')
      return
    }

    toast.success('Te enviamos un correo para restablecer tu contrasena.')
  }

  return (
    <div className="min-h-screen flex bg-background overflow-hidden selection:bg-primary/30">
      
      {/* ── SECCIÓN IZQUIERDA: Branding & Animaciones ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-between p-16 bg-[#0c2340] overflow-hidden group">
        
        {/* Luces de Fondo Animadas (Orbs) */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ 
              x: [0, 40, 0], 
              y: [0, -40, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              x: [0, -30, 0], 
              y: [0, 50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-[#2596be]/10 rounded-full blur-[100px]" 
          />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
        </div>

        {/* Logo superior */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative z-10 flex items-center gap-4"
        >
          <div className="w-20 h-20 rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10 p-3 shadow-2xl shadow-primary/20">
            <SEILogo className="w-full h-full object-contain filter drop-shadow-lg" />
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div>
            <h1 className="text-white text-xl font-bold tracking-widest leading-none">S.E.I.</h1>
            <p className="text-primary/60 text-[10px] uppercase font-black tracking-[0.2em] mt-1">Soporte Estructural</p>
          </div>
        </motion.div>

        {/* Contenido Central */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-xl"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
              <Activity className="w-3 h-3" /> Sistema de gestión v2.0
            </span>
            <h2 className="text-white text-5xl xl:text-6xl font-black tracking-tight leading-[0.95] mb-6">
              Liderazgo con <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-white/40">Visión Técnica.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md">
              La plataforma definitiva para unificar la formación, operaciones y crecimiento de tu iglesia local.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { n: "24/7", l: "Soporte", icon: <Globe className="w-4 h-4" /> },
                { n: "Admin", l: "Módulos", icon: <Layers className="w-4 h-4" /> },
                { n: "Total", l: "Seguridad", icon: <Shield className="w-4 h-4" /> },
              ].map((stat, i) => (
                <motion.div
                  key={stat.l}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all group/stat"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover/stat:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  <p className="text-white text-xl font-bold">{stat.n}</p>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">{stat.l}</p>
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
          className="relative z-10 flex items-center justify-between"
        >
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">IglesiaBD &middot; 2026</p>
          <div className="flex gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          </div>
        </motion.div>
      </div>

      {/* ── SECCIÓN DERECHA: Formulario de Login ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-24 h-24 rounded-3xl bg-[#0c2340] flex items-center justify-center p-4 shadow-2xl mb-6">
              <SEILogo className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-tight leading-none text-foreground">S.E.I.</h1>
            <p className="text-muted-foreground text-xs mt-1 font-medium italic">Soporte Estructural de Iglesias</p>
          </div>

          <div className="mb-12 text-center lg:text-left">
            <motion.h2 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-4xl lg:text-5xl font-black tracking-tight leading-none text-foreground"
            >
              Bienvenido<span className="text-primary">.</span><br />
              <span className="text-2xl lg:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary/80 to-primary/40 leading-normal">
                Nos alegra verte.
              </span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground text-sm mt-4 font-medium"
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
                  className="bg-accent/30 border-white/5 h-12 pl-10 rounded-xl focus:ring-primary/20 transition-all text-sm"
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
                  className="bg-accent/30 border-white/5 h-12 pl-10 pr-12 rounded-xl focus:ring-primary/20 transition-all text-sm"
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

            <Button type="submit" className="w-full h-12 rounded-xl shadow-lg shadow-primary/20 font-bold transition-all active:scale-[0.98]" disabled={isLoading}>
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