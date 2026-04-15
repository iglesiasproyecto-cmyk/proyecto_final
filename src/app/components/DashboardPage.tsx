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
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";
import { SimpleBarChart, SimpleDonutChart } from "./SimpleCharts";
import {
  Building2, Users, CalendarDays, ListTodo, BookOpen, ClipboardCheck, Bell,
  ArrowRight, CheckCircle2, Clock, AlertCircle, ChevronRight, Globe,
  Church, UserCheck, Settings, TrendingUp, Sparkles, Activity
} from "lucide-react";

const statusColors: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  en_progreso: "bg-blue-100 text-blue-700",
  completada: "bg-green-100 text-green-700",
};
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
    >
      <Card className={`${className} transition-all duration-200 ${onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5" : ""}`} onClick={onClick}>
        {children}
      </Card>
    </motion.div>
  );
}

function KPICard({ icon, iconBg, value, label, sublabel, index, onClick }: {
  icon: React.ReactNode; iconBg: string; value: number | string; label: string; sublabel?: string; index: number; onClick?: () => void;
}) {
  return (
    <AnimatedCard index={index} className="p-4 group" onClick={onClick}>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <p className="text-2xl tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sublabel && <p className="text-[10px] text-emerald-600 mt-0.5">{sublabel}</p>}
    </AnimatedCard>
  );
}

function SectionHeader({ icon, title, action, actionLabel = "Ver todos" }: {
  icon: React.ReactNode; title: string; action?: () => void; actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2.5 text-sm">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {action && (
        <button onClick={action} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors group">
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1>Panel de Control</h1>
            <p className="text-muted-foreground text-sm">Vista consolidada de la plataforma S.E.I.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard index={0} icon={<Building2 className="w-5 h-5 text-indigo-600" />} iconBg="bg-indigo-50" value={iglesias.length} label="Iglesias" sublabel={`${activeIglesias.length} activas`} onClick={() => navigate("/app/iglesias")} />
        <KPICard index={1} icon={<Church className="w-5 h-5 text-cyan-600" />} iconBg="bg-cyan-50" value={sedes.length} label="Sedes" sublabel={`${activeSedes} activas`} onClick={() => navigate("/app/sedes")} />
        <KPICard index={2} icon={<Users className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-50" value={usuarios.length} label="Usuarios" sublabel={`${activeUsers} activos`} onClick={() => navigate("/app/usuarios")} />
        <KPICard index={3} icon={<UserCheck className="w-5 h-5 text-violet-600" />} iconBg="bg-violet-50" value={pastores.length} label="Pastores" onClick={() => navigate("/app/pastores")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedCard index={4} className="p-5 lg:col-span-2">
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

        <AnimatedCard index={5} className="p-5">
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
        <AnimatedCard index={6} className="p-5 lg:col-span-2">
          <SectionHeader icon={<Building2 className="w-5 h-5" />} title="Iglesias Registradas" action={() => navigate("/app/iglesias")} actionLabel="Gestionar" />
          <div className="space-y-2">
            {iglesias.map((ig) => (
              <div
                key={ig.idIglesia}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer hover:bg-accent/50 border ${ig.estado !== "activa" ? "opacity-50 border-dashed border-border" : "border-transparent"}`}
                onClick={() => navigate("/app/iglesias")}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{ig.nombre}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {ig.ciudadNombre}, {ig.paisNombre}
                  </p>
                </div>
                <div className="hidden sm:flex gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1" title="Sedes"><Church className="w-3.5 h-3.5" /> {sedes.filter((s) => s.idIglesia === ig.idIglesia).length}</span>
                  <span className="flex items-center gap-1" title="Ministerios"><Settings className="w-3.5 h-3.5" /> {ministerios.filter((m) => m.idIglesia === ig.idIglesia).length}</span>
                </div>
                <Badge variant={ig.estado === "activa" ? "default" : "secondary"} className="text-[10px] shrink-0">{ig.estado}</Badge>
              </div>
            ))}
          </div>
        </AnimatedCard>

        <div className="space-y-4">
          <AnimatedCard index={7} className="p-4" onClick={() => navigate("/app/geografia")}>
            <SectionHeader icon={<Globe className="w-4 h-4" />} title="Cobertura Geografica" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-blue-50"><p className="text-lg text-blue-600">{paises.length}</p><p className="text-[10px] text-muted-foreground">Paises</p></div>
              <div className="p-2.5 rounded-xl bg-purple-50"><p className="text-lg text-purple-600">{departamentosGeo.length}</p><p className="text-[10px] text-muted-foreground">Deptos.</p></div>
              <div className="p-2.5 rounded-xl bg-green-50"><p className="text-lg text-green-600">{ciudades.length}</p><p className="text-[10px] text-muted-foreground">Ciudades</p></div>
            </div>
          </AnimatedCard>

          <AnimatedCard index={8} className="p-4">
            <SectionHeader icon={<Clock className="w-4 h-4" />} title="Actividad Reciente" />
            <div className="space-y-2.5">
              {recentUsers.map((u) => (
                <div key={u.idUsuario} className="flex items-center gap-2.5 text-xs">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[10px] text-primary shrink-0">{u.nombres[0]}{u.apellidos[0]}</div>
                  <span className="flex-1 truncate">{u.nombres} {u.apellidos}</span>
                  <span className="text-muted-foreground shrink-0">{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString("es", { day: "2-digit", month: "short" }) : "--"}</span>
                </div>
              ))}
            </div>
          </AnimatedCard>

          <AnimatedCard index={9} className="p-4">
            <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Accesos Rapidos" />
            <div className="space-y-1">
              {[
                { label: "Nueva Iglesia", path: "/app/iglesias", icon: <Building2 className="w-4 h-4" /> },
                { label: "Gestionar Sedes", path: "/app/sedes", icon: <Church className="w-4 h-4" /> },
                { label: "Ver Usuarios", path: "/app/usuarios", icon: <Users className="w-4 h-4" /> },
                { label: "Asignar Pastores", path: "/app/pastores", icon: <UserCheck className="w-4 h-4" /> },
              ].map((q) => (
                <button key={q.path + q.label} onClick={() => navigate(q.path)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors group">
                  <span className="text-primary/70 group-hover:text-primary transition-colors">{q.icon}</span>
                  <span className="flex-1 text-left text-xs">{q.label}</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </AnimatedCard>
        </div>
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-muted-foreground text-sm">Bienvenido de vuelta</p>
        <h1>{usuarioActual.nombres} {usuarioActual.apellidos}</h1>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard index={0} icon={<Settings className="w-5 h-5 text-indigo-600" />} iconBg="bg-indigo-50" value={activeMins.length} label="Ministerios activos" onClick={() => navigate("/app/departamentos")} />
        <KPICard index={1} icon={<Users className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-50" value={activeMembers.length} label="Miembros activos" onClick={() => navigate("/app/miembros")} />
        <KPICard index={2} icon={<CalendarDays className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" value={globalEvents.length} label="Eventos globales" onClick={() => navigate("/app/eventos")} />
        <KPICard index={3} icon={<Bell className="w-5 h-5 text-red-600" />} iconBg="bg-red-50" value={unread} label="Sin leer" onClick={() => navigate("/app/notificaciones")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard index={4} className="p-5">
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
          <div className="space-y-2">
            {ministerios.slice(0, 4).map((min) => (
              <div key={min.idMinisterio} className={`flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer ${min.estado !== "activo" ? "opacity-50" : ""}`} onClick={() => navigate("/app/departamentos")}>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm">{min.nombre.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{min.nombre}</p>
                  <p className="text-xs text-muted-foreground">{min.liderNombre} &middot; {min.cantidadMiembros} miembros</p>
                </div>
                <Badge variant={min.estado === "activo" ? "secondary" : "outline"} className="text-[10px]">{min.estado}</Badge>
              </div>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard index={5} className="p-5">
          <SectionHeader icon={<CalendarDays className="w-5 h-5" />} title="Eventos Globales" action={() => navigate("/app/eventos")} />
          <div className="space-y-3">
            {globalEvents.slice(0, 5).map((ev) => (
              <div key={ev.idEvento} className="flex items-start gap-3 p-3 rounded-xl bg-accent/30">
                <div className="w-12 text-center shrink-0 py-1">
                  <p className="text-[10px] text-muted-foreground uppercase">{new Date(ev.fechaInicio).toLocaleDateString("es", { month: "short" })}</p>
                  <p className="text-lg">{new Date(ev.fechaInicio).getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{ev.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ev.sedeNombre || ev.tipoEventoNombre}</p>
                </div>
              </div>
            ))}
            {globalEvents.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No hay eventos globales</p>}
          </div>
        </AnimatedCard>

        <AnimatedCard index={6} className="p-5 lg:col-span-2">
          <SectionHeader icon={<Bell className="w-5 h-5" />} title={`Notificaciones ${unread > 0 ? `(${unread})` : ""}`} action={() => navigate("/app/notificaciones")} actionLabel="Ver todas" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {notificaciones.slice(0, 4).map((n) => (
              <div key={n.idNotificacion} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${n.leida ? "bg-accent/20" : "bg-primary/5 border border-primary/10"}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.leida ? "bg-muted" : "bg-primary animate-pulse"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{n.titulo}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.mensaje}</p>
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
    { name: "Completada", value: tareas.filter((t) => t.estado === "completada").length, fill: "#22c55e" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-muted-foreground text-sm">Bienvenido de vuelta</p>
        <h1>{usuarioActual.nombres} {usuarioActual.apellidos}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{min?.nombre} &mdash; Lider</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard index={0} icon={<Users className="w-5 h-5 text-indigo-600" />} iconBg="bg-indigo-50" value={minMembers.length} label="Miembros" onClick={() => navigate("/app/miembros")} />
        <KPICard index={1} icon={<ListTodo className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50" value={pendingTareas.length} label="Tareas pendientes" onClick={() => navigate("/app/tareas")} />
        <KPICard index={2} icon={<CalendarDays className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" value={eventos.length} label="Eventos" onClick={() => navigate("/app/eventos")} />
        <KPICard index={3} icon={<ClipboardCheck className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" value={evaluaciones.length} label="Evaluaciones" onClick={() => navigate("/app/evaluaciones")} />
        <KPICard index={4} icon={<BookOpen className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-50" value={cursos.length} label="Cursos" onClick={() => navigate("/app/aula")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedCard index={5} className="p-5 lg:col-span-2">
          <SectionHeader icon={<ListTodo className="w-5 h-5" />} title="Tareas del Ministerio" action={() => navigate("/app/tareas")} />
          <div className="space-y-2">
            {tareas.slice(0, 5).map((t) => (
              <div key={t.idTarea} className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate("/app/tareas")}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${statusColors[t.estado]}`}>{statusIcons[t.estado]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{t.titulo}</p>
                  <p className="text-xs text-muted-foreground">{t.asignados?.map((a) => a.nombreCompleto).join(", ")}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusColors[t.estado]} border-0`}>{statusLabels[t.estado]}</Badge>
              </div>
            ))}
            {tareas.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin tareas</p>}
          </div>
        </AnimatedCard>

        <AnimatedCard index={6} className="p-5">
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
        <AnimatedCard index={7} className="p-5">
          <SectionHeader icon={<CalendarDays className="w-5 h-5" />} title="Proximos Eventos" action={() => navigate("/app/eventos")} />
          <div className="space-y-3">
            {upcomingEvents.map((ev) => (
              <div key={ev.idEvento} className="flex items-start gap-3 p-3 rounded-xl bg-accent/30">
                <div className="w-12 text-center shrink-0 py-1">
                  <p className="text-[10px] text-muted-foreground uppercase">{new Date(ev.fechaInicio).toLocaleDateString("es", { month: "short" })}</p>
                  <p className="text-lg">{new Date(ev.fechaInicio).getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{ev.nombre}</p>
                  <p className="text-xs text-muted-foreground">{ev.sedeNombre || ev.tipoEventoNombre}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{ev.idMinisterio ? "Min." : "Global"}</Badge>
              </div>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard index={8} className="p-5">
          <SectionHeader icon={<Users className="w-5 h-5" />} title="Equipo" action={() => navigate("/app/miembros")} />
          <div className="space-y-2">
            {minMembers.slice(0, 5).map((mm) => (
              <div key={mm.idMiembroMinisterio} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-xs">{(mm.nombreCompleto || "?").charAt(0)}</div>
                <div className="flex-1 min-w-0"><p className="text-sm truncate">{mm.nombreCompleto}</p></div>
                <Badge variant="outline" className="text-[10px]">{mm.rolEnMinisterio === "lider" ? "Lider" : "Servidor"}</Badge>
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-muted-foreground text-sm">Hola</p>
        <h1>{usuarioActual.nombres} {usuarioActual.apellidos}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{min?.nombre}</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard index={0} icon={<ListTodo className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50" value={pendingTareas.length} label="Tareas pendientes" onClick={() => navigate("/app/tareas")} />
        <KPICard index={1} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" value={completedTareas.length} label="Completadas" onClick={() => navigate("/app/tareas")} />
        <KPICard index={2} icon={<CalendarDays className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" value={eventos.length} label="Eventos" onClick={() => navigate("/app/eventos")} />
        <KPICard index={3} icon={<Bell className="w-5 h-5 text-red-600" />} iconBg="bg-red-50" value={unread} label="Sin leer" onClick={() => navigate("/app/notificaciones")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard index={4} className="p-5">
          <SectionHeader icon={<ListTodo className="w-5 h-5" />} title="Mis Tareas" action={() => navigate("/app/tareas")} />
          <div className="space-y-2">
            {myTareas.slice(0, 5).map((t) => (
              <div key={t.idTarea} className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate("/app/tareas")}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${statusColors[t.estado]}`}>{statusIcons[t.estado]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{t.titulo}</p>
                  <p className="text-xs text-muted-foreground">Limite: {t.fechaLimite || "Sin fecha"}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusColors[t.estado]} border-0`}>{statusLabels[t.estado]}</Badge>
              </div>
            ))}
            {myTareas.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin tareas asignadas</p>}
          </div>
        </AnimatedCard>

        <AnimatedCard index={5} className="p-5">
          <SectionHeader icon={<CalendarDays className="w-5 h-5" />} title="Proximos Eventos" action={() => navigate("/app/eventos")} />
          <div className="space-y-3">
            {eventos.slice(0, 4).map((ev) => (
              <div key={ev.idEvento} className="flex items-start gap-3 p-3 rounded-xl bg-accent/30">
                <div className="w-12 text-center shrink-0 py-1">
                  <p className="text-[10px] text-muted-foreground uppercase">{new Date(ev.fechaInicio).toLocaleDateString("es", { month: "short" })}</p>
                  <p className="text-lg">{new Date(ev.fechaInicio).getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{ev.nombre}</p>
                  <p className="text-xs text-muted-foreground">{ev.sedeNombre || ev.tipoEventoNombre}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard index={6} className="p-5">
          <SectionHeader icon={<ClipboardCheck className="w-5 h-5" />} title="Mis Evaluaciones" action={() => navigate("/app/evaluaciones")} />
          {evaluaciones.length > 0 ? (
            <div>
              <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-primary/5">
                <span className="text-2xl text-primary">{avgCal.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">promedio ({evaluaciones.length} eval.)</span>
              </div>
              <div className="space-y-2">
                {evaluaciones.slice(0, 3).map((ev) => (
                  <div key={ev.idEvaluacion} className="flex items-center justify-between p-2.5 rounded-xl bg-accent/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{ev.nombreCurso} &mdash; {ev.tituloModulo}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${ev.calificacion !== null && ev.calificacion >= 70 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"} border-0`}>
                      {ev.calificacion !== null ? ev.calificacion.toFixed(1) : "Pendiente"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sin evaluaciones aun</p>
          )}
        </AnimatedCard>

        <AnimatedCard index={7} className="p-5">
          <SectionHeader icon={<BookOpen className="w-5 h-5" />} title="Aula de Formacion" action={() => navigate("/app/aula")} actionLabel="Ir al aula" />
          <div className="space-y-2">
            {cursos.slice(0, 3).map((c, idx) => (
              <div key={c.idCurso} className="flex items-center gap-3 p-2.5 rounded-xl bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/app/aula")}>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm">{idx + 1}</div>
                <div className="flex-1">
                  <p className="text-sm">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.modulos?.length || 0} modulos</p>
                </div>
              </div>
            ))}
            {cursos.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin cursos disponibles</p>}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
