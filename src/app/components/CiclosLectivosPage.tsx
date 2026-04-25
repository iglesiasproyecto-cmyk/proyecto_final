import { useState } from "react";
import {
  useProcesosAsignadoCurso,
  useCursos,
  useDetallesProcesoCurso,
  useDeleteProcesoAsignadoCurso,
  useCreateProcesoAsignadoCurso,
} from "@/hooks/useCursos";
import { useRetirarInscripcion, useReactivarInscripcion } from "@/hooks/useInscripciones";
import { useMinisterios } from "@/hooks/useMinisterios";
import { useApp } from "@/app/store/AppContext";
import type { ProcesoAsignadoCurso } from "@/types/app.types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { AnimatedCard } from "./ui/AnimatedCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { Progress } from "./ui/progress";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap, Plus, Calendar, Filter, Users, ArrowLeft,
  BookOpen, Trash2, ChevronRight, CheckCircle2, PlayCircle, BookMarked, XCircle, UserPlus, Undo2,
} from "lucide-react";
import { EnrollmentPickerModal } from "./classroom/EnrollmentPickerModal";

const estadoCicloConfig: Record<string, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  programado: { label: "Programado", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",      dot: "bg-[#4682b4]",    icon: <BookMarked className="w-3 h-3" /> },
  en_curso:   { label: "En Curso",   color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20", dot: "bg-[#4682b4]", icon: <PlayCircle className="w-3 h-3" /> },
  finalizado: { label: "Finalizado", color: "bg-slate-500/10 text-slate-400 border-slate-500/20",   dot: "bg-slate-400",   icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelado:  { label: "Cancelado",  color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",      dot: "bg-[#4682b4]",    icon: <XCircle className="w-3 h-3" /> },
};

const estadoInscripcionConfig: Record<string, { label: string; color: string }> = {
  inscrito:    { label: "Inscrito",    color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
  en_progreso: { label: "En Progreso", color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
  completado:  { label: "Completado",  color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
  retirado:    { label: "Retirado",    color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20" },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>;
}

// ── Detail View ──────────────────────────────────────────────────────────────
function CicloDetail({
  ciclo,
  onBack,
  cursoNombre,
  cursoMinisterioId,
}: {
  ciclo: ProcesoAsignadoCurso;
  onBack: () => void;
  cursoNombre: string;
  cursoMinisterioId: number | null;
}) {
  const { data: detalles = [] } = useDetallesProcesoCurso(ciclo.idProcesoAsignadoCurso);
  const { rolActual, iglesiaActual } = useApp();
  const { data: ministerios = [] } = useMinisterios();
  const [showPicker, setShowPicker] = useState(false);
  const [pendingRetiro, setPendingRetiro] = useState<number | null>(null);
  const retirarMutation = useRetirarInscripcion();
  const reactivarMutation = useReactivarInscripcion();

  const misMinisterios = ministerios.map((m) => m.idMinisterio);
  const cicloCerrado = ciclo.estado === "finalizado" || ciclo.estado === "cancelado";
  const canEnroll =
    !cicloCerrado &&
    (
      rolActual === "super_admin" ||
      (rolActual === "lider" && cursoMinisterioId != null && misMinisterios.includes(cursoMinisterioId))
    );

  const completados = detalles.filter(d => d.estado === "completado").length;
  const progressPct = detalles.length > 0 ? Math.round((completados / detalles.length) * 100) : 0;
  const cfg = estadoCicloConfig[ciclo.estado] ?? estadoCicloConfig.programado;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center gap-4"
      >
        <div className="absolute top-0 right-0 w-64 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-background/50 border border-white/5 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all hover:-translate-x-0.5 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight leading-none mb-1 truncate">{cursoNombre}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {formatDate(ciclo.fechaInicio)} — {formatDate(ciclo.fechaFin)}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`${cfg.color} border flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shrink-0`}>
          {cfg.icon} {cfg.label}
        </Badge>
      </motion.div>

      {/* Progress card */}
      {detalles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold">Progreso del Ciclo</p>
              <p className="text-xs text-muted-foreground">{completados} de {detalles.length} participantes completaron el curso</p>
            </div>
            <span className="text-3xl font-black text-primary">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2 bg-background/50" />
        </motion.div>
      )}

      {/* Participants */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-card/40 backdrop-blur-xl border-border/50 rounded-2xl p-0 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/40 bg-card/20 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Participantes inscritos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{detalles.length} personas en este ciclo lectivo</p>
            </div>
            {canEnroll && (
              <Button size="sm" className="h-9 rounded-xl bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-md shadow-blue-900/20" onClick={() => setShowPicker(true)}>
                <UserPlus className="w-4 h-4 mr-1.5" /> Inscribir
              </Button>
            )}
          </div>
          <div className="divide-y divide-border/30">
            {detalles.map((d, i) => {
              const inscConfig = estadoInscripcionConfig[d.estado] ?? estadoInscripcionConfig.inscrito;
              const mutating = retirarMutation.isPending || reactivarMutation.isPending;
              return (
                <motion.div
                  key={d.idDetalleProcesoCurso}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group flex items-center gap-4 px-5 py-3.5 hover:bg-accent/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {(d.nombreCompleto || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{d.nombreCompleto || `Usuario ${d.idUsuario}`}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{d.correo}</p>
                  </div>
                  <Badge variant="outline" className={`${inscConfig.color} border text-[9px] uppercase font-bold tracking-wider px-2 py-0.5`}>
                    {inscConfig.label}
                  </Badge>
                  {canEnroll && d.estado !== "retirado" && (
                    <button
                      title="Retirar"
                      disabled={mutating}
                      onClick={() => setPendingRetiro(d.idDetalleProcesoCurso)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-all disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canEnroll && d.estado === "retirado" && (
                    <button
                      title="Reactivar"
                      disabled={mutating}
                      onClick={() => reactivarMutation.mutate(d.idDetalleProcesoCurso)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-all disabled:opacity-40"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })}
            {detalles.length === 0 && (
              <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                <div className="w-12 h-12 rounded-2xl bg-accent/40 flex items-center justify-center">
                  <Users className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-sm font-medium">Sin participantes inscritos</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      <EnrollmentPickerModal
        ciclo={ciclo}
        cursoNombre={cursoNombre}
        open={showPicker}
        onOpenChange={setShowPicker}
      />

      <AlertDialog open={pendingRetiro !== null} onOpenChange={(o) => !o && setPendingRetiro(null)}>
        <AlertDialogContent className="rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Retirar inscripción</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              El participante quedará marcado como <strong>retirado</strong>. Podrás reactivarlo más tarde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRetiro) {
                  retirarMutation.mutate(pendingRetiro, { onSuccess: () => setPendingRetiro(null) });
                }
              }}
              disabled={retirarMutation.isPending}
              className="rounded-xl bg-[#4682b4] hover:bg-[#4682b4]/80 text-white border-0"
            >
              {retirarMutation.isPending ? "Retirando..." : "Retirar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CiclosLectivosPage() {
  const { data: procesosAsignadoCurso = [], isLoading, error } = useProcesosAsignadoCurso();
  const { data: cursos = [] } = useCursos();
  const [selectedCicloId, setSelectedCicloId] = useState<number | null>(null);
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [cursoFilter, setCursoFilter] = useState("all");
  const [showCreateCiclo, setShowCreateCiclo] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<number | null>(null);
  const deleteProcesaMutation = useDeleteProcesoAsignadoCurso();
  const createMutation = useCreateProcesoAsignadoCurso();
  const { iglesiaActual } = useApp();
  const [cicloForm, setCicloForm] = useState<{
    idCurso: string;
    fechaInicio: string;
    fechaFin: string;
    estadoInicial: "programado" | "en_curso";
  }>({ idCurso: "", fechaInicio: "", fechaFin: "", estadoInicial: "programado" });
  const [cicloError, setCicloError] = useState<string | null>(null);

  const resetCicloForm = () => {
    setCicloForm({ idCurso: "", fechaInicio: "", fechaFin: "", estadoInicial: "programado" });
    setCicloError(null);
  };

  const handleCreateCiclo = () => {
    setCicloError(null);
    if (!cicloForm.idCurso) return setCicloError("Selecciona un curso.");
    if (!cicloForm.fechaInicio || !cicloForm.fechaFin) return setCicloError("Fechas requeridas.");
    if (cicloForm.fechaInicio > cicloForm.fechaFin) {
      return setCicloError("La fecha de inicio no puede ser posterior a la de fin.");
    }
    if (!iglesiaActual) return setCicloError("No hay iglesia seleccionada.");

    createMutation.mutate(
      {
        idCurso: Number(cicloForm.idCurso),
        idIglesia: iglesiaActual.id,
        fechaInicio: cicloForm.fechaInicio,
        fechaFin: cicloForm.fechaFin,
        estado: cicloForm.estadoInicial,
      },
      {
        onSuccess: () => {
          resetCicloForm();
          setShowCreateCiclo(false);
        },
        onError: (err) => setCicloError(String((err as Error).message ?? err)),
      }
    );
  };

  const getCursoNombre = (idCurso: number) => cursos.find(c => c.idCurso === idCurso)?.nombre || "Curso";

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Cargando ciclos lectivos...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-[#4682b4]/10 border border-[#4682b4]/20 text-[#4682b4] p-6 rounded-2xl text-sm">
      Error cargando ciclos lectivos: {String((error as any)?.message ?? "")}
    </div>
  );

  const selectedCiclo = selectedCicloId ? procesosAsignadoCurso.find(c => c.idProcesoAsignadoCurso === selectedCicloId) : null;
  if (selectedCiclo) {
    const curso = cursos.find((c) => c.idCurso === selectedCiclo.idCurso);
    return (
      <CicloDetail
        ciclo={selectedCiclo}
        onBack={() => setSelectedCicloId(null)}
        cursoNombre={getCursoNombre(selectedCiclo.idCurso)}
        cursoMinisterioId={curso?.idMinisterio ?? null}
      />
    );
  }

  const uniqueCursoIds = [...new Set(procesosAsignadoCurso.map(c => c.idCurso))];
  const estadoOrder: Record<string, number> = { en_curso: 0, programado: 1, finalizado: 2, cancelado: 3 };

  const ciclosOrdenados = [...procesosAsignadoCurso]
    .filter(c => (estadoFilter === "all" || c.estado === estadoFilter) && (cursoFilter === "all" || c.idCurso === Number(cursoFilter)))
    .sort((a, b) => {
      const diff = (estadoOrder[a.estado] ?? 9) - (estadoOrder[b.estado] ?? 9);
      return diff !== 0 ? diff : new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime();
    });

  const stats = [
    { label: "Total Ciclos",  value: procesosAsignadoCurso.length,                            color: "from-[#709dbd] to-[#4682b4]" },
    { label: "En Curso",      value: procesosAsignadoCurso.filter(c => c.estado === "en_curso").length,   color: "from-emerald-500 to-teal-600" },
    { label: "Próximos",    value: procesosAsignadoCurso.filter(c => c.estado === "programado").length, color: "from-amber-500 to-orange-600" },
    { label: "Finalizados",   value: procesosAsignadoCurso.filter(c => c.estado === "finalizado").length, color: "from-slate-500 to-slate-700" },
  ];

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">
              Ciclos Lectivos
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">Gestiona los procesos de formación académica</p>
          </div>
        </div>

        {/* Filtros + botón en el header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-xl px-3 h-10">
            <Filter className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} className="text-xs bg-transparent border-0 outline-none text-foreground cursor-pointer">
              <option value="all">Todos los estados</option>
              <option value="programado">Programado</option>
              <option value="en_curso">En Curso</option>
              <option value="finalizado">Finalizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-xl px-3 h-10">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <select value={cursoFilter} onChange={e => setCursoFilter(e.target.value)} className="text-xs bg-transparent border-0 outline-none text-foreground cursor-pointer">
              <option value="all">Todos los cursos</option>
              {uniqueCursoIds.map(id => <option key={id} value={id}>{getCursoNombre(id)}</option>)}
            </select>
          </div>
          <Button onClick={() => setShowCreateCiclo(true)} className="h-10 rounded-xl font-medium shrink-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transition-all">
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo Ciclo
          </Button>
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, idx) => (
          <AnimatedCard key={s.label} index={idx} className="p-4 group">
            <div className="flex justify-between items-start mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg text-white`}>
                <GraduationCap className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px] py-0 tracking-widest uppercase">STAT</Badge>
            </div>
            <div>
              <p className="text-4xl font-light tracking-tight text-foreground">{s.value}</p>
              <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{s.label}</p>
            </div>
          </AnimatedCard>
        ))}
      </div>


      {/* ── Ciclos list ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2.5">
        <AnimatePresence>
          {ciclosOrdenados.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-accent/40 flex items-center justify-center">
                <GraduationCap className="w-7 h-7 opacity-40" />
              </div>
              <p className="font-semibold text-sm">Sin ciclos lectivos</p>
              <p className="text-xs">Crea un ciclo para comenzar a gestionar la formación.</p>
            </div>
          ) : (
            ciclosOrdenados.map((ciclo, i) => {
              const cfg = estadoCicloConfig[ciclo.estado] ?? estadoCicloConfig.programado;
              return (
                <AnimatedCard
                  key={ciclo.idProcesoAsignadoCurso}
                  index={i}
                  className="px-6 py-5 group cursor-pointer"
                  onClick={() => setSelectedCicloId(ciclo.idProcesoAsignadoCurso)}
                >
                  <div className="flex items-center gap-5 relative z-10 h-full">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg text-white">
                      <BookOpen className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h4 className="text-lg font-bold tracking-tight group-hover:text-[#4682b4] transition-colors uppercase italic">{getCursoNombre(ciclo.idCurso)}</h4>
                        <Badge variant="outline" className={`${cfg.color} border-0 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 flex items-center gap-1.5 rounded-lg`}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#4682b4]/50" />
                          {formatDate(ciclo.fechaInicio)} — {formatDate(ciclo.fechaFin)}
                        </span>
                        <span className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-[#4682b4]/50" />
                          Participantes inscritos
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-[#4682b4] hover:bg-[#4682b4]/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                        onClick={e => { e.stopPropagation(); setShowConfirmDelete(ciclo.idProcesoAsignadoCurso); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-[#4682b4] group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </div>
                </AnimatedCard>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Create Dialog ── */}
      <Dialog
        open={showCreateCiclo}
        onOpenChange={(o) => {
          if (!o) resetCicloForm();
          setShowCreateCiclo(o);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Nuevo Ciclo Lectivo
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Asocia un curso con fechas de inicio y fin.</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <FieldLabel>Curso</FieldLabel>
              <select
                value={cicloForm.idCurso}
                onChange={(e) => setCicloForm((f) => ({ ...f, idCurso: e.target.value }))}
                className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">— Seleccionar curso —</option>
                {cursos.map(c => <option key={c.idCurso} value={c.idCurso}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Fecha de Inicio</FieldLabel>
                <Input
                  type="date"
                  value={cicloForm.fechaInicio}
                  onChange={(e) => setCicloForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                  className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
                />
              </div>
              <div>
                <FieldLabel>Fecha de Fin</FieldLabel>
                <Input
                  type="date"
                  value={cicloForm.fechaFin}
                  onChange={(e) => setCicloForm((f) => ({ ...f, fechaFin: e.target.value }))}
                  className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Estado Inicial</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {["programado", "en_curso"].map(s => (
                  <button key={s} className="h-10 rounded-xl border border-white/10 bg-[#4682b4]/10 text-[#4682b4] hover:border-[#4682b4]/30 hover:bg-[#4682b4]/5 transition-all capitalize">
                    {estadoCicloConfig[s].label}
                  </button>
                ))}
              </div>
            </div>
            {cicloError && (
              <p className="text-xs text-[#4682b4] bg-[#4682b4]/10 border border-[#4682b4]/20 rounded-lg px-3 py-2">
                {cicloError}
              </p>
            )}
          </div>
          <DialogFooter className="border-t border-border/50 pt-4 mt-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setShowCreateCiclo(false)}>Cancelar</Button>
            <Button
              className="rounded-xl"
              disabled={createMutation.isPending}
              onClick={handleCreateCiclo}
            >
              {createMutation.isPending ? "Creando..." : "Crear Ciclo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!showConfirmDelete} onOpenChange={o => !o && setShowConfirmDelete(null)}>
        <AlertDialogContent className="rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Eliminar Ciclo Lectivo</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Esta acción eliminará permanentemente este ciclo y todas sus inscripciones. <strong className="text-foreground">No se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (showConfirmDelete) deleteProcesaMutation.mutate(showConfirmDelete, { onSuccess: () => setShowConfirmDelete(null) }); }}
              disabled={deleteProcesaMutation.isPending}
              className="rounded-xl bg-[#4682b4] hover:bg-[#4682b4]/80 text-white border-0"
            >
              {deleteProcesaMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
