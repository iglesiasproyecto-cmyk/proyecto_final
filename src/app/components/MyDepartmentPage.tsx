import { useMinisterios, useMiembrosMinisterio } from "@/hooks/useMinisterios";
import { useEventos } from "@/hooks/useEventos";
import { useCursos } from "@/hooks/useCursos";
import { useApp } from "../store/AppContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { motion } from "motion/react";
import {
  Users, Mail, CalendarDays, BookOpen, Crown, User,
  Plus, Clock, FolderHeart, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router";

const rolLabels: Record<string, string> = { lider: "Líder", servidor: "Servidor" };
const rolColors: Record<string, string> = {
  lider:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  servidor: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};
const rolIcons: Record<string, React.ReactNode> = {
  lider:    <Crown className="w-3 h-3" />,
  servidor: <User className="w-3 h-3" />,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
      {children}
    </p>
  );
}

export function MyDepartmentPage() {
  const { usuarioActual } = useApp();
  const navigate = useNavigate();
  const { data: ministerios = [], isLoading } = useMinisterios();
  const min = ministerios[0] ?? null;
  const { data: minMembers = [] } = useMiembrosMinisterio(min?.idMinisterio ?? 0);
  const { data: eventos = [] } = useEventos();
  const { data: cursos = [] } = useCursos(min?.idMinisterio);

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Cargando ministerio...</span>
      </div>
    </div>
  );

  // ── Estado vacío: sin ministerio asignado ──────────────────────────────────
  if (!min) return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center max-w-md mx-auto"
    >
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center shadow-xl shadow-primary/10">
          <FolderHeart className="w-12 h-12 text-primary/60" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          Sin ministerio asignado
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Aún no tienes un ministerio asignado. Contacta con tu administrador para que te asigne uno y tendrás acceso completo a tu equipo, eventos y formación.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground/60">
        <div className="w-16 h-px bg-border" />
        <span>Una vez asignado, esta pantalla mostrará toda la información de tu ministerio.</span>
      </div>
    </motion.div>
  );

  // ── Con ministerio ─────────────────────────────────────────────────────────
  const upcomingEvents = eventos
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
    .slice(0, 4);

  const totalModulos = cursos.reduce((sum, c) => sum + (c.modulos?.length || 0), 0);
  const activeMembers = minMembers.filter(mm => mm.activo).sort((a, b) => {
    const order = ["lider", "servidor"];
    return order.indexOf(a.rolEnMinisterio || "servidor") - order.indexOf(b.rolEnMinisterio || "servidor");
  });

  const getDay = (d: string) => new Date(d).getDate();
  const getMon = (d: string) => new Date(d).toLocaleDateString("es", { month: "short" }).toUpperCase();
  const getTime = (d: string) => new Date(d).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* ── Header del Ministerio ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-card/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center gap-5"
      >
        <div className="absolute top-0 right-0 w-72 h-48 bg-primary/10 rounded-full blur-[90px] pointer-events-none -z-10" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg shadow-cyan-600/20">
          {min.nombre.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight leading-none mb-1 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {min.nombre}
          </h1>
          <p className="text-xs text-muted-foreground mb-3">{min.descripcion}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 flex items-center gap-1">
              <Crown className="w-3 h-3" /> {min.liderNombre || "Sin líder"}
            </Badge>
            <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 flex items-center gap-1">
              <Users className="w-3 h-3" /> {activeMembers.length} miembros
            </Badge>
            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border ${min.estado === "activo" ? "bg-primary/10 text-primary border-primary/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
              {min.estado}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* ── KPI row ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Eventos",       value: upcomingEvents.length, icon: <CalendarDays className="w-4 h-4" />, nav: "/app/eventos" },
          { label: "Cursos",        value: cursos.length,         icon: <BookOpen className="w-4 h-4" />,     nav: "/app/aula" },
          { label: "Miembros",      value: activeMembers.length,  icon: <Users className="w-4 h-4" />,        nav: "/app/miembros" },
          { label: "Módulos",       value: totalModulos,          icon: <BookOpen className="w-4 h-4" />,     nav: "/app/aula" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.04 }}
            onClick={() => navigate(s.nav)}
            className="group bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-600/10 group-hover:scale-110 transition-transform shrink-0">
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-primary leading-none">{s.value}</p>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Bento Grid Principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Equipo — col grande */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="lg:col-span-3"
        >
          <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-2xl p-0 overflow-hidden shadow-sm h-full">
            <div className="p-4 border-b border-border/40 bg-card/20 flex items-center justify-between">
              <div>
                <FieldLabel>Equipo del Ministerio</FieldLabel>
                <h3 className="font-bold text-sm -mt-2">{activeMembers.length} personas activas</h3>
              </div>
              <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={() => navigate("/app/miembros")}>
                Gestionar <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-border/30">
              {activeMembers.slice(0, 6).map((mm) => (
                <div key={mm.idMiembroMinisterio} className={`group flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors ${mm.idUsuario === usuarioActual?.idUsuario ? "bg-primary/5" : ""}`}>
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                      {(mm.nombreCompleto || "?").charAt(0).toUpperCase()}
                    </div>
                    {mm.idUsuario === usuarioActual?.idUsuario && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{mm.nombreCompleto}</p>
                      {mm.idUsuario === usuarioActual?.idUsuario && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 rounded-full">Tú</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" /> {mm.correo}
                    </p>
                  </div>
                  <Badge variant="outline" className={`${rolColors[mm.rolEnMinisterio || "servidor"]} border text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 flex items-center gap-1 shrink-0`}>
                    {rolIcons[mm.rolEnMinisterio || "servidor"]} {rolLabels[mm.rolEnMinisterio || "servidor"]}
                  </Badge>
                </div>
              ))}
              {activeMembers.length === 0 && (
                <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                  <Users className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Sin miembros activos</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Panel derecho — Eventos + Cursos */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="lg:col-span-2 flex flex-col gap-4"
        >
          {/* Próximos Eventos */}
          <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-2xl p-0 overflow-hidden shadow-sm flex-1">
            <div className="p-4 border-b border-border/40 bg-card/20 flex items-center justify-between">
              <FieldLabel>Próximos Eventos</FieldLabel>
              <button className="text-[10px] text-primary font-bold hover:underline" onClick={() => navigate("/app/eventos")}>
                Ver todos
              </button>
            </div>
            <div className="divide-y divide-border/30">
              {upcomingEvents.map((ev) => (
                <div key={ev.idEvento} className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => navigate("/app/eventos")}>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex flex-col items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="text-[9px] font-bold text-primary/60 uppercase leading-none">{getMon(ev.fechaInicio)}</span>
                    <span className="text-base font-black text-primary leading-none">{getDay(ev.fechaInicio)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">{ev.nombre}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" /> {getTime(ev.fechaInicio)}
                    </p>
                  </div>
                </div>
              ))}
              {upcomingEvents.length === 0 && (
                <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                  <CalendarDays className="w-7 h-7 opacity-20" />
                  <p className="text-xs">Sin eventos próximos</p>
                </div>
              )}
            </div>
          </Card>

          {/* Cursos de Formación */}
          <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-2xl p-0 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/40 bg-card/20 flex items-center justify-between">
              <FieldLabel>Formación</FieldLabel>
              <button className="text-[10px] text-primary font-bold hover:underline" onClick={() => navigate("/app/aula")}>
                Ir al Aula
              </button>
            </div>
            <div className="divide-y divide-border/30">
              {cursos.slice(0, 3).map((curso, idx) => (
                <div key={curso.idCurso} className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => navigate("/app/aula")}>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center text-primary text-[11px] font-black shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">{curso.nombre}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {curso.modulos?.length || 0} mód.{curso.duracionHoras ? ` · ${curso.duracionHoras}h` : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </div>
              ))}
              {cursos.length === 0 && (
                <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                  <BookOpen className="w-7 h-7 opacity-20" />
                  <p className="text-xs">Sin cursos disponibles</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
