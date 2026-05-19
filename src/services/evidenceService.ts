/**
 * evidenceService.ts
 * Handles task review workflow: evidence files, review comments, approvals/rejections
 * 
 * NOTE: The existing tarea_evidencia table uses id_tarea_asignada (not id_tarea)
 * and object_path for file storage. We use tarea_comentario for comments and
 * tarea_aprobacion for approve/reject records.
 */

import { supabase } from '@/lib/supabaseClient'

// ── Types ──

export interface TareaComentario {
  idTareaComentario: number
  idTarea: number
  idUsuario: number
  contenido: string
  creadoEn: string
  // enriched
  nombreCompleto?: string
}

export interface TareaAprobacion {
  idTareaAprobacion: number
  idTarea: number
  idUsuario: number
  accion: 'aprobar' | 'rechazar' | 'reabrir'
  observaciones: string | null
  creadoEn: string
  // enriched
  nombreCompleto?: string
}

export type TimelineEntry =
  | (TareaComentario & { _kind: 'comentario' })
  | (TareaAprobacion & { _kind: 'aprobacion' })

// ── Comments ──

export async function getTareaComentarios(idTarea: number): Promise<TareaComentario[]> {
  const { data, error } = await supabase
    .from('tarea_comentario')
    .select('*, usuario(nombres, apellidos)')
    .eq('id_tarea', idTarea)
    .order('creado_en', { ascending: true })

  if (error) throw error

  return (data as any[]).map((row) => ({
    idTareaComentario: row.id_tarea_comentario,
    idTarea: row.id_tarea,
    idUsuario: row.id_usuario,
    contenido: row.contenido,
    creadoEn: row.creado_en,
    nombreCompleto: `${row.usuario?.nombres ?? ''} ${row.usuario?.apellidos ?? ''}`.trim(),
  }))
}

export async function createTareaComentario(data: {
  idTarea: number
  idUsuario: number
  contenido: string
}): Promise<TareaComentario> {
  const { data: row, error } = await supabase
    .from('tarea_comentario')
    .insert({
      id_tarea: data.idTarea,
      id_usuario: data.idUsuario,
      contenido: data.contenido,
    })
    .select('*, usuario(nombres, apellidos)')
    .single()

  if (error) throw error

  return {
    idTareaComentario: (row as any).id_tarea_comentario,
    idTarea: (row as any).id_tarea,
    idUsuario: (row as any).id_usuario,
    contenido: (row as any).contenido,
    creadoEn: (row as any).creado_en,
    nombreCompleto: `${(row as any).usuario?.nombres ?? ''} ${(row as any).usuario?.apellidos ?? ''}`.trim(),
  }
}

// ── Approvals ──

export async function getTareaAprobaciones(idTarea: number): Promise<TareaAprobacion[]> {
  const { data, error } = await supabase
    .from('tarea_aprobacion')
    .select('*, usuario(nombres, apellidos)')
    .eq('id_tarea', idTarea)
    .order('creado_en', { ascending: true })

  if (error) throw error

  return (data as any[]).map((row) => ({
    idTareaAprobacion: row.id_tarea_aprobacion,
    idTarea: row.id_tarea,
    idUsuario: row.id_usuario,
    accion: row.accion as TareaAprobacion['accion'],
    observaciones: row.observaciones,
    creadoEn: row.creado_en,
    nombreCompleto: `${row.usuario?.nombres ?? ''} ${row.usuario?.apellidos ?? ''}`.trim(),
  }))
}

export async function createTareaAprobacion(data: {
  idTarea: number
  idUsuario: number
  accion: 'aprobar' | 'rechazar' | 'reabrir'
  observaciones?: string | null
}): Promise<TareaAprobacion> {
  const { data: row, error } = await supabase
    .from('tarea_aprobacion')
    .insert({
      id_tarea: data.idTarea,
      id_usuario: data.idUsuario,
      accion: data.accion,
      observaciones: data.observaciones ?? null,
    })
    .select('*, usuario(nombres, apellidos)')
    .single()

  if (error) throw error

  return {
    idTareaAprobacion: (row as any).id_tarea_aprobacion,
    idTarea: (row as any).id_tarea,
    idUsuario: (row as any).id_usuario,
    accion: (row as any).accion,
    observaciones: (row as any).observaciones,
    creadoEn: (row as any).creado_en,
    nombreCompleto: `${(row as any).usuario?.nombres ?? ''} ${(row as any).usuario?.apellidos ?? ''}`.trim(),
  }
}

// ── Combined Timeline ──

export async function getTaskTimeline(idTarea: number): Promise<TimelineEntry[]> {
  const [comentarios, aprobaciones] = await Promise.all([
    getTareaComentarios(idTarea),
    getTareaAprobaciones(idTarea),
  ])

  const timeline: TimelineEntry[] = [
    ...comentarios.map((c) => ({ ...c, _kind: 'comentario' as const })),
    ...aprobaciones.map((a) => ({ ...a, _kind: 'aprobacion' as const })),
  ]

  // Sort by creation date chronologically
  timeline.sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime())

  return timeline
}

// ── File Validation ──

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES_PER_TASK = 5

export interface FileValidationError {
  field: 'type' | 'size' | 'count'
  message: string
}

export function validateFile(file: File): FileValidationError | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      field: 'type',
      message: `Tipo de archivo no permitido. Usa JPG, PNG, PDF o documentos Word.`,
    }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      field: 'size',
      message: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 10MB.`,
    }
  }
  return null
}

export function validateFileCount(currentCount: number): FileValidationError | null {
  if (currentCount >= MAX_FILES_PER_TASK) {
    return {
      field: 'count',
      message: `Máximo ${MAX_FILES_PER_TASK} archivos por tarea.`,
    }
  }
  return null
}

export { MAX_FILES_PER_TASK }
