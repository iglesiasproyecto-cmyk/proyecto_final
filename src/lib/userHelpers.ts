import { supabase } from '@/lib/supabaseClient'

// Development utility to check for user synchronization issues
export const checkUserSynchronization = async (): Promise<{
  authUsersWithoutUsuario: string[]
  usuariosWithoutAuth: number[]
  totalAuthUsers: number
  totalUsuarios: number
}> => {
  if (import.meta.env.PROD) {
    console.warn('checkUserSynchronization should only be used in development')
    return { authUsersWithoutUsuario: [], usuariosWithoutAuth: [], totalAuthUsers: 0, totalUsuarios: 0 }
  }

  try {
    // Get all auth users (this requires admin privileges)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Cannot check auth users (requires admin):', authError)
      return { authUsersWithoutUsuario: [], usuariosWithoutAuth: [], totalAuthUsers: 0, totalUsuarios: 0 }
    }

    // Get all usuarios
    const { data: usuarios, error: userError } = await supabase
      .from('usuario')
      .select('id_usuario, auth_user_id')

    if (userError) {
      console.error('Cannot check usuarios:', userError)
      return { authUsersWithoutUsuario: [], usuariosWithoutAuth: [], totalAuthUsers: 0, totalUsuarios: 0 }
    }

    const authUserIds = new Set(authUsers.users.map(u => u.id))
    const usuarioAuthIds = new Set(usuarios.filter(u => u.auth_user_id).map(u => u.auth_user_id))

    const authUsersWithoutUsuario = authUsers.users
      .filter(u => !usuarioAuthIds.has(u.id))
      .map(u => u.email || u.id)

    const usuariosWithoutAuth = usuarios
      .filter(u => u.auth_user_id && !authUserIds.has(u.auth_user_id))
      .map(u => u.id_usuario)

    return {
      authUsersWithoutUsuario,
      usuariosWithoutAuth,
      totalAuthUsers: authUsers.users.length,
      totalUsuarios: usuarios.length
    }
  } catch (error) {
    console.error('Error checking user synchronization:', error)
    return { authUsersWithoutUsuario: [], usuariosWithoutAuth: [], totalAuthUsers: 0, totalUsuarios: 0 }
  }
}

// Helper function to get internal user ID from auth user ID
export const getInternalUserId = async (authUserId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('auth_user_id', authUserId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.error('[USER SYNC] ❌ No usuario record found for auth_user_id:', authUserId)
        console.error('[USER SYNC] This indicates desynchronization between auth.users and usuario table')
      } else {
        console.error('Error getting internal user ID:', error)
      }
      return null
    }

    return data.id_usuario
  } catch (error) {
    console.error('Error in getInternalUserId:', error)
    return null
  }
}

// Helper function to get user ministeries
export const getUserMinisterios = async (internalUserId: number) => {
  try {
    const { data, error } = await supabase
      .from('miembro_ministerio')
      .select(`
        id_ministerio,
        rol_en_ministerio,
        ministerio:ministerio(*)
      `)
      .eq('id_usuario', internalUserId)
      .is('fecha_salida', null)

    if (error) {
      console.error('Error getting user ministerios:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserMinisterios:', error)
    return []
  }
}