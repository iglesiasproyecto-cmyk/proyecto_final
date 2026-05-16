import { supabase } from '@/lib/supabaseClient'
import type { Tarea } from '@/types/app.types'

export async function archiveTask(idTarea: number): Promise<Tarea> {
  const { data, error } = await supabase.rpc('archive_tarea', {
    p_id_tarea: idTarea,
  })

  if (error) throw error
  return data
}

export async function unarchiveTask(idTarea: number): Promise<Tarea> {
  const { data, error } = await supabase.rpc('unarchive_tarea', {
    p_id_tarea: idTarea,
  })

  if (error) throw error
  return data
}

export async function getTareasArquivadas(idIglesia: number): Promise<Tarea[]> {
  const { data, error } = await supabase
    .from('tarea')
    .select('*')
    .eq('id_iglesia', idIglesia)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })

  if (error) throw error
  return data
}
