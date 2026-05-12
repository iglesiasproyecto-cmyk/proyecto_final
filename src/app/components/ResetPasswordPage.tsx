import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { supabase } from '@/lib/supabaseClient'
import { useApp } from "../store/AppContext"
import { Button } from './ui/button'
import { Input } from './ui/input'
import { motion, AnimatePresence } from 'motion/react'
import { SEILogo } from './SEILogo'
import {
  Lock, ArrowLeft, Shield, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, authLoading } = useApp()

  // Estados
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!authLoading && session) navigate("/app")
  }, [authLoading, session, navigate])

  // Validar token al cargar la página
  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setError('Token de recuperación no encontrado.')
      setIsValidating(false)
      return
    }

    setToken(tokenParam)
    validateToken(tokenParam)
  }, [searchParams])

  const validateToken = async (tokenToValidate: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-reset-token', {
        body: { token: tokenToValidate }
      })

      if (error) {
        setError('Token inválido o expirado.')
        setIsValidating(false)
        return
      }

      if (data.valid) {
        setTokenValid(true)
        setEmail(data.email)
      } else {
        setError('Token inválido o expirado.')
      }
    } catch (err) {
      setError('Error al validar el token.')
    } finally {
      setIsValidating(false)
    }
  }

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
      const { data, error } = await supabase.functions.invoke('complete-password-reset', {
        body: {
          token: token,
          newPassword: newPassword
        }
      })

      if (error) {
        setError(error.message || 'Error al cambiar la contraseña.')
        setIsLoading(false)
        return
      }

      if (data.success) {
        toast.success('¡Contraseña actualizada exitosamente!')
        setTimeout(() => navigate('/login'), 1500)
      } else {
        setError(data.message || 'Error al cambiar la contraseña.')
      }
    } catch (err) {
      setError('Error al actualizar la contraseña.')
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isValidating) {
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

  if (!tokenValid) {
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
              Token Inválido
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              El enlace de recuperación es inválido o ha expirado.
            </p>
          </div>

          {/* Footer */}
          <div className="relative z-10">
            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.6em]">
              © MMXXVI · SOPORTE ESTRUCTURAL DE IGLESIAS
            </p>
          </div>
        </div>

        {/* ── SECCIÓN DERECHA: Error ── */}
        <div className="w-full lg:w-[55%] xl:w-[50%] flex items-center justify-center p-6 bg-white">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-2xl space-y-8"
          >

            {/* Encabezado */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <h1 className="text-4xl font-black text-[#0c2340]">
                  Enlace Inválido
                </h1>
              </div>
              <p className="text-base text-slate-600">
                El enlace de recuperación de contraseña es inválido o ha expirado.
              </p>
            </div>

            {/* Error Message */}
            <div className="flex items-start gap-2 p-4 rounded-lg bg-red-100 border border-red-300">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>

            {/* Botón Volver */}
            <Button
              onClick={() => navigate('/forgot-password')}
              className="w-full h-14 bg-[#1a7fa8] hover:bg-[#2596be] text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Solicitar Nuevo Enlace
            </Button>

          </motion.div>
        </div>
      </div>
    )
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
            Nueva Contraseña
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Establece una nueva contraseña segura para tu cuenta.
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
                Restablecer Contraseña
              </h1>
            </div>
            <p className="text-base text-slate-600">
              Establece una nueva contraseña segura para tu cuenta
            </p>
          </div>

          {/* Mostrar Email */}
          <div className="p-4 rounded-lg bg-[#1a7fa8]/10 border-2 border-[#1a7fa8]/30">
            <p className="text-sm text-slate-600 font-medium">Cuenta:</p>
            <p className="text-lg font-bold text-[#0c2340] mt-1">{email}</p>
          </div>

          {/* Formulario */}
          <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
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
              <div className="absolute inset- 0 bg-gradient-to-r from-[#1a7fa8]/0 via-[#1a7fa8]/10 to-[#1a7fa8]/0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
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