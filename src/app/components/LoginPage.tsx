import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabaseClient'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { motion } from 'motion/react'
import { SEILogo } from './SEILogo'
import {
  Church, Eye, EyeOff, LogIn, Shield, Building2, Crown,
  User, ChevronRight, Sparkles,
} from 'lucide-react'

const testCredentials = [
  { email: 'admin@iglesiabd.com', label: 'Admin', desc: 'Gestión global', icon: Shield, color: 'from-red-500 to-orange-500' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Por favor completa todos los campos.')
      return
    }
    setIsLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Credenciales incorrectas.')
      setIsLoading(false)
    } else {
      navigate('/app')
    }
  }

  const handleQuickLogin = async (credEmail: string) => {
    setEmail(credEmail)
    setError('')
    setIsLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: credEmail,
      password: 'Password123!',
    })
    if (authError) {
      setError('Cuenta demo no encontrada. Créala en Supabase Dashboard > Auth > Users.')
      setIsLoading(false)
    } else {
      navigate('/app')
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0c2340] overflow-hidden">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#1a7fa8]/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -right-20 w-72 h-72 bg-[#2596be]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-[#5cbcd6]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-[#1a7fa8]/30 p-2">
              <SEILogo className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-white text-2xl tracking-tight">S.E.I.</h1>
              <p className="text-[#5cbcd6]/60 text-xs">Soporte Estructural</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-lg"
        >
          <h2 className="text-white/95 text-4xl tracking-tight leading-tight mb-4">
            Soporte Estructural<br />de Iglesias
          </h2>
          <p className="text-[#5cbcd6]/90 text-lg leading-relaxed">
            Plataforma integral para la gestion organizacional, formacion
            y operaciones de tu iglesia.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { n: "23", l: "Tablas DB" },
              { n: "6", l: "Roles" },
              { n: "6", l: "Dominios" },
            ].map((stat, i) => (
              <motion.div
                key={stat.l}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-4 border border-white/[0.08]"
              >
                <p className="text-white text-2xl">{stat.n}</p>
                <p className="text-[#5cbcd6]/70 text-xs mt-1">{stat.l}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="relative z-10"
        >
          <p className="text-white/30 text-xs">IGLESIABD v2.0 &middot; MVP &middot; 2026</p>
        </motion.div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background rounded-l-none lg:rounded-l-[2rem]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a7fa8] to-[#2596be] mb-3 shadow-lg shadow-[#1a7fa8]/20">
              <Church className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-foreground text-2xl">S.E.I.</h1>
            <p className="text-muted-foreground text-sm">Soporte Estructural de Iglesias</p>
          </div>

          <div className="mb-8">
            <h2 className="text-foreground text-2xl tracking-tight">Iniciar sesion</h2>
            <p className="text-muted-foreground text-sm mt-1">Selecciona un rol de prueba o ingresa tus credenciales</p>
          </div>

          {/* Quick Login Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {testCredentials.map((cred, i) => {
              const Icon = cred.icon;
              return (
                <motion.button
                  key={cred.email}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                  onClick={() => handleQuickLogin(cred.email)}
                  disabled={isLoading}
                  className="group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cred.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-foreground">{cred.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{cred.desc}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground px-2">o ingresa manualmente</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Correo electronico</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="bg-input-background h-11"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Contrasena</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contrasena"
                  className="bg-input-background pr-10 h-11"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Iniciar Sesion
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Contrasena de prueba: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">cualquiera</code>
          </p>
        </motion.div>
      </div>
    </div>
  );
}