import { useState, useMemo } from "react";
import { useCumpleanos, type UsuarioCumpleanos } from "@/hooks/useCumpleanos";
import { useApp } from "@/app/store/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

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

const PALETTES = [
  "from-blue-500 to-blue-700",
  "from-teal-500 to-teal-700",
  "from-indigo-500 to-indigo-700",
  "from-violet-500 to-violet-700",
  "from-sky-500 to-sky-700",
  "from-emerald-500 to-emerald-700",
  "from-rose-500 to-rose-700",
  "from-amber-500 to-amber-700",
];

function palette(id: number) { return PALETTES[id % PALETTES.length]; }

type Tab = "hoy" | "proximos" | "todos";

interface Filtrados {
  hoy: UsuarioCumpleanos[];
  proximos: UsuarioCumpleanos[];
  todos: UsuarioCumpleanos[];
}

// ── Scope badge icon ──────────────────────────────────────────────────────────

const SCOPE_META = {
  sistema: { icon: "🌐", color: "#0c2340", bg: "#e0eaf5" },
  iglesia: { icon: "⛪", color: "#1a7fa8", bg: "#dbeafe" },
  sede: { icon: "🏛️", color: "#0891b2", bg: "#cffafe" },
  ministerio: { icon: "🤝", color: "#059669", bg: "#d1fae5" },
  propio: { icon: "👤", color: "#7c3aed", bg: "#ede9fe" },
};

// ── Componente principal ──────────────────────────────────────────────────────

export function CumpleanosPage() {
  const { data: todos, isLoading, error, scope } = useCumpleanos();
  const { rolActual, isMockMode, mockRol } = useApp();
  const rol = isMockMode ? mockRol : rolActual;

  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem("cumpleanos_tab") as Tab) ?? "hoy");
  const [rango, setRango] = useState(() => parseInt(localStorage.getItem("cumpleanos_rango") ?? "7", 10));
  const [mesFiltro, setMesFiltro] = useState("todos");

  const handleTab = (t: Tab) => { setTab(t); localStorage.setItem("cumpleanos_tab", t); };
  const handleRango = (v: string) => { setRango(parseInt(v, 10)); localStorage.setItem("cumpleanos_rango", v); };

  const conFecha = useMemo(
    () => todos.filter((u) => u.activo && u.fechaNacimiento) as (UsuarioCumpleanos & { fechaNacimiento: string })[],
    [todos]
  );

  const filtrados: Filtrados = useMemo(() => {
    const hoy = conFecha.filter((u) => isToday(u.fechaNacimiento));
    const proximos = conFecha
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
    return { hoy, proximos, todos: todosArr };
  }, [conFecha, rango, mesFiltro]);

  const stats = useMemo(() => ({
    hoy: filtrados.hoy.length,
    semana: conFecha.filter((u) => { const d = getDaysUntil(u.fechaNacimiento); return d > 0 && d <= 7; }).length,
    mes: conFecha.filter((u) => {
      const today = new Date();
      return parseInt(u.fechaNacimiento.split("-")[1], 10) === today.getMonth() + 1;
    }).length,
    total: conFecha.length,
  }), [filtrados, conFecha]);

  const current = filtrados[tab];
  const scopeMeta = SCOPE_META[scope.tipo];

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState />;

  // Servidor sin ministerio: vista especial solo de su perfil
  if (scope.tipo === "propio") {
    return <PropioView usuarios={conFecha} />;
  }

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: "linear-gradient(135deg, #1a7fa8 0%, #0c2340 100%)" }}
          >
            <span className="text-2xl">🎂</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
              Cumpleaños
            </h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Celebra con tu comunidad
              </span>
              <ScopeBadge label={scope.label} meta={scopeMeta} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Hoy" count={stats.hoy} accent="#f59e0b" icon="🎉" />
          <StatPill label="Esta semana" count={stats.semana} accent="#1a7fa8" icon="📅" />
          <StatPill label="Este mes" count={stats.mes} accent="#059669" icon="🗓️" />
          <StatPill label="Registrados" count={stats.total} accent="#0c2340" icon="👥" />
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <TabBar tab={tab} onTab={handleTab} counts={{ hoy: stats.hoy }} />

        {tab === "proximos" && (
          <Select value={String(rango)} onValueChange={handleRango}>
            <SelectTrigger className="w-[160px] rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
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
            <SelectTrigger className="w-[160px] rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
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

        <span className="ml-auto text-sm" style={{ color: "var(--muted-foreground)" }}>
          {current.length} {current.length === 1 ? "persona" : "personas"}
        </span>
      </div>

      {/* ── Grid ── */}
      {current.length === 0 ? (
        <EmptyState tab={tab} rango={rango} />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((u) => (
            <CumpleanosCard
              key={u.idUsuario}
              usuario={u as UsuarioCumpleanos & { fechaNacimiento: string }}
              diasFaltantes={getDaysUntil(u.fechaNacimiento!)}
              edad={getAge(u.fechaNacimiento!)}
              esHoy={isToday(u.fechaNacimiento!)}
              showRole={rol === "super_admin" || rol === "admin_iglesia"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── PropioView (servidor sin ministerio) ──────────────────────────────────────

function PropioView({ usuarios }: { usuarios: (UsuarioCumpleanos & { fechaNacimiento: string })[] }) {
  const propio = usuarios[0];

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)" }}
          >
            <span className="text-2xl">🎂</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
              Tu Cumpleaños
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Tu fecha especial registrada en el sistema
            </p>
          </div>
        </div>
      </div>

      {propio ? (
        <div className="max-w-sm">
          <CumpleanosCard
            usuario={propio}
            diasFaltantes={getDaysUntil(propio.fechaNacimiento)}
            edad={getAge(propio.fechaNacimiento)}
            esHoy={isToday(propio.fechaNacimiento)}
            showRole={false}
          />
        </div>
      ) : (
        <div
          className="rounded-2xl p-12 flex flex-col items-center text-center max-w-sm"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="text-5xl mb-4">📅</div>
          <p className="font-semibold" style={{ color: "var(--foreground)" }}>
            Sin fecha registrada
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Tu fecha de nacimiento no está registrada en el sistema
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ScopeBadge({ label, meta }: { label: string; meta: { icon: string; color: string; bg: string } }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.icon} {label}
    </span>
  );
}

function TabBar({ tab, onTab, counts }: { tab: Tab; onTab: (t: Tab) => void; counts: { hoy: number } }) {
  return (
    <div
      className="flex gap-1 p-1 rounded-xl"
      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
    >
      {(["hoy", "proximos", "todos"] as Tab[]).map((t) => (
        <button
          key={t}
          onClick={() => onTab(t)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: tab === t ? "var(--card)" : "transparent",
            color: tab === t ? "var(--foreground)" : "var(--muted-foreground)",
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {t === "hoy" ? "Hoy" : t === "proximos" ? "Próximos" : "Todos"}
          {t === "hoy" && counts.hoy > 0 && (
            <span
              className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
              style={{ background: "#f59e0b", color: "#fff" }}
            >
              {counts.hoy}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function StatPill({ label, count, accent, icon }: { label: string; count: number; accent: string; icon: string }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${accent}18` }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none" style={{ color: accent }}>{count}</p>
        <p className="text-xs mt-1 truncate" style={{ color: "var(--muted-foreground)" }}>{label}</p>
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

function CumpleanosCard({ usuario, diasFaltantes, edad, esHoy, showRole }: CardProps) {
  const grad = palette(usuario.idUsuario);
  const initials = getInitials(usuario.nombres, usuario.apellidos);
  const dateStr = formatBirthDate(usuario.fechaNacimiento);
  const nextAge = edad + (esHoy ? 0 : 1);

  return (
    <div
      className="group relative rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: esHoy ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" : "var(--card)",
        border: esHoy ? "1.5px solid #f59e0b" : "1px solid var(--border)",
        boxShadow: esHoy ? "0 4px 20px rgba(245,158,11,0.15)" : "0 1px 6px rgba(0,0,0,0.05)",
      }}
    >
      {esHoy && (
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: "#f59e0b", color: "#fff" }}
        >
          ¡HOY! 🎉
        </div>
      )}

      <div className="flex gap-4 items-start">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-md`}>
          <span className="text-lg font-bold text-white">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate leading-tight" style={{ color: "var(--foreground)" }}>
            {usuario.nombres} {usuario.apellidos}
          </p>
          {usuario.correo && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
              {usuario.correo}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              📅 {dateStr}
            </span>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {esHoy ? `Cumple ${nextAge} años hoy` : `Cumplirá ${nextAge} años`}
            </span>
          </div>
        </div>
      </div>

      {!esHoy && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <CountdownRow dias={diasFaltantes} />
        </div>
      )}
    </div>
  );
}

function CountdownRow({ dias }: { dias: number }) {
  const { color, label } = useMemo(() => {
    if (dias === 1) return { color: "#ef4444", label: "¡Mañana!" };
    if (dias <= 3) return { color: "#f97316", label: `En ${dias} días` };
    if (dias <= 7) return { color: "#1a7fa8", label: `En ${dias} días` };
    return { color: "#64748b", label: `En ${dias} días` };
  }, [dias]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-base">⏳</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="flex gap-1">
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

// ── Empty / Loading / Error ───────────────────────────────────────────────────

function EmptyState({ tab, rango }: { tab: Tab; rango: number }) {
  const msg = {
    hoy: { icon: "🎂", title: "Sin cumpleaños hoy", sub: "Nadie cumple años hoy" },
    proximos: { icon: "📅", title: "Sin próximos cumpleaños", sub: `Nadie cumple en los próximos ${rango} días` },
    todos: { icon: "👥", title: "Sin cumpleaños registrados", sub: "No hay fechas de nacimiento en este grupo" },
  }[tab];

  return (
    <div
      className="rounded-2xl p-16 flex flex-col items-center text-center"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="text-6xl mb-4">{msg.icon}</div>
      <p className="text-lg font-semibold mb-1" style={{ color: "var(--foreground)" }}>{msg.title}</p>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{msg.sub}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 w-64 rounded-2xl" style={{ background: "var(--muted)" }} />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-2xl" style={{ background: "var(--muted)" }} />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-36 rounded-2xl" style={{ background: "var(--muted)" }} />)}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div
      className="rounded-2xl p-12 flex flex-col items-center text-center"
      style={{ background: "var(--card)", border: "1.5px solid #ef4444" }}
    >
      <div className="text-5xl mb-3">⚠️</div>
      <p className="font-semibold" style={{ color: "var(--foreground)" }}>Error al cargar los datos</p>
      <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>No se pudo conectar con la base de datos</p>
    </div>
  );
}
