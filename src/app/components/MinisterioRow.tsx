import { Badge } from './ui/badge';
import { CursoListItem } from './CursoListItem';
import { ChevronDown, Users } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useCursosPorMinisterio } from '@/hooks/useGlobalAula';
import type { Tables } from '@/types/database.types';

interface MinisterioRowProps {
  ministerio: Tables<'ministerio'>;
  onCursoSelect: (curso: Tables<'aula_curso'> & { usuario_creador?: { nombres: string; apellidos: string } | null; }) => void;
  expandedMinisterios: Set<number>;
  onToggleMinisterio: (idMinisterio: number) => void;
}

export function MinisterioRow({
  ministerio,
  onCursoSelect,
  expandedMinisterios,
  onToggleMinisterio,
}: MinisterioRowProps) {
  const isExpanded = expandedMinisterios.has(ministerio.id_ministerio);
  const { data: cursos = [], isLoading, isError } = useCursosPorMinisterio(
    isExpanded ? ministerio.id_ministerio : undefined
  );

  return (
    <div className="space-y-2">
      <button
        onClick={() => onToggleMinisterio(ministerio.id_ministerio)}
        aria-expanded={isExpanded}
        aria-controls={`ministerio-${ministerio.id_ministerio}-content`}
        id={`ministerio-toggle-${ministerio.id_ministerio}`}
        className="w-full text-left px-4 py-3 rounded-lg border border-white/10 bg-card/30 hover:bg-card/60 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <Users className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="font-semibold text-sm truncate">{ministerio.nombre}</h4>
          </div>
        </div>
        <Badge variant="outline" className="ml-2 flex-shrink-0">
          {cursos.length} cursos
        </Badge>
      </button>

      {isExpanded && (
        <div className="pl-6 space-y-2" id={`ministerio-${ministerio.id_ministerio}-content`}>
          {isLoading ? (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          ) : isError ? (
            <p className="text-xs text-destructive px-4 py-2">Error cargando cursos</p>
          ) : cursos.length > 0 ? (
            cursos.map((curso) => (
              <CursoListItem
                key={curso.id_aula_curso}
                curso={curso}
                enrollmentCount={0}
                onSelect={onCursoSelect}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground px-4 py-2">
              No hay cursos en este ministerio
            </p>
          )}
        </div>
      )}
    </div>
  );
}
