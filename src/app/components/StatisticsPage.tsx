import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  FileSpreadsheet, FileText, TrendingUp, CalendarDays as CalendarDaysIcon
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
  iglesia: <Building2 className="w-4 h-4 text-sky-500/80" />,
  ministerios: <Settings2 className="w-4 h-4 text-violet-500/80" />,
  'eventos-tareas': <CalendarDays className="w-4 h-4 text-amber-500/80" />,
  aula: <BookOpen className="w-4 h-4 text-emerald-500/80" />,
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
    <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
      <CalendarDaysIcon className="w-4 h-4 text-[#1a7fa8] dark:text-[#5cbcd6] ml-2 shrink-0 mr-1.5" />
      {datePresets.map((p) => (
        <button
          key={p.label}
          onClick={() => onChange(p.label, p.range())}
          className={`px-3.5 py-2 text-[10px] font-black rounded-xl transition-all duration-300 uppercase tracking-widest border ${
            value === p.label
              ? 'bg-white dark:bg-slate-900 text-primary dark:text-white border-slate-200/60 dark:border-slate-800/80 shadow-md hover:scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white border-transparent hover:bg-white/50 dark:hover:bg-slate-800/30'
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
    <div className="relative overflow-hidden rounded-2xl bg-card/45 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 dark:border-white/10 dark:bg-card/20 flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group hover:border-border/80">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
      
      <div className="relative z-10 flex justify-between items-start mb-3">
        <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-[#1a7fa8] to-[#0c2340] flex items-center justify-center shadow-lg text-white shrink-0 group-hover:scale-105 transition-transform duration-500">
          {icon}
        </div>
        {sublabel && (
          <Badge variant="secondary" className="bg-[#1a7fa8]/10 text-[#1a7fa8] border border-[#1a7fa8]/10 text-[9px] font-black uppercase tracking-wider py-0.5 px-2">
            {sublabel}
          </Badge>
        )}
      </div>

      <div className="relative z-10 mt-2">
        <p className="text-3xl sm:text-4xl font-light tracking-tight text-foreground leading-none">{value}</p>
        <p className="text-[10px] font-bold text-muted-foreground mt-2.5 uppercase tracking-widest truncate">{label}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-card/45 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 dark:border-white/10 dark:bg-card/20 hover:border-border/80 transition-all duration-300 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
      <div className="relative z-10">
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1a7fa8] mb-4">
          <TrendingUp className="w-4 h-4" />
          {title}
        </h3>
        <div className="min-h-[220px] flex items-center justify-center w-full">
          {children}
        </div>
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div className="flex justify-center w-full">
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
        <div className="relative overflow-hidden rounded-2xl bg-card/45 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:border-white/10 dark:bg-card/20 hover:border-border/80 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  {data.table.columns.map((col) => (
                    <th key={col.key} className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {data.table.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/10 transition-colors">
                    {data.table!.columns.map((col) => (
                      <td key={col.key} className="p-4 text-xs font-semibold text-foreground/80">{String(row[col.key] ?? '')}</td>
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* ── Breathtaking Minimal & Clean Page Header (Matching Lumen Design) ── */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-0.5">Métricas</p>
            <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-foreground leading-tight">Estadísticas</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              Analiza el crecimiento, participación y métricas clave de tu comunidad en {iglesiaActual?.nombre || 'Lumen'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeSelector value={activePreset} onChange={handlePresetChange} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2 h-10 px-4 text-xs font-bold uppercase tracking-wider bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300"
              disabled={exporting !== null}
              onClick={() => handleExport('xlsx')}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              {exporting === 'xlsx' ? 'Exportando...' : 'Excel'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2 h-10 px-4 text-xs font-bold uppercase tracking-wider bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-rose-500/50 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-300"
              disabled={exporting !== null}
              onClick={() => handleExport('pdf')}
            >
              <FileText className="w-4 h-4 text-rose-500" />
              {exporting === 'pdf' ? 'Exportando...' : 'PDF'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Tabs Navigation with unified styles ── */}
      <Tabs value={activeDomain} onValueChange={(v) => setActiveDomain(v as StatisticsDomain)}>
        <TabsList className="bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-1.5 mb-6 flex flex-wrap gap-1 h-auto max-w-fit shadow-sm">
          {(Object.keys(domainLabels) as StatisticsDomain[]).map((d) => (
            <TabsTrigger 
              key={d} 
              value={d} 
              className="gap-2.5 rounded-xl text-xs font-bold uppercase tracking-wider py-2.5 px-4.5 transition-all duration-300 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/30 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary dark:data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-slate-200/60 dark:data-[state=active]:border-slate-800/80 hover:scale-[1.02]"
            >
              {domainIcons[d]}
              {domainLabels[d]}
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          {(Object.keys(domainLabels) as StatisticsDomain[]).map((d) => (
            <TabsContent key={d} value={d}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {allData ? <TabRenderer data={allData[d]} /> : <TabContentSkeleton />}
              </motion.div>
            </TabsContent>
          ))}
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

export default StatisticsPage;
