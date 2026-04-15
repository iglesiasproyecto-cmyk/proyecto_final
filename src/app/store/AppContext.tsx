import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Usuario } from '@/types/app.types'

interface AppState {
  session: Session | null
  usuarioActual: Usuario | null
  isAuthenticated: boolean
  authLoading: boolean
  iglesiaActual: { id: number; nombre: string } | null
  setIglesiaActual: (ig: { id: number; nombre: string } | null) => void
  iglesiasDelUsuario: { id: number; nombre: string }[]
  rolActual: string
  sidebarOpen: boolean
  notificacionesCount: number
  darkMode: boolean
  toggleSidebar: () => void
  toggleDarkMode: () => void
  logout: () => Promise<void>
  // MOCK MODE FOR UI DESIGN
  isMockMode: boolean
  setMockMode: (val: boolean) => void
  mockRol: string
  setMockRol: (rol: string) => void
}

const AppContext = createContext<AppState | undefined>(undefined)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/** Raw fetch with AbortController timeout — guaranteed to not hang */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch usuario bypassing Supabase SDK entirely */
async function fetchUsuarioRaw(accessToken: string, authUserId: string): Promise<any | null> {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
  }

  // Try RPC first (SECURITY DEFINER — bypasses RLS)
  try {
    console.log('[AUTH] Trying RPC get_my_usuario...')
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/rpc/get_my_usuario`,
      { method: 'POST', headers, body: '{}' },
      5000
    )
    if (res.ok) {
      const rows = await res.json()
      if (Array.isArray(rows) && rows.length > 0) {
        console.log('[AUTH] ✅ RPC get_my_usuario succeeded')
        return rows[0]
      }
      console.warn('[AUTH] RPC returned empty array')
    } else {
      const text = await res.text()
      console.warn('[AUTH] RPC status:', res.status, text)
    }
  } catch (err: any) {
    console.warn('[AUTH] RPC failed:', err.name === 'AbortError' ? 'TIMEOUT' : err.message)
  }

  // Fallback: direct table query
  try {
    console.log('[AUTH] Trying direct query...')
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/usuario?auth_user_id=eq.${authUserId}&select=*&limit=1`,
      { method: 'GET', headers },
      5000
    )
    if (res.ok) {
      const rows = await res.json()
      if (Array.isArray(rows) && rows.length > 0) {
        console.log('[AUTH] ✅ Direct query succeeded')
        return rows[0]
      }
      console.warn('[AUTH] Direct query returned empty array')
    } else {
      const text = await res.text()
      console.warn('[AUTH] Direct query status:', res.status, text)
    }
  } catch (err: any) {
    console.warn('[AUTH] Direct query failed:', err.name === 'AbortError' ? 'TIMEOUT' : err.message)
  }

  return null
}

/** Fetch roles via RPC */
async function fetchRolesRaw(accessToken: string): Promise<any[]> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/rpc/get_my_roles`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: '{}',
      },
      5000
    )
    if (res.ok) return await res.json()
  } catch { /* skip */ }
  return []
}

/** Fetch unread notification count via RPC */
async function fetchNotifCountRaw(accessToken: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/rpc/get_my_unread_notifications_count`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: '{}',
      },
      3000
    )
    if (res.ok) {
      const val = await res.json()
      return typeof val === 'number' ? val : 0
    }
  } catch { /* skip */ }
  return 0
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [iglesiaActual, setIglesiaActual] = useState<{ id: number; nombre: string } | null>(null)
  const [iglesiasDelUsuario, setIglesiasDelUsuario] = useState<{ id: number; nombre: string }[]>([])
  const [rolActual, setRolActual] = useState<string>('servidor')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificacionesCount, setNotificacionesCount] = useState(0)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sei-dark-mode') === 'true'
    }
    return false
  })

  // Mock Mode state
  const [isMockMode, setIsMockMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sei-mock-mode') === 'true'
    }
    return false
  })
  const [mockRol, setMockRol] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sei-mock-rol') || 'super_admin'
    }
    return 'super_admin'
  })

  useEffect(() => {
    localStorage.setItem('sei-mock-mode', String(isMockMode))
  }, [isMockMode])

  useEffect(() => {
    localStorage.setItem('sei-mock-rol', mockRol)
  }, [mockRol])

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('sei-dark-mode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    let callCounter = 0
    let loadingResolved = false

    const resolveLoading = () => {
      if (!loadingResolved) {
        loadingResolved = true
        setAuthLoading(false)
      }
    }

    // Safety timeout: 8 seconds absolute max
    const safetyTimeout = setTimeout(() => {
      if (!loadingResolved) {
        console.warn('[AUTH] ⚠️ Safety timeout (8s) — forcing authLoading=false')
        resolveLoading()
      }
    }, 8000)

    const handleAuthSession = async (session: Session | null, callId: number) => {
      setSession(session)

      if (session) {
        const token = session.access_token
        const authUserId = session.user.id
        console.log('[AUTH] Loading profile for:', session.user.email, authUserId)

        try {
          const data = await fetchUsuarioRaw(token, authUserId)
          if (callId !== callCounter) return

          if (!data) {
            console.warn('[AUTH] ❌ No usuario found in public.usuario table')
            resolveLoading()
            return
          }

          console.log('[AUTH] ✅ Profile loaded:', data.nombres, data.apellidos)
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

          // Load notifications + roles in parallel (non-blocking)
          const [notifCount, roles] = await Promise.all([
            fetchNotifCountRaw(token),
            fetchRolesRaw(token),
          ])
          if (callId !== callCounter) return

          setNotificacionesCount(notifCount)

          // Derive highest role
          const roleNames = roles.map((r: any) => r.rol_nombre ?? '')
          let derivedRol = 'servidor'
          if (roleNames.includes('Super Administrador')) derivedRol = 'super_admin'
          else if (roleNames.includes('Administrador de Iglesia')) derivedRol = 'admin_iglesia'
          else if (roleNames.includes('Líder')) derivedRol = 'lider'
          setRolActual(derivedRol)

          // Build iglesias
          const iglesiasMap = new Map<number, string>()
          roles.forEach((r: any) => {
            if (r.iglesia_id) iglesiasMap.set(r.iglesia_id, r.iglesia_nombre)
          })
          const iglesias = Array.from(iglesiasMap.entries()).map(([id, nombre]) => ({ id, nombre }))
          setIglesiasDelUsuario(iglesias)
          if (iglesias.length === 1) setIglesiaActual(iglesias[0])
          else setIglesiaActual(null)

          console.log('[AUTH] ✅ Fully loaded — role:', derivedRol, '— iglesias:', iglesias.length)
        } catch (err) {
          console.error('[AUTH] Error loading user data:', err)
        }
      } else {
        if (callId !== callCounter) return
        setUsuarioActual(null)
        setNotificacionesCount(0)
        setIglesiaActual(null)
        setIglesiasDelUsuario([])
        setRolActual('servidor')
      }
      resolveLoading()
    }

    console.log('[AUTH] Setting up onAuthStateChange listener')

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AUTH] onAuthStateChange:', _event, !!session)
      const callId = ++callCounter
      await handleAuthSession(session, callId)
    })

    // Fallback: if onAuthStateChange doesn't fire within 2s
    const fallbackTimeout = setTimeout(() => {
      if (callCounter === 0) {
        console.log('[AUTH] Fallback: getSession after 2s')
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (callCounter === 0) {
            const callId = ++callCounter
            handleAuthSession(session, callId)
          }
        }).catch(() => resolveLoading())
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
      clearTimeout(fallbackTimeout)
    }
  }, [])

  const logout = async () => {
    setIsMockMode(false)
    await supabase.auth.signOut()
  }

  // Effect to set a mock user if in mock mode and no real user
  useEffect(() => {
    if (isMockMode && !usuarioActual && !authLoading) {
      setUsuarioActual({
        idUsuario: 999,
        nombres: 'Usuario',
        apellidos: 'Mock',
        correo: 'mock@ejemplo.com',
        contrasenaHash: '',
        telefono: '12345678',
        activo: true,
        ultimoAcceso: new Date().toISOString(),
        authUserId: 'mock-id',
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      })
      setRolActual(mockRol)
      setIglesiasDelUsuario([{ id: 1, nombre: 'Iglesia Mock' }])
      setIglesiaActual({ id: 1, nombre: 'Iglesia Mock' })
    }
  }, [isMockMode, usuarioActual, authLoading, mockRol])

  return (
    <AppContext.Provider
      value={{
        session,
        usuarioActual,
        isAuthenticated: !!session,
        authLoading,
        iglesiaActual,
        setIglesiaActual,
        iglesiasDelUsuario,
        rolActual,
        sidebarOpen,
        notificacionesCount,
        darkMode,
        toggleSidebar: () => setSidebarOpen((p) => !p),
        toggleDarkMode: () => setDarkMode((p) => !p),
        logout,
        isMockMode,
        setMockMode: setIsMockMode,
        mockRol,
        setMockRol,
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
