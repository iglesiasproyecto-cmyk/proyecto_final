// src/services/evento-presupuesto.service.ts
import { supabase } from '@/lib/supabaseClient'
import type { PresupuestoItem, PresupuestoResumenEvento } from '@/types/app.types'

type RawItem = {
  id: number
  id_evento: number
  tipo: string
  categoria: string
  descripcion: string | null
  monto_planeado: number
  monto_real: number | null
  created_by: number | null
  created_at: string
  updated_at: string
}

function mapItem(r: RawItem): PresupuestoItem {
  return {
    idPresupuestoItem: r.id,
    idEvento: r.id_evento,
    tipo: r.tipo as 'ingreso' | 'egreso',
    categoria: r.categoria,
    descripcion: r.descripcion,
    montoPlaneado: Number(r.monto_planeado),
    montoReal: r.monto_real !== null ? Number(r.monto_real) : null,
    creadoPor: r.created_by,
    creadoEn: r.created_at,
    actualizadoEn: r.updated_at,
  }
}

export async function getItemsByEvento(idEvento: number): Promise<PresupuestoItem[]> {
  const { data, error } = await (supabase as any)
    .from('evento_presupuesto_item')
    .select('*')
    .eq('id_evento', idEvento)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as RawItem[]).map(mapItem)
}

export type CreateItemPayload = {
  idEvento: number
  tipo: 'ingreso' | 'egreso'
  categoria: string
  descripcion?: string | null
  montoPlaneado: number
  montoReal?: number | null
  creadoPor?: number | null
}

export async function createItem(payload: CreateItemPayload): Promise<PresupuestoItem> {
  const { data, error } = await (supabase as any)
    .from('evento_presupuesto_item')
    .insert({
      id_evento: payload.idEvento,
      tipo: payload.tipo,
      categoria: payload.categoria,
      descripcion: payload.descripcion ?? null,
      monto_planeado: payload.montoPlaneado,
      monto_real: payload.montoReal ?? null,
      created_by: payload.creadoPor ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return mapItem(data as RawItem)
}

export type UpdateItemPayload = {
  categoria?: string
  descripcion?: string | null
  montoPlaneado?: number
  montoReal?: number | null
}

export async function updateItem(id: number, payload: UpdateItemPayload): Promise<PresupuestoItem> {
  const update: Record<string, unknown> = {}
  if (payload.categoria !== undefined)     update.categoria      = payload.categoria
  if (payload.descripcion !== undefined)   update.descripcion    = payload.descripcion
  if (payload.montoPlaneado !== undefined) update.monto_planeado = payload.montoPlaneado
  if (payload.montoReal !== undefined)     update.monto_real     = payload.montoReal

  const { data, error } = await (supabase as any)
    .from('evento_presupuesto_item')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapItem(data as RawItem)
}

export async function deleteItem(id: number): Promise<void> {
  const { error } = await (supabase as any)
    .from('evento_presupuesto_item')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export type ResumenFilters = {
  idMinisterio?: number | null
  mes?: number | null   // 1–12
  anio?: number | null
}

export async function getItemsByIglesia(
  idIglesia: number,
  filters?: ResumenFilters
): Promise<PresupuestoItem[]> {
  let evQ: any = supabase
    .from('evento')
    .select('id_evento')
    .eq('id_iglesia', idIglesia)

  if (filters?.idMinisterio) evQ = evQ.eq('id_ministerio', filters.idMinisterio)
  if (filters?.mes && filters?.anio) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const start = `${filters.anio}-${pad(filters.mes)}-01`
    const endMonth = filters.mes === 12 ? 1 : filters.mes + 1
    const endYear  = filters.mes === 12 ? filters.anio + 1 : filters.anio
    const end = `${endYear}-${pad(endMonth)}-01`
    evQ = evQ.gte('fecha_inicio', start).lt('fecha_inicio', end)
  }

  const { data: eventRows, error: evErr } = await evQ
  if (evErr) throw evErr
  const ids = (eventRows ?? []).map((r: { id_evento: number }) => r.id_evento)
  if (ids.length === 0) return []

  const { data, error } = await (supabase as any)
    .from('evento_presupuesto_item')
    .select('*')
    .in('id_evento', ids)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as RawItem[]).map(mapItem)
}

export function buildResumen(
  eventos: { idEvento: number; nombre: string; fechaInicio: string; idMinisterio: number | null; idSede: number | null }[],
  items: PresupuestoItem[]
): PresupuestoResumenEvento[] {
  const byEvento = new Map<number, PresupuestoItem[]>()
  for (const item of items) {
    const list = byEvento.get(item.idEvento) ?? []
    list.push(item)
    byEvento.set(item.idEvento, list)
  }

  return eventos.map(ev => {
    const evItems = byEvento.get(ev.idEvento) ?? []
    const ingresos = evItems.filter(i => i.tipo === 'ingreso')
    const egresos  = evItems.filter(i => i.tipo === 'egreso')
    const ingresosPlaneados = ingresos.reduce((s, i) => s + i.montoPlaneado, 0)
    const ingresosReales    = ingresos.reduce((s, i) => s + (i.montoReal ?? 0), 0)
    const egresosPlaneados  = egresos.reduce((s, i) => s + i.montoPlaneado, 0)
    const egresosReales     = egresos.reduce((s, i) => s + (i.montoReal ?? 0), 0)
    return {
      idEvento:          ev.idEvento,
      nombreEvento:      ev.nombre,
      fechaInicio:       ev.fechaInicio,
      idMinisterio:      ev.idMinisterio,
      idSede:            ev.idSede,
      items:             evItems,
      ingresosPlaneados,
      ingresosReales,
      egresosPlaneados,
      egresosReales,
      balanceNeto:       ingresosReales - egresosReales,
    }
  })
}
