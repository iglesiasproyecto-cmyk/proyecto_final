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
  FileSpreadsheet, FileText, TrendingUp, CalendarDays as CalendarDaysIcon,
} from 'lucide-react';
import type { StatisticsDomain, StatisticsData, TabData, DateRange } from '@/types/statistics.types';

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

const datePresets = [
  {
    label: 'Este mes',
    range: () => { const now = new Date(); return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: now.toISOString() }; },
  },
  {
    label: 'Últimos 3 meses',
    range: () => { const now = new Date(); const start = new Date(now); start.setMonth(start.getMonth() - 3); return { start: start.toISOString(), end: now.toISOString() }; },
  },
  {
    label: 'Últimos 12 meses',
    range: () => { const now = new Date(); const start = new Date(now); start.setFullYear(start.getFullYear() - 1); return { start: start.toISOString(), end: now.toISOString() }; },
  },
  {
    label: 'Todo',
    range: () => ({ start: null, end: null }),
  },
];

function DateRangeSelector({ value, onChange }: { value: string; onChange: (label: string, range: { start: string | null; end: string | null }) => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/50 rounded-xl p-1 border border-border/30">
      <CalendarDaysIcon className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
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

function iconFromName(name: string): React.ReactNode {
  switch (name) {
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
}

function TabRenderer({ data }: { data: TabData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.kpis.map((kpi) => (
          <motion.div key={kpi.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <KpiCard
              icon={iconFromName(kpi.icon)}
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
  const [activePreset, setActivePreset] = useState('Este mes');
  const [dateRange, setDateRange] = useState<DateRange>(() => datePresets[0].range());

  const { data: allData, scope, isReady } = useStatistics(activeDomain, dateRange);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const handlePresetChange = useCallback((label: string, range: { start: string | null; end: string | null }) => {
    setActivePreset(label);
    setDateRange(range);
  }, []);

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
              Lumen {iglesiaActual ? `— ${iglesiaActual.nombre}` : '— Global'}
            </p>
            <h1 className="text-4xl font-light tracking-tight text-foreground leading-tight">Estadísticas</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeSelector value={activePreset} onChange={handlePresetChange} />
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
