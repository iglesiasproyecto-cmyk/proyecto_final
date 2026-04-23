import { Link } from 'react-router'
import { ChevronRight, GraduationCap } from 'lucide-react'

interface Props {
  cursoNombre: string
  idCurso: number
  moduloOrden: number
  moduloTitulo: string
  backHref?: string
}

export function ModuloBreadcrumb({
  cursoNombre,
  idCurso,
  moduloOrden,
  moduloTitulo,
  backHref = '/app/aula',
}: Props) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
      <Link to={backHref} className="flex items-center gap-1 hover:text-foreground transition-colors">
        <GraduationCap className="w-3.5 h-3.5" />
        Aula
      </Link>
      <ChevronRight className="w-3 h-3 shrink-0" />
      <Link to={`${backHref}?curso=${idCurso}`} className="truncate hover:text-foreground transition-colors">
        {cursoNombre}
      </Link>
      <ChevronRight className="w-3 h-3 shrink-0" />
      <span className="truncate font-semibold text-foreground">
        Módulo {moduloOrden}: {moduloTitulo}
      </span>
    </nav>
  )
}
