import { supabase } from '@/lib/supabaseClient'

// Helper function to get internal user ID from auth user ID
export const getInternalUserId = async (authUserId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('auth_user_id', authUserId)
      .single()

    if (error) {
      console.error('Error getting internal user ID:', error)
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