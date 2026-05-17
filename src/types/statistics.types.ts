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

export type StatisticsData = Record<StatisticsDomain, TabData>;

export interface ReportDataset {
  scope: StatisticsScope;
  dateRange: DateRange;
  domain: StatisticsDomain;
  tab: TabData;
  churchName?: string;
  generatedAt: string;
}
