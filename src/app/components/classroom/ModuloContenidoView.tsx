import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { FileText } from 'lucide-react'

interface Props {
  contenidoMd: string | null
}

const YT_ID_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

function extractYouTubeId(href: unknown): string | null {
  if (typeof href !== 'string') return null
  const m = href.match(YT_ID_RE)
  return m ? m[1] : null
}

interface HastNode {
  type: string
  tagName?: string
  value?: string
  properties?: { href?: string } & Record<string, unknown>
  children?: HastNode[]
}

function getYouTubeIdFromParagraph(node: HastNode | undefined): string | null {
  if (!node?.children) return null
  const kids = node.children.filter(
    (c) => !(c.type === 'text' && !(c.value ?? '').trim()),
  )
  if (kids.length !== 1) return null
  const only = kids[0]
  if (only.type !== 'element' || only.tagName !== 'a') return null
  return extractYouTubeId(only.properties?.href)
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div
      className="my-5 w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
      style={{ aspectRatio: '16 / 9' }}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
        title="Video de YouTube"
        className="w-full h-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

export function ModuloContenidoView({ contenidoMd }: Props) {
  if (!contenidoMd || contenidoMd.trim() === '') {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/40 flex items-center justify-center">
          <FileText className="w-6 h-6 opacity-40" />
        </div>
        <p className="text-sm font-medium">Este módulo aún no tiene contenido publicado.</p>
      </div>
    )
  }

  return (
    <article className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          p({ node, children, ...rest }) {
            const ytId = getYouTubeIdFromParagraph(node as unknown as HastNode)
            if (ytId) return <YouTubeEmbed videoId={ytId} />
            return <p {...rest}>{children}</p>
          },
        }}
      >
        {contenidoMd}
      </ReactMarkdown>
    </article>
  )
}
