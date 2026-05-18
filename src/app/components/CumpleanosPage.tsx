import { useState, useMemo } from "react";
import { useCumpleanos, type UsuarioCumpleanos } from "@/hooks/useCumpleanos";
import { useApp } from "@/app/store/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { 
  Globe, Church, MapPin, Users, User, Gift, Calendar, 
  Sparkles, Clock, AlertTriangle, Search, Cake, Mail, CalendarDays, Compass
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysUntil(fn: string): number {
  const [, month, day] = fn.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bd = new Date(today.getFullYear(), month - 1, day);
  if (bd < today) bd.setFullYear(today.getFullYear() + 1);
  return Math.round((bd.getTime() - today.getTime()) / 86400000);
}

function getAge(fn: string): number {
  const today = new Date();
  const [year, month, day] = fn.split("-").map(Number);
  let age = today.getFullYear() - year;
  const md = today.getMonth() - (month - 1);
  if (md < 0 || (md === 0 && today.getDate() < day)) age--;
  return age;
}

function isToday(fn: string): boolean {
  const today = new Date();
  const [, month, day] = fn.split("-").map(Number);
  return today.getMonth() === month - 1 && today.getDate() === day;
}

function formatBirthDate(fn: string): string {
  const [, month, day] = fn.split("-").map(Number);
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${day} de ${months[month - 1]}`;
}

function getInitials(n: string, a: string) {
  return `${n.charAt(0)}${a.charAt(0)}`.toUpperCase();
}

type Tab = "hoy" | "proximos" | "todos";

interface Filtrados {
  hoy: UsuarioCumpleanos[];
  proximos: UsuarioCumpleanos[];
  todos: UsuarioCumpleanos[];
}

// ── Scope Badge Configuration ────────────────────────────────────────────────

const SCOPE_META = {
  sistema: { icon: <Globe className="w-3.5 h-3.5" /> },
  iglesia: { icon: <Church className="w-3.5 h-3.5" /> },
  sede: { icon: <MapPin className="w-3.5 h-3.5" /> },
  ministerio: { icon: <Users className="w-3.5 h-3.5" /> },
  propio: { icon: <User className="w-3.5 h-3.5" /> },
};

// ── Main Component ───────────────────────────────────────────────────────────

export function CumpleanosPage() {
  const { data: todos, isLoading, error, scope } = useCumpleanos();
  const { rolActual, isMockMode, mockRol, iglesiaActual } = useApp();
  const rol = isMockMode ? mockRol : rolActual;

  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem("cumpleanos_tab") as Tab) ?? "hoy");
  const [rango, setRango] = useState(() => parseInt(localStorage.getItem("cumpleanos_rango") ?? "7", 10));
  const [mesFiltro, setMesFiltro] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const handleTab = (t: Tab) => { setTab(t); localStorage.setItem("cumpleanos_tab", t); };
  const handleRango = (v: string) => { setRango(parseInt(v, 10)); localStorage.setItem("cumpleanos_rango", v); };

  const conFecha = useMemo(
    () => todos.filter((u) => u.activo && u.fechaNacimiento) as (UsuarioCumpleanos & { fechaNacimiento: string })[],
    [todos]
  );

  const filtrados: Filtrados = useMemo(() => {
    let hoy = conFecha.filter((u) => isToday(u.fechaNacimiento));
    let proximos = conFecha
      .filter((u) => { const d = getDaysUntil(u.fechaNacimiento); return d > 0 && d <= rango; })
      .sort((a, b) => getDaysUntil(a.fechaNacimiento) - getDaysUntil(b.fechaNacimiento));
    let todosArr = conFecha.slice().sort((a, b) => {
      const [, mA, dA] = a.fechaNacimiento.split("-").map(Number);
      const [, mB, dB] = b.fechaNacimiento.split("-").map(Number);
      return mA !== mB ? mA - mB : dA - dB;
    });

    if (mesFiltro !== "todos") {
      const m = parseInt(mesFiltro, 10);
      todosArr = todosArr.filter((u) => parseInt(u.fechaNacimiento.split("-")[1], 10) === m);
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      const matchFilter = (u: UsuarioCumpleanos) => 
        u.nombres.toLowerCase().includes(query) || 
        u.apellidos.toLowerCase().includes(query) || 
        (u.correo && u.correo.toLowerCase().includes(query));
      
      hoy = hoy.filter(matchFilter);
      proximos = proximos.filter(matchFilter);
      todosArr = todosArr.filter(matchFilter);
    }

    return { hoy, proximos, todos: todosArr };
  }, [conFecha, rango, mesFiltro, searchQuery]);

  const stats = useMemo(() => ({
    hoy: conFecha.filter((u) => isToday(u.fechaNacimiento)).length,
    semana: conFecha.filter((u) => { const d = getDaysUntil(u.fechaNacimiento); return d > 0 && d <= 7; }).length,
    mes: conFecha.filter((u) => {
      const today = new Date();
      return parseInt(u.fechaNacimiento.split("-")[1], 10) === today.getMonth() + 1;
    }).length,
    total: conFecha.length,
  }), [conFecha]);

  const current = filtrados[tab];
  const scopeMeta = SCOPE_META[scope.tipo] ?? SCOPE_META.propio;

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState />;

  if (scope.tipo === "propio") {
    return <PropioView usuarios={conFecha} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* ── Breathtaking Minimal & Clean Page Header (Matching Lumen Design) ── */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Cake className="w-7 h-7 text-[#1a7fa8] shrink-0" />
            Cumpleaños
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Celebra y mantén el registro de fechas especiales de tu comunidad en {iglesiaActual?.nombre || 'Lumen'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScopeBadge label={scope.label} icon={scopeMeta.icon} />
        </div>
      </motion.div>

      {/* ── Dynamic Stats Grid (Matching KpiCard layout in StatisticsPage) ── */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatPill 
          label="Cumplen Hoy" 
          count={stats.hoy} 
          icon={<Sparkles className="w-5 h-5" />} 
        />
        <StatPill 
          label="Esta semana" 
          count={stats.semana} 
          icon={<Calendar className="w-5 h-5" />} 
        />
        <StatPill 
          label="Este mes" 
          count={stats.mes} 
          icon={<CalendarDays className="w-5 h-5" />} 
        />
        <StatPill 
          label="Miembros" 
          count={stats.total} 
          icon={<Users className="w-5 h-5" />} 
        />
      </motion.div>

      {/* ── Interactive Navigation & Filters Bar (Matching Statistics Page presets) ── */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4 items-center justify-between p-2.5 rounded-2xl bg-muted/30 border border-border/30 backdrop-blur-md"
      >
        <div className="flex flex-wrap gap-3 items-center">
          <Tabs value={tab} onValueChange={(v) => handleTab(v as Tab)} className="shrink-0">
            <TabsList className="bg-muted/50 border border-border/30 rounded-xl p-1">
              <TabsTrigger value="hoy" className="text-[11px] font-bold rounded-lg transition-all uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground">
                Hoy
                {stats.hoy > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#1a7fa8] text-white">
                    {stats.hoy}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="proximos" className="text-[11px] font-bold rounded-lg transition-all uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-foreground">
                Próximos
              </TabsTrigger>
              <TabsTrigger value="todos" className="text-[11px] font-bold rounded-lg transition-all uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-foreground">
                Todos
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "proximos" && (
            <Select value={String(rango)} onValueChange={handleRango}>
              <SelectTrigger className="w-[180px] rounded-xl text-xs font-bold uppercase tracking-wider bg-card border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Próximos 7 días</SelectItem>
                <SelectItem value="15">Próximos 15 días</SelectItem>
                <SelectItem value="30">Próximos 30 días</SelectItem>
              </SelectContent>
            </Select>
          )}

          {tab === "todos" && (
            <Select value={mesFiltro} onValueChange={setMesFiltro}>
              <SelectTrigger className="w-[180px] rounded-xl text-xs font-bold uppercase tracking-wider bg-card border-border/50 text-foreground">
                <SelectValue placeholder="Filtrar mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Real-time search filter */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo..."
            className="w-full h-10 pl-9 pr-4 rounded-xl text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground transition-all duration-300 outline-none"
          />
        </div>
      </motion.div>

      {/* ── Responsive Glassmorphic Cards Grid (Light & Dark Theme Compliant) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${tab}-${rango}-${mesFiltro}-${searchQuery}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4 }}
        >
          {current.length === 0 ? (
            <EmptyState tab={tab} rango={rango} hasFilter={searchQuery.trim() !== ""} />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {current.map((u, i) => (
                <motion.div
                  key={u.idUsuario}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <CumpleanosCard
                    usuario={u as UsuarioCumpleanos & { fechaNacimiento: string }}
                    diasFaltantes={getDaysUntil(u.fechaNacimiento!)}
                    edad={getAge(u.fechaNacimiento!)}
                    esHoy={isToday(u.fechaNacimiento!)}
                    showRole={rol === "super_admin" || rol === "admin_iglesia"}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── PropioView (Server without ministry) ──────────────────────────────────────

function PropioView({ usuarios }: { usuarios: (UsuarioCumpleanos & { fechaNacimiento: string })[] }) {
  const propio = usuarios[0];

  return (
    <div className="space-y-6 max-w-md mx-auto pb-10 flex flex-col justify-center min-h-[70vh]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a7fa8] to-[#0c2340] flex items-center justify-center shadow-lg mx-auto mb-4 text-[#5cbcd6]">
          <Gift className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Tu Cumpleaños</h1>
        <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
          Tu fecha de nacimiento registrada en Lumen
        </p>
      </motion.div>

      {propio ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CumpleanosCard
            usuario={propio}
            diasFaltantes={getDaysUntil(propio.fechaNacimiento)}
            edad={getAge(propio.fechaNacimiento)}
            esHoy={isToday(propio.fechaNacimiento)}
            showRole={false}
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-10 flex flex-col items-center text-center backdrop-blur-2xl bg-card border border-border/40 shadow-xl"
        >
          <Calendar className="w-12 h-12 text-[#1a7fa8] mb-4 animate-bounce" />
          <p className="font-bold text-foreground text-lg">Sin fecha registrada</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Tu fecha de nacimiento no está registrada en el sistema. Comunícate con tu administrador para actualizar tu perfil.
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ScopeBadge({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Badge 
      variant="outline" 
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/5 text-primary border-primary/20 shadow-sm"
    >
      {icon}
      <span>{label}</span>
    </Badge>
  );
}

function StatPill({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card/45 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-4 dark:border-white/10 dark:bg-card/20 flex items-center gap-4 transition-all duration-300 hover:translate-y-[-2px] group hover:border-border/80">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
      <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-[#1a7fa8] to-[#0c2340] flex items-center justify-center shadow-lg text-white shrink-0 group-hover:scale-105 transition-transform duration-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-light tracking-tight text-foreground leading-none">{count}</p>
        <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest truncate">{label}</p>
      </div>
    </div>
  );
}

// ── CumpleanosCard ────────────────────────────────────────────────────────────

interface CardProps {
  usuario: UsuarioCumpleanos & { fechaNacimiento: string };
  diasFaltantes: number;
  edad: number;
  esHoy: boolean;
  showRole: boolean;
}

function CumpleanosCard({ usuario, diasFaltantes, edad, esHoy }: CardProps) {
  const initials = getInitials(usuario.nombres, usuario.apellidos);
  const dateStr = formatBirthDate(usuario.fechaNacimiento);
  const nextAge = edad + (esHoy ? 0 : 1);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-card/45 backdrop-blur-2xl border transition-all duration-300 p-5 flex flex-col justify-between hover:translate-y-[-2px] ${
        esHoy 
          ? "border-[#1a7fa8] dark:border-[#1a7fa8]/70 shadow-[0_12px_30px_rgba(26,127,168,0.12)] bg-card/60" 
          : "border-border/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:bg-card/20 hover:border-border/80 dark:hover:border-white/20"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
      
      {esHoy && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#1a7fa8]/10 text-[#1a7fa8] border border-[#1a7fa8]/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse relative z-10">
          <Sparkles className="w-2.5 h-2.5" />
          ¡HOY!
        </div>
      )}

      <div className="flex gap-4 items-start mb-4 relative z-10">
        {/* Glowing Profile Initials */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg text-white font-bold text-sm tracking-wider group-hover:scale-105 transition-transform duration-500">
            {initials}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-foreground text-sm truncate leading-tight group-hover:text-[#1a7fa8] transition-colors">
            {usuario.nombres} {usuario.apellidos}
          </p>
          {usuario.correo ? (
            <p className="text-muted-foreground text-[11px] mt-1 truncate flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 opacity-60" />
              {usuario.correo}
            </p>
          ) : (
            <p className="text-muted-foreground/50 text-[11px] mt-1 truncate italic">Sin correo registrado</p>
          )}

          <div className="mt-3.5 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-primary/5 text-primary border border-primary/10 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#1a7fa8]" />
              {dateStr}
            </Badge>
            <span className="text-[11px] text-muted-foreground font-semibold">
              {esHoy ? `Cumple ${nextAge} hoy` : `Cumplirá ${nextAge} años`}
            </span>
          </div>
        </div>
      </div>

      {!esHoy && (
        <div className="mt-4 pt-3.5 border-t border-border/30 dark:border-white/5 relative z-10">
          <CountdownRow dias={diasFaltantes} />
        </div>
      )}
    </div>
  );
}

function CountdownRow({ dias }: { dias: number }) {
  const { color, label, bg } = useMemo(() => {
    if (dias === 1) return { color: "#ef4444", label: "¡Mañana!", bg: "rgba(239, 68, 68, 0.08)" };
    if (dias <= 3) return { color: "#c5a96a", label: `En ${dias} días`, bg: "rgba(197, 169, 106, 0.08)" };
    return { color: "#1a7fa8", label: `En ${dias} días`, bg: "rgba(26, 127, 168, 0.08)" };
  }, [dias]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ color, background: bg }}>
          {label}
        </span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{
              background: i < Math.max(1, Math.ceil(10 - (10 * Math.min(dias, 30)) / 30)) ? color : `${color}25`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Empty / Loading / Error States ──────────────────────────────────────────

function EmptyState({ tab, rango, hasFilter }: { tab: Tab; rango: number; hasFilter: boolean }) {
  const msg = useMemo(() => {
    if (hasFilter) {
      return { icon: <Search className="w-12 h-12 text-muted-foreground mb-4" />, title: "Sin coincidencias", sub: "Prueba modificando tu búsqueda" };
    }
    return {
      hoy: { icon: <Cake className="w-12 h-12 text-[#1a7fa8] mb-4 animate-pulse" />, title: "Sin cumpleaños hoy", sub: "Nadie cumple años el día de hoy" },
      proximos: { icon: <CalendarDays className="w-12 h-12 text-[#1a7fa8] mb-4" />, title: "Sin próximos cumpleaños", sub: `Nadie cumple años en los próximos ${rango} días` },
      todos: { icon: <Compass className="w-12 h-12 text-[#1a7fa8] mb-4" />, title: "Sin registros", sub: "No hay fechas registradas para este filtro" },
    }[tab];
  }, [tab, rango, hasFilter]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl p-16 flex flex-col items-center text-center backdrop-blur-2xl bg-card/40 border border-border/50 shadow-sm"
    >
      {msg.icon}
      <p className="text-lg font-bold text-foreground mb-2">{msg.title}</p>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{msg.sub}</p>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto pb-10">
      <div className="h-20 w-full rounded-2xl bg-muted" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted" />)}
      </div>
      <div className="h-16 w-full rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-44 rounded-2xl bg-muted" />)}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-2xl p-12 flex flex-col items-center text-center backdrop-blur-2xl bg-card border border-rose-500/20 shadow-sm max-w-md mx-auto min-h-[40vh] justify-center">
      <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
      <p className="font-bold text-foreground text-lg">Error al cargar datos</p>
      <p className="text-xs text-rose-400 mt-2 leading-relaxed">
        No se pudo establecer la conexión con la base de datos de Lumen. Por favor, reintente en unos minutos.
      </p>
    </div>
  );
}
