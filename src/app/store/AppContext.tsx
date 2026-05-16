import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { queryClient } from '@/lib/queryClient'
import type { Usuario } from '@/types/app.types'


interface AppState {
  session: Session | null
  user: any // Supabase user object
  usuarioActual: Usuario | null
  isAuthenticated: boolean
  authLoading: boolean
  isHydrated: boolean
  isClaimsReady: boolean
  authReady: boolean
  authError: string | null
  isInitializing: boolean
  iglesiaActual: { id: number; nombre: string } | null
  setIglesiaActual: (ig: { id: number; nombre: string } | null) => void
  iglesiasDelUsuario: { id: number; nombre: string }[]
  sedesDelUsuario: { id: number; nombre: string }[]
  ministeriosDelUsuario: { id: number; nombre: string; idSede: number }[]
  rolActual: string
  sidebarOpen: boolean
  notificacionesCount: number
  decrementNotificacionesCount: () => void
  resetNotificacionesCount: () => void
  darkMode: boolean
  toggleSidebar: () => void
  toggleDarkMode: () => void
  logout: () => Promise<void>
  refreshClaims: () => Promise<void>
  setInitializing: (val: boolean) => void
  // MOCK MODE FOR UI DESIGN
  isMockMode: boolean
  setMockMode: (val: boolean) => void
  mockRol: string
  setMockRol: (rol: string) => void
}

const AppContext = createContext<AppState | undefined>(undefined)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const PROTECTED_SUPER_EMAIL = 'super@test.dev'

function normalizeAppRole(rawRoles: string[]): string {
  const normalized = rawRoles.map((name) =>
    String(name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  )

  if (normalized.some((name) => name === 'super administrador' || name === 'super_admin')) {
    return 'super_admin'
  }
  if (normalized.some((name) => name === 'administrador de iglesia' || name === 'admin_iglesia')) {
    return 'admin_iglesia'
  }
  if (normalized.some((name) => name === 'administrador de sede' || name === 'admin_sede')) {
    return 'admin_sede'
  }
  if (normalized.some((name) => name.includes('lider'))) {
    return 'lider'
  }
  return 'servidor'
}

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
    } else if (res.status === 401 || res.status === 403) {
      // Token inválido o expirado
      console.warn('[AUTH] RPC returned 401/403 — token inválido')
      return 'UNAUTHORIZED'
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
    } else if (res.status === 401 || res.status === 403) {
      console.warn('[AUTH] Direct query returned 401/403 — token inválido')
      return 'UNAUTHORIZED'
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
      `${SUPABASE_URL}/rest/v1/rpc/get_user_ministerios`,
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
      const data = await res.json()
      return data
    }
    if (res.status === 401 || res.status === 403) {
      console.warn('[AUTH] get_my_roles returned 401/403')
    }
  } catch { /* skip */ }
  return []
}

/** Fetch ministerios where user is líder */
async function fetchMinisteriosRaw(accessToken: string): Promise<any[] | null> {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
  }

  try {
    console.log('[AUTH] Fetching ministerios where user is líder...')
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/rpc/get_my_ministerios`,
      { method: 'POST', headers, body: '{}' },
      5000
    )
    if (res.ok) {
      const ministerios = await res.json()
      console.log('[AUTH] Ministerios fetched:', ministerios.length)
      return Array.isArray(ministerios) ? ministerios : []
    }
    console.warn('[AUTH] get_user_ministerios returned', res.status)
    return []
  } catch (err) {
    console.warn('[AUTH] Failed to fetch ministerios:', err)
    return []
  }
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
    if (res.status === 401 || res.status === 403) {
      console.warn('[AUTH] get_my_unread_notifications_count returned 401/403')
    }
  } catch { /* skip */ }
  return 0
}

async function refreshTenantClaims(accessToken: string): Promise<void> {
  try {
    await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/set-tenant-claims`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: '{}',
      },
      3000
    )
  } catch (err: any) {
    console.warn('[AUTH] set-tenant-claims failed:', err.message)
  }
}

async function fetchPermissionsUpdatedAt(accessToken: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/rpc/get_my_permissions_updated_at`,
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
      return val ? Math.floor(new Date(val).getTime() / 1000) : null
    }
  } catch { /* skip */ }
  return null
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isClaimsReady, setIsClaimsReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [iglesiaActual, setIglesiaActual] = useState<{ id: number; nombre: string } | null>(null)
  const [iglesiasDelUsuario, setIglesiasDelUsuario] = useState<{ id: number; nombre: string }[]>([])
  const [sedesDelUsuario, setSedesDelUsuario] = useState<{ id: number; nombre: string }[]>([])
  const [ministeriosDelUsuario, setMinisteriosDelUsuario] = useState<{ id: number; nombre: string; idSede: number }[]>([])
  const [rolActual, setRolActual] = useState<string>('')
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
  const lastHandledTokenRef = useRef<string | null>(null)
  const isHydratingRef = useRef(false)
  const hydratingUserIdRef = useRef<string | null>(null)
  const hydratedUserIdRef = useRef<string | null>(null)
  const hydratedTokenRef = useRef<string | null>(null)
  const authCycleRef = useRef(0)
  const logoutInProgressRef = useRef(false)
  const authReadyRef = useRef(false)
  const claimsRefreshInFlightRef = useRef(false)
  const reloadQueuedRef = useRef(false)

  // Development check for user synchronization issues - DISABLED
  // This was causing 403 errors when trying to use Admin API from frontend with anon key
  // Uncomment if you need to debug user synchronization issues
  /*
  useEffect(() => {
    if (!import.meta.env.PROD) {
      checkUserSynchronization().then(result => {
        if (result.authUsersWithoutUsuario.length > 0 || result.usuariosWithoutAuth.length > 0) {
          console.error('[DEV] 🚨 USER SYNCHRONIZATION ISSUES DETECTED:')
          if (result.authUsersWithoutUsuario.length > 0) {
            console.error(`  - ${result.authUsersWithoutUsuario.length} auth users without usuario records:`, result.authUsersWithoutUsuario.slice(0, 5))
          }
          if (result.usuariosWithoutAuth.length > 0) {
            console.error(`  - ${result.usuariosWithoutAuth.length} usuario records without auth users:`, result.usuariosWithoutAuth.slice(0, 5))
          }
        }
      })
    }
  }, [])
  */

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

  const clearAuthStorage = useCallback(() => {
    if (typeof window === 'undefined') return
    const shouldRemoveKey = (key: string) =>
      key.startsWith('sb-') ||
      key.startsWith('supabase.auth') ||
      key.includes('supabase-auth-token')

    Object.keys(localStorage).forEach((key) => {
      if (shouldRemoveKey(key)) {
        localStorage.removeItem(key)
      }
    })

    Object.keys(sessionStorage).forEach((key) => {
      if (shouldRemoveKey(key)) {
        sessionStorage.removeItem(key)
      }
    })
  }, [])

  const cleanupRealtime = useCallback(() => {
    try {
      if (typeof supabase.removeAllChannels === 'function') {
        supabase.removeAllChannels()
        return
      }
    } catch {
      // Fall through to manual cleanup
    }

    const channels = typeof supabase.getChannels === 'function' ? supabase.getChannels() : []
    channels.forEach((channel) => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // Ignore cleanup errors
      }
    })
  }, [])

  const resetClientState = useCallback((reason: string) => {
    authCycleRef.current += 1
    isHydratingRef.current = false
    hydratingUserIdRef.current = null
    hydratedUserIdRef.current = null
    hydratedTokenRef.current = null
    lastHandledTokenRef.current = null
    claimsRefreshInFlightRef.current = false

    setSession(null)
    setUsuarioActual(null)
    setNotificacionesCount(0)
    setIglesiaActual(null)
    setIglesiasDelUsuario([])
    setSedesDelUsuario([])
    setMinisteriosDelUsuario([])
    setRolActual('')
    setIsClaimsReady(false)
    setAuthError(null)
    setAuthLoading(false)
    setIsHydrated(true)
    setIsInitializing(false)

    try {
      queryClient.cancelQueries()
      queryClient.clear()
    } catch {
      // Ignore cache cleanup errors
    }

    cleanupRealtime()
    clearAuthStorage()
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('post_login_reload')
    }
    console.log('[AUTH] Reset client state:', reason)
  }, [cleanupRealtime, clearAuthStorage])

  const authReady = isHydrated && !authLoading && !!usuarioActual && isClaimsReady && !authError

  useEffect(() => {
    authReadyRef.current = authReady
  }, [authReady])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const flag = sessionStorage.getItem('post_login_reload')
    if (flag === 'pending') {
      sessionStorage.setItem('post_login_reload', 'done')
      reloadQueuedRef.current = true
      return
    }
    if (flag === 'done') {
      reloadQueuedRef.current = true
    }
  }, [])

  useEffect(() => {
    let loadingResolved = false

    const resolveLoading = () => {
      if (!loadingResolved) {
        loadingResolved = true
        setAuthLoading(false)
        setIsHydrated(true)
        setIsInitializing(false)
      }
    }

    const beginHydration = () => {
      setAuthLoading(true)
      setIsHydrated(false)
      setIsInitializing(true)
      setIsClaimsReady(false)
      setAuthError(null)
    }

    // Safety timeout: 20 seconds absolute max for all RPC calls
    const safetyTimeout = setTimeout(() => {
      if (!loadingResolved) {
        console.warn('[AUTH] ⚠️ Safety timeout (20s) — forcing authLoading=false')
        resolveLoading()
        setIsClaimsReady(true)
      }
    }, 20000)

    const hydrateSession = async (session: Session, cycleId: number) => {
      if (isHydratingRef.current && hydratingUserIdRef.current === session.user.id) {
        setSession(session)
        return
      }

      isHydratingRef.current = true
      hydratingUserIdRef.current = session.user.id
      const token = session.access_token
      const authUserId = session.user.id
      setSession(session)
      console.log('[AUTH] Loading profile for:', session.user.email)

      // Background: Claims refresh (non-blocking, runs in parallel with profile load)
      if (!claimsRefreshInFlightRef.current) {
        claimsRefreshInFlightRef.current = true
        setTimeout(async () => {
          try {
            const jwtClaimsAt = session.user.app_metadata?.claims_at as number | undefined
            const dbPermissionsAt = await fetchPermissionsUpdatedAt(token)
            if (!jwtClaimsAt || (dbPermissionsAt && dbPermissionsAt > jwtClaimsAt)) {
              console.log('[AUTH] Refreshing claims in background...')
              await refreshTenantClaims(token)
              await supabase.auth.refreshSession()
            }
          } catch (e) { /* ignore */ } finally {
            claimsRefreshInFlightRef.current = false
          }
        }, 0)
      }

      try {
        setIsClaimsReady(false)
        const data = await fetchUsuarioRaw(token, authUserId)
        if (cycleId !== authCycleRef.current) return

        if (data === 'UNAUTHORIZED') {
          console.warn('[AUTH] ❌ Token invalido o expirado — forzando logout')
          resetClientState('unauthorized')
          await supabase.auth.signOut({ scope: 'local' })
          return
        }

        if (!data) {
          console.error('[AUTH] ❌ No usuario record found for:', authUserId)
          resetClientState('missing-usuario')
          await supabase.auth.signOut({ scope: 'local' })
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
          fechaNacimiento: data.fecha_nacimiento,
          activo: data.activo,
          ultimoAcceso: data.ultimo_acceso,
          authUserId: data.auth_user_id ?? null,
          creadoEn: data.creado_en,
          actualizadoEn: data.updated_at,
        })

        const [notifCount, roles, ministerios] = await Promise.all([
          fetchNotifCountRaw(token),
          fetchRolesRaw(token),
          fetchMinisteriosRaw(token),
        ])
        if (cycleId !== authCycleRef.current) return

        setNotificacionesCount(notifCount)

        const normalizedSessionEmail = String(session.user.email ?? '').trim().toLowerCase()
        const roleNames = roles.map((r: any) => String(r.rol_nombre ?? ''))
        const derivedFromRoles = normalizeAppRole(roleNames)
        const derivedRol = normalizedSessionEmail === PROTECTED_SUPER_EMAIL
          ? 'super_admin'
          : derivedFromRoles

        console.log('[AUTH] Role derived:', derivedRol, '| email:', normalizedSessionEmail, '| rawRoles:', roleNames)

        if (roles.length === 0) {
          console.warn('[AUTH] ⚠️ No active roles returned for:', normalizedSessionEmail)
        }
        setRolActual(derivedRol)

        const iglesiasMap = new Map<number, string>()
        roles.forEach((r: any) => {
          if (r.iglesia_id) iglesiasMap.set(r.iglesia_id, r.iglesia_nombre)
        })
        const iglesias = Array.from(iglesiasMap.entries()).map(([id, nombre]) => ({ id, nombre }))
        setIglesiasDelUsuario(iglesias)
        if (iglesias.length >= 1) setIglesiaActual(iglesias[0])
        else setIglesiaActual(null)

        const sedesMap = new Map<number, string>()
        roles.forEach((r: any) => {
          if (r.sede_id) sedesMap.set(r.sede_id, r.sede_nombre || '')
        })
        setSedesDelUsuario(Array.from(sedesMap.entries()).map(([id, nombre]) => ({ id, nombre })))

        const ministeriosData = (ministerios || []).map((m: any) => ({
          id: m.idMinisterio,
          nombre: m.ministerioNombre,
          idSede: m.idSede,
        }))
        setMinisteriosDelUsuario(ministeriosData)

        console.log('[AUTH] ✅ Fully loaded — role:', derivedRol, '| iglesias:', iglesias.length)
        hydratedUserIdRef.current = authUserId
        hydratedTokenRef.current = token
        setIsClaimsReady(true)
        setAuthError(null)
        resolveLoading()

      } catch (err) {
        console.error('[AUTH] Error loading user data:', err)

        // Fallback for super admin even if data loading fails partially
        const normalizedSessionEmail = String(session.user.email ?? '').trim().toLowerCase()
        if (normalizedSessionEmail === PROTECTED_SUPER_EMAIL) {
          console.warn('[AUTH] ⚠️ Profile load failed for super admin — using forced role')
          setRolActual('super_admin')
          setIsClaimsReady(true)
          setAuthError(null)
        } else {
          setAuthError('Error cargando el perfil')
        }
        resolveLoading()
      } finally {
        isHydratingRef.current = false
        hydratingUserIdRef.current = null
      }
    }

    const handleSessionEvent = async (event: string, session: Session | null) => {
      console.log('[AUTH] onAuthStateChange:', event, !!session)

      if (logoutInProgressRef.current && event !== 'SIGNED_OUT') {
        return
      }

      if (session && isHydratingRef.current && hydratingUserIdRef.current === session.user.id) {
        setSession(session)
        return
      }

      if (session && hydratedUserIdRef.current === session.user.id) {
        hydratedTokenRef.current = session.access_token
        setSession(session)
        resolveLoading()
        return
      }

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session) {
          hydratedTokenRef.current = session.access_token
          setSession(session)
        }
        return
      }

      if (event === 'SIGNED_OUT' || !session) {
        resetClientState('signed-out-event')
        return
      }

      if (event === 'SIGNED_IN' && session.access_token === lastHandledTokenRef.current) {
        return
      }

      if (session?.access_token) {
        lastHandledTokenRef.current = session.access_token
      }

      if (authReadyRef.current && hydratedUserIdRef.current === session.user.id) {
        hydratedTokenRef.current = session.access_token
        setSession(session)
        resolveLoading()
        return
      }

      beginHydration()
      const cycleId = ++authCycleRef.current
      await hydrateSession(session, cycleId)
    }

    console.log('[AUTH] Setting up onAuthStateChange listener')

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleSessionEvent)

    // Fallback: if onAuthStateChange doesn't fire within 2s
    const fallbackTimeout = setTimeout(() => {
      if (authCycleRef.current === 0) {
        console.log('[AUTH] Fallback: getSession after 2s')
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (authCycleRef.current === 0) {
            handleSessionEvent('INITIAL_SESSION', session)
          }
        }).catch(() => resolveLoading())
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
      clearTimeout(fallbackTimeout)
    }
  }, [resetClientState])

  const logout = async () => {
    logoutInProgressRef.current = true
    setIsMockMode(false)
    resetClientState('logout')
    try {
      await supabase.auth.signOut({ scope: 'local' })
      window.location.replace('/login')
    } finally {
      logoutInProgressRef.current = false
    }
  }

  const refreshClaims = async () => {
    if (!session) return
    await refreshTenantClaims(session.access_token)
    await supabase.auth.refreshSession()
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
        fechaNacimiento: null,
        activo: true,
        ultimoAcceso: new Date().toISOString(),
        authUserId: 'mock-id',
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      })
      const mockDerivedRol = normalizeAppRole([mockRol])
      setRolActual(mockDerivedRol)
      setIglesiasDelUsuario([{ id: 1, nombre: 'Iglesia Mock' }])
      setIglesiaActual({ id: 1, nombre: 'Iglesia Mock' })
      setIsClaimsReady(true)
    }
  }, [isMockMode, usuarioActual, authLoading, mockRol])

  return (
    <AppContext.Provider
      value={{
        session,
        user: session?.user || null,
        usuarioActual,
        isAuthenticated: !!session || isMockMode,
        authLoading,
        isHydrated,
        isInitializing,
        isClaimsReady,
        authReady,
        authError,
        iglesiaActual,
        setIglesiaActual,
        iglesiasDelUsuario,
        sedesDelUsuario,
        ministeriosDelUsuario,
        rolActual,
        sidebarOpen,
        notificacionesCount,
        decrementNotificacionesCount: () => setNotificacionesCount((p) => Math.max(0, p - 1)),
        resetNotificacionesCount: () => setNotificacionesCount(0),
        darkMode,
        toggleSidebar: () => setSidebarOpen((p) => !p),
        toggleDarkMode: () => setDarkMode((p) => !p),
        logout,
        refreshClaims,
        setInitializing: setIsInitializing,
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

export function useAuth() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAuth must be used within AppProvider')
  return {
    user: ctx.user,
    rolActual: ctx.rolActual,
    usuarioActual: ctx.usuarioActual,
    isHydrated: ctx.isHydrated,
    isClaimsReady: ctx.isClaimsReady,
    authError: ctx.authError,
  }
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
