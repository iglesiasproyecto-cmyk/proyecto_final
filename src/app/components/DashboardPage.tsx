import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";
import { useUsuariosEnriquecidos } from "@/hooks/useUsuarios";
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
  ArrowRight, CheckCircle2, Clock, AlertCircle, Globe,
  Church, UserCheck, Settings, TrendingUp, Sparkles, Activity
} from "lucide-react";

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completada: "Completada",
};
const statusIcons: Record<string, React.ReactNode> = {
  pendiente: <AlertCircle className="w-4 h-4" />,
  en_progreso: <Clock className="w-4 h-4" />,
  completada: <CheckCircle2 className="w-4 h-4" />,
};

const CHART_COLORS = ["#1a7fa8", "#2596be", "#0c2340", "#5cbcd6", "#c5a96a", "#e8927c"];

function AnimatedCard({ children, index = 0, className = "", onClick }: { children: React.ReactNode; index?: number; className?: string; onClick?: () => void }) {
  // Extraemos las clases relativas al grid (como lg:col-span-2) para aplicarlas en el motion.div
  const colSpanClasses = className.split(" ").filter(c => c.includes("col-span") || c.includes("row-span") || c.includes("grid-")).join(" ");
  const innerClasses = className.split(" ").filter(c => !c.includes("col-span") && !c.includes("row-span") && !c.includes("grid-")).join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
      className={`h-full ${colSpanClasses}`}
    >
      <div 
        className={`h-full relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 dark:border-white/10 dark:bg-card/20 ${onClick ? "cursor-pointer hover:shadow-lg hover:bg-card/60 hover:-translate-y-1" : ""} ${innerClasses}`}
        onClick={onClick}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
        <div className="relative z-10 flex flex-col h-full">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

function KPICard({ icon, value, label, sublabel, index, onClick }: {
  icon: React.ReactNode; value: number | string; label: string; sublabel?: string; index: number; onClick?: () => void;
}) {
  return (
    <AnimatedCard index={index} className="p-4 group" onClick={onClick}>
      <div className="flex justify-between items-start mb-3">
        <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-cyan-600/20 text-white">
          {icon}
        </div>
        {sublabel && <Badge variant="secondary" className="bg-primary/10 text-primary dark:bg-primary/20 border-0 text-[10px] py-0">{sublabel}</Badge>}
      </div>
      <div>
        <p className="text-4xl font-light tracking-tight text-foreground">{value}</p>
        <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{label}</p>
      </div>
    </AnimatedCard>
  );
}

function SectionHeader({ icon, title, action, actionLabel = "Ver todos" }: {
  icon: React.ReactNode; title: string; action?: () => void; actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary/70">
        <span className="text-primary/80">{icon}</span>
        {title}
      </h3>
      {action && (
        <button onClick={action} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors group">
          {actionLabel}
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { usuarioActual, rolActual } = useApp();
  if (!usuarioActual) return null;
  switch (rolActual) {
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
  const { data: enrichedUsuarios = [] } = useUsuariosEnriquecidos();
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
  void cursos; // available for future use

  const iglesiaChartData = iglesias.map((ig) => ({
    name: ig.nombre.length > 12 ? ig.nombre.substring(0, 12) + "..." : ig.nombre,
    sedes: sedes.filter((s) => s.idIglesia === ig.idIglesia).length,
    ministerios: ministerios.filter((m) => m.idIglesia === ig.idIglesia).length,
    eventos: eventos.filter((e) => e.idIglesia === ig.idIglesia).length,
  }));

  // Compute role distribution from real enriched user data
  const roleCounts = new Map<string, number>();
  enrichedUsuarios.forEach(u => {
    u.roleNames.forEach(rn => {
      const name = rn.rolNombre || "Sin rol";
      roleCounts.set(name, (roleCounts.get(name) || 0) + 1);
    });
  });
  // Include users without any role
  const usersWithoutRole = enrichedUsuarios.filter(u => u.roleNames.length === 0).length;
  if (usersWithoutRole > 0) roleCounts.set("Sin rol", usersWithoutRole);
  const roleDistribution = Array.from(roleCounts.entries()).map(([name, value]) => ({ name, value }));

  const recentUsers = [...usuarios].filter((u) => u.ultimoAcceso).sort((a, b) => (b.ultimoAcceso || "").localeCompare(a.ultimoAcceso || "")).slice(0, 5);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Header unificado */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">S.E.I.</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Panel de Control</h1>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard index={0} icon={<Building2 className="w-5 h-5" />} value={iglesias.length} label="Iglesias" sublabel={`${activeIglesias.length} activas`} onClick={() => navigate("/app/iglesias")} />
        <KPICard index={1} icon={<Church className="w-5 h-5" />} value={sedes.length} label="Sedes" sublabel={`${activeSedes} activas`} onClick={() => navigate("/app/sedes")} />
        <KPICard index={2} icon={<Users className="w-5 h-5" />} value={usuarios.length} label="Usuarios" sublabel={`${activeUsers} activos`} onClick={() => navigate("/app/usuarios")} />
        <KPICard index={3} icon={<UserCheck className="w-5 h-5" />} value={pastores.length} label="Pastores" onClick={() => navigate("/app/pastores")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedCard index={4} className="p-4 lg:col-span-2">
          <SectionHeader icon={<Activity className="w-5 h-5" />} title="Recursos por Iglesia" action={() => navigate("/app/iglesias")} actionLabel="Gestionar" />
          <SimpleBarChart
            data={iglesiaChartData.map((d) => ({
              label: d.name,
              values: [
                { value: d.sedes, color: "#1a7fa8", name: "Sedes" },
                { value: d.ministerios, color: "#2596be", name: "Ministerios" },
                { value: d.eventos, color: "#5cbcd6", name: "Eventos" },
              ],
            }))}
            height={224}
          />
        </AnimatedCard>

        <AnimatedCard index={5} className="p-4">
          <SectionHeader icon={<Users className="w-5 h-5" />} title="Distribucion de Roles" />
          <div className="flex justify-center mb-2">
            <SimpleDonutChart
              data={roleDistribution.map((r, i) => ({
                name: r.name,
                value: r.value,
                color: CHART_COLORS[i % CHART_COLORS.length],
              }))}
              size={140}
              thickness={25}
            />
          </div>
        </AnimatedCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedCard index={6} className="p-4 lg:col-span-2">
          <SectionHeader icon={<Building2 className="w-5 h-5" />} title="Iglesias Registradas" action={() => navigate("/app/iglesias")} actionLabel="Gestionar" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {iglesias.map((ig) => (
              <div
                key={ig.idIglesia}
                className={`group flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer bg-gradient-to-br border ${ig.estado !== "activa" ? "from-muted/20 to-muted/5 opacity-60 border-dashed border-border" : "from-blue-600/5 to-cyan-600/5 hover:from-blue-600/10 hover:to-cyan-600/10 border-blue-600/10 hover:border-blue-600/20 shadow-sm hover:shadow-md hover:-translate-y-0.5"}`}
                onClick={() => navigate("/app/iglesias")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${ig.estado !== "activa" ? "bg-muted text-muted-foreground" : "bg-gradient-to-br from-cyan-600 to-blue-700 text-white group-hover:scale-110 transition-transform"}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground/90">{ig.nombre}</p>
                    <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <Globe className="w-3 h-3 text-cyan-600/70" /> {ig.ciudadNombre}, {ig.paisNombre}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                  <Badge variant={ig.estado === "activa" ? "default" : "secondary"} className={`text-[9px] px-2 py-0 border-0 ${ig.estado === "activa" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 font-bold tracking-wider uppercase" : ""}`}>{ig.estado}</Badge>
                  <div className="hidden xl:flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-0.5" title="Sedes"><Church className="w-3 h-3 text-blue-600/50" /> {sedes.filter((s) => s.idIglesia === ig.idIglesia).length}</span>
                    <span className="flex items-center gap-0.5" title="Ministerios"><Settings className="w-3 h-3 text-blue-600/50" /> {ministerios.filter((m) => m.idIglesia === ig.idIglesia).length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard index={7} className="p-4 h-fit" onClick={() => navigate("/app/geografia")}>
            <SectionHeader icon={<Globe className="w-4 h-4" />} title="Cobertura Geografica" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-cyan-600/10 border border-cyan-600/10 flex flex-col items-center justify-center hover:bg-cyan-600/20 transition-colors"><p className="text-xl font-light text-cyan-700 dark:text-cyan-400">{paises.length}</p><p className="text-[9px] font-bold uppercase tracking-widest text-cyan-600/70 mt-1">Paises</p></div>
              <div className="p-3 rounded-2xl bg-blue-600/10 border border-blue-600/10 flex flex-col items-center justify-center hover:bg-blue-600/20 transition-colors"><p className="text-xl font-light text-blue-700 dark:text-blue-400">{departamentosGeo.length}</p><p className="text-[9px] font-bold uppercase tracking-widest text-blue-600/70 mt-1">Deptos.</p></div>
              <div className="p-3 rounded-2xl bg-indigo-600/10 border border-indigo-600/10 flex flex-col items-center justify-center hover:bg-indigo-600/20 transition-colors"><p className="text-xl font-light text-indigo-700 dark:text-indigo-400">{ciudades.length}</p><p className="text-[9px] font-bold uppercase tracking-widest text-indigo-600/70 mt-1">Ciudades</p></div>
            </div>
        </AnimatedCard>

        <AnimatedCard index={8} className="p-4 h-fit">
            <SectionHeader icon={<Clock className="w-4 h-4" />} title="Actividad Reciente" />
            <div className="grid grid-cols-1 gap-2">
              {recentUsers.map((u) => (
                <div key={u.idUsuario} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-blue-600/5 transition-colors border border-transparent hover:border-blue-600/10 group cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600/20 to-blue-600/10 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">{u.nombres[0]}{u.apellidos[0]}</div>
                  <span className="flex-1 text-[13px] font-medium truncate text-foreground/90 group-hover:text-blue-600 transition-colors">{u.nombres} {u.apellidos}</span>
                  <span className="text-[9px] font-semibold text-muted-foreground shrink-0 bg-muted/50 dark:bg-muted/30 px-2 py-1 rounded-lg uppercase tracking-wider">{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString("es", { day: "2-digit", month: "short" }) : "--"}</span>
                </div>
              ))}
            </div>
        </AnimatedCard>

        <AnimatedCard index={9} className="p-4 lg:col-span-2 h-fit">
            <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Accesos Rapidos" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Nueva Iglesia", path: "/app/iglesias", icon: <Building2 className="w-5 h-5" /> },
                { label: "Sedes", path: "/app/sedes", icon: <Church className="w-5 h-5" /> },
                { label: "Usuarios", path: "/app/usuarios", icon: <Users className="w-5 h-5" /> },
                { label: "Pastores", path: "/app/pastores", icon: <UserCheck className="w-5 h-5" /> },
              ].map((q) => (
                <button key={q.path + q.label} onClick={() => navigate(q.path)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-blue-600/5 hover:bg-blue-600/10 hover:-translate-y-0.5 text-muted-foreground transition-all group border border-transparent hover:border-blue-600/20 shadow-sm">
                  <span className="text-blue-600/60 group-hover:text-blue-600 transition-colors group-hover:scale-110">{q.icon}</span>
                  <span className="text-[10px] font-bold text-center text-foreground/80 tracking-wide uppercase">{q.label}</span>
                </button>
              ))}
            </div>
        </AnimatedCard>
      </div>
    </div>
  );
}

/* ======== ADMIN IGLESIA ======== */
function AdminIglesiaDashboard() {
  const { usuarioActual, notificacionesCount, iglesiaActual } = useApp();
  const navigate = useNavigate();
  const { data: ministerios = [] } = useMinisterios();
  const { data: miembrosMinisterio = [] } = useMiembrosMinisterio(0);
  const { data: eventos = [] } = useEventos(iglesiaActual?.id);
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
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Header unificado */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm relative overflow-hidden dark:border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Bienvenido de vuelta</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">{usuarioActual.nombres} {usuarioActual.apellidos}</h1>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard index={0} icon={<Settings className="w-5 h-5" />} value={activeMins.length} label="Ministerios activos" onClick={() => navigate("/app/departamentos")} />
        <KPICard index={1} icon={<Users className="w-5 h-5" />} value={activeMembers.length} label="Miembros activos" onClick={() => navigate("/app/miembros")} />
        <KPICard index={2} icon={<CalendarDays className="w-5 h-5" />} value={globalEvents.length} label="Eventos globales" onClick={() => navigate("/app/eventos")} />
        <KPICard index={3} icon={<Bell className="w-5 h-5" />} value={unread} label="Sin leer" onClick={() => navigate("/app/notificaciones")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard index={4} className="p-4">
          <SectionHeader icon={<Settings className="w-5 h-5" />} title="Ministerios" action={() => navigate("/app/departamentos")} />
          {minChartData.length > 0 && (
            <div className="mb-4">
              <SimpleBarChart
                data={minChartData.map((d) => ({
                  label: d.name,
                  values: [{ value: d.miembros, color: "#1a7fa8", name: "Miembros" }],
                }))}
                height={160}
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ministerios.slice(0, 4).map((min) => (
              <div key={min.idMinisterio} className={`group flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer bg-gradient-to-br border ${min.estado !== "activo" ? "from-muted/20 to-muted/5 opacity-60 border-dashed border-border" : "from-blue-600/5 to-cyan-600/5 hover:from-blue-600/10 hover:to-cyan-600/10 border-blue-600/30 hover:border-blue-600/40 shadow-md shadow-blue-600/15 hover:-translate-y-0.5"}`} onClick={() => navigate("/app/departamentos")}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${min.estado !== "activo" ? "bg-muted text-muted-foreground" : "bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-inner group-hover:scale-110 transition-transform"}`}>
                  <span className="text-[13px] font-bold">{min.nombre.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground/90 truncate group-hover:text-blue-600 transition-colors">{min.nombre}</p>
                  <p className="text-[10px] font-medium text-muted-foreground truncate">{min.liderNombre} &middot; {min.cantidadMiembros} miembros</p>
                </div>
                <Badge variant={min.estado === "activo" ? "secondary" : "outline"} className={`text-[9px] px-2 py-0 border-0 ${min.estado === "activo" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 uppercase tracking-widest p-1" : ""}`}>{min.estado}</Badge>
              </div>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard index={5} className="p-4">
          <SectionHeader icon={<CalendarDays className="w-5 h-5" />} title="Eventos Globales" action={() => navigate("/app/eventos")} />
          <div className="grid grid-cols-1 gap-2">
            {globalEvents.slice(0, 5).map((ev) => (
              <div key={ev.idEvento} className="group flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-blue-600/5 to-transparent border border-blue-600/10 hover:border-blue-600/20 transition-colors shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex flex-col items-center justify-center shrink-0 shadow-sm text-white group-hover:scale-105 transition-transform">
                  <span className="text-[9px] font-bold uppercase opacity-80">{new Date(ev.fechaInicio).toLocaleDateString("es", { month: "short" })}</span>
                  <span className="text-[15px] font-black leading-none mt-0.5">{new Date(ev.fechaInicio).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground/90 truncate group-hover:text-blue-600 transition-colors">{ev.nombre}</p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{ev.sedeNombre || ev.tipoEventoNombre}</p>
                </div>
              </div>
            ))}
            {globalEvents.length === 0 && <p className="text-[11px] font-medium text-muted-foreground text-center py-6">No hay eventos globales</p>}
          </div>
        </AnimatedCard>

        <AnimatedCard index={6} className="p-4 lg:col-span-2">
          <SectionHeader icon={<Bell className="w-5 h-5" />} title={`Notificaciones ${unread > 0 ? `(${unread})` : ""}`} action={() => navigate("/app/notificaciones")} actionLabel="Ver todas" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {notificaciones.slice(0, 4).map((n) => (
              <div key={n.idNotificacion} className={`flex items-start gap-3 p-3 rounded-2xl transition-colors border ${n.leida ? "bg-muted/20 border-transparent hover:border-border" : "bg-blue-600/5 border-blue-600/20 shadow-sm"}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-sm top-0 ${n.leida ? "bg-muted-foreground/30" : "bg-cyan-500 animate-pulse"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] truncate ${n.leida ? "font-medium text-foreground/70" : "font-bold text-blue-700 dark:text-blue-400"}`}>{n.titulo}</p>
                  <p className={`text-[11px] truncate mt-0.5 ${n.leida ? "text-muted-foreground" : "text-foreground/80 font-medium"}`}>{n.mensaje}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}

/* ======== LIDER ======== */
function LiderDashboard() {
  const { usuarioActual, iglesiaActual } = useApp();
  const navigate = useNavigate();
  const { data: ministerios = [] } = useMinisterios();
  const { data: miembrosMinisterio = [] } = useMiembrosMinisterio(ministerios[0]?.idMinisterio ?? 0);
  const { data: eventos = [] } = useEventos(iglesiaActual?.id);
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
    { name: "Completada", value: tareas.filter((t) => t.estado === "completada").length, fill: "#1a7fa8" },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Header unificado */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm relative overflow-hidden dark:border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0 text-white">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Líder &mdash; {min?.nombre}</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">{usuarioActual.nombres} {usuarioActual.apellidos}</h1>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard index={0} icon={<Users className="w-5 h-5" />} value={minMembers.length} label="Miembros" onClick={() => navigate("/app/miembros")} />
        <KPICard index={1} icon={<ListTodo className="w-5 h-5" />} value={pendingTareas.length} label="Tareas pendientes" onClick={() => navigate("/app/tareas")} />
        <KPICard index={2} icon={<CalendarDays className="w-5 h-5" />} value={eventos.length} label="Eventos" onClick={() => navigate("/app/eventos")} />
        <KPICard index={3} icon={<ClipboardCheck className="w-5 h-5" />} value={evaluaciones.length} label="Evaluaciones" onClick={() => navigate("/app/evaluaciones")} />
        <KPICard index={4} icon={<BookOpen className="w-5 h-5" />} value={cursos.length} label="Cursos" onClick={() => navigate("/app/aula")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedCard index={5} className="p-4 lg:col-span-2">
          <SectionHeader icon={<ListTodo className="w-5 h-5" />} title="Tareas del Ministerio" action={() => navigate("/app/tareas")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tareas.slice(0, 5).map((t) => (
              <div key={t.idTarea} className="group flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-blue-600/5 to-cyan-600/5 hover:from-blue-600/10 hover:to-cyan-600/10 border border-blue-600/10 hover:border-blue-600/20 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5" onClick={() => navigate("/app/tareas")}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform bg-gradient-to-br from-blue-600 to-cyan-600 text-white`}>{statusIcons[t.estado]}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold truncate transition-colors ${t.estado === "completada" ? "line-through text-muted-foreground" : "text-foreground/90 group-hover:text-blue-600"}`}>{t.titulo}</p>
                  <p className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">{t.asignados?.map((a) => a.nombreCompleto).join(", ")}</p>
                </div>
                <Badge variant="outline" className={`text-[9px] px-2 py-0 border-0 bg-blue-600/10 text-blue-700 dark:text-blue-400 uppercase tracking-widest p-1`}>{statusLabels[t.estado]}</Badge>
              </div>
            ))}
            {tareas.length === 0 && <p className="text-[11px] font-medium text-muted-foreground text-center py-6 col-span-2">Sin tareas</p>}
          </div>
        </AnimatedCard>

        <AnimatedCard index={6} className="p-4">
          <SectionHeader icon={<Activity className="w-5 h-5" />} title="Estado de Tareas" />
          <div className="flex justify-center py-2">
            <SimpleDonutChart
              data={taskStatusData.map((d) => ({ name: d.name, value: d.value, color: d.fill }))}
              size={140}
              thickness={25}
            />
          </div>
        </AnimatedCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard index={7} className="p-4">
          <SectionHeader icon={<CalendarDays className="w-5 h-5" />} title="Proximos Eventos" action={() => navigate("/app/eventos")} />
          <div className="grid grid-cols-1 gap-2">
            {upcomingEvents.map((ev) => (
              <div key={ev.idEvento} className="group flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-blue-600/5 to-transparent border border-blue-600/10 hover:border-blue-600/20 transition-colors shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex flex-col items-center justify-center shrink-0 shadow-sm text-white group-hover:scale-105 transition-transform">
                  <span className="text-[9px] font-bold uppercase opacity-80">{new Date(ev.fechaInicio).toLocaleDateString("es", { month: "short" })}</span>
                  <span className="text-[15px] font-black leading-none mt-0.5">{new Date(ev.fechaInicio).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground/90 truncate group-hover:text-blue-600 transition-colors">{ev.nombre}</p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{ev.sedeNombre || ev.tipoEventoNombre}</p>
                </div>
                <Badge variant="secondary" className={`text-[9px] px-2 py-0 border-0 ${ev.idMinisterio ? "bg-amber-500/10 text-amber-600" : "bg-blue-600/10 text-blue-700"} uppercase tracking-widest`}>{ev.idMinisterio ? "Min." : "Global"}</Badge>
              </div>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard index={8} className="p-4">
          <SectionHeader icon={<Users className="w-5 h-5" />} title="Equipo" action={() => navigate("/app/miembros")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {minMembers.slice(0, 5).map((mm) => (
              <div key={mm.idMiembroMinisterio} className="group flex items-center gap-3 p-2.5 rounded-2xl border border-transparent hover:border-blue-600/10 hover:bg-blue-600/5 transition-colors cursor-default">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600/20 to-blue-600/10 shadow-sm flex items-center justify-center text-blue-700 font-bold group-hover:scale-110 transition-transform">{(mm.nombreCompleto || "?").charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground/90 truncate group-hover:text-blue-600 transition-colors">{mm.nombreCompleto}</p>
                </div>
                <Badge variant="outline" className={`text-[9px] px-2 py-0 border-0 ${mm.rolEnMinisterio === "lider" ? "bg-amber-500/10 text-amber-600" : "bg-cyan-600/10 text-cyan-600"} uppercase tracking-widest`}>{mm.rolEnMinisterio === "lider" ? "Líder" : "Serv. "}</Badge>
              </div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}

/* ======== SERVIDOR ======== */
function ServidorDashboard() {
  const { usuarioActual, notificacionesCount, iglesiaActual } = useApp();
  const navigate = useNavigate();
  const { data: ministerios = [] } = useMinisterios();
  const { data: eventos = [] } = useEventos(iglesiaActual?.id);
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
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Header unificado */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm relative overflow-hidden dark:border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0 text-white">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Servidor &mdash; {min?.nombre}</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">{usuarioActual.nombres} {usuarioActual.apellidos}</h1>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard index={0} icon={<ListTodo className="w-5 h-5" />} value={pendingTareas.length} label="Tareas pendientes" onClick={() => navigate("/app/tareas")} />
        <KPICard index={1} icon={<CheckCircle2 className="w-5 h-5" />} value={completedTareas.length} label="Completadas" onClick={() => navigate("/app/tareas")} />
        <KPICard index={2} icon={<CalendarDays className="w-5 h-5" />} value={eventos.length} label="Eventos" onClick={() => navigate("/app/eventos")} />
        <KPICard index={3} icon={<Bell className="w-5 h-5" />} value={unread} label="Sin leer" onClick={() => navigate("/app/notificaciones")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard index={4} className="p-4">
          <SectionHeader icon={<ListTodo className="w-5 h-5" />} title="Mis Tareas" action={() => navigate("/app/tareas")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {myTareas.slice(0, 5).map((t) => (
              <div key={t.idTarea} className="group flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-blue-600/5 to-cyan-600/5 hover:from-blue-600/10 hover:to-cyan-600/10 border border-blue-600/10 hover:border-blue-600/20 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5" onClick={() => navigate("/app/tareas")}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform bg-gradient-to-br from-blue-600 to-cyan-600 text-white`}>{statusIcons[t.estado]}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold truncate transition-colors ${t.estado === "completada" ? "line-through text-muted-foreground" : "text-foreground/90 group-hover:text-blue-600"}`}>{t.titulo}</p>
                  <p className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">Limite: {t.fechaLimite || "Sin fecha"}</p>
                </div>
                <Badge variant="outline" className={`text-[9px] px-2 py-0 border-0 bg-blue-600/10 text-blue-700 dark:text-blue-400 uppercase tracking-widest p-1`}>{statusLabels[t.estado]}</Badge>
              </div>
            ))}
            {myTareas.length === 0 && <p className="text-[11px] font-medium text-muted-foreground text-center py-6 col-span-2">Sin tareas asignadas</p>}
          </div>
        </AnimatedCard>

        <AnimatedCard index={5} className="p-4">
          <SectionHeader icon={<CalendarDays className="w-5 h-5" />} title="Proximos Eventos" action={() => navigate("/app/eventos")} />
          <div className="grid grid-cols-1 gap-2">
            {eventos.slice(0, 4).map((ev) => (
              <div key={ev.idEvento} className="group flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-blue-600/5 to-transparent border border-blue-600/10 hover:border-blue-600/20 transition-colors shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex flex-col items-center justify-center shrink-0 shadow-sm text-white group-hover:scale-105 transition-transform">
                  <span className="text-[9px] font-bold uppercase opacity-80">{new Date(ev.fechaInicio).toLocaleDateString("es", { month: "short" })}</span>
                  <span className="text-[15px] font-black leading-none mt-0.5">{new Date(ev.fechaInicio).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground/90 truncate group-hover:text-blue-600 transition-colors">{ev.nombre}</p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{ev.sedeNombre || ev.tipoEventoNombre}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard index={6} className="p-4">
          <SectionHeader icon={<ClipboardCheck className="w-5 h-5" />} title="Mis Evaluaciones" action={() => navigate("/app/evaluaciones")} />
          {evaluaciones.length > 0 ? (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-2xl bg-gradient-to-r from-cyan-600/10 to-blue-600/10 border border-blue-600/10">
                <div className="flex items-baseline gap-2"><span className="text-3xl font-light tracking-tight text-blue-700 dark:text-blue-400">{avgCal.toFixed(1)}</span><span className="text-[10px] font-bold uppercase tracking-widest text-blue-600/70">Promedio</span></div>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg uppercase tracking-wider">{evaluaciones.length} Eval.</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {evaluaciones.slice(0, 3).map((ev) => (
                  <div key={ev.idEvaluacion} className="flex items-center justify-between p-2.5 rounded-2xl border border-transparent hover:border-blue-600/10 hover:bg-blue-600/5 transition-colors cursor-default">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground/90 truncate">{ev.nombreCurso} &mdash; <span className="font-normal text-muted-foreground">{ev.tituloModulo}</span></p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0 border-0 ${ev.calificacion !== null && ev.calificacion >= 70 ? "bg-emerald-600/10 text-emerald-700" : "bg-amber-500/10 text-amber-600"} uppercase tracking-widest`}>
                      {ev.calificacion !== null ? ev.calificacion.toFixed(1) : "Pendiente"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] font-medium text-muted-foreground text-center py-6">Sin evaluaciones aun</p>
          )}
        </AnimatedCard>

        <AnimatedCard index={7} className="p-4">
          <SectionHeader icon={<BookOpen className="w-5 h-5" />} title="Aula de Formacion" action={() => navigate("/app/aula")} actionLabel="Ir al aula" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {cursos.slice(0, 3).map((c, idx) => (
              <div key={c.idCurso} className="group flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-br from-blue-600/5 to-cyan-600/5 hover:from-blue-600/10 hover:to-cyan-600/10 border border-blue-600/10 hover:border-blue-600/20 shadow-sm cursor-pointer transition-all hover:-translate-y-0.5" onClick={() => navigate("/app/aula")}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-inner group-hover:scale-110 transition-transform">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground/90 truncate group-hover:text-blue-600 transition-colors">{c.nombre}</p>
                  <p className="text-[10px] font-medium text-muted-foreground truncate">{c.modulos?.length || 0} modulos</p>
                </div>
              </div>
            ))}
            {cursos.length === 0 && <p className="text-[11px] font-medium text-muted-foreground text-center py-6 col-span-2">Sin cursos disponibles</p>}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
