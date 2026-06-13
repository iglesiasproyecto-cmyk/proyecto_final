// src/hooks/useDisponibilidad.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDisponibilidadUsuario,
  getDisponibilidadEquipo,
  createDisponibilidadRegla,
  toggleDisponibilidadRegla,
  deleteDisponibilidadRegla,
} from '@/services/disponibilidad.service'
import type { DisponibilidadRegla } from '@/types/app.types'

// ── Pure helper ──────────────────────────────────────────────────────────────

export function estaDisponible(
  usuarioId: number,
  fecha: Date,
  reglas: DisponibilidadRegla[]
): { disponible: boolean; nota?: string } {
  const activas = reglas.filter(r => r.activo && r.usuarioId === usuarioId)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fechaStr = `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`

  // Evalúa fecha_especifica primero (mayor precedencia)
  for (const r of activas) {
    if (r.tipo !== 'fecha_especifica') continue
    if (!r.fecha) continue
    const desde = r.fecha
    const hasta = r.fechaFin ?? r.fecha
    if (fechaStr >= desde && fechaStr <= hasta) {
      return { disponible: false, nota: r.nota }
    }
  }

  // Evalúa recurrentes
  const diaSemana = fecha.getDay() // 0=Dom … 6=Sáb
  const dia = fecha.getDate()
  const mesYear = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const primerDiaSemana = mesYear.getDay()
  const semanaDelMes = Math.ceil((dia + primerDiaSemana) / 7)
  // Última semana: comprueba si añadir 7 días sobrepasa el mes
  const esUltimaSemana = new Date(fecha.getFullYear(), fecha.getMonth(), dia + 7).getMonth() !== fecha.getMonth()

  for (const r of activas) {
    if (r.tipo !== 'recurrente' || !r.patron) continue
    if (r.patron.tipo === 'semanal') {
      if (r.patron.diasSemana?.includes(diaSemana)) {
        return { disponible: false, nota: r.nota }
      }
    } else if (r.patron.tipo === 'mensual') {
      const semanaMatch =
        r.patron.semanaDelMes === -1
          ? esUltimaSemana
          : r.patron.semanaDelMes === semanaDelMes
      if (semanaMatch && r.patron.diasSemana?.includes(diaSemana)) {
        return { disponible: false, nota: r.nota }
      }
    }
  }

  return { disponible: true }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useDisponibilidadUsuario(usuarioId?: number) {
  return useQuery({
    queryKey: ['disponibilidad', usuarioId],
    queryFn: () => getDisponibilidadUsuario(usuarioId!),
    enabled: !!usuarioId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDisponibilidadEquipo(usuarioIds: number[]) {
  return useQuery({
    queryKey: ['disponibilidad-equipo', usuarioIds],
    queryFn: () => getDisponibilidadEquipo(usuarioIds),
    enabled: usuarioIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDisponibilidadRegla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createDisponibilidadRegla,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['disponibilidad', data.usuarioId] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-equipo'] })
    },
  })
}

export function useToggleDisponibilidadRegla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      toggleDisponibilidadRegla(id, activo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-equipo'] })
    },
  })
}

export function useDeleteDisponibilidadRegla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteDisponibilidadRegla,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-equipo'] })
    },
  })
}
