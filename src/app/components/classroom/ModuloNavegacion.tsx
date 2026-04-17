import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Modulo } from '@/types/app.types'
import { Button } from '../ui/button'

interface Props {
  modulos: Modulo[]
  idModuloActual: number
  idCurso: number
  soloPublicados: boolean
}

export function ModuloNavegacion({ modulos, idModuloActual, idCurso, soloPublicados }: Props) {
  const visibles = [...modulos]
    .filter((m) => !soloPublicados || m.estado === 'publicado')
    .sort((a, b) => a.orden - b.orden)

  const idx = visibles.findIndex((m) => m.idModulo === idModuloActual)
  const anterior = idx > 0 ? visibles[idx - 1] : null
  const siguiente = idx >= 0 && idx < visibles.length - 1 ? visibles[idx + 1] : null

  const hrefFor = (idModulo: number) => `/app/aula/curso/${idCurso}/modulo/${idModulo}`

  return (
    <div className="flex items-center justify-between gap-3">
      <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={!anterior}>
        {anterior ? (
          <Link to={hrefFor(anterior.idModulo)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Link>
        ) : (
          <span className="opacity-40 pointer-events-none">
            <ChevronLeft className="w-4 h-4 mr-1 inline" />
            Anterior
          </span>
        )}
      </Button>
      <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={!siguiente}>
        {siguiente ? (
          <Link to={hrefFor(siguiente.idModulo)}>
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        ) : (
          <span className="opacity-40 pointer-events-none">
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1 inline" />
          </span>
        )}
      </Button>
    </div>
  )
}
