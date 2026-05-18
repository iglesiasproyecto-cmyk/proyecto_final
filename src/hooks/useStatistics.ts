import { useMemo } from 'react';
import { useApp } from '@/app/store/AppContext';
import { useUsuarios, useUsuariosEnriquecidos } from '@/hooks/useUsuarios';
import { useSedes } from '@/hooks/useIglesias';
import { useEventos, useTareas } from '@/hooks/useEventos';
import { useMinisterios, useMiembrosMinisterio } from '@/hooks/useMinisterios';
import { useCursos } from '@/hooks/useCursos';
import type { StatisticsScope, DateRange, StatisticsDomain, TabData, StatisticsData } from '@/types/statistics.types';
import { computeStatistics } from '@/services/statistics.service';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

function getDefaultDateRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return { start, end: now.toISOString() };
}

export function useStatistics(domain?: StatisticsDomain, dateRange?: DateRange) {
  const { usuarioActual, rolActual, iglesiaActual, sedesDelUsuario } = useApp();
  const range = dateRange ?? getDefaultDateRange();

  const scope = useMemo<StatisticsScope>(() => {
    switch (rolActual) {
      case 'super_admin':
        return { type: 'global' };
      case 'admin_iglesia':
        return { type: 'iglesia', idIglesia: iglesiaActual?.id };
      case 'admin_sede':
        return { type: 'sede', idIglesia: iglesiaActual?.id, idSede: sedesDelUsuario[0]?.id };
      case 'lider':
      case 'servidor':
        return { type: 'personal', idIglesia: iglesiaActual?.id, idUsuario: usuarioActual?.idUsuario };
      default:
        return { type: 'global' };
    }
  }, [rolActual, iglesiaActual, usuarioActual, sedesDelUsuario]);

  const { data: usuarios = [] } = useUsuarios();
  const { data: enrichedUsuarios = [] } = useUsuariosEnriquecidos();
  const { data: sedes = [] } = useSedes();
  const { data: eventos = [] } = useEventos(scope.idIglesia);
  const { data: tareas = [] } = useTareas();
  const { data: ministerios = [] } = useMinisterios(scope.idIglesia);
  const { data: miembrosMinisterio = [] } = useMiembrosMinisterio();

  const { data: certificados = [] } = useQuery({
    queryKey: ['statistics-certificados', scope.idIglesia],
    queryFn: async () => {
      if (!scope.idIglesia && scope.type !== 'global') return [];
      const { data } = await supabase
        .from('aula_certificado')
        .select('id_aula_certificado, creado_en')
        .limit(1000);
      return data ?? [];
    },
  });

  const { data: cursos = [] } = useCursos(scope.idIglesia);
  const { data: inscripciones = [] } = useQuery({
    queryKey: ['statistics-inscripciones', scope.idIglesia],
    queryFn: async () => {
      if (!scope.idIglesia && scope.type !== 'global') return [];
      const { data } = await supabase
        .from('aula_inscripcion')
        .select('id_aula_inscripcion, activo, id_usuario, creado_en')
        .limit(5000);
      return data ?? [];
    },
  });

  const roles = useMemo(() => {
    const map = new Map<string, number>();
    enrichedUsuarios.forEach((u: any) => {
      u.roleNames.forEach((rn: any) => {
        const name = rn.rolNombre || 'Sin rol';
        map.set(name, (map.get(name) || 0) + 1);
      });
    });
    const withoutRole = enrichedUsuarios.filter((u: any) => u.roleNames.length === 0).length;
    if (withoutRole > 0) map.set('Sin rol', withoutRole);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [enrichedUsuarios]);

  const rawData = useMemo(
    () => ({
      usuarios,
      miembros: [],
      sedes,
      ministerios,
      roles,
      eventos,
      tareas,
      cursos,
      inscripciones,
      certificados,
      miembrosMinisterio,
    }),
    [usuarios, sedes, ministerios, roles, eventos, tareas, cursos, inscripciones, certificados, miembrosMinisterio],
  );

  const allData = useMemo<StatisticsData>(() => computeStatistics(scope, range, rawData), [scope, range, rawData]);

  const filtered: TabData | null = domain ? allData[domain] : null;

  return {
    data: allData,
    tabData: filtered,
    domain: domain ?? null,
    scope,
    dateRange: range,
    isReady: !!usuarioActual,
  };
}
