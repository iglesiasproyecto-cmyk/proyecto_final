import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Usuario } from '@/types/app.types'

interface AppState {
  session: Session | null
  usuarioActual: Usuario | null
  isAuthenticated: boolean
  sidebarOpen: boolean
  notificacionesCount: number
  darkMode: boolean
  toggleSidebar: () => void
  toggleDarkMode: () => void
  logout: () => Promise<void>
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificacionesCount, setNotificacionesCount] = useState(0)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sei-dark-mode') === 'true'
    }
    return false
  })

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('sei-dark-mode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        const { data } = await supabase
          .from('usuario')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single()
        if (data) {
          setUsuarioActual({
            idUsuario: data.id_usuario,
            nombres: data.nombres,
            apellidos: data.apellidos,
            correo: data.correo,
            contrasenaHash: data.contrasena_hash,
            telefono: data.telefono,
            activo: data.activo,
            ultimoAcceso: data.ultimo_acceso,
            authUserId: data.auth_user_id ?? null,
            creadoEn: data.creado_en,
            actualizadoEn: data.updated_at,
          })
          const { count } = await supabase
            .from('notificacion')
            .select('*', { count: 'exact', head: true })
            .eq('id_usuario', data.id_usuario)
            .eq('leida', false)
          setNotificacionesCount(count ?? 0)
        }
      } else {
        setUsuarioActual(null)
        setNotificacionesCount(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AppContext.Provider
      value={{
        session,
        usuarioActual,
        isAuthenticated: !!session,
        sidebarOpen,
        notificacionesCount,
        darkMode,
        toggleSidebar: () => setSidebarOpen((p) => !p),
        toggleDarkMode: () => setDarkMode((p) => !p),
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
