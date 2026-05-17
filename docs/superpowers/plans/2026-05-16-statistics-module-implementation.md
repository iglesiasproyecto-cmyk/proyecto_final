# Statistics Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the statistics module with a dedicated page, dashboard summary card, and Excel/PDF export.

**Architecture:** Hybrid incremental - first version computes metrics in a service layer from existing hook data, prepared to migrate to Supabase RPC later without UI changes.

**Tech Stack:** React 18, Recharts (existing), date-fns (existing), xlsx (SheetJS), jspdf + jspdf-autotable, shadcn/ui Tabs, lucide-react

---

### Task 1: Install export dependencies

**Files:**
- Modify: `package.json`
- Run: `npm install`

- [ ] **Run install command**

```bash
npm install xlsx jspdf jspdf-autotable
```

- [ ] **Verify they appear in package.json dependencies**

Run: `grep -E "xlsx|jspdf" package.json` or `rg "xlsx|jspdf" package.json`
Expected: 3 new dependency lines

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add xlsx, jspdf, jspdf-autotable for statistics export"
```

---

### Task 2: Create statistics types

**Files:**
- Create: `src/types/statistics.types.ts`

- [ ] **Create the types file**

```typescript
export type StatisticsDomain = 'iglesia' | 'ministerios' | 'eventos-tareas' | 'aula';

export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface StatisticsScope {
  type: 'global' | 'iglesia' | 'sede' | 'ministerio' | 'personal';
  idIglesia?: number;
  idSede?: number;
  idMinisterio?: number;
  idUsuario?: number;
}

export interface KpiCard {
  id: string;
  label: string;
  value: string | number;
  sublabel?: string;
  icon: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; value: string };
}

export interface ChartSeries {
  id: string;
  title: string;
  type: 'bar' | 'donut';
  labels: string[];
  datasets: { name: string; values: number[]; color: string }[];
}

export interface TableData {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
}

export interface TabData {
  kpis: KpiCard[];
  charts: ChartSeries[];
  table: TableData | null;
}

export interface StatisticsData {
  iglesia: TabData;
  ministerios: TabData;
  'eventos-tareas': TabData;
  aula: TabData;
}

export interface ReportDataset {
  scope: StatisticsScope;
  dateRange: DateRange;
  domain: StatisticsDomain;
  tab: TabData;
  churchName?: string;
  generatedAt: string;
}
```

- [ ] **Commit**

```bash
git add src/types/statistics.types.ts
git commit -m "feat: add statistics types"
```

---

### Task 3: Create statistics data service

**Files:**
- Create: `src/services/statistics.service.ts`

- [ ] **Create service file with computation functions**

```typescript
import type {
  StatisticsScope,
  StatisticsDomain,
  DateRange,
  TabData,
  KpiCard,
  ChartSeries,
  TableData,
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
  const activeSedes = sedes.filter((s) => s.estado === 'activa');
  const activeMins = ministerios.filter((m) => m.estado === 'activo');

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
    {
      id: 'crecimiento-usuarios',
      title: 'Crecimiento mensual',
      type: 'bar',
      labels: [] as string[],
      datasets: [{ name: 'Nuevos', values: [] as number[], color: '#1a7fa8' }],
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
  usuarios: any[],
  range: DateRange,
): TabData {
  const activeMins = ministerios.filter((m) => m.estado === 'activo');

  const miembrosPorMinisterio = activeMins.map((m) => {
    const miembros = Array.isArray(m.miembrosPortal) ? m.miembrosPortal : [];
    return { ...m, miembros };
  });

  const kpis: KpiCard[] = [
    { id: 'total-ministerios', label: 'Ministerios', value: ministerios.length, icon: 'Settings2', sublabel: `${activeMins.length} activos` },
    { id: 'total-miembros-min', label: 'Miembros en ministerios', value: miembrosMinisterio.length, icon: 'Users' },
  ];

  const sorted = [...miembrosPorMinisterio].sort((a, b) => b.cantidadMiembros - a.cantidadMiembros);
  const top5 = sorted.slice(0, 5);

  const charts: ChartSeries[] = [
    {
      id: 'miembros-por-ministerio',
      title: 'Miembros por ministerio (top 5)',
      type: 'bar',
      labels: top5.map((m) => m.nombre?.length > 12 ? m.nombre.substring(0, 10) + '...' : m.nombre || ''),
      datasets: [{ name: 'Miembros', values: top5.map((m) => m.cantidadMiembros || 0), color: '#2596be' }],
    },
  ];

  const table: TableData = {
    columns: [
      { key: 'nombre', label: 'Ministerio' },
      { key: 'miembros', label: 'Miembros' },
      { key: 'lider', label: 'Líder' },
      { key: 'estado', label: 'Estado' },
    ],
    rows: ministerios.map((m) => ({
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

  const completadas = filteredTareas.filter((t) => t.estado === 'completada').length;
  const pendientes = filteredTareas.filter((t) => t.estado === 'pendiente').length;
  const enProgreso = filteredTareas.filter((t) => t.estado === 'en_progreso').length;
  const vencidas = filteredTareas.filter((t) => t.estado !== 'completada' && t.fechaLimite && new Date(t.fechaLimite) < new Date()).length;

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
    {
      id: 'eventos-por-mes',
      title: 'Eventos por periodo',
      type: 'bar',
      labels: [] as string[],
      datasets: [{ name: 'Eventos', values: [] as number[], color: '#5cbcd6' }],
    },
  ];

  const table: TableData = {
    columns: [
      { key: 'titulo', label: 'Título' },
      { key: 'estado', label: 'Estado' },
      { key: 'fechaLimite', label: 'Fecha límite' },
      { key: 'prioridad', label: 'Prioridad' },
    ],
    rows: filteredTareas.slice(0, 10).map((t) => ({
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
  range: DateRange,
): TabData {
  const activos = cursos.filter((c) => c.estado === 'activo').length;
  const borradores = cursos.filter((c) => c.estado !== 'activo').length;
  const activeInscripciones = inscripciones.filter((i) => i.activo);

  const kpis: KpiCard[] = [
    { id: 'cursos-activos', label: 'Cursos activos', value: activos, icon: 'BookOpen' },
    { id: 'cursos-borrador', label: 'Borradores', value: borradores, icon: 'FileEdit' },
    { id: 'inscripciones', label: 'Inscripciones activas', value: activeInscripciones.length, icon: 'Users' },
    { id: 'certificados', label: 'Certificados emitidos', value: certificados.length, icon: 'Award' },
  ];

  const sortedCursos = [...cursos].sort((a, b) => (b.aula_inscripcion?.length || 0) - (a.aula_inscripcion?.length || 0));
  const topCursos = sortedCursos.slice(0, 5);

  const charts: ChartSeries[] = [
    {
      id: 'cursos-mas-inscritos',
      title: 'Cursos con más inscripciones',
      type: 'bar',
      labels: topCursos.map((c) => c.titulo?.length > 12 ? c.titulo.substring(0, 10) + '...' : c.titulo || ''),
      datasets: [{ name: 'Inscritos', values: topCursos.map((c) => c.aula_inscripcion?.length || 0), color: '#c5a96a' }],
    },
  ];

  const table: TableData = {
    columns: [
      { key: 'titulo', label: 'Curso' },
      { key: 'estado', label: 'Estado' },
      { key: 'inscritos', label: 'Inscritos' },
      { key: 'modulos', label: 'Módulos' },
    ],
    rows: cursos.slice(0, 10).map((c) => ({
      titulo: c.titulo,
      estado: c.estado === 'activo' ? 'Activo' : 'Borrador',
      inscritos: c.aula_inscripcion?.length || 0,
      modulos: c.aula_modulo?.length || 0,
    })),
  };

  return { kpis, charts, table };
}

export function computeStatistics(
  scope: StatisticsScope,
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
): Record<StatisticsDomain, TabData> {
  return {
    iglesia: computeIglesiaTab(data.usuarios, data.miembros, data.sedes, data.ministerios, data.roles, range),
    ministerios: computeMinisteriosTab(data.ministerios, data.miembrosMinisterio, data.usuarios, range),
    'eventos-tareas': computeEventosTareasTab(data.eventos, data.tareas, range),
    aula: computeAulaTab(data.cursos, data.inscripciones, data.certificados, range),
  };
}
```

- [ ] **Commit**

```bash
git add src/services/statistics.service.ts
git commit -m "feat: add statistics computation service"
```

---

### Task 4: Create useStatistics hook

**Files:**
- Create: `src/hooks/useStatistics.ts`

- [ ] **Create the hook file**

```typescript
import { useMemo } from 'react';
import { useApp } from '@/app/store/AppContext';
import { useUsuarios, useUsuariosEnriquecidos } from '@/hooks/useUsuarios';
import { useIglesias, useSedes, useSedesEnriquecidas } from '@/hooks/useIglesias';
import { useEventos, useTareas } from '@/hooks/useEventos';
import { useMinisterios, useMiembrosMinisterio } from '@/hooks/useMinisterios';
import { useCursos } from '@/hooks/useCursos';
import type { StatisticsScope, DateRange, StatisticsDomain, TabData } from '@/types/statistics.types';
import { computeStatistics } from '@/services/statistics.service';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

function getDefaultDateRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return { start, end: now.toISOString() };
}

export function useStatistics(domain?: StatisticsDomain, dateRange?: DateRange) {
  const { usuarioActual, rolActual, iglesiaActual } = useApp();
  const range = dateRange ?? getDefaultDateRange();

  const scope = useMemo<StatisticsScope>(() => {
    switch (rolActual) {
      case 'super_admin':
        return { type: 'global' };
      case 'admin_iglesia':
        return { type: 'iglesia', idIglesia: iglesiaActual?.id };
      case 'admin_sede':
        return { type: 'sede', idIglesia: iglesiaActual?.id };
      case 'lider':
      case 'servidor':
        return { type: 'personal', idIglesia: iglesiaActual?.id, idUsuario: usuarioActual?.idUsuario };
      default:
        return { type: 'global' };
    }
  }, [rolActual, iglesiaActual, usuarioActual]);

  const { data: usuarios = [] } = useUsuarios();
  const { data: enrichedUsuarios = [] } = useUsuariosEnriquecidos();
  const { data: sedes = [] } = useSedes();
  const { data: eventos = [] } = useEventos(scope.idIglesia);
  const { data: tareas = [] } = useTareas(scope.idIglesia);
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
    enrichedUsuarios.forEach((u) => {
      u.roleNames.forEach((rn: any) => {
        const name = rn.rolNombre || 'Sin rol';
        map.set(name, (map.get(name) || 0) + 1);
      });
    });
    const withoutRole = enrichedUsuarios.filter((u) => u.roleNames.length === 0).length;
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

  const allData = useMemo(() => computeStatistics(scope, range, rawData), [scope, range, rawData]);

  const filtered = domain ? { [domain]: allData[domain] } : allData;

  return {
    data: allData,
    tabData: domain ? allData[domain] : null,
    domain,
    scope,
    dateRange: range,
    isReady: !!usuarioActual,
  };
}
```

- [ ] **Commit**

```bash
git add src/hooks/useStatistics.ts
git commit -m "feat: add useStatistics hook"
```

---

### Task 5: Create export service

**Files:**
- Create: `src/services/statisticsExport.service.ts`

- [ ] **Create the export service**

```typescript
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportDataset, TabData, KpiCard, ChartSeries } from '@/types/statistics.types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function generateExcel(dataset: ReportDataset): Promise<Blob> {
  const wb = XLSX.utils.book_new();
  const tab = dataset.tab;

  // Sheet 1: KPIs
  const kpiRows = tab.kpis.map((k) => [k.label, k.value, k.sublabel || '']);
  const kpiSheet = XLSX.utils.aoa_to_sheet([
    [`Reporte - ${dataset.domain}`, '', ''],
    [`Generado: ${formatDate(dataset.generatedAt)}`, '', ''],
    ['', '', ''],
    ['Indicador', 'Valor', 'Detalle'],
    ...kpiRows,
  ]);
  XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');

  // Sheet 2: Tabla
  if (tab.table) {
    const header = tab.table.columns.map((c) => c.label);
    const rows = tab.table.rows.map((r) => tab.table!.columns.map((c) => r[c.key] ?? ''));
    const dataSheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, dataSheet, 'Detalle');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

async function generatePDF(dataset: ReportDataset): Promise<Blob> {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const tab = dataset.tab;
  const pageW = 190;
  const margin = 10;

  // Cover
  doc.setFontSize(24);
  doc.text('Reporte Ejecutivo', margin, 30);
  doc.setFontSize(12);
  doc.text(`IGLESIABD`, margin, 40);
  doc.setFontSize(10);
  doc.text(`Seccion: ${dataset.domain === 'iglesia' ? 'Iglesia' : dataset.domain === 'ministerios' ? 'Ministerios' : dataset.domain === 'eventos-tareas' ? 'Eventos y Tareas' : 'Aula'}`, margin, 50);
  if (dataset.churchName) doc.text(`Iglesia: ${dataset.churchName}`, margin, 57);
  doc.text(`Generado: ${formatDate(dataset.generatedAt)}`, margin, 64);

  const startDate = dataset.dateRange.start ? formatDate(dataset.dateRange.start) : 'Inicio';
  const endDate = dataset.dateRange.end ? formatDate(dataset.dateRange.end) : 'Hoy';
  doc.text(`Periodo: ${startDate} - ${endDate}`, margin, 71);

  doc.line(margin, 80, pageW + margin, 80);

  // KPIs section
  let yPos = 90;
  doc.setFontSize(14);
  doc.text('Indicadores Clave', margin, yPos);
  yPos += 10;

  const kpiRows = tab.kpis.map((k) => [k.label, String(k.value), k.sublabel || '']);
  autoTable(doc, {
    startY: yPos,
    head: [['Indicador', 'Valor', 'Detalle']],
    body: kpiRows,
    theme: 'grid',
    headStyles: { fillColor: [26, 127, 168] },
    styles: { fontSize: 9 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Tabla detalle
  if (tab.table && tab.table.rows.length > 0) {
    const header = tab.table.columns.map((c) => c.label);
    const body = tab.table.rows.map((r) => tab.table!.columns.map((c) => String(r[c.key] ?? '')));
    autoTable(doc, {
      startY: yPos,
      head: [header],
      body,
      theme: 'striped',
      headStyles: { fillColor: [26, 127, 168] },
      styles: { fontSize: 8 },
    });
  }

  return doc.output('blob');
}

export async function downloadReport(dataset: ReportDataset, format: 'xlsx' | 'pdf', filename?: string): Promise<void> {
  const blob = format === 'xlsx' ? await generateExcel(dataset) : await generatePDF(dataset);
  const ext = format === 'xlsx' ? 'xlsx' : 'pdf';
  const name = filename || `estadisticas-${dataset.domain}-${new Date().toISOString().split('T')[0]}.${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { generateExcel, generatePDF };
```

- [ ] **Commit**

```bash
git add src/services/statisticsExport.service.ts
git commit -m "feat: add statistics export service (Excel + PDF)"
```

---

### Task 6: Create StatisticsPage component

**Files:**
- Create: `src/app/components/StatisticsPage.tsx`

- [ ] **Create the page component** (this is the main page with tabs, KPIs, charts and export)

```tsx
import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useApp } from '@/app/store/AppContext';
import { useStatistics } from '@/hooks/useStatistics';
import { downloadReport } from '@/services/statisticsExport.service';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { SimpleBarChart, SimpleDonutChart } from '@/app/components/SimpleCharts';
import {
  Building2, Users, UserCheck, Church, Settings2, CalendarDays, ListTodo,
  CheckCircle2, AlertCircle, BookOpen, FileEdit, Award,
  Download, FileSpreadsheet, FileText, TrendingUp,
} from 'lucide-react';
import type { StatisticsDomain, StatisticsData, TabData } from '@/types/statistics.types';

const CHART_COLORS = ['#1a7fa8', '#2596be', '#0c2340', '#5cbcd6', '#c5a96a', '#e8927c'];

const domainLabels: Record<StatisticsDomain, string> = {
  iglesia: 'Iglesia',
  ministerios: 'Ministerios',
  'eventos-tareas': 'Eventos y Tareas',
  aula: 'Aula',
};

const domainIcons: Record<StatisticsDomain, React.ReactNode> = {
  iglesia: <Building2 className="w-4 h-4" />,
  ministerios: <Settings2 className="w-4 h-4" />,
  'eventos-tareas': <CalendarDays className="w-4 h-4" />,
  aula: <BookOpen className="w-4 h-4" />,
};

function KpiCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-4 dark:border-white/10 dark:bg-card/20">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
      <div className="relative z-10 flex justify-between items-start mb-3">
        <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg text-white">
          {icon}
        </div>
        {sublabel && (
          <Badge variant="secondary" className="bg-primary/10 text-primary dark:bg-primary/20 border-0 text-[10px] py-0">{sublabel}</Badge>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-3xl sm:text-4xl font-light tracking-tight text-foreground">{value}</p>
        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-4 dark:border-white/10 dark:bg-card/20 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
      <div className="relative z-10">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-3">
          <TrendingUp className="w-4 h-4 text-primary/80" />
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

function TabContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

function TabRenderer({ data }: { data: TabData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.kpis.map((kpi) => (
          <motion.div key={kpi.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <KpiCard
              icon={(() => {
                switch (kpi.icon) {
                  case 'Users': return <Users className="w-5 h-5" />;
                  case 'UserCheck': return <UserCheck className="w-5 h-5" />;
                  case 'Church': return <Church className="w-5 h-5" />;
                  case 'Settings2': return <Settings2 className="w-5 h-5" />;
                  case 'CalendarDays': return <CalendarDays className="w-5 h-5" />;
                  case 'ListTodo': return <ListTodo className="w-5 h-5" />;
                  case 'CheckCircle2': return <CheckCircle2 className="w-5 h-5" />;
                  case 'AlertCircle': return <AlertCircle className="w-5 h-5" />;
                  case 'BookOpen': return <BookOpen className="w-5 h-5" />;
                  case 'FileEdit': return <FileEdit className="w-5 h-5" />;
                  case 'Award': return <Award className="w-5 h-5" />;
                  default: return <Building2 className="w-5 h-5" />;
                }
              })()}
              label={kpi.label}
              value={kpi.value}
              sublabel={kpi.sublabel}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.charts.map((chart) => (
          <ChartCard key={chart.id} title={chart.title}>
            {chart.type === 'bar' ? (
              <SimpleBarChart
                data={chart.labels.map((label, i) => ({
                  label,
                  values: chart.datasets.map((ds) => ({
                    value: ds.values[i] || 0,
                    color: ds.color || CHART_COLORS[i % CHART_COLORS.length],
                    name: ds.name,
                  })),
                }))}
                height={200}
              />
            ) : (
              <div className="flex justify-center">
                <SimpleDonutChart
                  data={chart.labels.map((label, i) => ({
                    name: label,
                    value: chart.datasets[0]?.values[i] || 0,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                  }))}
                  size={160}
                  thickness={25}
                />
              </div>
            )}
          </ChartCard>
        ))}
      </div>

      {data.table && data.table.rows.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:border-white/10 dark:bg-card/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {data.table.columns.map((col) => (
                    <th key={col.key} className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.table.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    {data.table!.columns.map((col) => (
                      <td key={col.key} className="p-3 text-[13px] text-foreground/80">{String(row[col.key] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function StatisticsPage() {
  const { iglesiaActual } = useApp();
  const [activeDomain, setActiveDomain] = useState<StatisticsDomain>('iglesia');
  const { data: allData, scope, dateRange, isReady } = useStatistics(activeDomain);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const handleExport = useCallback(async (format: 'xlsx' | 'pdf') => {
    if (!allData) return;
    setExporting(format);
    try {
      await downloadReport({
        scope,
        dateRange,
        domain: activeDomain,
        tab: allData[activeDomain],
        churchName: iglesiaActual?.nombre,
        generatedAt: new Date().toISOString(),
      }, format);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(null);
    }
  }, [allData, scope, dateRange, activeDomain, iglesiaActual]);

  if (!isReady) return <TabContentSkeleton />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-[#4682b4]/20 shrink-0 text-white">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-0.5">
              S.E.I. {iglesiaActual ? `— ${iglesiaActual.nombre}` : '— Global'}
            </p>
            <h1 className="text-4xl font-light tracking-tight text-foreground leading-tight">Estadísticas</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            disabled={exporting !== null}
            onClick={() => handleExport('xlsx')}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === 'xlsx' ? 'Exportando...' : 'Excel'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            disabled={exporting !== null}
            onClick={() => handleExport('pdf')}
          >
            <FileText className="w-4 h-4" />
            {exporting === 'pdf' ? 'Exportando...' : 'PDF'}
          </Button>
        </div>
      </motion.div>

      <Tabs value={activeDomain} onValueChange={(v) => setActiveDomain(v as StatisticsDomain)}>
        <TabsList className="mb-4">
          {(Object.keys(domainLabels) as StatisticsDomain[]).map((d) => (
            <TabsTrigger key={d} value={d} className="gap-2 rounded-xl">
              {domainIcons[d]}
              {domainLabels[d]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(domainLabels) as StatisticsDomain[]).map((d) => (
          <TabsContent key={d} value={d}>
            {allData ? <TabRenderer data={allData[d]} /> : <TabContentSkeleton />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default StatisticsPage;
```

- [ ] **Commit**

```bash
git add src/app/components/StatisticsPage.tsx
git commit -m "feat: add StatisticsPage component with tabs, KPIs, charts and export"
```

---

### Task 7: Create StatisticsSummaryCard for dashboards

**Files:**
- Create: `src/app/components/StatisticsSummaryCard.tsx`

- [ ] **Create the summary card**

```tsx
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface StatisticsSummaryCardProps {
  statsPath: string;
  index?: number;
  compact?: boolean;
}

export function StatisticsSummaryCard({ statsPath, index = 0, compact = false }: StatisticsSummaryCardProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <Button
        variant="outline"
        className="h-full w-full rounded-2xl border border-border/50 bg-card/40 backdrop-blur-2xl hover:bg-card/60 hover:-translate-y-1 transition-all gap-3 p-4 flex items-center justify-between shadow-sm"
        onClick={() => navigate(statsPath)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Estadísticas</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ver análisis completo</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="h-full"
    >
      <div
        className="h-full relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 dark:border-white/10 dark:bg-card/20 cursor-pointer hover:shadow-lg hover:bg-card/60 hover:-translate-y-1 p-4 group"
        onClick={() => navigate(statsPath)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-[48px] h-[48px] rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-foreground">Estadísticas</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Métricas detalladas de iglesia, ministerios, eventos y aula</p>
          </div>
          <ArrowRight className="w-5 h-5 text-primary/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Commit**

```bash
git add src/app/components/StatisticsSummaryCard.tsx
git commit -m "feat: add StatisticsSummaryCard dashboard widget"
```

---

### Task 8: Add routes for statistics page

**Files:**
- Modify: `src/app/routes.ts`

- [ ] **Import StatisticsPage and add routes**

Edit `src/app/routes.ts`:

Add import at top (after existing imports):
```typescript
import { StatisticsPage } from "./components/StatisticsPage";
```

Add route inside `GlobalLayout` children (after `administrador`):
```typescript
{ path: "estadisticas", Component: StatisticsPage, ErrorBoundary: ErrorPage },
```

Add route inside `TenantLayout` children (after `cumpleanos`):
```typescript
{ path: "estadisticas", Component: StatisticsPage, ErrorBoundary: ErrorPage },
```

- [ ] **Commit**

```bash
git add src/app/routes.ts
git commit -m "feat: add statistics routes to global and tenant layouts"
```

---

### Task 9: Add nav items for statistics in AppLayout

**Files:**
- Modify: `src/app/components/AppLayout.tsx`

- [ ] **Add `BarChart3` to imports and add "Estadísticas" nav items for all roles**

Edit `src/app/components/AppLayout.tsx`:

Add `BarChart3` to lucide-react import (line 10-15):
```typescript
import {
  Church, LayoutDashboard, Building2, Users, CalendarDays, ListTodo,
  Bell, User, LogOut, Menu, X, ChevronDown,
  Settings, FolderHeart, Globe, UserCheck, Settings2,
  PanelLeftClose, PanelLeftOpen, Moon, Sun, BookOpen, Cake, BarChart3
} from "lucide-react";
```

Add nav items in each role's `getNavItemsForRole`:

For `super_admin` (after Geografía):
```typescript
{ label: "Estadísticas", path: "/app/global/estadisticas", icon: <BarChart3 className="w-5 h-5" />, section: "Gestión Global" },
```

For `admin_iglesia` (after Tareas):
```typescript
{ label: "Estadísticas", path: `${t}/estadisticas`, icon: <BarChart3 className="w-5 h-5" />, section: "Operaciones" },
```

For `lider` (after Tareas):
```typescript
{ label: "Estadísticas", path: `${t}/estadisticas`, icon: <BarChart3 className="w-5 h-5" />, section: "Operaciones" },
```

For `admin_sede` (after Tareas):
```typescript
{ label: "Estadísticas", path: `${t}/estadisticas`, icon: <BarChart3 className="w-5 h-5" />, section: "Operaciones" },
```

For `servidor` (after Aula):
```typescript
{ label: "Estadísticas", path: `${t}/estadisticas`, icon: <BarChart3 className="w-5 h-5" />, section: "Operaciones" },
```

- [ ] **Commit**

```bash
git add src/app/components/AppLayout.tsx
git commit -m "feat: add Estadisticas nav items to all roles"
```

---

### Task 10: Integrate StatisticsSummaryCard into dashboards

**Files:**
- Modify: `src/app/components/DashboardPage.tsx`

- [ ] **Import StatisticsSummaryCard**

Add import at top of `DashboardPage.tsx`:
```typescript
import { StatisticsSummaryCard } from "./StatisticsSummaryCard";
```

- [ ] **Add summary card to each role dashboard**

For `SuperAdminDashboard` (after the first StatCards grid, around line 199):
```tsx
<div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
  <StatisticsSummaryCard statsPath="/app/global/estadisticas" index={4} />
</div>
```
(Replace the lg:grid-cols-4 with appropriate sizing)

For `AdminIglesiaDashboard` (after first StatCards grid):
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
  <StatisticsSummaryCard statsPath={`${basePath}/estadisticas`} index={4} />
</div>
```

For `AdminSedeDashboard` (after first KPIs):
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatisticsSummaryCard statsPath={`${basePath}/estadisticas`} index={4} compact />
</div>
```

For `LiderDashboard` (after first StatCards):
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
  <StatisticsSummaryCard statsPath={`${basePath}/estadisticas`} index={4} />
</div>
```

For `ServidorDashboard` (after first StatCards):
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
  <StatisticsSummaryCard statsPath={`${basePath}/estadisticas`} index={4} />
</div>
```

- [ ] **Commit**

```bash
git add src/app/components/DashboardPage.tsx
git commit -m "feat: integrate StatisticsSummaryCard into all role dashboards"
```

---

### Task 11: Add date range filter to StatisticsPage

**Files:**
- Modify: `src/app/components/StatisticsPage.tsx`

- [ ] **Add date range selector with presets**

Add import for `CalendarDays` to existing lucide imports.

Add this state and handler before the `handleExport` function:

```typescript
import { format as formatDateFns } from 'date-fns';

const datePresets = [
  { label: 'Este mes', range: () => { const now = new Date(); return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: now.toISOString() }; } },
  { label: 'Últimos 3 meses', range: () => { const now = new Date(); const start = new Date(now); start.setMonth(start.getMonth() - 3); return { start: start.toISOString(), end: now.toISOString() }; } },
  { label: 'Últimos 12 meses', range: () => { const now = new Date(); const start = new Date(now); start.setFullYear(start.getFullYear() - 1); return { start: start.toISOString(), end: now.toISOString() }; } },
  { label: 'Todo', range: () => ({ start: null, end: null }) },
];

function DateRangeSelector({ value, onChange }: { value: string; onChange: (preset: string, range: { start: string | null; end: string | null }) => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/50 rounded-xl p-1 border border-border/30">
      <CalendarDays className="w-4 h-4 text-muted-foreground ml-2" />
      {datePresets.map((p) => (
        <button
          key={p.label}
          onClick={() => onChange(p.label, p.range())}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all uppercase tracking-widest ${
            value === p.label
              ? 'bg-card text-foreground shadow-sm border border-border/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

Update `StatisticsPage` to use it:

```typescript
export function StatisticsPage() {
  const { iglesiaActual } = useApp();
  const [activeDomain, setActiveDomain] = useState<StatisticsDomain>('iglesia');
  const [activePreset, setActivePreset] = useState('Este mes');
  const [dateRange, setDateRange] = useState(() => datePresets[0].range());

  const { data: allData, scope, isReady } = useStatistics(activeDomain, dateRange);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const handlePresetChange = useCallback((label: string, range: { start: string | null; end: string | null }) => {
    setActivePreset(label);
    setDateRange(range);
  }, []);
  
  // ... rest stays the same
```

Add the `DateRangeSelector` in the header next to the title area (before the export buttons):

```tsx
<DateRangeSelector value={activePreset} onChange={handlePresetChange} />
```

- [ ] **Commit**

```bash
git add src/app/components/StatisticsPage.tsx
git commit -m "feat: add date range filter presets to statistics page"
```

---

### Task 12: Build verification

- [ ] **Run production build**

Run: `npm run build`
Expected: Build succeeds without errors.

- [ ] **Fix any build errors** if they appear and re-run.

- [ ] **Final commit** if fixes were needed.

```bash
git add -A
git commit -m "fix: resolve build errors"
```
