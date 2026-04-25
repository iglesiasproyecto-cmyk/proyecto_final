import { useState } from "react";
import { useEvaluacionesEnriquecidas, useDeleteEvaluacion, useCreateEvaluacion, useUpdateEvaluacion, useCursos } from "@/hooks/useCursos";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { 
  ChevronRight, Calendar, Star, BookOpen, AlertCircle, CheckCircle2,
  Trophy, Target, Zap, Plus, Filter, Pencil, Trash2, TrendingUp, ClipboardCheck,
  User, BarChart3, GraduationCap, Building2, Users, Search
} from "lucide-react";
import { AnimatedCard } from "./ui/AnimatedCard";
import { SimpleBarChart, SimpleDonutChart } from "./SimpleCharts";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  RadialBarChart, RadialBar, Legend, PieChart, Pie
} from 'recharts';

const estadoEvalConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-500/10 text-amber-500 border-amber-500/20",   icon: AlertCircle },
  aprobado:    { label: "Aprobado",    color: "bg-primary/10 text-primary border-primary/20",         icon: CheckCircle2 },
  reprobado:   { label: "Reprobado",   color: "bg-rose-500/10 text-rose-500 border-rose-500/20",      icon: XCircle },
  en_revision: { label: "En Revisión", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",      icon: Clock },
};

function XCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
  );
}

function Clock(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>;
}

export function EvaluationsPage() {
  const { usuarioActual, rolActual } = useApp();
  const { data: evaluaciones = [], isLoading, error } = useEvaluacionesEnriquecidas();
  const { data: cursos = [] } = useCursos();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [cursoFilter, setCursoFilter] = useState("all");
  const [editTarget, setEditTarget] = useState<{ id: number; calificacion: string; estado: string; observaciones: string } | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [createForm, setCreateForm] = useState({ idModulo: 0, calificacion: "", estado: "pendiente" as string, observaciones: "", fechaEvaluacion: "" });

  const resetCreateForm = () => setCreateForm({ idModulo: 0, calificacion: "", estado: "pendiente", observaciones: "", fechaEvaluacion: "" });
  const canManageEvaluaciones =
    rolActual === "super_admin" || rolActual === "lider";

  const deleteEvaluacionMutation = useDeleteEvaluacion();
  const createEvaluacionMutation = useCreateEvaluacion();
  const updateEvaluacionMutation = useUpdateEvaluacion();

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm tracking-widest uppercase text-[10px] font-bold">Obteniendo Resultados...</span>
      </div>
    </div>
  );

  if (error) {
    console.error('Error loading evaluations:', error);
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-lg">⚠️</span>
          </div>
          <p className="text-sm font-medium">Error al cargar evaluaciones</p>
          <p className="text-xs">Verifica que tengas permisos para gestionar evaluaciones</p>
        </div>
      </div>
    );
  }

  const uniqueCursos = [...new Set(evaluaciones.map((e) => e.cursoNombre).filter(Boolean))] as string[];

  const filtered = evaluaciones.filter((ev) => {
    return cursoFilter === "all" || ev.cursoNombre === cursoFilter;
  });

  const avgCal = evaluaciones.filter((e) => e.calificacion !== null).length > 0
    ? evaluaciones.filter((e) => e.calificacion !== null).reduce((sum, e) => sum + (e.calificacion || 0), 0) / evaluaciones.filter((e) => e.calificacion !== null).length
    : 0;

  const getCalColor = (cal: number | null) => {
    if (cal === null) return "text-muted-foreground";
    return cal >= 80 ? "text-primary" : cal >= 60 ? "text-amber-500" : "text-rose-500";
  };

  const handleDelete = () => {
    if (!canManageEvaluaciones) return;
    if (!deleteTarget) return;
    deleteEvaluacionMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleCreate = () => {
    if (!canManageEvaluaciones) return;
    if (!createForm.idModulo || !usuarioActual) return;
    createEvaluacionMutation.mutate(
      {
        idModulo: createForm.idModulo,
        idUsuario: usuarioActual.idUsuario,
        calificacion: createForm.calificacion ? Number(createForm.calificacion) : null,
        estado: createForm.estado as any,
        observaciones: createForm.observaciones.trim() || null,
        fechaEvaluacion: createForm.fechaEvaluacion || null,
      },
      { onSuccess: () => { setShowCreate(false); resetCreateForm(); } }
    );
  };

  const handleUpdate = () => {
    if (!canManageEvaluaciones) return;
    if (!editTarget) return;
    updateEvaluacionMutation.mutate(
      {
        id: editTarget.id,
        data: {
          calificacion: editTarget.calificacion ? Number(editTarget.calificacion) : null,
          estado: editTarget.estado as any,
          observaciones: editTarget.observaciones.trim() || null,
        },
      },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  const moduleOptions = cursos.flatMap(c =>
    (c.modulos || []).map(m => ({ idModulo: m.idModulo, label: `${c.nombre} — ${m.titulo}` }))
  );

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header Panorámico */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-48 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg shadow-blue-900/30">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none mb-2">
              Panel de Evaluaciones
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium">Control académico y seguimiento de resultados</p>
          </div>
        </div>
        {canManageEvaluaciones ? (
          <Button 
            onClick={() => setShowCreate(true)} 
            className="h-11 rounded-2xl font-bold uppercase tracking-widest text-[10px] shrink-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Nueva Evaluación
          </Button>
        ) : (
          <Badge variant="outline" className="h-11 px-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20">
            Modo Lectura
          </Badge>
        )}
      </motion.div>

      {/* Stats Bento Grid Enhanced */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedCard index={0} className="p-5">
           <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                 <Trophy className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border-0">Logro</Badge>
           </div>
           <p className={`text-3xl font-black ${getCalColor(avgCal)}`}>{avgCal > 0 ? avgCal.toFixed(1) : "—"}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Promedio General</p>
        </AnimatedCard>

        <AnimatedCard index={1} className="p-5">
           <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg">
                 <Target className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border-0">Meta</Badge>
           </div>
           <p className="text-3xl font-black text-foreground">
             {evaluaciones.filter(e => e.calificacion && e.calificacion >= 80).length}
           </p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Módulos Excelentes</p>
        </AnimatedCard>

        <AnimatedCard index={2} className="p-5">
           <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                 <Zap className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500 border-0">Estado</Badge>
           </div>
           <p className="text-3xl font-black text-foreground">
             {evaluaciones.filter(e => e.estado === 'aprobado').length}
           </p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Total Aprobados</p>
        </AnimatedCard>

        <AnimatedCard index={3} className="p-5">
           <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white shadow-lg">
                 <Building2 className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-slate-500/10 text-slate-400 border-0">Sede</Badge>
           </div>
           <p className="text-3xl font-black text-foreground">{uniqueCursos.length}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Cursos en Proceso</p>
        </AnimatedCard>
      </div>

      {/* Seccion Mi Progreso (Visible para TODOS) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        <AnimatedCard className="md:col-span-2 p-5 flex flex-col justify-center h-[300px]">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Mi Rendimiento por Curso
              </h3>
           </div>
           <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={uniqueCursos.map(c => {
                  const cursoEvals = evaluaciones.filter(e => e.cursoNombre === c && e.calificacion !== null && e.idUsuario === usuarioActual?.idUsuario);
                  const avg = cursoEvals.length > 0 ? cursoEvals.reduce((sum, e) => sum + (e.calificacion || 0), 0) / cursoEvals.length : 0;
                  return { name: c.substring(0, 15), avg: Number(avg.toFixed(1)) };
                }).filter(i => i.avg > 0)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} domain={[0, 100]} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Bar dataKey="avg" fill="#4682b4" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </AnimatedCard>

        <AnimatedCard className="p-5 flex flex-col items-center justify-center h-[300px] overflow-hidden">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Progreso Global</h3>
           <div className="relative w-full h-[220px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  innerRadius="80%" 
                  outerRadius="110%" 
                  data={[{ name: 'Aprobados', value: (evaluaciones.filter(e => e.estado === 'aprobado' && e.idUsuario === usuarioActual?.idUsuario).length / (evaluaciones.filter(e => e.idUsuario === usuarioActual?.idUsuario).length || 1)) * 100, fill: '#4682b4' }]} 
                  startAngle={180} 
                  endAngle={0}
                >
                  <RadialBar background dataKey='value' cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                 <span className="text-5xl font-black text-[#4682b4] leading-none">
                   {Math.round((evaluaciones.filter(e => e.estado === 'aprobado' && e.idUsuario === usuarioActual?.idUsuario).length / (evaluaciones.filter(e => e.idUsuario === usuarioActual?.idUsuario).length || 1)) * 100)}%
                 </span>
                 <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mt-2">Aprobación</span>
              </div>
           </div>
        </AnimatedCard>
      </motion.div>

      {/* Seccion Estadistica por Estudiante (Solo Admins y Lideres) */}
      {(rolActual === 'super_admin' || rolActual === 'lider') && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 px-1 mt-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight uppercase text-[12px] tracking-[0.2em] text-muted-foreground">Estadística por Estudiante</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Top Estudiantes List */}
            <AnimatedCard className="lg:col-span-1 p-0 overflow-hidden">
               <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Top Estudiantes</span>
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
               </div>
               <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                  {(() => {
                    const studentMap: Record<string, { sum: number, count: number, name: string }> = {};
                    evaluaciones.forEach(ev => {
                      if (ev.calificacion === null) return;
                      if (!studentMap[ev.idUsuario]) studentMap[ev.idUsuario] = { sum: 0, count: 0, name: ev.usuarioNombre };
                      studentMap[ev.idUsuario].sum += ev.calificacion;
                      studentMap[ev.idUsuario].count += 1;
                    });
                    const students = Object.values(studentMap)
                      .map(s => ({ name: s.name, avg: s.sum / s.count }))
                      .sort((a, b) => b.avg - a.avg);

                    if (students.length === 0) return <div className="p-10 text-center text-xs text-muted-foreground/50">Sin datos</div>;

                    return students.map((s, i) => (
                      <div key={s.name} className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-lg bg-background border border-white/10 flex items-center justify-center text-[10px] font-black text-primary">
                             {i + 1}
                           </div>
                           <span className="text-xs font-bold truncate max-w-[120px]">{s.name}</span>
                        </div>
                        <span className={`text-xs font-black ${getCalColor(s.avg)}`}>{s.avg.toFixed(1)}</span>
                      </div>
                    ));
                  })()}
               </div>
            </AnimatedCard>

            <AnimatedCard className="lg:col-span-2 p-5 bg-card/10 border-white/5 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#4682b4]">Distribución por Estado</span>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Aprobados', value: evaluaciones.filter(e => e.estado === 'aprobado').length, fill: '#10b981' },
                            { name: 'Pendientes', value: evaluaciones.filter(e => e.estado === 'pendiente').length, fill: '#f59e0b' },
                            { name: 'Reprobados', value: evaluaciones.filter(e => e.estado === 'reprobado').length, fill: '#ef4444' },
                          ]}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          { [0,1,2].map((entry, index) => <Cell key={`cell-${index}`} />) }
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    {[
                      { label: 'Aprobados', color: 'bg-emerald-500', count: evaluaciones.filter(e => e.estado === 'aprobado').length },
                      { label: 'Pendientes', color: 'bg-amber-500', count: evaluaciones.filter(e => e.estado === 'pendiente').length },
                      { label: 'Reprobados', color: 'bg-rose-500', count: evaluaciones.filter(e => e.estado === 'reprobado').length },
                    ].map(st => (
                      <div key={st.label} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${st.color}`} />
                          <span className="text-xs font-bold text-muted-foreground">{st.label}</span>
                        </div>
                        <span className="text-sm font-black text-foreground">{st.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
            </AnimatedCard>
          </div>

          {/* Estadísticas Detalladas por Curso */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {uniqueCursos.map((c, i) => {
              const cursoEvals = evaluaciones.filter(e => e.cursoNombre === c && e.calificacion !== null);
              const avg = cursoEvals.length > 0 ? cursoEvals.reduce((sum, e) => sum + (e.calificacion || 0), 0) / cursoEvals.length : 0;
              const count = new Set(cursoEvals.map(e => e.idUsuario)).size;
              return (
                <AnimatedCard key={c} index={i} className="p-4 bg-primary/5 border-primary/10">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#4682b4] truncate max-w-[120px]">{c}</span>
                      <GraduationCap className="w-3.5 h-3.5 text-[#4682b4]" />
                   </div>
                   <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${getCalColor(avg)}`}>{avg > 0 ? avg.toFixed(1) : "—"}</span>
                      <span className="text-[10px] text-muted-foreground font-bold">AVG</span>
                   </div>
                   <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">{count} estudiantes evaluados</p>
                </AnimatedCard>
              );
            })}
          </div>

          {/* Tabla de Desempeño por Estudiante */}
          <AnimatedCard className="mt-6 p-0 overflow-hidden">
             <div className="p-4 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-primary/70">Desempeño Detallado por Estudiante</span>
                </div>
                <div className="relative w-full sm:w-64">
                   <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                   <Input 
                      placeholder="Buscar estudiante..." 
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 h-9 bg-background/50 border-white/10 rounded-xl text-xs"
                   />
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                         <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Estudiante</th>
                         <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Curso</th>
                         <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Módulos</th>
                         <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Promedio</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {(() => {
                        const reportMap: Record<string, { name: string, curso: string, sum: number, count: number }> = {};
                        evaluaciones.forEach(ev => {
                          if (ev.calificacion === null) return;
                          const key = `${ev.idUsuario}-${ev.cursoNombre}`;
                          if (!reportMap[key]) reportMap[key] = { name: ev.usuarioNombre, curso: ev.cursoNombre, sum: 0, count: 0 };
                          reportMap[key].sum += ev.calificacion;
                          reportMap[key].count += 1;
                        });
                        const filteredReports = Object.values(reportMap)
                          .filter(r => r.name.toLowerCase().includes(studentSearch.toLowerCase()) || r.curso.toLowerCase().includes(studentSearch.toLowerCase()))
                          .sort((a,b) => a.name.localeCompare(b.name));
                        
                        if (filteredReports.length === 0) return <tr><td colSpan={4} className="p-10 text-center text-xs text-muted-foreground/50">Sin resultados</td></tr>;
                        return filteredReports.map((r, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors group">
                             <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                   <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-[10px] font-black text-white">
                                      {r.name.charAt(0)}
                                   </div>
                                   <span className="text-xs font-bold text-foreground/90 group-hover:text-primary transition-colors">{r.name}</span>
                                </div>
                             </td>
                             <td className="px-5 py-3">
                                <Badge variant="outline" className="text-[10px] font-medium border-white/10 bg-white/5 text-muted-foreground truncate max-w-[150px]">{r.curso}</Badge>
                             </td>
                             <td className="px-5 py-3">
                                <span className="text-xs font-bold text-muted-foreground">{r.count} <span className="text-[10px] opacity-50">evaluados</span></span>
                             </td>
                             <td className="px-5 py-3 text-right font-black">
                                <span className={`text-sm ${getCalColor(r.sum/r.count)}`}>{(r.sum/r.count).toFixed(1)}</span>
                             </td>
                          </tr>
                        ));
                      })()}
                   </tbody>
                </table>
             </div>
          </AnimatedCard>
        </motion.div>
      )}

      {/* List Section Unificied with AnimatedCard */}
      <AnimatedCard className="overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.25em] text-primary/70">
            <TrendingUp className="w-4 h-4" /> Historial General
          </h3>
          <div className="flex items-center gap-2 bg-background/40 border border-border/50 rounded-2xl px-3 h-10 shrink-0">
            <Filter className="w-3.5 h-3.5 text-muted-foreground/40" />
            <select 
              value={cursoFilter} 
              onChange={(e) => setCursoFilter(e.target.value)} 
              className="text-[11px] bg-transparent border-0 outline-none text-foreground cursor-pointer font-bold uppercase tracking-tight"
            >
              <option value="all">Todos los cursos</option>
              {uniqueCursos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-20 flex flex-col items-center gap-3 text-muted-foreground/20"
              >
                <ClipboardCheck className="w-16 h-16" />
                <p className="text-sm font-medium">No se encontraron evaluaciones</p>
              </motion.div>
            ) : (
              filtered.sort((a, b) => new Date(b.fechaEvaluacion || b.creadoEn).getTime() - new Date(a.fechaEvaluacion || a.creadoEn).getTime()).map((ev, idx) => {
                const cfg = estadoEvalConfig[ev.estado] || estadoEvalConfig.pendiente;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={ev.idEvaluacion}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group flex flex-col sm:flex-row sm:items-center p-5 hover:bg-white/5 transition-all gap-5"
                  >
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-background/80 to-background/40 border border-white/5 flex flex-col items-center justify-center shrink-0 shadow-sm">
                        <span className="text-[9px] font-black uppercase text-muted-foreground/50 leading-none">
                          {new Date(ev.fechaEvaluacion || ev.creadoEn).toLocaleDateString("es", { month: "short" })}
                        </span>
                        <span className="text-lg font-black text-foreground/80 leading-tight">
                          {new Date(ev.fechaEvaluacion || ev.creadoEn).getDate()}
                        </span>
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter bg-primary/5 text-primary border-primary/20 border-0 px-2 h-4">
                            {ev.cursoNombre}
                          </Badge>
                          {rolActual === 'super_admin' && (
                            <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter bg-amber-500/10 text-amber-600 border-0 px-2 h-4 flex items-center gap-1">
                              <User className="w-2 h-2" /> {ev.usuarioNombre}
                            </Badge>
                          )}
                          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{ev.moduloNombre}</span>
                        </div>
                        <p className="text-sm font-semibold truncate text-foreground/90 group-hover:text-primary transition-colors">
                          Evaluación de {ev.moduloNombre}
                        </p>
                        {ev.observaciones && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic px-2 border-l border-primary/20">"{ev.observaciones}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pl-[68px] sm:pl-0">
                      <div className="flex flex-col items-end">
                        <span className={`text-2xl font-black ${getCalColor(ev.calificacion)}`}>
                          {ev.calificacion !== null ? ev.calificacion.toFixed(1) : "—"}
                        </span>
                        <Badge variant="outline" className={`text-[9px] uppercase font-black tracking-widest border-0 flex items-center gap-1 ${cfg.color}`}>
                          <Icon className="w-2.5 h-2.5" /> {cfg.label}
                        </Badge>
                      </div>

                      {canManageEvaluaciones && (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setEditTarget({ id: ev.idEvaluacion, calificacion: ev.calificacion?.toString() ?? "", estado: ev.estado, observaciones: ev.observaciones ?? "" })} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(ev.idEvaluacion)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/10 text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:translate-x-1 group-hover:text-primary transition-all hidden sm:block" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </AnimatedCard>

      {/* Delete confirmation */}
      <AlertDialog open={canManageEvaluaciones && !!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight">¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta acción no se puede deshacer. Se eliminará permanentemente esta evaluación del historial académico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteEvaluacionMutation.isPending} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white">
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <Dialog open={canManageEvaluaciones && showCreate} onOpenChange={o => { if (!o) { setShowCreate(false); resetCreateForm(); } }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Registrar Evaluación</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <FieldLabel>Módulo Académico *</FieldLabel>
              <select className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20" value={createForm.idModulo} onChange={e => setCreateForm(p => ({ ...p, idModulo: Number(e.target.value) }))}>
                <option value={0}>Seleccionar módulo...</option>
                {moduleOptions.map(mo => <option key={mo.idModulo} value={mo.idModulo}>{mo.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel>Calificación (0-100)</FieldLabel>
                <Input type="number" min="0" max="100" step="0.5" value={createForm.calificacion} onChange={e => setCreateForm(p => ({ ...p, calificacion: e.target.value }))} placeholder="Ej. 95.0" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <FieldLabel>Estado</FieldLabel>
                <select className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20" value={createForm.estado} onChange={e => setCreateForm(p => ({ ...p, estado: e.target.value }))}>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="reprobado">Reprobado</option>
                  <option value="en_revision">En Revisión</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>Fecha de Evaluación</FieldLabel>
              <Input type="date" value={createForm.fechaEvaluacion} onChange={e => setCreateForm(p => ({ ...p, fechaEvaluacion: e.target.value }))} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
            </div>
            <div className="space-y-2">
              <FieldLabel>Observaciones</FieldLabel>
              <textarea value={createForm.observaciones} onChange={e => setCreateForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Retroalimentación o notas adicionales..." className="w-full h-24 rounded-xl border border-white/10 bg-background/50 p-4 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</Button>
            <Button className="rounded-xl px-8" onClick={handleCreate} disabled={createEvaluacionMutation.isPending || !createForm.idModulo}>
              {createEvaluacionMutation.isPending ? "Guardando..." : "Guardar Evaluación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={canManageEvaluaciones && !!editTarget} onOpenChange={o => { if (!o) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Editar Evaluación</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Calificación</FieldLabel>
                  <Input type="number" min="0" max="100" step="0.5" value={editTarget.calificacion} onChange={e => setEditTarget(p => p ? { ...p, calificacion: e.target.value } : p)} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Estado</FieldLabel>
                  <select className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20" value={editTarget.estado} onChange={e => setEditTarget(p => p ? { ...p, estado: e.target.value } : p)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="reprobado">Reprobado</option>
                    <option value="en_revision">En Revisión</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel>Observaciones</FieldLabel>
                <textarea value={editTarget.observaciones} onChange={e => setEditTarget(p => p ? { ...p, observaciones: e.target.value } : p)} className="w-full h-28 rounded-xl border border-white/10 bg-background/50 p-4 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button className="rounded-xl px-8" onClick={handleUpdate} disabled={updateEvaluacionMutation.isPending}>
              {updateEvaluacionMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
