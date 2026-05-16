import { useQuery } from '@tanstack/react-query'
import {
  getCumpleanosAll,
  getCumpleanosByIglesia,
  getCumpleanosBySede,
  getCumpleanosByMinisterios,
  getCumpleanosPropio,
  type UsuarioCumpleanos,
} from '@/services/usuarios.service'
import { useApp } from '@/app/store/AppContext'
import { useMinisteriosIdsDeUsuario } from '@/hooks/useMinisterios'

export type { UsuarioCumpleanos }

export interface CumpleanosScope {
  tipo: 'sistema' | 'iglesia' | 'sede' | 'ministerio' | 'propio'
  label: string
}

interface UseCumpleanosResult {
  data: UsuarioCumpleanos[]
  isLoading: boolean
  error: Error | null
  scope: CumpleanosScope
}

export function useCumpleanos(): UseCumpleanosResult {
  const {
    rolActual,
    isMockMode,
    mockRol,
    iglesiaActual,
    sedesDelUsuario,
    ministeriosDelUsuario,
    usuarioActual,
  } = useApp()

  const rol = isMockMode ? mockRol : rolActual
  const idUsuario = usuarioActual?.idUsuario ?? null
  const idIglesia = iglesiaActual?.id ?? null
  const idSede = sedesDelUsuario[0]?.id ?? null

  // Use the same reliable source EventsPage uses (getMinisteriosIdsDeUsuario)
  // instead of ministeriosDelUsuario.map(m => m.id) which has a snake_case mapping bug
  const needsMinisterios = rol === 'lider' || rol === 'servidor'
  const { data: ministerioIds = [] } = useMinisteriosIdsDeUsuario(
    needsMinisterios && idUsuario ? idUsuario : undefined
  )

  // For the scope label, still use ministeriosDelUsuario names (best-effort)
  const ministerioNames = ministeriosDelUsuario.map((m) => m.nombre).filter(Boolean)

  // ── Determinar scope visual ───────────────────────────────────────────────
  const scope: CumpleanosScope = (() => {
    if (rol === 'super_admin') {
      return { tipo: 'sistema', label: 'Todo el sistema' }
    }
    if (rol === 'admin_iglesia') {
      return { tipo: 'iglesia', label: iglesiaActual?.nombre ?? 'Tu Iglesia' }
    }
    if (rol === 'admin_sede') {
      return { tipo: 'sede', label: sedesDelUsuario[0]?.nombre ?? 'Tu Sede' }
    }
    if (rol === 'lider') {
      const names = ministerioNames.join(', ')
      return { tipo: 'ministerio', label: names || 'Tu Ministerio' }
    }
    // servidor
    if (ministerioIds.length > 0) {
      const names = ministerioNames.join(', ')
      return { tipo: 'ministerio', label: names || 'Tu Ministerio' }
    }
    return { tipo: 'propio', label: 'Tu perfil' }
  })()

  // ── Query key ─────────────────────────────────────────────────────────────
  const queryKey = (() => {
    if (rol === 'super_admin') return ['cumpleanos', 'all']
    if (rol === 'admin_iglesia') return ['cumpleanos', 'iglesia', idIglesia]
    if (rol === 'admin_sede') return ['cumpleanos', 'sede', idSede]
    if (rol === 'lider') return ['cumpleanos', 'ministerios', ...ministerioIds]
    if (ministerioIds.length > 0) return ['cumpleanos', 'ministerios', ...ministerioIds]
    return ['cumpleanos', 'propio', idUsuario]
  })()

  // ── Query fn ──────────────────────────────────────────────────────────────
  const queryFn = async (): Promise<UsuarioCumpleanos[]> => {
    if (rol === 'super_admin') return getCumpleanosAll()
    if (rol === 'admin_iglesia' && idIglesia) return getCumpleanosByIglesia(idIglesia)
    if (rol === 'admin_sede' && idSede) return getCumpleanosBySede(idSede)
    if ((rol === 'lider' || rol === 'servidor') && ministerioIds.length > 0)
      return getCumpleanosByMinisterios(ministerioIds)
    if (idUsuario) return getCumpleanosPropio(idUsuario)
    return []
  }

  const enabled =
    rol === 'super_admin' ||
    (rol === 'admin_iglesia' && !!idIglesia) ||
    (rol === 'admin_sede' && !!idSede) ||
    ((rol === 'lider' || rol === 'servidor') && (ministerioIds.length > 0 || !!idUsuario)) ||
    !!idUsuario

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime: 3 * 60 * 1000,
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    scope,
  }
}
