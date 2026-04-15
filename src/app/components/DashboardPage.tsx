import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";
import { useIglesias, usePastores, useSedes } from "@/hooks/useIglesias";
import { useEventos } from "@/hooks/useEventos";
import { useMinisterios, useMiembrosMinisterio } from "@/hooks/useMinisterios";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useTareas } from "@/hooks/useEventos";
import { useCursos } from "@/hooks/useCursos";
import { useEvaluaciones } from "@/hooks/useCursos";
import { useNotificaciones } from "@/hooks/useNotificaciones";
import { usePaises, useDepartamentos, useCiudades } from "@/hooks/useGeografia";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";
import { SimpleBarChart, SimpleDonutChart } from "./SimpleCharts";
import {
  Building2, Users, CalendarDays, ListTodo, BookOpen, ClipboardCheck, Bell,
  ArrowRight, CheckCircle2, Clock, AlertCircle, ChevronRight, Globe,
  Church, UserCheck, Settings, TrendingUp, Sparkles, Activity
} from "lucide-react";

const statusColors: Record<string, string> = {
  pendiente: "text-amber-500",
  en_progreso: "text-blue-500",
  completada: "text-emerald-500",
};
const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completada: "Completada",
};
const statusIcons: Record<string, React.ReactNode> = {
  pendiente: <AlertCircle className="w-5 h-5" />,
  en_progreso: <Clock className="w-5 h-5" />,
  completada: <CheckCircle2 className="w-5 h-5" />,
};

const CHART_COLORS = ["#1a7fa8", "#2596be", "#163554", "#5cbcd6", "#c5a96a", "#e8927c"];

// Nuevo Panel Glassmorphism que ahorra espacio visual
function GlassPanel({ children, index = 0, className = "", onClick }: { children: React.ReactNode; index?: number; className?: string; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
      className={`h-full ${className}`}
    >
      <div 
        className={`h-full rounded-2xl bg-card/50 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 dark:border-white/10 dark:bg-card/20 ${onClick ? "cursor-pointer hover:shadow-lg hover:bg-card/70 hover:-translate-y-1" : ""} overflow-hidden relative`}
        onClick={onClick}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
        <div className="relative z-10 p-5 md:p-6">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

// Nueva Fila de Estadisticas (Bento/Header unido) para reemplazar las cajas pesadas
function StatsRow({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/20 rounded-2xl bg-card/60 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden dark:border-white/10 dark:bg-card/20 mb-6 lg:mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        {children}
      </div>
    </motion.div>
  )
}

function StatItem({ icon, iconColor, value, label, sublabel, onClick }: {
  icon: React.ReactNode; iconColor: string; value: number | string; label: string; sublabel?: string; onClick?: () => void;
}) {
  return (
    <div className={`relative p-5 lg:p-6 flex items-start gap-4 transition-colors ${onClick ? "cursor-pointer hover:bg-white/40 dark:hover:bg-white/5" : "group"}`} onClick={onClick}>
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-white/80 to-white/20 shadow-sm border border-white/50 dark:from-white/10 dark:to-white/5 dark:border-white/10 ${iconColor} group-hover:scale-105 transition-transform duration-300`}>
         {icon}
       </div>
       <div className="flex-1">
         <p className="text-3xl font-light tracking-tight text-foreground/90">{value}</p>
         <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">{label}</p>
         {sublabel && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">{sublabel}</p>}
       </div>
    </div>
  )
}

function SectionHeader({ icon, title, action, actionLabel = "Ver todos", light = false }: {
  icon: React.ReactNode; title: string; action?: () => void; actionLabel?: string; light?: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h3 className={`flex items-center gap-2.5 text-base font-semibold ${light ? "text-primary/80" : "text-foreground"}`}>
        <span className="text-primary w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">{icon}</span>
        {title}
      </h3>
      {action && (
        <button onClick={action} className="flex items-center gap-1.5 text-xs font-semibold text-primary/80 hover:text-primary transition-colors group px-3 py-1.5 rounded-full hover:bg-primary/5">
          {actionLabel}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { usuarioActual } = useApp();
  if (!usuarioActual) return null;
  const rol = (usuarioActual as unknown as { rol?: string }).rol;
  switch (rol) {
    case "super_admin": return <SuperAdminDashboard />;
    case "admin_iglesia": return <AdminIglesiaDashboard />;
    case "lider": return <LiderDashboard />;
    case "servidor": return <ServidorDashboard />;
    default: return <ServidorDashboard />;
  }
}
export default DashboardPage;

/* ======== SUPER ADMIN ======== */
function SuperAdminDashboard() {
  const { usuarioActual } = useApp();
  const navigate = useNavigate();
  const { data: iglesias = [] } = useIglesias();
  const { data: sedes = [] } = useSedes();
  const { data: pastores = [] } = usePastores();
  const { data: usuarios = [] } = useUsuarios();
  const { data: ministerios = [] } = useMinisterios();
  const { data: eventos = [] } = useEventos();
  const { data: cursos = [] } = useCursos();
  const { data: paises = [] } = usePaises();
  const { data: departamentosGeo = [] } = useDepartamentos();
  const { data: ciudades = [] } = useCiudades();

  if (!usuarioActual) return null;

  const activeIglesias = iglesias.filter((ig) => ig.estado === "activa");
  const activeUsers = usuarios.filter((u) => u.activo).length;
  const activeSedes = sedes.filter((s) => s.estado === "activa").length;
  void cursos;

  const iglesiaChartData = iglesias.map((ig) => ({
    name: ig.nombre.length > 12 ? ig.nombre.substring(0, 12) + "..." : ig.nombre,
    sedes: sedes.filter((s) => s.idIglesia === ig.idIglesia).length,
    ministerios: ministerios.filter((m) => m.idIglesia === ig.idIglesia).length,
    eventos: eventos.filter((e) => e.idIglesia === ig.idIglesia).length,
  }));

  const roleDistribution = [
    { name: "Admins", value: 2 },
    { name: "Líderes", value: 3 },
    { name: "Servidores", value: 6 },
  ];

  const recentUsers = [...usuarios].filter((u) => u.ultimoAcceso).sort((a, b) => (b.ultimoAcceso || "").localeCompare(a.ultimoAcceso || "")).slice(0, 5);

  return (
    <div className="max-w-[1400px] mx-auto space-y-2 pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-light tracking-tight">Panel Principal</h1>
            <p className="text-muted-foreground text-sm font-medium">Control unificado de la plataforma S.E.I.</p>
          </div>
        </div>
      </motion.div>

      {/* Stats unificados */}
      <StatsRow index={0}>
        <StatItem icon={<Building2 className="w-5 h-5" />} iconColor="text-indigo-600 dark:text-indigo-400" value={iglesias.length} label="Iglesias" sublabel={`${activeIglesias.length} activas`} onClick={() => navigate("/app/iglesias")} />
        <StatItem icon={<Church className="w-5 h-5" />} iconColor="text-cyan-600 dark:text-cyan-400" value={sedes.length} label="Sedes" sublabel={`${activeSedes} operativas`} onClick={() => navigate("/app/sedes")} />
        <StatItem icon={<Users className="w-5 h-5" />} iconColor="text-emerald-600 dark:text-emerald-400" value={usuarios.length} label="Usuarios" sublabel={`${activeUsers} activos hoy`} onClick={() => navigate("/app/usuarios")} />
        <StatItem icon={<UserCheck className="w-5 h-5" />} iconColor="text-violet-600 dark:text-violet-400" value={pastores.length} label="Pastores" onClick={() => navigate("/app/pastores")} />
      </StatsRow>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Columna Principal (Gráficas grandes, listas de Iglesias) */}
        <div className="xl:col-span-2 space-y-6 lg:space-y-8">
          <GlassPanel index={1}>
            <SectionHeader icon={<Activity className="w-4 h-4" />} title="Métricas por Iglesia" action={() => navigate("/app/iglesias")} actionLabel="Administrar Iglesias" />
            <SimpleBarChart
              data={iglesiaChartData.map((d) => ({
                label: d.name,
                values: [
                  { value: d.sedes, color: "#1a7fa8", name: "Sedes" },
                  { value: d.ministerios, color: "#2596be", name: "Ministerios" },
                  { value: d.eventos, color: "#5cbcd6", name: "Eventos" },
                ],
              }))}
              height={260}
            />
          </GlassPanel>

          <GlassPanel index={2}>
            <SectionHeader icon={<Building2 className="w-4 h-4" />} title="Directorio de Iglesias" action={() => navigate("/app/iglesias")} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {iglesias.map((ig) => (
                <div
                  key={ig.idIglesia}
                  className={`group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${ig.estado === "activa" ? "bg-white/40 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10" : "bg-muted/30 opacity-70 border border-dashed border-border"}`}
                  onClick={() => navigate("/app/iglesias")}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0 z-10">
                    <p className="text-base font-medium text-foreground">{ig.nombre}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Globe className="w-3 h-3" /> {ig.ciudadNombre}, {ig.paisNombre}
                    </p>
                  </div>
                  <Badge variant={ig.estado === "activa" ? "default" : "secondary"} className="z-10 shadow-sm">{ig.estado}</Badge>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Columna Secundaria (Roles, Geografía, Accesos Rápidos) */}
        <div className="space-y-6 lg:space-y-8">
          <GlassPanel index={3}>
            <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Accesos Rápidos" />
            <div className="flex flex-col gap-2">
              {[
                { label: "Nueva Iglesia", path: "/app/iglesias", icon: <Building2 className="w-5 h-5" />, color: "text-blue-500" },
                { label: "Gestionar Sedes", path: "/app/sedes", icon: <Church className="w-5 h-5" />, color: "text-cyan-500" },
                { label: "Directorio de Usuarios", path: "/app/usuarios", icon: <Users className="w-5 h-5" />, color: "text-emerald-500" },
                { label: "Asignar Pastores", path: "/app/pastores", icon: <UserCheck className="w-5 h-5" />, color: "text-violet-500" },
              ].map((q) => (
                <button key={q.path + q.label} onClick={() => navigate(q.path)} className="w-full relative overflow-hidden flex items-center gap-4 p-3.5 rounded-2xl bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-all group text-left">
                  <div className={`w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center shadow-sm ${q.color} group-hover:scale-110 transition-transform`}>
                    {q.icon}
                  </div>
                  <span className="flex-1 font-medium text-sm text-foreground/90">{q.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel index={4}>
            <SectionHeader icon={<Users className="w-4 h-4" />} title="Distribución de Roles" />
            <div className="flex justify-center -mt-2">
              <SimpleDonutChart
                data={roleDistribution.map((r, i) => ({
                  name: r.name,
                  value: r.value,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
                size={180}
                thickness={35}
              />
            </div>
          </GlassPanel>

          <GlassPanel index={5}>
            <SectionHeader icon={<Globe className="w-4 h-4" />} title="Cobertura Geográfica" action={() => navigate("/app/geografia")} actionLabel="Ver" />
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10"><p className="text-2xl font-light text-blue-600 dark:text-blue-400">{paises.length}</p><p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase mt-1">Países</p></div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10"><p className="text-2xl font-light text-purple-600 dark:text-purple-400">{departamentosGeo.length}</p><p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase mt-1">Deptos.</p></div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10"><p className="text-2xl font-light text-emerald-600 dark:text-emerald-400">{ciudades.length}</p><p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase mt-1">Ciudades</p></div>
            </div>
          </GlassPanel>

          <GlassPanel index={6}>
            <SectionHeader icon={<Clock className="w-4 h-4" />} title="Actividad Reciente" />
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div key={u.idUsuario} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-semibold text-primary shadow-inner shrink-0">{u.nombres[0]}{u.apellidos[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.nombres} {u.apellidos}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Acceso: {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString("es", { day: "2-digit", month: "short" }) : "--"}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

/* ======== ADMIN IGLESIA ======== */
function AdminIglesiaDashboard() {
  const { usuarioActual, notificacionesCount } = useApp();
  const navigate = useNavigate();
  const { data: ministerios = [] } = useMinisterios();
  const { data: miembrosMinisterio = [] } = useMiembrosMinisterio(0);
  const { data: eventos = [] } = useEventos();
  const { data: notificaciones = [] } = useNotificaciones(usuarioActual?.idUsuario ?? 0);

  if (!usuarioActual) return null;

  const activeMins = ministerios.filter((m) => m.estado === "activo");
  const activeMembers = miembrosMinisterio.filter((mm) => mm.activo);
  const globalEvents = eventos.filter((e) => !e.idMinisterio);
  const unread = notificacionesCount;

  const minChartData = ministerios.map((m) => ({
    name: m.nombre.length > 10 ? m.nombre.substring(0, 8) + "..." : m.nombre,
    miembros: m.cantidadMiembros || 0,
  }));

  return (
    <div className="max-w-[1400px] mx-auto space-y-2 pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest pl-1">Bienvenido de vuelta</p>
        <h1 className="text-3xl font-light tracking-tight mt-1">{usuarioActual.nombres} {usuarioActual.apellidos}</h1>
      </motion.div>

      <StatsRow>
        <StatItem icon={<Settings className="w-5 h-5" />} iconColor="text-indigo-600" value={activeMins.length} label="Ministerios" sublabel="Activos" onClick={() => navigate("/app/departamentos")} />
        <StatItem icon={<Users className="w-5 h-5" />} iconColor="text-emerald-600" value={activeMembers.length} label="Miembros" sublabel="Activos" onClick={() => navigate("/app/miembros")} />
        <StatItem icon={<CalendarDays className="w-5 h-5" />} iconColor="text-blue-600" value={globalEvents.length} label="Eventos" sublabel="Globales" onClick={() => navigate("/app/eventos")} />
        <StatItem icon={<Bell className="w-5 h-5" />} iconColor="text-red-500" value={unread} label="Alertas" sublabel="Sin leer" onClick={() => navigate("/app/notificaciones")} />
      </StatsRow>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <GlassPanel index={1}>
          <SectionHeader icon={<Settings className="w-4 h-4" />} title="Resumen de Ministerios" action={() => navigate("/app/departamentos")} actionLabel="Administrar" />
          {minChartData.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-white/20 dark:bg-black/10">
              <SimpleBarChart
                data={minChartData.map((d) => ({
                  label: d.name,
                  values: [{ value: d.miembros, color: "#1a7fa8", name: "Miembros" }],
                }))}
                height={160}
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ministerios.slice(0, 4).map((min) => (
              <div key={min.idMinisterio} className={`flex items-start gap-4 p-4 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 transition-colors cursor-pointer ${min.estado !== "activo" ? "opacity-60 grayscale" : ""}`} onClick={() => navigate("/app/departamentos")}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shadow-sm">{min.nombre.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{min.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{min.liderNombre}</p>
                  <p className="text-[10px] text-primary/80 uppercase font-semibold tracking-wide mt-1">{min.cantidadMiembros} miembros</p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <div className="space-y-6 lg:space-y-8">
          <GlassPanel index={2}>
            <SectionHeader icon={<CalendarDays className="w-4 h-4" />} title="Eventos Globales Próximos" action={() => navigate("/app/eventos")} actionLabel="Calendario" />
            <div className="space-y-3">
              {globalEvents.slice(0, 4).map((ev) => (
                <div key={ev.idEvento} className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-colors overflow-hidden">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center shadow-inner border border-primary/10 group-hover:scale-105 transition-transform shrink-0">
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{new Date(ev.fechaInicio).toLocaleDateString("es", { month: "short" })}</p>
                    <p className="text-xl font-light text-foreground">{new Date(ev.fechaInicio).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0 z-10">
                    <p className="text-sm font-medium text-foreground">{ev.nombre}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Globe className="w-3 h-3"/> {ev.sedeNombre || ev.tipoEventoNombre}</p>
                  </div>
                </div>
              ))}
              {globalEvents.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No hay eventos globales próximos</p>}
            </div>
          </GlassPanel>

          <GlassPanel index={3}>
            <SectionHeader icon={<Bell className="w-4 h-4" />} title={`Alertas Recientes ${unread > 0 ? `(${unread})` : ""}`} action={() => navigate("/app/notificaciones")} actionLabel="Ver historial" />
            <div className="flex flex-col gap-3">
              {notificaciones.slice(0, 3).map((n) => (
                <div key={n.idNotificacion} className={`flex items-start gap-4 p-4 rounded-2xl transition-colors ${n.leida ? "bg-white/20 dark:bg-white/5" : "bg-primary/5 border border-primary/20 shadow-sm"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.leida ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-sm ${!n.leida ? "font-semibold" : "font-medium"} text-foreground`}>{n.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{n.mensaje}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

/* ======== LIDER ======== */
function LiderDashboard() {
  const { usuarioActual } = useApp();
  const navigate = useNavigate();
  const { data: ministerios = [] } = useMinisterios();
  const { data: miembrosMinisterio = [] } = useMiembrosMinisterio(ministerios[0]?.idMinisterio ?? 0);
  const { data: eventos = [] } = useEventos();
  const { data: tareas = [] } = useTareas();
  const { data: cursos = [] } = useCursos(ministerios[0]?.idMinisterio);
  const { data: evaluaciones = [] } = useEvaluaciones(usuarioActual?.idUsuario);

  if (!usuarioActual) return null;

  const min = ministerios[0] ?? null;
  const minMembers = miembrosMinisterio.filter((mm) => mm.activo);
  const pendingTareas = tareas.filter((t) => t.estado !== "completada");
  const upcomingEvents = eventos.slice(0, 4);

  const taskStatusData = [
    { name: "Pendiente", value: tareas.filter((t) => t.estado === "pendiente").length, fill: "#f59e0b" },
    { name: "En Progreso", value: tareas.filter((t) => t.estado === "en_progreso").length, fill: "#3b82f6" },
    { name: "Completada", value: tareas.filter((t) => t.estado === "completada").length, fill: "#10b981" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-2 pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest pl-1">Vista de Líder</p>
          <h1 className="text-3xl font-light tracking-tight mt-1">{usuarioActual.nombres} {usuarioActual.apellidos}</h1>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
          <Settings className="w-4 h-4" /> {min?.nombre || "Ministerio no asignado"}
        </div>
      </motion.div>

      <StatsRow>
        <StatItem icon={<ListTodo className="w-5 h-5" />} iconColor="text-amber-500" value={pendingTareas.length} label="Tareas" sublabel="En Curso" onClick={() => navigate("/app/tareas")} />
        <StatItem icon={<Users className="w-5 h-5" />} iconColor="text-indigo-500" value={minMembers.length} label="Equipo" sublabel="Activos" onClick={() => navigate("/app/miembros")} />
        <StatItem icon={<CalendarDays className="w-5 h-5" />} iconColor="text-blue-500" value={eventos.length} label="Eventos" sublabel="Programados" onClick={() => navigate("/app/eventos")} />
        <StatItem icon={<BookOpen className="w-5 h-5" />} iconColor="text-emerald-500" value={cursos.length} label="Formación" sublabel="Cursos Disponibles" onClick={() => navigate("/app/aula")} />
      </StatsRow>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <GlassPanel index={1} className="lg:col-span-2">
          <SectionHeader icon={<ListTodo className="w-4 h-4" />} title="Gestión de Tareas" action={() => navigate("/app/tareas")} actionLabel="Tablero completo" />
          <div className="grid gap-3">
            {tareas.slice(0, 5).map((t) => (
              <div key={t.idTarea} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 md:p-5 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/40" onClick={() => navigate("/app/tareas")}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-white shadow-sm dark:bg-black/20 ${statusColors[t.estado]}`}>{statusIcons[t.estado]}</div>
                  <div>
                    <p className="text-base font-medium text-foreground">{t.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Users className="w-3 h-3"/> Asignados: {t.asignados?.map((a) => a.nombreCompleto).join(", ") || "Ninguno"}</p>
                  </div>
                </div>
                <div className="w-full sm:w-auto flex justify-end pl-16 sm:pl-0">
                  <Badge variant="secondary" className="px-3 py-1 font-medium">{statusLabels[t.estado]}</Badge>
                </div>
              </div>
            ))}
            {tareas.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay tareas creadas para el ministerio.</p>}
          </div>
        </GlassPanel>

        <div className="space-y-6 lg:space-y-8">
          <GlassPanel index={2}>
             <SectionHeader icon={<Activity className="w-4 h-4" />} title="Estado Global Tareas" />
             <div className="flex justify-center py-4">
               <SimpleDonutChart
                 data={taskStatusData}
                 size={180}
                 thickness={35}
               />
             </div>
          </GlassPanel>

          <GlassPanel index={3}>
            <SectionHeader icon={<Users className="w-4 h-4" />} title="Miembros del Equipo" action={() => navigate("/app/miembros")} actionLabel="Gestionar" />
            <div className="space-y-3">
              {minMembers.slice(0, 4).map((mm) => (
                <div key={mm.idMiembroMinisterio} className="flex items-center gap-3 p-3 rounded-xl bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold shadow-inner border border-primary/10">{(mm.nombreCompleto || "?").charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">{mm.nombreCompleto}</p>
                    <p className="text-[10px] uppercase tracking-wide text-primary/70 mt-0.5">{mm.rolEnMinisterio}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

/* ======== SERVIDOR ======== */
function ServidorDashboard() {
  const { usuarioActual, notificacionesCount } = useApp();
  const navigate = useNavigate();
  const { data: ministerios = [] } = useMinisterios();
  const { data: eventos = [] } = useEventos();
  const { data: tareas = [] } = useTareas();
  const { data: cursos = [] } = useCursos(ministerios[0]?.idMinisterio);
  const { data: evaluaciones = [] } = useEvaluaciones(usuarioActual?.idUsuario);

  if (!usuarioActual) return null;

  const min = ministerios[0] ?? null;
  const unread = notificacionesCount;
  const myTareas = tareas.filter((t) => t.asignados?.some((a) => a.idUsuario === usuarioActual.idUsuario));
  const pendingTareas = myTareas.filter((t) => t.estado !== "completada");
  const completedTareas = myTareas.filter((t) => t.estado === "completada");
  const avgCal = evaluaciones.filter((e) => e.calificacion !== null).length > 0
    ? evaluaciones.filter((e) => e.calificacion !== null).reduce((sum, e) => sum + (e.calificacion || 0), 0) / evaluaciones.filter((e) => e.calificacion !== null).length
    : 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-2 pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest pl-1">Hola de nuevo</p>
          <h1 className="text-3xl font-light tracking-tight mt-1">{usuarioActual.nombres} {usuarioActual.apellidos}</h1>
        </div>
        {min && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
            <Settings className="w-4 h-4" /> {min.nombre}
          </div>
        )}
      </motion.div>

      <StatsRow>
        <StatItem icon={<ListTodo className="w-5 h-5" />} iconColor="text-amber-500" value={pendingTareas.length} label="Mis Tareas" sublabel="En Curso" onClick={() => navigate("/app/tareas")} />
        <StatItem icon={<CheckCircle2 className="w-5 h-5" />} iconColor="text-emerald-500" value={completedTareas.length} label="Logros" sublabel="Tareas Completadas" onClick={() => navigate("/app/tareas")} />
        <StatItem icon={<CalendarDays className="w-5 h-5" />} iconColor="text-blue-500" value={eventos.length} label="Agenda" sublabel="Próximos Eventos" onClick={() => navigate("/app/eventos")} />
        <StatItem icon={<Bell className="w-5 h-5" />} iconColor={unread > 0 ? "text-red-500" : "text-muted-foreground"} value={unread} label="Notificaciones" sublabel="Sin leer" onClick={() => navigate("/app/notificaciones")} />
      </StatsRow>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Mis Tareas y Evaluaciones */}
        <div className="space-y-6 lg:space-y-8">
          <GlassPanel index={1}>
            <SectionHeader icon={<ListTodo className="w-4 h-4" />} title="Acciones Pendientes" action={() => navigate("/app/tareas")} actionLabel="Ir a Tablero" />
            <div className="grid gap-3">
              {myTareas.slice(0, 4).map((t) => (
                <div key={t.idTarea} className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 transition-all cursor-pointer overflow-hidden border border-transparent hover:border-white/40" onClick={() => navigate("/app/tareas")}>
                  <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${t.estado === "completada" ? "bg-emerald-400" : t.estado === "en_progreso" ? "bg-blue-400" : "bg-amber-400"}`} />
                  <div className="flex items-center gap-4 pl-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-foreground">{t.titulo}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1">Límite: {t.fechaLimite || "Sin fecha"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`px-2.5 py-1 font-medium bg-card ${statusColors[t.estado]}`}>{statusLabels[t.estado]}</Badge>
                </div>
              ))}
              {myTareas.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">¡Todo al día! Sin tareas en curso.</p>}
            </div>
          </GlassPanel>

          <GlassPanel index={2}>
            <SectionHeader icon={<ClipboardCheck className="w-4 h-4" />} title="Aula de Formación" action={() => navigate("/app/evaluaciones")} actionLabel="Desempeño" />
            {evaluaciones.length > 0 ? (
              <div>
                <div className="flex items-center gap-4 mb-5 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-black/20 text-primary flex items-center justify-center text-3xl font-light shadow-sm">
                    {avgCal.toFixed(1)}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Promedio General</p>
                    <p className="text-sm text-muted-foreground">Basado en {evaluaciones.length} evaluaciones</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {evaluaciones.slice(0, 3).map((ev) => (
                    <div key={ev.idEvaluacion} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/30 dark:bg-white/5 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ev.nombreCurso}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{ev.tituloModulo}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 px-3 py-1 font-medium bg-white dark:bg-black/40 ${ev.calificacion !== null && ev.calificacion >= 70 ? "text-emerald-600 border-emerald-200" : "text-amber-500 border-amber-200"}`}>
                        {ev.calificacion !== null ? `${ev.calificacion.toFixed(1)} / 100` : "Pendiente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No has realizado evaluaciones aún.</p>
            )}
          </GlassPanel>
        </div>

        {/* Agenda Viva */}
        <div className="space-y-6 lg:space-y-8">
          <GlassPanel index={3} className="h-full">
            <SectionHeader icon={<CalendarDays className="w-4 h-4" />} title="Días Próximos" action={() => navigate("/app/eventos")} actionLabel="Ver Agenda" />
            <div className="relative border-l-2 border-border/40 ml-4 pl-6 space-y-6 pb-4">
              {eventos.slice(0, 5).map((ev, idx) => (
                <div key={ev.idEvento} className="relative group">
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-card shadow-sm ${idx === 0 ? "bg-primary w-5 h-5 -left-[33px] ring-4 ring-primary/20" : "bg-muted-foreground"}`} />
                  <div className="bg-white/40 dark:bg-white/5 p-4 rounded-2xl group-hover:bg-white/60 dark:group-hover:bg-white/10 transition-colors border border-transparent group-hover:border-white/40">
                    <div className="flex justify-between items-start mb-2">
                       <p className="text-sm font-semibold text-foreground">{ev.nombre}</p>
                       <p className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md">{new Date(ev.fechaInicio).toLocaleDateString("es", { month: "short", day: "numeric" })}</p>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3 text-muted-foreground/70"/> {ev.sedeNombre || ev.tipoEventoNombre}</p>
                  </div>
                </div>
              ))}
              {eventos.length === 0 && <p className="text-sm text-muted-foreground py-4">No hay eventos en los próximos días.</p>}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
