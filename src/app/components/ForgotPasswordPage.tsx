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
  const [step, setStep] = useState<'email' | 'verification' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
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
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      })

      if (authError) {
        setError(authError.message || 'Error al enviar el código.')
        setIsLoading(false)
        return
      }

      setStep('verification')
      toast.success('Código de verificación enviado a tu correo.')
    } catch (err) {
      setError('Error en el servidor. Intenta más tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  // Manejar cambios en los campos de código
  const handleCodeChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`)
      nextInput?.focus()
    }
  }

  // Manejar retroceso
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      prevInput?.focus()
    }
  }

  // Paso 2: Verificar código y pasar a reset
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Por favor ingresa los 6 dígitos.')
      return
    }

    setIsLoading(true)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: fullCode,
        type: 'email',
      })

      if (verifyError) {
        setError('Código inválido o expirado.')
        setIsLoading(false)
        return
      }

      setStep('reset')
      toast.success('Código verificado. Ahora establece tu nueva contraseña.')
    } catch (err) {
      setError('Error al verificar el código.')
    } finally {
      setIsLoading(false)
    }
  }

  // Paso 3: Cambiar contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!newPassword || !confirmPassword) {
      setError('Por favor completa ambos campos de contraseña.')
      return
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setError(updateError.message || 'Error al cambiar la contraseña.')
        setIsLoading(false)
        return
      }

      toast.success('¡Contraseña actualizada exitosamente!')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError('Error al actualizar la contraseña.')
    } finally {
      setIsLoading(false)
    }
  }

  // Volver al paso anterior
  const handleBack = () => {
    if (step === 'verification') {
      setStep('email')
      setCode(['', '', '', '', '', ''])
      setError('')
    } else if (step === 'reset') {
      setStep('verification')
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
          <SEILogo className="w-32 h-32 object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
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
                {step === 'verification' && 'Verificar Código'}
                {step === 'reset' && 'Nueva Contraseña'}
              </h1>
            </div>
            <p className="text-base text-slate-600">
              {step === 'email' && 'Ingresa tu correo para comenzar el proceso de recuperación'}
              {step === 'verification' && 'Ingresa el código enviado a tu correo'}
              {step === 'reset' && 'Establece una nueva contraseña segura'}
            </p>
          </div>

          {/* PASO 1: Solicitud de Email */}
          <AnimatePresence mode="wait">
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
                  className="w-full h-14 bg-[#1a7fa8] hover:bg-[#2596be] text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Enviar Código
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

          {/* PASO 2: Verificación de Código */}
          <AnimatePresence mode="wait">
            {step === 'verification' && (
              <motion.form
                key="verification-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleVerifyCode}
                className="space-y-6"
              >
                
                {/* Mostrar Email Verificando */}
                <div className="p-4 rounded-lg bg-[#1a7fa8]/10 border-2 border-[#1a7fa8]/30">
                  <p className="text-sm text-slate-600 font-medium">Código enviado a:</p>
                  <p className="text-lg font-bold text-[#0c2340] mt-1">{email}</p>
                </div>

                {/* Campos de Código */}
                <div className="space-y-5">
                  <p className="text-sm text-slate-600 font-semibold uppercase tracking-widest">Ingresa los 6 dígitos</p>
                  <div className="flex gap-3 justify-center">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        id={`code-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(e.target.value, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-16 h-16 rounded-lg border-2 border-slate-300 bg-white text-center text-2xl font-bold text-[#0c2340] focus:border-[#1a7fa8] focus:bg-slate-50 transition-all duration-200 outline-none"
                      />
                    ))}
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

                {/* Botón Verificar */}
                <Button
                  type="submit"
                  disabled={isLoading || code.join('').length !== 6}
                  className="w-full h-14 bg-[#1a7fa8] hover:bg-[#2596be] text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Verificar Código
                    </>
                  )}
                </Button>

                {/* Link para Volver */}
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full text-sm text-[#1a7fa8] hover:text-[#0c2340] transition-colors duration-300 font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Usar otro correo
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* PASO 3: Reset de Contraseña */}
          <AnimatePresence mode="wait">
            {step === 'reset' && (
              <motion.form
                key="reset-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleResetPassword}
                className="space-y-5"
              >
                
                {/* Nueva Contraseña */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1a7fa8]/0 via-[#1a7fa8]/10 to-[#1a7fa8]/0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center gap-3 px-4 py-4 rounded-lg border-2 border-slate-300 bg-white focus-within:border-[#1a7fa8] focus-within:bg-slate-50 transition-all duration-300">
                    <Lock className="w-6 h-6 text-[#1a7fa8]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nueva contraseña (mínimo 8 caracteres)"
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

                {/* Confirmar Contraseña */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1a7fa8]/0 via-[#1a7fa8]/10 to-[#1a7fa8]/0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center gap-3 px-4 py-4 rounded-lg border-2 border-slate-300 bg-white focus-within:border-[#1a7fa8] focus-within:bg-slate-50 transition-all duration-300">
                    <Lock className="w-6 h-6 text-[#1a7fa8]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirma tu nueva contraseña"
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

                {/* Botón Reset */}
                <Button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword}
                  className="w-full h-14 bg-[#1a7fa8] hover:bg-[#2596be] text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Actualizar Contraseña
                    </>
                  )}
                </Button>

                {/* Link para Volver */}
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full text-sm text-[#1a7fa8] hover:text-[#0c2340] transition-colors duration-300 font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a verificación
                </button>
              </motion.form>
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
