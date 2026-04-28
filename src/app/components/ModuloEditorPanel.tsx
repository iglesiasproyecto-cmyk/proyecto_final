import { useCallback, useEffect, useRef, useState } from 'react'
import MDEditor from '@uiw/react-md-editor'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import {
  Save, Loader2, Paperclip, Trash2, FileText,
  FileImage, File, ExternalLink, X, Link2, Plus,
} from 'lucide-react'
import {
  subirArchivoModulo,
  eliminarArchivoModulo,
  getArchivosModulo,
  getArchivoSignedUrl,
  actualizarContenidoModulo,
  getContenidoModulo,
  validarArchivo,
  getEnlacesModulo,
  agregarEnlaceModulo,
  eliminarEnlaceModulo,
  type AulaModuloArchivo,
  type AulaModuloEnlace,
} from '@/services/aulaArchivos.service'

const ICON_BY_MIME: Record<string, React.ElementType> = {
  'image/': FileImage,
  'application/pdf': FileText,
}

function fileIcon(mime: string | null): React.ElementType {
  if (!mime) return File
  for (const [k, C] of Object.entries(ICON_BY_MIME)) {
    if (mime.startsWith(k)) return C
  }
  return File
}

function fmtBytes(n: number | null) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 ** 2).toFixed(1)} MB`
}

function isValidUrl(s: string) {
  try { return ['http:', 'https:'].includes(new URL(s).protocol) }
  catch { return false }
}

interface Props {
  idModulo: number
  tituloModulo: string
  onClose: () => void
  /** true = solo lectura (Servidor), false/undefined = edición (Líder) */
  readOnly?: boolean
}

export function ModuloEditorPanel({ idModulo, tituloModulo, onClose, readOnly = false }: Props) {
  // ── Contenido MD ──────────────────────────────────────────────────────────
  const [contenido, setContenido] = useState<string>('')
  const [contenidoDirty, setContenidoDirty] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // ── Archivos ──────────────────────────────────────────────────────────────
  const [archivos, setArchivos] = useState<AulaModuloArchivo[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Enlaces ───────────────────────────────────────────────────────────────
  const [enlaces, setEnlaces] = useState<AulaModuloEnlace[]>([])
  const [showFormEnlace, setShowFormEnlace] = useState(false)
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoUrl, setNuevoUrl] = useState('')
  const [nuevoDesc, setNuevoDesc] = useState('')
  const [guardandoEnlace, setGuardandoEnlace] = useState(false)

  // ── Carga inicial ─────────────────────────────────────────────────────────
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelled = false
    setCargando(true)
    Promise.all([
      getContenidoModulo(idModulo),
      getArchivosModulo(idModulo),
      getEnlacesModulo(idModulo),
    ]).then(([md, files, links]) => {
      if (cancelled) return
      setContenido(md ?? '')
      setArchivos(files)
      setEnlaces(links)
    }).catch(() => {
      if (!cancelled) toast.error('Error al cargar el contenido del módulo')
    }).finally(() => {
      if (!cancelled) setCargando(false)
    })
    return () => { cancelled = true }
  }, [idModulo])

  // ── Handlers contenido ────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setGuardando(true)
    try {
      await actualizarContenidoModulo(idModulo, contenido.trim() || null)
      setContenidoDirty(false)
      toast.success('Contenido guardado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  // ── Handlers archivos ─────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const err = validarArchivo(file)
    if (err) { toast.error(err); return }
    setSubiendo(true)
    try {
      const nuevo = await subirArchivoModulo(idModulo, file)
      setArchivos(prev => [...prev, nuevo])
      toast.success(`"${file.name}" adjuntado`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : 'Error al subir archivo')
    } finally {
      setSubiendo(false)
    }
  }, [idModulo])

  const handleEliminarArchivo = async (archivo: AulaModuloArchivo) => {
    if (!confirm(`¿Eliminar "${archivo.nombre}"?`)) return
    try {
      await eliminarArchivoModulo(archivo.id_archivo, archivo.storage_path)
      setArchivos(prev => prev.filter(a => a.id_archivo !== archivo.id_archivo))
      toast.success('Archivo eliminado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  const handleDescargar = async (archivo: AulaModuloArchivo) => {
    try {
      const url = await getArchivoSignedUrl(archivo.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('No se pudo abrir el archivo')
    }
  }

  // ── Handlers enlaces ──────────────────────────────────────────────────────
  const handleAgregarEnlace = async () => {
    const titulo = nuevoTitulo.trim()
    const url = nuevoUrl.trim()
    if (!titulo) { toast.error('El título es obligatorio'); return }
    if (!isValidUrl(url)) { toast.error('Ingresa una URL válida (http:// o https://)'); return }

    setGuardandoEnlace(true)
    try {
      const nuevo = await agregarEnlaceModulo(idModulo, titulo, url, nuevoDesc.trim() || undefined)
      setEnlaces(prev => [...prev, nuevo])
      setNuevoTitulo(''); setNuevoUrl(''); setNuevoDesc('')
      setShowFormEnlace(false)
      toast.success('Enlace agregado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al agregar enlace')
    } finally {
      setGuardandoEnlace(false)
    }
  }

  const handleEliminarEnlace = async (enlace: AulaModuloEnlace) => {
    if (!confirm(`¿Eliminar "${enlace.titulo}"?`)) return
    try {
      await eliminarEnlaceModulo(enlace.id_enlace)
      setEnlaces(prev => prev.filter(e => e.id_enlace !== enlace.id_enlace))
      toast.success('Enlace eliminado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar enlace')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando módulo...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {readOnly ? 'Contenido del módulo' : 'Editar módulo'}
          </p>
          <h3 className="font-bold text-sm truncate">{tituloModulo}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Contenido MD ── */}
      <Card className="bg-card/40 border-white/10 rounded-2xl p-4 space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {readOnly ? 'Contenido' : 'Contenido del módulo'}
        </p>

        {readOnly ? (
          contenido.trim() ? (
            <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {contenido}
              </ReactMarkdown>
            </article>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Este módulo aún no tiene contenido publicado.
            </p>
          )
        ) : (
          <>
            <div data-color-mode="auto" className="rounded-xl overflow-hidden border border-white/10">
              <MDEditor
                value={contenido}
                onChange={v => { setContenido(v ?? ''); setContenidoDirty(true) }}
                height={400}
                preview="live"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {contenido.length.toLocaleString()} caracteres
                {contenidoDirty && <span className="ml-2 text-amber-500">· sin guardar</span>}
              </span>
              <Button
                size="sm"
                onClick={handleGuardar}
                disabled={!contenidoDirty || guardando}
                className="rounded-xl"
              >
                {guardando
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Guardando...</>
                  : <><Save className="w-3.5 h-3.5 mr-1" />Guardar</>}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* ── Archivos adjuntos ── */}
      <Card className="bg-card/40 border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Archivos adjuntos
          </p>
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-8"
                disabled={subiendo}
                onClick={() => fileRef.current?.click()}
              >
                {subiendo
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Subiendo...</>
                  : <><Paperclip className="w-3.5 h-3.5 mr-1" />Adjuntar archivo</>}
              </Button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.zip"
                onChange={handleFileChange}
              />
            </>
          )}
        </div>

        {archivos.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {readOnly ? 'No hay archivos adjuntos.' : 'Aún no hay archivos. Adjunta PDFs, documentos o imágenes.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {archivos.map(a => {
              const Icon = fileIcon(a.tipo_mime)
              return (
                <li
                  key={a.id_archivo}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/10 bg-background/40"
                >
                  <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.nombre}</p>
                    {a.tamano_bytes && (
                      <p className="text-[11px] text-muted-foreground">{fmtBytes(a.tamano_bytes)}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleDescargar(a)}
                    title="Abrir archivo"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-destructive"
                      onClick={() => handleEliminarArchivo(a)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* ── Enlaces ── */}
      <Card className="bg-card/40 border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Enlaces
          </p>
          {!readOnly && !showFormEnlace && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-8"
              onClick={() => setShowFormEnlace(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar enlace
            </Button>
          )}
        </div>

        {/* Inline form */}
        {showFormEnlace && (
          <div className="space-y-2 rounded-xl border border-white/10 bg-background/40 p-3">
            <Input
              placeholder="Título del enlace *"
              value={nuevoTitulo}
              onChange={e => setNuevoTitulo(e.target.value)}
              className="h-8 text-sm rounded-lg"
            />
            <Input
              placeholder="https://..."
              value={nuevoUrl}
              onChange={e => setNuevoUrl(e.target.value)}
              className="h-8 text-sm rounded-lg"
            />
            <Input
              placeholder="Descripción (opcional)"
              value={nuevoDesc}
              onChange={e => setNuevoDesc(e.target.value)}
              className="h-8 text-sm rounded-lg"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setShowFormEnlace(false); setNuevoTitulo(''); setNuevoUrl(''); setNuevoDesc('') }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs rounded-lg"
                disabled={guardandoEnlace}
                onClick={handleAgregarEnlace}
              >
                {guardandoEnlace ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        )}

        {enlaces.length === 0 && !showFormEnlace ? (
          <p className="text-sm text-muted-foreground italic">
            {readOnly ? 'No hay enlaces en este módulo.' : 'Agrega enlaces a recursos externos.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {enlaces.map(e => (
              <li
                key={e.id_enlace}
                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/10 bg-background/40"
              >
                <Link2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.titulo}</p>
                  {e.descripcion && (
                    <p className="text-[11px] text-muted-foreground truncate">{e.descripcion}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  title="Abrir enlace"
                  onClick={() => window.open(e.url, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive"
                    onClick={() => handleEliminarEnlace(e)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
