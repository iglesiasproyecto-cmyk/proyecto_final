import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { FileText } from 'lucide-react'

interface Props {
  contenidoMd: string | null
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
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {contenidoMd}
      </ReactMarkdown>
    </article>
  )
}
