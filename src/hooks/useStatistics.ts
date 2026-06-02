import { useMemo } from 'react';
import { useApp } from '@/app/store/AppContext';
import { useUsuarios, useUsuariosEnriquecidos } from '@/hooks/useUsuarios';
import { useSedes } from '@/hooks/useIglesias';
import { useEventos, useTareas } from '@/hooks/useEventos';
import { useMinisteriosEnriquecidos, useMiembrosMinisterio } from '@/hooks/useMinisterios';
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
  const { data: ministerios = [] } = useMinisteriosEnriquecidos(scope.idIglesia);
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

  // Cursos del aula, alcance resuelto por RLS (super_admin: todos; admin_iglesia: su iglesia;
  // lider: sus ministerios). NOTA: useCursos() filtra por id_ministerio, no por iglesia, por lo
  // que pasarle scope.idIglesia devolvía 0 cursos y dejaba las estadísticas de aula en cero.
  const { data: cursos = [] } = useQuery({
    queryKey: ['statistics-cursos', scope.idIglesia, scope.type],
    queryFn: async () => {
      if (!scope.idIglesia && scope.type !== 'global') return [];
      const { data } = await supabase
        .from('aula_curso')
        .select('id_aula_curso, titulo, estado, creado_en, aula_modulo(id_aula_modulo), aula_inscripcion(id_aula_inscripcion, activo)')
        .limit(2000);
      return data ?? [];
    },
  });
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

  const filteredSedes = useMemo(() => {
    if (scope.type === 'sede') return sedes.filter((s: any) => s.idSede === scope.idSede);
    if (scope.type === 'personal') return [];
    return sedes;
  }, [sedes, scope]);

  const filteredMinisterios = useMemo(() => {
    if (scope.type === 'sede') return ministerios.filter((m: any) => m.idSede === scope.idSede);
    if (scope.type === 'personal') return [];
    return ministerios;
  }, [ministerios, scope]);

  const filteredEnrichedUsuarios = useMemo(() => {
    if (scope.type === 'sede') {
      const allowedMinisterios = new Set(filteredMinisterios.map((m: any) => m.idMinisterio));
      return enrichedUsuarios.filter((u: any) => {
        const isSedeRole = u.roleNames.some((r: any) => r.idSede === scope.idSede);
        const isMinRole = u.minNames.some((m: any) => allowedMinisterios.has(m.idMinisterio));
        return isSedeRole || isMinRole;
      });
    }
    if (scope.type === 'personal') {
       return enrichedUsuarios.filter((u: any) => u.idUsuario === scope.idUsuario);
    }
    return enrichedUsuarios;
  }, [enrichedUsuarios, scope, filteredMinisterios]);

  const filteredUsuarios = useMemo(() => {
    if (scope.type === 'iglesia' || scope.type === 'global') return usuarios;
    const allowed = new Set(filteredEnrichedUsuarios.map((u: any) => u.idUsuario));
    return usuarios.filter((u: any) => allowed.has(u.idUsuario));
  }, [usuarios, filteredEnrichedUsuarios, scope]);

  const filteredEventos = useMemo(() => {
    if (scope.type === 'sede') {
      const allowedMinisterios = new Set(filteredMinisterios.map((m: any) => m.idMinisterio));
      return eventos.filter((e: any) => e.idSede === scope.idSede || (e.idMinisterio && allowedMinisterios.has(e.idMinisterio)));
    }
    if (scope.type === 'personal') return [];
    return eventos;
  }, [eventos, scope, filteredMinisterios]);

  const filteredTareas = useMemo(() => {
    if (scope.type === 'sede') {
      const allowedMinisterios = new Set(filteredMinisterios.map((m: any) => m.idMinisterio));
      const allowedEventos = new Set(filteredEventos.map((e: any) => e.idEvento));
      return tareas.filter((t: any) => 
        (t.idMinisterio && allowedMinisterios.has(t.idMinisterio)) || 
        (t.idEvento && allowedEventos.has(t.idEvento))
      );
    }
    if (scope.type === 'personal') return [];
    return tareas;
  }, [tareas, scope, filteredMinisterios, filteredEventos]);

  const filteredMiembrosMinisterio = useMemo(() => {
    if (scope.type === 'sede') {
      const allowedMinisterios = new Set(filteredMinisterios.map((m: any) => m.idMinisterio));
      return miembrosMinisterio.filter((m: any) => allowedMinisterios.has(m.idMinisterio));
    }
    if (scope.type === 'personal') return [];
    return miembrosMinisterio;
  }, [miembrosMinisterio, scope, filteredMinisterios]);

  const roles = useMemo(() => {
    const map = new Map<string, number>();
    filteredEnrichedUsuarios.forEach((u: any) => {
      u.roleNames.forEach((rn: any) => {
        if (scope.type === 'sede' && rn.idSede && rn.idSede !== scope.idSede) return;
        const name = rn.rolNombre || 'Sin rol';
        map.set(name, (map.get(name) || 0) + 1);
      });
    });
    const withoutRole = filteredEnrichedUsuarios.filter((u: any) => u.roleNames.length === 0).length;
    if (withoutRole > 0) map.set('Sin rol', withoutRole);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredEnrichedUsuarios, scope]);

  const rawData = useMemo(
    () => ({
      usuarios: filteredUsuarios,
      miembros: [],
      sedes: filteredSedes,
      ministerios: filteredMinisterios,
      roles,
      eventos: filteredEventos,
      tareas: filteredTareas,
      cursos,
      inscripciones,
      certificados,
      miembrosMinisterio: filteredMiembrosMinisterio,
    }),
    [filteredUsuarios, filteredSedes, filteredMinisterios, roles, filteredEventos, filteredTareas, cursos, inscripciones, certificados, filteredMiembrosMinisterio],
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
