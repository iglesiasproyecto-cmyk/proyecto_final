import { supabase } from '@/lib/supabaseClient'

export interface AulaModuloArchivo {
  id_archivo: number
  id_aula_modulo: number
  nombre: string
  storage_path: string
  tipo_mime: string | null
  tamano_bytes: number | null
  orden: number
  creado_en: string
}

const BUCKET = 'aula-recursos'
const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
])

export function validarArchivo(file: File): string | null {
  if (file.size > MAX_BYTES)
    return `El archivo excede el límite de ${MAX_BYTES / (1024 * 1024)} MB.`
  if (file.type && !ALLOWED_MIME.has(file.type))
    return `Tipo de archivo no permitido (${file.type}).`
  return null
}

export async function subirArchivoModulo(
  idModulo: number,
  file: File,
): Promise<AulaModuloArchivo> {
  const err = validarArchivo(file)
  if (err) throw new Error(err)

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const rand = crypto.randomUUID()
  const path = `modulo-${idModulo}/${Date.now()}-${rand}-${safeName}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (upErr) throw upErr

  const { data: nextOrden } = await supabase
    .from('aula_modulo_archivo')
    .select('orden')
    .eq('id_aula_modulo', idModulo)
    .order('orden', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabase
    .from('aula_modulo_archivo')
    .insert({
      id_aula_modulo: idModulo,
      nombre: file.name,
      storage_path: path,
      tipo_mime: file.type || null,
      tamano_bytes: file.size,
      orden: (nextOrden?.orden ?? 0) + 1,
    })
    .select()
    .single()
  if (error) throw error
  return data as AulaModuloArchivo
}

export async function getArchivoSignedUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error) throw error
  if (!data?.signedUrl) throw new Error('No se pudo generar URL firmada')
  return data.signedUrl
}

export async function eliminarArchivoModulo(idArchivo: number, storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath])
  const { error } = await supabase
    .from('aula_modulo_archivo')
    .delete()
    .eq('id_archivo', idArchivo)
  if (error) throw error
}

export async function getArchivosModulo(idModulo: number): Promise<AulaModuloArchivo[]> {
  const { data, error } = await supabase
    .from('aula_modulo_archivo')
    .select('*')
    .eq('id_aula_modulo', idModulo)
    .order('orden')
  if (error) throw error
  return (data ?? []) as AulaModuloArchivo[]
}

export async function actualizarContenidoModulo(
  idModulo: number,
  contenidoMd: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('aula_modulo')
    .update({ contenido_md: contenidoMd })
    .eq('id_aula_modulo', idModulo)
  if (error) throw error
}

export async function getContenidoModulo(idModulo: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('aula_modulo')
    .select('contenido_md')
    .eq('id_aula_modulo', idModulo)
    .maybeSingle()
  if (error) throw error
  return (data as { contenido_md: string | null } | null)?.contenido_md ?? null
}

// ─── Enlaces ─────────────────────────────────────────────────────────────────

export interface AulaModuloEnlace {
  id_enlace: number
  id_aula_modulo: number
  titulo: string
  url: string
  descripcion: string | null
  orden: number
  creado_en: string
}

export async function getEnlacesModulo(idModulo: number): Promise<AulaModuloEnlace[]> {
  const { data, error } = await supabase
    .from('aula_modulo_enlace')
    .select('*')
    .eq('id_aula_modulo', idModulo)
    .order('orden')
  if (error) throw error
  return (data ?? []) as AulaModuloEnlace[]
}

export async function agregarEnlaceModulo(
  idModulo: number,
  titulo: string,
  url: string,
  descripcion?: string,
): Promise<AulaModuloEnlace> {
  const { data: last } = await supabase
    .from('aula_modulo_enlace')
    .select('orden')
    .eq('id_aula_modulo', idModulo)
    .order('orden', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabase
    .from('aula_modulo_enlace')
    .insert({
      id_aula_modulo: idModulo,
      titulo,
      url,
      descripcion: descripcion || null,
      orden: (last?.orden ?? 0) + 1,
    })
    .select()
    .single()
  if (error) throw error
  return data as AulaModuloEnlace
}

export async function eliminarEnlaceModulo(idEnlace: number): Promise<void> {
  const { error } = await supabase
    .from('aula_modulo_enlace')
    .delete()
    .eq('id_enlace', idEnlace)
  if (error) throw error
}
