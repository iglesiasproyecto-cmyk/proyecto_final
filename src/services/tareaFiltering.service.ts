import { supabase } from '@/lib/supabaseClient'
import type { Tarea } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type TareaRow = Database['public']['Tables']['tarea']['Row']

// ── Filter Parameters ──

export interface TareaFilterParams {
  idIglesia?: number
  idMinisterio?: number
  estado?: string
  prioridad?: string
  busqueda?: string
  fechaDesde?: string
  fechaHasta?: string
  limit?: number
  offset?: number
}

// ── Enriched Interface ──

export interface TareaEnriquecida extends Tarea {
  ministerioNombre: string
}

// ── Mapping Functions ──

function mapTarea(r: TareaRow): Tarea {
  return {
    idTarea: r.id_tarea,
    titulo: r.titulo,
    descripcion: r.descripcion,
    fechaLimite: r.fecha_limite,
    estado: r.estado as Tarea['estado'],
    prioridad: r.prioridad as Tarea['prioridad'],
    idEvento: r.id_evento,
    idUsuarioCreador: r.id_usuario_creador,
    idMinisterio: r.id_ministerio ?? null,
    idIglesia: null,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
    horasMargenRechazo: (r as any).horas_margen_rechazo ?? 12,
  }
}

// ── Filtering Service ──

export async function getTareasFiltered(
  params: TareaFilterParams
): Promise<{ data: TareaEnriquecida[]; total: number }> {
  const limit = params.limit ?? 50
  const offset = params.offset ?? 0

  let q = supabase
    .from('tarea')
    .select('*, ministerio!inner(*), usuario!inner(*)', { count: 'exact' })

  // Apply filters
  if (params.idIglesia !== undefined) {
    q = q.eq('id_iglesia', params.idIglesia)
  }

  if (params.idMinisterio !== undefined) {
    q = q.eq('id_ministerio', params.idMinisterio)
  }

  if (params.estado !== undefined) {
    q = q.eq('estado', params.estado)
  }

  if (params.prioridad !== undefined) {
    q = q.eq('prioridad', params.prioridad)
  }

  // Search filter using or() with ilike
  if (params.busqueda !== undefined && params.busqueda.trim()) {
    const searchTerm = `%${params.busqueda}%`
    q = q.or(`titulo.ilike.${searchTerm},descripcion.ilike.${searchTerm}`)
  }

  // Date filters
  if (params.fechaDesde !== undefined) {
    q = q.gte('creado_en', params.fechaDesde)
  }

  if (params.fechaHasta !== undefined) {
    q = q.lte('creado_en', params.fechaHasta)
  }

  // Order and pagination
  q = q.order('creado_en', { ascending: false })
  q = q.range(offset, offset + limit - 1)

  const { data, error, count } = await q

  if (error) throw error

  const enriched: TareaEnriquecida[] = (data as any[]).map(r => ({
    ...mapTarea(r),
    ministerioNombre: r.ministerio?.nombre ?? '',
  }))

  return {
    data: enriched,
    total: count ?? 0,
  }
}

// ── Quick Search Helper ──

export async function searchTareas(
  idIglesia: number,
  busqueda: string
): Promise<TareaEnriquecida[]> {
  const result = await getTareasFiltered({
    idIglesia,
    busqueda,
    limit: 20,
  })
  return result.data
}
