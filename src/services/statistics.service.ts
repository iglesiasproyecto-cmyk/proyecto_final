import type {
  StatisticsScope,
  StatisticsDomain,
  DateRange,
  TabData,
  KpiCard,
  ChartSeries,
  TableData,
  StatisticsData,
} from '@/types/statistics.types';

function filterByDateRange<T extends { creadoEn?: string | null }>(items: T[], range: DateRange): T[] {
  if (!range.start && !range.end) return items;
  return items.filter((item) => {
    if (!item.creadoEn) return true;
    const date = new Date(item.creadoEn);
    if (range.start && date < new Date(range.start)) return false;
    if (range.end && date > new Date(range.end)) return false;
    return true;
  });
}

export function computeIglesiaTab(
  usuarios: any[],
  miembros: any[],
  sedes: any[],
  ministerios: any[],
  roles: { name: string; value: number }[],
  range: DateRange,
): TabData {
  const filteredUsers = filterByDateRange(usuarios, range);
  const activeUsers = filteredUsers.filter((u) => u.activo);
  const activeSedes = sedes.filter((s: any) => s.estado === 'activa');
  const activeMins = ministerios.filter((m: any) => m.estado === 'activo');

  const kpis: KpiCard[] = [
    { id: 'total-users', label: 'Usuarios totales', value: filteredUsers.length, icon: 'Users', sublabel: `${activeUsers.length} activos` },
    { id: 'active-members', label: 'Miembros activos', value: miembros.filter((m: any) => m.activo).length, icon: 'UserCheck' },
    { id: 'active-sedes', label: 'Sedes activas', value: activeSedes.length, icon: 'Church' },
    { id: 'active-ministerios', label: 'Ministerios activos', value: activeMins.length, icon: 'Settings2' },
  ];

  const charts: ChartSeries[] = [
    {
      id: 'usuarios-por-rol',
      title: 'Usuarios por rol',
      type: 'donut',
      labels: roles.map((r) => r.name),
      datasets: [{ name: 'Usuarios', values: roles.map((r) => r.value), color: '#1a7fa8' }],
    },
  ];

  const table: TableData = {
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'email', label: 'Email' },
      { key: 'activo', label: 'Estado' },
      { key: 'ultimoAcceso', label: 'Último acceso' },
    ],
    rows: filteredUsers.slice(0, 10).map((u) => ({
      nombre: `${u.nombres || ''} ${u.apellidos || ''}`,
      email: u.email || '-',
      activo: u.activo ? 'Activo' : 'Inactivo',
      ultimoAcceso: u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString('es') : '-',
    })),
  };

  return { kpis, charts, table };
}

export function computeMinisteriosTab(
  ministerios: any[],
  miembrosMinisterio: any[],
  _usuarios: any[],
  _range: DateRange,
): TabData {
  const activeMins = ministerios.filter((m: any) => m.estado === 'activo');

  const kpis: KpiCard[] = [
    { id: 'total-ministerios', label: 'Ministerios', value: ministerios.length, icon: 'Settings2', sublabel: `${activeMins.length} activos` },
    { id: 'total-miembros-min', label: 'Miembros en ministerios', value: miembrosMinisterio.length, icon: 'Users' },
  ];

  const sorted = [...ministerios].sort((a: any, b: any) => (b.cantidadMiembros || 0) - (a.cantidadMiembros || 0));
  const top5 = sorted.slice(0, 5);

  const charts: ChartSeries[] = [
    {
      id: 'miembros-por-ministerio',
      title: 'Miembros por ministerio (top 5)',
      type: 'bar',
      labels: top5.map((m: any) => (m.nombre?.length > 12 ? m.nombre.substring(0, 10) + '...' : m.nombre || '')),
      datasets: [{ name: 'Miembros', values: top5.map((m: any) => m.cantidadMiembros || 0), color: '#2596be' }],
    },
  ];

  const table: TableData = {
    columns: [
      { key: 'nombre', label: 'Ministerio' },
      { key: 'miembros', label: 'Miembros' },
      { key: 'lider', label: 'Líder' },
      { key: 'estado', label: 'Estado' },
    ],
    rows: ministerios.map((m: any) => ({
      nombre: m.nombre,
      miembros: m.cantidadMiembros || 0,
      lider: m.liderNombre || '-',
      estado: m.estado === 'activo' ? 'Activo' : 'Inactivo',
    })),
  };

  return { kpis, charts, table };
}

export function computeEventosTareasTab(
  eventos: any[],
  tareas: any[],
  range: DateRange,
): TabData {
  const filteredEventos = filterByDateRange(eventos, range);
  const filteredTareas = filterByDateRange(tareas, range);

  const completadas = filteredTareas.filter((t: any) => t.estado === 'completada').length;
  const pendientes = filteredTareas.filter((t: any) => t.estado === 'pendiente').length;
  const enProgreso = filteredTareas.filter((t: any) => t.estado === 'en_progreso').length;
  const vencidas = filteredTareas.filter((t: any) => t.estado !== 'completada' && t.fechaLimite && new Date(t.fechaLimite) < new Date()).length;

  const kpis: KpiCard[] = [
    { id: 'total-eventos', label: 'Eventos', value: filteredEventos.length, icon: 'CalendarDays' },
    { id: 'total-tareas', label: 'Tareas', value: filteredTareas.length, icon: 'ListTodo' },
    { id: 'tareas-completadas', label: 'Completadas', value: completadas, icon: 'CheckCircle2' },
    { id: 'tareas-vencidas', label: 'Vencidas', value: vencidas, icon: 'AlertCircle' },
  ];

  const charts: ChartSeries[] = [
    {
      id: 'tareas-por-estado',
      title: 'Tareas por estado',
      type: 'donut',
      labels: ['Pendiente', 'En progreso', 'Completada'],
      datasets: [
        { name: 'Tareas', values: [pendientes, enProgreso, completadas], color: '#0c2340' },
      ],
    },
  ];

  const table: TableData = {
    columns: [
      { key: 'titulo', label: 'Título' },
      { key: 'estado', label: 'Estado' },
      { key: 'fechaLimite', label: 'Fecha límite' },
      { key: 'prioridad', label: 'Prioridad' },
    ],
    rows: filteredTareas.slice(0, 10).map((t: any) => ({
      titulo: t.titulo,
      estado: t.estado === 'pendiente' ? 'Pendiente' : t.estado === 'en_progreso' ? 'En progreso' : 'Completada',
      fechaLimite: t.fechaLimite ? new Date(t.fechaLimite).toLocaleDateString('es') : '-',
      prioridad: t.prioridad || '-',
    })),
  };

  return { kpis, charts, table };
}

export function computeAulaTab(
  cursos: any[],
  inscripciones: any[],
  certificados: any[],
  _range: DateRange,
): TabData {
  const activos = cursos.filter((c: any) => c.estado === 'activo').length;
  const borradores = cursos.filter((c: any) => c.estado !== 'activo').length;
  const activeInscripciones = inscripciones.filter((i: any) => i.activo);

  const kpis: KpiCard[] = [
    { id: 'cursos-activos', label: 'Cursos activos', value: activos, icon: 'BookOpen' },
    { id: 'cursos-borrador', label: 'Borradores', value: borradores, icon: 'FileEdit' },
    { id: 'inscripciones', label: 'Inscripciones activas', value: activeInscripciones.length, icon: 'Users' },
    { id: 'certificados', label: 'Certificados emitidos', value: certificados.length, icon: 'Award' },
  ];

  const sortedCursos = [...cursos].sort((a: any, b: any) => (b.aula_inscripcion?.length || 0) - (a.aula_inscripcion?.length || 0));
  const topCursos = sortedCursos.slice(0, 5);

  const charts: ChartSeries[] = [
    {
      id: 'cursos-mas-inscritos',
      title: 'Cursos con más inscripciones',
      type: 'bar',
      labels: topCursos.map((c: any) => (c.titulo?.length > 12 ? c.titulo.substring(0, 10) + '...' : c.titulo || '')),
      datasets: [{ name: 'Inscritos', values: topCursos.map((c: any) => c.aula_inscripcion?.length || 0), color: '#c5a96a' }],
    },
  ];

  const table: TableData = {
    columns: [
      { key: 'titulo', label: 'Curso' },
      { key: 'estado', label: 'Estado' },
      { key: 'inscritos', label: 'Inscritos' },
      { key: 'modulos', label: 'Módulos' },
    ],
    rows: cursos.slice(0, 10).map((c: any) => ({
      titulo: c.titulo,
      estado: c.estado === 'activo' ? 'Activo' : 'Borrador',
      inscritos: c.aula_inscripcion?.length || 0,
      modulos: c.aula_modulo?.length || 0,
    })),
  };

  return { kpis, charts, table };
}

export function computeStatistics(
  _scope: StatisticsScope,
  range: DateRange,
  data: {
    usuarios: any[];
    miembros: any[];
    sedes: any[];
    ministerios: any[];
    roles: { name: string; value: number }[];
    eventos: any[];
    tareas: any[];
    cursos: any[];
    inscripciones: any[];
    certificados: any[];
    miembrosMinisterio: any[];
  },
): StatisticsData {
  return {
    iglesia: computeIglesiaTab(data.usuarios, data.miembros, data.sedes, data.ministerios, data.roles, range),
    ministerios: computeMinisteriosTab(data.ministerios, data.miembrosMinisterio, data.usuarios, range),
    'eventos-tareas': computeEventosTareasTab(data.eventos, data.tareas, range),
    aula: computeAulaTab(data.cursos, data.inscripciones, data.certificados, range),
  };
}
