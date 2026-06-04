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

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { session, authLoading } = useApp()

  // Estados
  const [step, setStep] = useState<'email' | 'verification'>('email')
  const [email, setEmail] = useState('')
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

  // Paso 1: Enviar código de recuperación
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo válido.')
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('reset-password-request', {
        body: { email: email.toLowerCase().trim() }
      })

      if (error) {
        // Extraer mensaje real de la Edge Function si está disponible
        let message = error.message || 'Error al enviar el enlace de recuperación.'
        try {
          const errBody = await (error as any).context?.json?.()
          if (errBody?.error) message = errBody.error
        } catch {
          // ignorar errores al parsear el cuerpo
        }
        setError(message)
        setIsLoading(false)
        return
      }

      // La función responde siempre con success aunque el correo no exista (no revela usuarios)
      setStep('verification')
      toast.success('Enlace de recuperación enviado a tu correo.')
    } catch (err: any) {
      setError(err.message || 'Error en el servidor. Intenta más tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  // Volver al paso anterior
  const handleBack = () => {
    if (step === 'verification') {
      setStep('email')
      setError('')
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
          <SEILogo 
            variant="dark-bg" 
            style={{ width: '100%', maxWidth: '350px', height: '110px' }}
            className="filter drop-shadow-[0_0_35px_rgba(59,130,246,0.35)] hover:scale-105 transition-all duration-500" 
          />
        </div>

        {/* Contenido Branding */}
        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
            Recupera tu Acceso
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Restablece tu contraseña de forma segura con verificación por correo electrónico.
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
              <h1 className="text-4xl font-black text-[#0c2340]">
                {step === 'email' && 'Recuperar Contraseña'}
                {step === 'verification' && 'Enlace Enviado'}
              </h1>
            </div>
            <p className="text-base text-slate-600">
              {step === 'email' && 'Ingresa tu correo para comenzar el proceso de recuperación'}
              {step === 'verification' && 'Revisa tu correo y haz clic en el enlace de recuperación'}
            </p>
          </div>

          {/* PASO 1: Solicitud de Email */}
          <AnimatePresence>
            {step === 'email' && (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSendCode}
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

                {/* Botón Enviar Código */}
                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-14 bg-gradient-to-r from-[#4682b4] to-[#709dbd] hover:from-[#3b6d96] hover:to-[#5b84a1] text-white font-bold uppercase tracking-wider rounded-lg shadow-lg border-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Enviar Enlace
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
                    Volver a Login
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* PASO 2: Confirmación de envío */}
          <AnimatePresence>
            {step === 'verification' && (
              <motion.div
                key="verification-message"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >

                {/* Mostrar Email Verificando */}
                <div className="p-4 rounded-lg bg-[#1a7fa8]/10 border-2 border-[#1a7fa8]/30">
                  <p className="text-sm text-slate-600 font-medium">Correo de recuperación enviado a:</p>
                  <p className="text-lg font-bold text-[#0c2340] mt-1">{email}</p>
                </div>

                {/* Mensaje de instrucciones */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-green-100 border border-green-300">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">¡Correo enviado exitosamente!</p>
                      <p className="text-sm text-green-700 mt-1">
                        Revisa tu bandeja de entrada. Encontrarás un enlace para restablecer tu contraseña. El enlace expira en 1 hora.
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    Si no encuentras el correo, revisa tu carpeta de spam o correo no deseado e intenta de nuevo.
                  </p>
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

                {/* Botón Reenviar */}
                <Button
                  onClick={() => setStep('email')}
                  className="w-full h-14 bg-[#1a7fa8] hover:bg-[#2596be] text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-lg"
                >
                  <Mail className="w-5 h-5" />
                  Enviar Nuevo Enlace
                </Button>

                {/* Link para Volver */}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full text-sm text-[#1a7fa8] hover:text-[#0c2340] transition-colors duration-300 font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Info */}
          <div className="pt-4 border-t border-slate-700">
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              Tu seguridad es prioritaria. Este proceso es completamente seguro y privado.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
