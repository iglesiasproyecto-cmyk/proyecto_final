import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabaseClient'
import { useApp } from "../store/AppContext"
import { Button } from './ui/button'
import { Input } from './ui/input'
import { motion, AnimatePresence } from 'motion/react'
import { SEILogo } from './SEILogo'
import {
  Mail, Lock, ArrowLeft, Shield, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

export function RegisterPage() {
  const navigate = useNavigate()
  const { session, authLoading } = useApp()

  // Estados
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && session) navigate("/app")
  }, [authLoading, session, navigate])

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

  // Registro con email y contraseña
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo válido.')
      return
    }

    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsLoading(true)
    try {
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      })

      if (authError) {
        // Detectar si el email ya existe
        if (authError.message.includes('already registered') || authError.message.includes('User already exists')) {
          setError(`El correo ${email} ya está registrado. Intenta con login.`)
        } else {
          setError(authError.message || 'Error al registrarse.')
        }
        setIsLoading(false)
        return
      }

      // Si signUp fue exitoso y ya tiene sesión, redirige directamente
      if (signUpData?.session) {
        toast.success('¡Cuenta creada exitosamente! Bienvenido!')
        setTimeout(() => navigate('/app'), 1500)
        return
      }

      // Si no hay sesión automática, intenta login
      toast.success('¡Cuenta creada! Iniciando sesión...')
      
      // Espera un poco para asegurar que la cuenta se haya creado en BD
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Auto login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      })

      if (loginError) {
        // Si aún requiere confirmación, muestra mensaje
        if (loginError.message.includes('Email not confirmed')) {
          setError('Por favor confirma tu email antes de continuar. Revisa tu bandeja de entrada.')
          setIsLoading(false)
          return
        }
        setError(`Error al iniciar sesión: ${loginError.message}`)
        setIsLoading(false)
        setTimeout(() => navigate('/login'), 2000)
        return
      }

      // Si login exitoso, redirigir a app
      toast.success('¡Bienvenido!')
      setTimeout(() => navigate('/app'), 1500)
    } catch (err: any) {
      console.error('Register error:', err)
      setError('Error en el servidor. Intenta más tarde.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background overflow-hidden selection:bg-primary/30">
      {/* ── SECCIÓN IZQUIERDA: Branding & Animaciones ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-between p-16 bg-[#0c2340] overflow-hidden">
        
        {/* Luces de Fondo Animadas */}
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
              scale: [1, 0.9, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px]" 
          />
        </div>

        {/* Logo SEI */}
        <div className="relative z-10">
          <SEILogo className="w-32 h-32 object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
        </div>

        {/* Contenido Branding */}
        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
            Únete al Sistema
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Crea tu cuenta con email y contraseña para acceder a la plataforma de gestión de iglesias.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.6em]">
            © MMXXVI · SOPORTE ESTRUCTURAL DE IGLESIAS
          </p>
        </div>
      </div>

      {/* ── SECCIÓN DERECHA: Formulario ── */}
      <div className="w-full lg:w-[55%] xl:w-[50%] flex items-center justify-center p-6 bg-white">
        
        {/* Contenedor del Formulario */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl space-y-8"
        >
          
          {/* Encabezado */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#1a7fa8]" />
              <h1 className="text-4xl font-black text-[#0c2340]">Registro Seguro</h1>
            </div>
            <p className="text-base text-slate-600">
              Crea tu cuenta para comenzar a usar la plataforma
            </p>
          </div>

          {/* Formulario */}
          <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleRegister}
            className="space-y-5"
          >
            {/* Campo de Email */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a7fa8]/0 via-[#1a7fa8]/10 to-[#1a7fa8]/0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3 px-4 py-4 rounded-lg border-2 border-slate-300 bg-white focus-within:border-[#1a7fa8] focus-within:bg-slate-50 transition-all duration-300">
                <Mail className="w-6 h-6 text-[#1a7fa8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.email@ejemplo.com"
                  className="flex-1 bg-transparent outline-none text-[#0c2340] placeholder:text-slate-400 text-lg font-medium"
                />
              </div>
            </div>

            {/* Campo de Contraseña */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a7fa8]/0 via-[#1a7fa8]/10 to-[#1a7fa8]/0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3 px-4 py-4 rounded-lg border-2 border-slate-300 bg-white focus-within:border-[#1a7fa8] focus-within:bg-slate-50 transition-all duration-300">
                <Lock className="w-6 h-6 text-[#1a7fa8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña (mínimo 8 caracteres)"
                  className="flex-1 bg-transparent outline-none text-[#0c2340] placeholder:text-slate-400 text-lg font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-[#1a7fa8] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Campo de Confirmar Contraseña */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a7fa8]/0 via-[#1a7fa8]/10 to-[#1a7fa8]/0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3 px-4 py-4 rounded-lg border-2 border-slate-300 bg-white focus-within:border-[#1a7fa8] focus-within:bg-slate-50 transition-all duration-300">
                <Lock className="w-6 h-6 text-[#1a7fa8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu contraseña"
                  className="flex-1 bg-transparent outline-none text-[#0c2340] placeholder:text-slate-400 text-lg font-medium"
                />
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 p-4 rounded-lg bg-red-100 border border-red-300"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botón Registrar */}
            <Button
              type="submit"
              disabled={isLoading || !email || !password || !confirmPassword}
              className="w-full h-14 bg-[#1a7fa8] hover:bg-[#2596be] text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Crear Cuenta
                </>
              )}
            </Button>

            {/* Link para Volver */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-[#1a7fa8] hover:text-[#0c2340] transition-colors duration-300 font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Ya tengo cuenta
              </button>
            </div>
          </motion.form>

          {/* Footer Info */}
          <div className="pt-4 border-t border-slate-700">
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              Tu seguridad es prioritaria. Usamos encriptación segura para proteger tus datos.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
