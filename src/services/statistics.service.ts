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

// Agrupa una lista por una clave y devuelve {name, value} ordenado de mayor a menor.
function groupCount(items: any[], keyFn: (i: any) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  items.forEach((i) => {
    const k = keyFn(i) || 'Sin dato';
    map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

const shorten = (s: string) => (s?.length > 12 ? s.substring(0, 10) + '...' : s || '');

export function computeIglesiaTab(
  usuarios: any[],
  miembros: any[],
  sedes: any[],
  ministerios: any[],
  roles: { name: string; value: number }[],
  range: DateRange,
  variant: 'iglesia' | 'sede' = 'iglesia',
): TabData {
  const filteredUsers = filterByDateRange(usuarios, range);
  const activeUsers = filteredUsers.filter((u) => u.activo);
  const activeSedes = sedes.filter((s: any) => s.estado === 'activa');
  const activeMins = ministerios.filter((m: any) => m.estado === 'activo');

  const kpis: KpiCard[] = variant === 'sede'
    ? [
        { id: 'total-users', label: 'Usuarios de la sede', value: filteredUsers.length, icon: 'Users', sublabel: `${activeUsers.length} activos` },
        { id: 'active-members', label: 'Miembros activos', value: miembros.filter((m: any) => m.activo).length, icon: 'UserCheck' },
        { id: 'active-ministerios', label: 'Ministerios de la sede', value: activeMins.length, icon: 'Settings2' },
      ]
    : [
        { id: 'total-users', label: 'Usuarios totales', value: filteredUsers.length, icon: 'Users', sublabel: `${activeUsers.length} activos` },
        { id: 'active-members', label: 'Miembros activos', value: miembros.filter((m: any) => m.activo).length, icon: 'UserCheck' },
        { id: 'active-sedes', label: 'Sedes activas', value: activeSedes.length, icon: 'Church' },
        { id: 'active-ministerios', label: 'Ministerios activos', value: activeMins.length, icon: 'Settings2' },
      ];

  const inactiveUsers = filteredUsers.length - activeUsers.length;
  const minPorSede = groupCount(ministerios, (m: any) => m.sedeNombre).slice(0, 6);

  const charts: ChartSeries[] = [
    {
      id: 'usuarios-por-rol',
      title: 'Usuarios por rol',
      type: 'donut',
      labels: roles.map((r) => r.name),
      datasets: [{ name: 'Usuarios', values: roles.map((r) => r.value), color: '#1a7fa8' }],
    },
    {
      id: 'usuarios-por-estado',
      title: 'Usuarios por estado',
      type: 'donut',
      labels: ['Activos', 'Inactivos'],
      datasets: [{ name: 'Usuarios', values: [activeUsers.length, inactiveUsers], color: '#2596be' }],
    },
    {
      id: 'ministerios-por-sede',
      title: variant === 'sede' ? 'Ministerios de la sede' : 'Ministerios por sede (top 6)',
      type: 'bar',
      labels: minPorSede.map((m) => shorten(m.name)),
      datasets: [{ name: 'Ministerios', values: minPorSede.map((m) => m.value), color: '#5cbcd6' }],
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
      email: u.correo || '-',
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
  const promedioMiembros = ministerios.length
    ? Math.round(miembrosMinisterio.length / ministerios.length)
    : 0;

  const kpis: KpiCard[] = [
    { id: 'total-ministerios', label: 'Ministerios', value: ministerios.length, icon: 'Settings2', sublabel: `${activeMins.length} activos` },
    { id: 'total-miembros-min', label: 'Miembros en ministerios', value: miembrosMinisterio.length, icon: 'Users' },
    { id: 'promedio-miembros', label: 'Promedio miembros/ministerio', value: promedioMiembros, icon: 'UserCheck' },
  ];

  const sorted = [...ministerios].sort((a: any, b: any) => (b.cantidadMiembros || 0) - (a.cantidadMiembros || 0));
  const top5 = sorted.slice(0, 5);

  const charts: ChartSeries[] = [
    {
      id: 'miembros-por-ministerio',
      title: 'Miembros por ministerio (top 5)',
      type: 'bar',
      labels: top5.map((m: any) => shorten(m.nombre)),
      datasets: [{ name: 'Miembros', values: top5.map((m: any) => m.cantidadMiembros || 0), color: '#2596be' }],
    },
    {
      id: 'ministerios-por-estado',
      title: 'Ministerios por estado',
      type: 'donut',
      labels: ['Activos', 'Inactivos'],
      datasets: [{ name: 'Ministerios', values: [activeMins.length, ministerios.length - activeMins.length], color: '#1a7fa8' }],
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

  const porPrioridad = groupCount(filteredTareas, (t: any) => {
    const p = (t.prioridad || '').toLowerCase();
    if (p === 'alta') return 'Alta';
    if (p === 'media') return 'Media';
    if (p === 'baja') return 'Baja';
    return 'Sin prioridad';
  });
  const porEstadoEvento = groupCount(filteredEventos, (e: any) => {
    const s = (e.estado || '').replace(/_/g, ' ');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Sin estado';
  });

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
    {
      id: 'tareas-por-prioridad',
      title: 'Tareas por prioridad',
      type: 'donut',
      labels: porPrioridad.map((p) => p.name),
      datasets: [{ name: 'Tareas', values: porPrioridad.map((p) => p.value), color: '#e8927c' }],
    },
    {
      id: 'eventos-por-estado',
      title: 'Eventos por estado',
      type: 'bar',
      labels: porEstadoEvento.map((e) => shorten(e.name)),
      datasets: [{ name: 'Eventos', values: porEstadoEvento.map((e) => e.value), color: '#2596be' }],
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

  const inactiveInscripciones = inscripciones.length - activeInscripciones.length;

  const charts: ChartSeries[] = [
    {
      id: 'cursos-mas-inscritos',
      title: 'Cursos con más inscripciones',
      type: 'bar',
      labels: topCursos.map((c: any) => shorten(c.titulo)),
      datasets: [{ name: 'Inscritos', values: topCursos.map((c: any) => c.aula_inscripcion?.length || 0), color: '#c5a96a' }],
    },
    {
      id: 'cursos-por-estado',
      title: 'Cursos por estado',
      type: 'donut',
      labels: ['Activos', 'Borradores'],
      datasets: [{ name: 'Cursos', values: [activos, borradores], color: '#1a7fa8' }],
    },
    {
      id: 'inscripciones-por-estado',
      title: 'Inscripciones por estado',
      type: 'donut',
      labels: ['Activas', 'Inactivas'],
      datasets: [{ name: 'Inscripciones', values: [activeInscripciones.length, inactiveInscripciones], color: '#2596be' }],
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

export function computeGlobalTab(
  iglesias: any[],
  sedes: any[],
  usuarios: any[],
  ministerios: any[],
): TabData {
  const activeIglesias = iglesias.filter((i: any) => i.estado === 'activa');

  const kpis: KpiCard[] = [
    { id: 'total-iglesias', label: 'Iglesias', value: iglesias.length, icon: 'Church', sublabel: `${activeIglesias.length} activas` },
    { id: 'total-sedes', label: 'Sedes', value: sedes.length, icon: 'Building2' },
    { id: 'total-usuarios', label: 'Usuarios', value: usuarios.length, icon: 'Users' },
    { id: 'total-ministerios', label: 'Ministerios', value: ministerios.length, icon: 'Settings2' },
  ];

  // Ministerios por iglesia (usa iglesiaNombre del ministerio enriquecido)
  const minPorIglesia = new Map<string, number>();
  ministerios.forEach((m: any) => {
    const name = m.iglesiaNombre || 'Sin iglesia';
    minPorIglesia.set(name, (minPorIglesia.get(name) || 0) + 1);
  });
  const minEntries = Array.from(minPorIglesia.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const topSedes = [...iglesias]
    .sort((a: any, b: any) => (b.cantidadSedes || 0) - (a.cantidadSedes || 0))
    .slice(0, 6);

  const porDepartamento = groupCount(iglesias, (i: any) => i.departamentoNombre).slice(0, 6);
  const porEstadoIglesia = [
    { name: 'Activas', value: activeIglesias.length },
    { name: 'Inactivas', value: iglesias.length - activeIglesias.length },
  ];

  const charts: ChartSeries[] = [
    {
      id: 'ministerios-por-iglesia',
      title: 'Ministerios por iglesia (top 6)',
      type: 'bar',
      labels: minEntries.map(([name]) => shorten(name)),
      datasets: [{ name: 'Ministerios', values: minEntries.map(([, v]) => v), color: '#1a7fa8' }],
    },
    {
      id: 'sedes-por-iglesia',
      title: 'Sedes por iglesia (top 6)',
      type: 'bar',
      labels: topSedes.map((i: any) => shorten(i.nombre)),
      datasets: [{ name: 'Sedes', values: topSedes.map((i: any) => i.cantidadSedes || 0), color: '#2596be' }],
    },
    {
      id: 'iglesias-por-departamento',
      title: 'Iglesias por departamento',
      type: 'donut',
      labels: porDepartamento.map((d) => d.name),
      datasets: [{ name: 'Iglesias', values: porDepartamento.map((d) => d.value), color: '#5cbcd6' }],
    },
    {
      id: 'iglesias-por-estado',
      title: 'Iglesias por estado',
      type: 'donut',
      labels: porEstadoIglesia.map((d) => d.name),
      datasets: [{ name: 'Iglesias', values: porEstadoIglesia.map((d) => d.value), color: '#1a7fa8' }],
    },
  ];

  const table: TableData = {
    columns: [
      { key: 'nombre', label: 'Iglesia' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'sedes', label: 'Sedes' },
      { key: 'estado', label: 'Estado' },
    ],
    rows: iglesias.slice(0, 15).map((i: any) => ({
      nombre: i.nombre,
      ciudad: i.ciudadNombre || '-',
      sedes: i.cantidadSedes || 0,
      estado: i.estado === 'activa' ? 'Activa' : 'Inactiva',
    })),
  };

  return { kpis, charts, table };
}

export function computePersonalTab(
  misTareas: any[],
  misInscripciones: any[],
  range: DateRange,
): TabData {
  const filteredTareas = filterByDateRange(misTareas, range);
  const completadas = filteredTareas.filter((t: any) => t.estado === 'completada').length;
  const pendientes = filteredTareas.filter((t: any) => t.estado === 'pendiente').length;
  const enProgreso = filteredTareas.filter((t: any) => t.estado === 'en_progreso').length;
  const vencidas = filteredTareas.filter((t: any) => t.estado !== 'completada' && t.fechaLimite && new Date(t.fechaLimite) < new Date()).length;
  const cursosActivos = misInscripciones.filter((i: any) => i.activo).length;

  const porPrioridad = groupCount(filteredTareas, (t: any) => {
    const p = (t.prioridad || '').toLowerCase();
    if (p === 'alta') return 'Alta';
    if (p === 'media') return 'Media';
    if (p === 'baja') return 'Baja';
    return 'Sin prioridad';
  });

  const kpis: KpiCard[] = [
    { id: 'mis-tareas', label: 'Mis tareas', value: filteredTareas.length, icon: 'ListTodo' },
    { id: 'mis-pendientes', label: 'Pendientes', value: pendientes + enProgreso, icon: 'AlertCircle' },
    { id: 'mis-completadas', label: 'Completadas', value: completadas, icon: 'CheckCircle2' },
    { id: 'mis-vencidas', label: 'Vencidas', value: vencidas, icon: 'AlertCircle' },
    { id: 'mis-cursos', label: 'Cursos inscritos', value: cursosActivos, icon: 'BookOpen' },
  ];

  const charts: ChartSeries[] = [
    {
      id: 'mis-tareas-por-estado',
      title: 'Mis tareas por estado',
      type: 'donut',
      labels: ['Pendiente', 'En progreso', 'Completada'],
      datasets: [{ name: 'Tareas', values: [pendientes, enProgreso, completadas], color: '#1a7fa8' }],
    },
    {
      id: 'mis-tareas-por-prioridad',
      title: 'Mis tareas por prioridad',
      type: 'donut',
      labels: porPrioridad.map((p) => p.name),
      datasets: [{ name: 'Tareas', values: porPrioridad.map((p) => p.value), color: '#e8927c' }],
    },
  ];

  const table: TableData = {
    columns: [
      { key: 'titulo', label: 'Tarea' },
      { key: 'estado', label: 'Estado' },
      { key: 'fechaLimite', label: 'Fecha límite' },
    ],
    rows: filteredTareas.slice(0, 10).map((t: any) => ({
      titulo: t.titulo,
      estado: t.estado === 'pendiente' ? 'Pendiente' : t.estado === 'en_progreso' ? 'En progreso' : 'Completada',
      fechaLimite: t.fechaLimite ? new Date(t.fechaLimite).toLocaleDateString('es') : '-',
    })),
  };

  return { kpis, charts, table };
}

export function computeStatistics(
  scope: StatisticsScope,
  range: DateRange,
  data: {
    iglesias: any[];
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
    misTareas: any[];
    misInscripciones: any[];
  },
): StatisticsData {
  return {
    global: computeGlobalTab(data.iglesias, data.sedes, data.usuarios, data.ministerios),
    iglesia: computeIglesiaTab(
      data.usuarios,
      data.miembros.length > 0 ? data.miembros : data.miembrosMinisterio,
      data.sedes,
      data.ministerios,
      data.roles,
      range,
      scope.type === 'sede' ? 'sede' : 'iglesia',
    ),
    ministerios: computeMinisteriosTab(data.ministerios, data.miembrosMinisterio, data.usuarios, range),
    'eventos-tareas': computeEventosTareasTab(data.eventos, data.tareas, range),
    aula: computeAulaTab(data.cursos, data.inscripciones, data.certificados, range),
    personal: computePersonalTab(data.misTareas, data.misInscripciones, range),
  };
}
