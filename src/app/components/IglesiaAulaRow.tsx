import { useState } from 'react';
import { Badge } from './ui/badge';
import { CursoListItem } from './CursoListItem';
import { MinisterioRow } from './MinisterioRow';
import { ChevronDown, Building2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useCursosGlobal, useCursosPorMinisterio } from '@/hooks/useGlobalAula';
import { useMinisterios } from '@/hooks/useMinisterios';
import type { Tables } from '@/types/database.types';

interface IglesiaAulaRowProps {
  iglesia: Tables<'iglesia'>;
  onCursoSelect: (
    curso: Tables<'aula_curso'> & {
      usuario_creador?: { nombres: string; apellidos: string } | null;
    }
  ) => void;
  expandedIglesias: Set<number>;
  onToggleIglesia: (idIglesia: number) => void;
  expandedMinisterios: Set<number>;
  onToggleMinisterio: (idMinisterio: number) => void;
}

export function IglesiaAulaRow({
  iglesia,
  onCursoSelect,
  expandedIglesias,
  onToggleIglesia,
  expandedMinisterios,
  onToggleMinisterio,
}: IglesiaAulaRowProps) {
  const isExpanded = expandedIglesias.has(iglesia.id_iglesia);

  // Fetch cursos and ministerios only when iglesia is expanded
  const {
    data: cursosIglesia = [],
    isLoading: loadingCursos,
    isError: errorCursos,
  } = useCursosGlobal(isExpanded ? iglesia.id_iglesia : undefined);

  const {
    data: ministerios = [],
    isLoading: loadingMinisterios,
    isError: errorMinisterios,
  } = useMinisterios(isExpanded ? iglesia.id_iglesia : undefined);

  // Total curso count: iglesia-level cursos only (ministerio cursos counted separately in MinisterioRow)
  const totalCursos = cursosIglesia.length;

  return (
    <div className="space-y-3 border-l-2 border-primary/30 pl-4">
      <button
        onClick={() => onToggleIglesia(iglesia.id_iglesia)}
        aria-expanded={isExpanded}
        aria-controls={`iglesia-${iglesia.id_iglesia}-content`}
        id={`iglesia-toggle-${iglesia.id_iglesia}`}
        className="w-full text-left px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ChevronDown
            className={`w-5 h-5 text-primary flex-shrink-0 transition-transform ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-primary truncate">
              {iglesia.nombre}
            </h3>
          </div>
        </div>
        <Badge className="ml-2 flex-shrink-0">{totalCursos} cursos</Badge>
      </button>

      {isExpanded && (
        <div className="space-y-4" id={`iglesia-${iglesia.id_iglesia}-content`}>
          {/* Cursos de Iglesia */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4">
              Cursos de {iglesia.nombre}
            </h4>
            {loadingCursos ? (
              <>
                <Skeleton className="h-16 mx-4" />
                <Skeleton className="h-16 mx-4" />
              </>
            ) : errorCursos ? (
              <p className="text-xs text-destructive px-4 py-2">
                Error cargando cursos de iglesia
              </p>
            ) : cursosIglesia.length > 0 ? (
              <div className="space-y-2 px-4">
                {cursosIglesia.map((curso) => (
                  <CursoListItem
                    key={curso.id_aula_curso}
                    curso={curso}
                    enrollmentCount={0}
                    onSelect={onCursoSelect}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-4 py-2">
                No hay cursos creados a nivel iglesia
              </p>
            )}
          </div>

          {/* Ministerios */}
          {ministerios && ministerios.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4">
                Ministerios
              </h4>
              {loadingMinisterios ? (
                <div className="space-y-3 px-4">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : errorMinisterios ? (
                <p className="text-xs text-destructive px-4 py-2">
                  Error cargando ministerios
                </p>
              ) : (
                <div className="space-y-3 px-4">
                  {ministerios.map((ministerio) => (
                    <MinisterioRow
                      key={ministerio.id_ministerio}
                      ministerio={ministerio}
                      onCursoSelect={onCursoSelect}
                      expandedMinisterios={expandedMinisterios}
                      onToggleMinisterio={onToggleMinisterio}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
