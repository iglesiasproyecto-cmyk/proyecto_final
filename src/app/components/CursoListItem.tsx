import { Badge } from './ui/badge';
import { ChevronRight } from 'lucide-react';
import type { Tables } from '@/types/database.types';

interface CursoListItemProps {
  curso: Tables<'aula_curso'> & {
    usuario_creador?: { nombres: string; apellidos: string } | null;
  };
  enrollmentCount?: number;
  onSelect: (curso: any) => void;
}

export function CursoListItem({ curso, enrollmentCount = 0, onSelect }: CursoListItemProps) {
  const estadoColor = {
    borrador: 'secondary',
    activo: 'default',
    archivado: 'outline',
  };

  return (
    <button
      onClick={() => onSelect(curso)}
      className="w-full text-left px-4 py-3 rounded-lg border border-white/10 bg-card/50 hover:bg-card/80 transition-colors flex items-center justify-between group"
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground truncate text-sm">
          {curso.titulo}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {curso.descripcion ? curso.descripcion.substring(0, 60) + '...' : 'Sin descripción'}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <Badge variant={estadoColor[curso.estado as keyof typeof estadoColor]}>
          {curso.estado}
        </Badge>
        <Badge variant="secondary" className="whitespace-nowrap">
          {enrollmentCount} inscritos
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}
