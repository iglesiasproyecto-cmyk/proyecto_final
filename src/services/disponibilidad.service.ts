// src/services/disponibilidad.service.ts
import { supabase } from '@/lib/supabaseClient'
import type { DisponibilidadRegla } from '@/types/app.types'

type Row = {
  id: number
  usuario_id: number
  tipo: string
  fecha: string | null
  fecha_fin: string | null
  patron: any
  nota: string | null
  activo: boolean
  created_at: string
}

function mapRow(r: Row): DisponibilidadRegla {
  return {
    id: r.id,
    usuarioId: r.usuario_id,
    tipo: r.tipo as DisponibilidadRegla['tipo'],
    fecha: r.fecha ?? undefined,
    fechaFin: r.fecha_fin ?? undefined,
    patron: r.patron ?? undefined,
    nota: r.nota ?? undefined,
    activo: r.activo,
    createdAt: r.created_at,
  }
}

export async function getDisponibilidadUsuario(usuarioId: number): Promise<DisponibilidadRegla[]> {
  const { data, error } = await supabase
    .from('disponibilidad')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(mapRow)
}

export async function getDisponibilidadEquipo(usuarioIds: number[]): Promise<DisponibilidadRegla[]> {
  if (usuarioIds.length === 0) return []
  const { data, error } = await supabase
    .from('disponibilidad')
    .select('*')
    .in('usuario_id', usuarioIds)
    .eq('activo', true)
  if (error) throw error
  return (data as Row[]).map(mapRow)
}

export async function createDisponibilidadRegla(
  regla: Omit<DisponibilidadRegla, 'id' | 'createdAt'>
): Promise<DisponibilidadRegla> {
  const { data, error } = await supabase
    .from('disponibilidad')
    .insert({
      usuario_id: regla.usuarioId,
      tipo: regla.tipo,
      fecha: regla.fecha ?? null,
      fecha_fin: regla.fechaFin ?? null,
      patron: regla.patron ?? null,
      nota: regla.nota ?? null,
      activo: regla.activo,
    })
    .select()
    .single()
  if (error) throw error
  return mapRow(data as Row)
}

export async function toggleDisponibilidadRegla(id: number, activo: boolean): Promise<void> {
  const { error } = await supabase
    .from('disponibilidad')
    .update({ activo })
    .eq('id', id)
  if (error) throw error
}

export async function deleteDisponibilidadRegla(id: number): Promise<void> {
  const { error } = await supabase
    .from('disponibilidad')
    .delete()
    .eq('id', id)
  if (error) throw error
}
