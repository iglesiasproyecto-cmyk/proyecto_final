import { useState, useEffect, useLayoutEffect } from "react";
import { useParams } from "react-router";
import { useEventosEnriquecidos, useDeleteEvento, useCreateEvento, useUpdateEvento } from "@/hooks/useEventos";
import { useSedesEnriquecidas } from "@/hooks/useIglesias";
import { useMinisteriosEnriquecidos, useMinisteriosIdsDeUsuario } from "@/hooks/useMinisterios";
import { useCanManageMinisterio } from "@/hooks/useMinisterioRole";
import type { EventoEnriquecido } from "@/services/eventos.service";
import { useApp } from "@/app/store/AppContext";
import { debugLog } from "@/lib/debug";
import { AnimatedCard } from "./ui/AnimatedCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "./ui/skeleton";
import { SedeMinisterioSelector } from "./ui/SedeMinisterioSelector";
import {
  CalendarDays, Plus, MapPin, Clock, Globe, Users, Pencil, Trash2, Eye,
  CheckCircle2, XCircle, PlayCircle, BookMarked, Church, ListTodo, Wallet
} from "lucide-react";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { toast } from "sonner";
import { EventoPresupuestoDrawer } from "./EventoPresupuestoDrawer";
import { usePresupuestoResumenIglesia } from "@/hooks/useEventoPresupuesto";
import { buildResumen } from "@/services/evento-presupuesto.service";

const estadoConfig: Record<string, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  programado:  { label: "Programado",  color: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",    dot: "bg-[#4682b4]",    icon: <BookMarked className="w-3 h-3" /> },
  en_curso:    { label: "En Curso",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400",   icon: <PlayCircle className="w-3 h-3" /> },
  finalizado:  { label: "Finalizado",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400", icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelado:   { label: "Cancelado",   color: "bg-rose-500/10 text-rose-400 border-rose-500/20",    dot: "bg-rose-400",    icon: <XCircle className="w-3 h-3" /> },
};

const scopeConfig = {
  global:     { label: "Global",      color: "bg-primary/10 text-primary border-primary/20",           icon: <Globe className="w-3 h-3" /> },
  ministerio: { label: "Ministerial", color: "bg-violet-500/10 text-violet-400 border-violet-500/20",  icon: <Users className="w-3 h-3" /> },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{children}</label>;
}

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      {...props}
      className={`h-11 bg-background/50 border-white/10 rounded-xl text-sm ${props.className ?? ""}`}
    />
  );
}

function GlassSelect({ value, onChange, children }: { value: number; onChange: (v: number) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
    >
      {children}
    </select>
  );
}

function EventDialogFields({ form, setForm, sedes = [], ministerios = [] }: { form: any; setForm: (f: any) => void; sedes?: any[]; ministerios?: any[] }) {
  const shouldHideSelectorFields = form._hideSelectorFields ?? false;

  return (
    <div className="space-y-4 py-2">
      <div>
        <FieldLabel>Nombre del Evento</FieldLabel>
        <GlassInput value={form.nombre} onChange={e => setForm((p: any) => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Culto de Adoración Especial" />
      </div>
      <div>
        <FieldLabel>Detalle del Evento <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span></FieldLabel>
        <GlassInput value={form.tipoEventoTexto} onChange={e => setForm((p: any) => ({ ...p, tipoEventoTexto: e.target.value }))} placeholder="Ej. Vigilia, aniversario, campaña, culto especial..." />
      </div>
      {!shouldHideSelectorFields && (
        <SedeMinisterioSelector
          sedes={sedes}
          ministerios={ministerios}
          selectedSedeId={form.idSede}
          selectedMinisterioId={form.idMinisterio}
          onSedeChange={(idSede, clearMinisterio) =>
            setForm((p: any) => ({
              ...p,
              idSede,
              idMinisterio: clearMinisterio ? 0 : p.idMinisterio,
            }))
          }
          onMinisterioChange={(idMinisterio, autoSedeId) =>
            setForm((p: any) => ({ ...p, idMinisterio, idSede: autoSedeId }))
          }
          sedeReadOnly={form._sedeReadOnly ?? false}
          ministerioReadOnly={form._ministerioReadOnly ?? false}
          allowNoMinisterio={form._allowNoMinisterio ?? true}
          allowGeneral={form._allowGeneral ?? false}
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Inicio</FieldLabel>
          <div className="relative">
            <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/75 pointer-events-none" />
            <GlassInput 
              type="datetime-local" 
              value={form.fechaInicio} 
              onChange={e => setForm((p: any) => ({ ...p, fechaInicio: e.target.value }))} 
              className="pl-10 hover:border-primary/40 focus-visible:ring-primary/20 transition-all cursor-pointer select-none" 
            />
          </div>
        </div>
        <div>
          <FieldLabel>Fin</FieldLabel>
          <div className="relative">
            <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/75 pointer-events-none" />
            <GlassInput 
              type="datetime-local" 
              value={form.fechaFin} 
              onChange={e => setForm((p: any) => ({ ...p, fechaFin: e.target.value }))} 
              className="pl-10 hover:border-primary/40 focus-visible:ring-primary/20 transition-all cursor-pointer select-none" 
            />
          </div>
        </div>
      </div>
      {"estado" in form && (
        <div>
          <FieldLabel>Estado</FieldLabel>
          <Select value={(form as any).estado} onValueChange={v => setForm((p: any) => ({ ...p, estado: v }))}>
            <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="programado">Programado</SelectItem>
              <SelectItem value="en_curso">En Curso</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <FieldLabel>Descripción <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(opcional)</span></FieldLabel>
        <GlassInput value={form.descripcion} onChange={e => setForm((p: any) => ({ ...p, descripcion: e.target.value }))} placeholder="Breve descripción del evento" />
      </div>
    </div>
  );
}

function FinanzasTab({
  eventos,
  ministerios,
  resumenEventos,
  totalIngresosPlaneados,
  totalIngresosReales,
  totalEgresosPlaneados,
  totalEgresosReales,
  totalBalanceNeto,
  eventosConPresupuesto,
  finanzasMinisterioFilter,
  setFinanzasMinisterioFilter,
  finanzasMes,
  setFinanzasMes,
  setPresupuestoEvento,
}: {
  eventos: EventoEnriquecido[]
  ministerios: any[]
  resumenEventos: ReturnType<typeof buildResumen>
  totalIngresosPlaneados: number
  totalIngresosReales: number
  totalEgresosPlaneados: number
  totalEgresosReales: number
  totalBalanceNeto: number
  eventosConPresupuesto: number
  finanzasMinisterioFilter: number
  setFinanzasMinisterioFilter: (value: number) => void
  finanzasMes: number
  setFinanzasMes: (value: number) => void
  setPresupuestoEvento: (evento: EventoEnriquecido | null) => void
}) {
  const meses = [
    { value: 0, label: "Todos" },
    { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
    { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
  ]

  const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Ingresos plan.", value: fmt(totalIngresosPlaneados), sub: `Real: ${fmt(totalIngresosReales)}`, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Egresos plan.", value: fmt(totalEgresosPlaneados), sub: `Real: ${fmt(totalEgresosReales)}`, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
          { label: "Balance neto", value: `${totalBalanceNeto >= 0 ? "+" : ""}${fmt(totalBalanceNeto)}`, sub: `Plan: ${fmt(totalIngresosPlaneados - totalEgresosPlaneados)}`, color: totalBalanceNeto >= 0 ? "text-emerald-400" : "text-rose-400", bg: "bg-primary/10 border-primary/20" },
          { label: "Con presupuesto", value: `${eventosConPresupuesto} / ${resumenEventos.length}`, sub: `${resumenEventos.length - eventosConPresupuesto} sin asignar`, color: "text-foreground", bg: "bg-card/40 border-border/50" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border p-4 ${kpi.bg}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={String(finanzasMinisterioFilter)} onValueChange={(v) => setFinanzasMinisterioFilter(Number(v))}>
          <SelectTrigger className="h-9 bg-card/40 border-border/50 rounded-xl text-xs w-48">
            <SelectValue placeholder="Todos los ministerios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Todos los ministerios</SelectItem>
            {ministerios.map((m) => (
              <SelectItem key={m.idMinisterio} value={String(m.idMinisterio)}>{m.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(finanzasMes)} onValueChange={(v) => setFinanzasMes(Number(v))}>
          <SelectTrigger className="h-9 bg-card/40 border-border/50 rounded-xl text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {meses.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {resumenEventos.map((r) => {
          const hasBudget = r.items.length > 0
          const pct = r.ingresosPlaneados + r.egresosPlaneados > 0
            ? Math.round(((r.ingresosReales + r.egresosReales) / (r.ingresosPlaneados + r.egresosPlaneados)) * 100)
            : 0
          const ev = eventos.find((e) => e.idEvento === r.idEvento)
          if (!ev) return null
          const nombreMinisterio = r.idMinisterio
            ? ministerios.find((m) => m.idMinisterio === r.idMinisterio)?.nombre ?? "Ministerio"
            : "Global"

          return (
            <div
              key={r.idEvento}
              onClick={() => setPresupuestoEvento(ev)}
              className="bg-card/40 border border-border/50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{r.nombreEvento}</p>
                <p className="text-xs text-muted-foreground">{nombreMinisterio} · {new Date(r.fechaInicio).toLocaleDateString("es-CO")}</p>
              </div>
              {hasBudget ? (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-muted-foreground">Ingresos</p>
                    <p className="text-sm font-semibold text-emerald-400">{fmt(r.ingresosReales)}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-muted-foreground">Egresos</p>
                    <p className="text-sm font-semibold text-rose-400">{fmt(r.egresosReales)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Balance</p>
                    <p className={`text-sm font-bold ${r.balanceNeto >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {r.balanceNeto >= 0 ? "+" : ""}{fmt(r.balanceNeto)}
                    </p>
                  </div>
                  <div className="w-14 hidden md:block">
                    <p className="text-[10px] text-muted-foreground mb-1">Ejecutado</p>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-primary mt-0.5">{pct}%</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground italic">Sin presupuesto</p>
                  <span className="text-xs text-primary border border-primary/30 rounded-lg px-2 py-0.5 bg-primary/5">+ Agregar</span>
                </div>
              )}
              <span className="text-muted-foreground/40 text-lg">›</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function EventsPage() {
  const { idIglesia } = useParams<{ idIglesia: string }>();
  const idIglesiaNum = Number(idIglesia) || undefined;
  const { iglesiaActual, rolActual, usuarioActual, ministeriosDelUsuario } = useApp();
  const { data: eventos = [], isLoading } = useEventosEnriquecidos(idIglesiaNum);
  const { data: sedes = [] } = useSedesEnriquecidas(idIglesiaNum);
  const { data: ministerios = [] } = useMinisteriosEnriquecidos(idIglesiaNum);
  const { data: usuarioMinisterioIds = [] } = useMinisteriosIdsDeUsuario(rolActual === "lider" ? usuarioActual?.idUsuario : undefined);
  const createEventoMutation = useCreateEvento();
  const deleteEventoMutation = useDeleteEvento();
  const updateEventoMutation = useUpdateEvento();

  const [showCreate, setShowCreate] = useState(false);
  const [editEvento, setEditEvento] = useState<EventoEnriquecido | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventoEnriquecido | null>(null);
  const [confirmDeleteEvento, setConfirmDeleteEvento] = useState<{ isOpen: boolean; id: number; nombre: string }>({ isOpen: false, id: 0, nombre: "" });
  const [presupuestoEvento, setPresupuestoEvento] = useState<EventoEnriquecido | null>(null);
  const [finanzasMinisterioFilter, setFinanzasMinisterioFilter] = useState<number>(0);
  const [finanzasMes, setFinanzasMes] = useState<number>(new Date().getMonth() + 1);
  const [finanzasAnio] = useState<number>(new Date().getFullYear());

  const [createForm, setCreateForm] = useState<any>({ nombre: "", descripcion: "", tipoEventoTexto: "", fechaInicio: "", fechaFin: "", idSede: 0, idMinisterio: 0 });
  const [editForm, setEditForm] = useState({ nombre: "", descripcion: "", tipoEventoTexto: "", fechaInicio: "", fechaFin: "", estado: "programado" as string, idSede: 0, idMinisterio: 0 });

  const canManageEvents = rolActual === "lider" || rolActual === "admin_iglesia" || rolActual === "admin_sede" || rolActual === "super_admin";
  const canSeeBudget = rolActual !== "servidor";

  const presupuestoFilters = {
    idMinisterio: finanzasMinisterioFilter || null,
    mes: finanzasMes || null,
    anio: finanzasAnio,
  };
  const { data: presupuestoItems = [] } = usePresupuestoResumenIglesia(
    canSeeBudget ? idIglesiaNum : undefined,
    presupuestoFilters
  );

  const eventosParaResumen = finanzasMinisterioFilter
    ? eventos.filter((e) => e.idMinisterio === finanzasMinisterioFilter)
    : eventos;

  const resumenEventos = buildResumen(
    eventosParaResumen.map((e) => ({
      idEvento: e.idEvento,
      nombre: e.nombre,
      fechaInicio: e.fechaInicio,
      idMinisterio: e.idMinisterio ?? null,
      idSede: e.idSede ?? null,
    })),
    presupuestoItems
  );

  const totalIngresosPlaneados = resumenEventos.reduce((s, r) => s + r.ingresosPlaneados, 0);
  const totalIngresosReales = resumenEventos.reduce((s, r) => s + r.ingresosReales, 0);
  const totalEgresosPlaneados = resumenEventos.reduce((s, r) => s + r.egresosPlaneados, 0);
  const totalEgresosReales = resumenEventos.reduce((s, r) => s + r.egresosReales, 0);
  const totalBalanceNeto = totalIngresosReales - totalEgresosReales;
  const eventosConPresupuesto = resumenEventos.filter((r) => r.items.length > 0).length;

  const isAdminSede = rolActual === "admin_sede";
  const isLider = rolActual === "lider";

  const [activeMinisterioFilter] = useState<number>(0);
  const canCreateInContext = useCanManageMinisterio(activeMinisterioFilter || null);
  const canShowCreateButton = canManageEvents && (activeMinisterioFilter === 0 || canCreateInContext);

  // Use ministeriosDelUsuario from context (available immediately at login) for reliable auto-fill
  const liderMinisterios = isLider ? ministeriosDelUsuario : [];
  const liderMinisterioIdsFromContext = liderMinisterios.map(m => m.id).filter(Boolean) as number[];
  // Fall back to async query IDs if context is empty
  const effectiveLiderIds = liderMinisterioIdsFromContext.length > 0 ? liderMinisterioIdsFromContext : (isLider ? usuarioMinisterioIds : []);
  const userLeadMinisterios = liderMinisterios.length || (isLider ? usuarioMinisterioIds.length : 0);
  const hasMultipleMinisterios = userLeadMinisterios >= 2;
  const shouldShowSelectorFields = true;

  // Full ministerio objects (with idSede) from async query, filtered to user's ministerios
  const ministeriosDisponiblesParaCrearAsync = isLider
    ? ministerios.filter((m) => effectiveLiderIds.includes(m.idMinisterio))
    : ministerios;

  // Fallback from context when async data hasn't loaded yet (avoids empty dropdown on open)
  const ministeriosDesdeContexto = isLider && ministeriosDisponiblesParaCrearAsync.length === 0
    ? liderMinisterios.map(m => ({
        idMinisterio: m.id,
        nombre: m.nombre,
        idSede: m.idSede,
        cantidadMiembros: 0,
        sedeNombre: m.sedeNombre,
        liderNombre: '',
        descripcion: null,
        estado: 'activo' as const,
        creadoEn: '',
        actualizadoEn: null,
      }))
    : [];
  const ministeriosDisponiblesParaCrear = ministeriosDisponiblesParaCrearAsync.length > 0
    ? ministeriosDisponiblesParaCrearAsync
    : ministeriosDesdeContexto;

  // Sede IDs where the lider leads a ministerio (from context, always available)
  const liderSedeIds = new Set(liderMinisterios.map(m => m.idSede).filter(Boolean));
  const liderHasSingleSede = isLider && liderSedeIds.size === 1;

  // Sedes for selector: liders only see their own sedes; fallback from context if async not loaded
  const sedesParaSelector = isLider
    ? (sedes.length > 0
        ? sedes.filter(s => liderSedeIds.has(s.idSede))
        : Array.from(new Map(liderMinisterios.map(m => [m.idSede, m])).values()).map(m => ({
            idSede: m.idSede,
            nombre: m.sedeNombre,
            direccion: null as null,
            idCiudad: 0,
            idIglesia: 0,
            estado: 'activa' as const,
            creadoEn: '',
            actualizadoEn: '',
          }))
      )
    : sedes;

  // Pre-fill sede and ministerio: prefer full async data (has sede name), fall back to context
  const firstFullMinisterio = ministeriosDisponiblesParaCrear[0] ?? null;
  const firstContextMinisterio = liderMinisterios[0] ?? null;
  const leaderHasSingleMinisterio = isLider && userLeadMinisterios === 1;

  // Primitive IDs for stable dep tracking
  const firstLiderMinisterioId = firstFullMinisterio?.idMinisterio ?? firstContextMinisterio?.id ?? 0;
  const firstLiderSedeId = firstFullMinisterio?.idSede ?? firstContextMinisterio?.idSede
    ?? (isAdminSede || isLider ? (sedes.length === 1 ? sedes[0].idSede : 0) : 0);

  // Sede is read-only when lider has only 1 sede (regardless of number of ministerios)
  const liderSedeReadOnly = isAdminSede || leaderHasSingleMinisterio || liderHasSingleSede;

  debugLog('EventsPage', 'rolActual:', rolActual, 'liderMinisterios:', liderMinisterios, 'firstLiderMinisterioId:', firstLiderMinisterioId, 'firstLiderSedeId:', firstLiderSedeId, 'shouldShowSelectorFields:', shouldShowSelectorFields);

  const resetCreateForm = () => setCreateForm({ nombre: "", descripcion: "", tipoEventoTexto: "", fechaInicio: "", fechaFin: "", idSede: firstLiderSedeId, idMinisterio: firstLiderMinisterioId, _sedeReadOnly: liderSedeReadOnly, _ministerioReadOnly: leaderHasSingleMinisterio, _allowNoMinisterio: !isLider, _allowGeneral: rolActual === "super_admin" || rolActual === "admin_iglesia", _hideSelectorFields: !shouldShowSelectorFields } as any);

  useLayoutEffect(() => {
    if (showCreate) {
      resetCreateForm();
    }
  }, [showCreate, firstLiderMinisterioId, firstLiderSedeId, liderSedeReadOnly, isLider, shouldShowSelectorFields, rolActual]);

  const openEditDialog = (ev: EventoEnriquecido) => {
    setEditEvento(ev);
    setEditForm({
      nombre: ev.nombre, descripcion: ev.descripcion ?? "",
      tipoEventoTexto: ev.tipoEventoTexto ?? "",
      fechaInicio: ev.fechaInicio?.replace(" ", "T").slice(0, 16) ?? "",
      fechaFin: ev.fechaFin?.replace(" ", "T").slice(0, 16) ?? "",
      estado: ev.estado,
      idSede: ev.idSede ?? 0,
      idMinisterio: ev.idMinisterio ?? 0,
    });
  };

  const handleCreateEvento = () => {
    if (!createForm.nombre.trim() || !createForm.fechaInicio || !createForm.fechaFin || !(idIglesiaNum ?? iglesiaActual?.id)) {
      toast.error('Por favor completa nombre, fecha de inicio y fecha de fin del evento');
      return;
    }
    if (isLider && !createForm.idMinisterio) {
      toast.error('Como lider debes seleccionar un ministerio para crear el evento');
      return;
    }
    createEventoMutation.mutate(
      { nombre: createForm.nombre.trim(), descripcion: createForm.descripcion.trim() || null, tipoEventoTexto: createForm.tipoEventoTexto.trim() || null, fechaInicio: createForm.fechaInicio, fechaFin: createForm.fechaFin, idIglesia: idIglesiaNum ?? iglesiaActual?.id ?? 0, idSede: createForm.idSede || null, idMinisterio: createForm.idMinisterio || null },
      {
        onSuccess: () => {
          toast.success('Evento creado exitosamente');
          setShowCreate(false);
          resetCreateForm();
        },
        onError: (error: any) => toast.error(`Error al crear evento: ${error.message}`)
      }
    );
  };

  const handleUpdateEvento = () => {
    if (!editEvento || !editForm.nombre.trim()) {
      toast.error('Por favor completa el nombre del evento');
      return;
    }
    updateEventoMutation.mutate(
      { id: editEvento.idEvento, data: { nombre: editForm.nombre.trim(), descripcion: editForm.descripcion.trim() || null, tipoEventoTexto: editForm.tipoEventoTexto.trim() || null, fechaInicio: editForm.fechaInicio, fechaFin: editForm.fechaFin || null, estado: editForm.estado, idSede: editForm.idSede || null, idMinisterio: editForm.idMinisterio || null } },
      {
        onSuccess: () => {
          toast.success('Evento actualizado exitosamente');
          setEditEvento(null);
        },
        onError: (error: any) => toast.error(`Error al actualizar evento: ${error.message}`)
      }
    );
  };

  function handleDeleteEvento(id: number, nombre: string) {
    setConfirmDeleteEvento({ isOpen: true, id, nombre });
  }

  if (!iglesiaActual) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-accent/40 flex items-center justify-center">
          <Church className="w-7 h-7 opacity-40" />
        </div>
        <p className="font-semibold text-sm">Selecciona una iglesia</p>
        <p className="text-xs text-center max-w-xs">Para ver los eventos, primero debes seleccionar la iglesia con la que deseas trabajar desde el menú superior.</p>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es", { day: "numeric", month: "short" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  const getDay  = (d: string) => new Date(d).getDate();
  const getMon  = (d: string) => new Date(d).toLocaleDateString("es", { month: "short" }).toUpperCase();

  const stats = [
    { label: "Programados", value: eventos.filter(e => e.estado === "programado").length,  color: "from-[#709dbd] to-[#4682b4]" },
    { label: "En Curso",    value: eventos.filter(e => e.estado === "en_curso").length,    color: "from-amber-500 to-orange-600" },
    { label: "Finalizados", value: eventos.filter(e => e.estado === "finalizado").length,  color: "from-emerald-500 to-teal-600" },
    { label: "Total Eventos", value: eventos.length,                                      color: "from-[#709dbd] to-[#4682b4]" },
  ];

  const renderEventsGrid = (list: typeof eventos) => {
    if (list.length === 0) return (
      <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-accent/40 flex items-center justify-center">
          <CalendarDays className="w-7 h-7 opacity-40" />
        </div>
        <p className="font-semibold text-sm">Sin eventos en esta categoría</p>
        <p className="text-xs">Crea un nuevo evento para verlo aquí.</p>
      </div>
    );

    // Group by month
    const grouped: Record<string, typeof eventos> = {};
    list.forEach((e) => {
      const key = new Date(e.fechaInicio).toLocaleDateString("es", { month: "long", year: "numeric" });
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });

    return Object.entries(grouped).map(([month, monthEvents]) => (
      <div key={month} className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 capitalize">{month}</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {monthEvents.map((evento, i) => {
            const isGlobal = !evento.idMinisterio;
            const scope = isGlobal ? scopeConfig.global : scopeConfig.ministerio;
            const estado = estadoConfig[evento.estado] ?? estadoConfig.programado;
            return (
              <AnimatedCard
                key={evento.idEvento}
                index={i}
                className="group relative overflow-hidden bg-card/40 hover:bg-card/60 border border-border/50 hover:border-[#4682b4]/30 transition-all duration-300 rounded-[2rem] p-5 shadow-sm hover:shadow-xl hover:shadow-[#4682b4]/5"
              >
                {/* Gradiente decorativo de fondo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#4682b4]/10 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex gap-4 relative z-10 h-full">
                  {/* Calendar chip (Izquierda) */}
                  <div className="w-[72px] shrink-0 h-[72px] rounded-[1.25rem] bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex flex-col items-center justify-center shadow-lg shadow-[#4682b4]/20 group-hover:scale-105 group-hover:rotate-[-2deg] transition-all duration-300 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-90">{getMon(evento.fechaInicio)}</span>
                    <span className="text-[28px] font-black leading-none mt-0.5 tracking-tighter">{getDay(evento.fechaInicio)}</span>
                  </div>

                  <div className="flex flex-col flex-1 min-w-0 py-0.5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-lg font-bold tracking-tight leading-tight text-foreground/90 group-hover:text-[#4682b4] transition-colors truncate">
                        {evento.nombre}
                      </h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 bg-background/80 backdrop-blur-md rounded-xl p-1 border border-border/50 shadow-sm">
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/70 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-all"
                          onClick={() => setSelectedEvent(evento)}
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canManageEvents && (
                          <>
                            <button
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/70 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-all"
                              onClick={() => openEditDialog(evento)}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/70 hover:text-red-500 hover:bg-red-500/10 transition-all"
                              disabled={deleteEventoMutation.isPending}
                              onClick={() => handleDeleteEvento(evento.idEvento, evento.nombre)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {evento.descripcion && (
                      <p className="text-[12px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{evento.descripcion}</p>
                    )}

                    {/* Spacer para empujar el footer al final si no hay descripción */}
                    {!evento.descripcion && <div className="flex-1 min-h-[16px]" />}

                    {/* Badges / Estado */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 mt-1">
                      <Badge variant="outline" className={`${estado.color} border-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 flex items-center gap-1.5 rounded-md`}>
                        {estado.icon} {estado.label}
                      </Badge>
                      <Badge variant="outline" className={`${scope.color} border-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 flex items-center gap-1.5 rounded-md`}>
                        {scope.icon} {isGlobal ? "Global" : evento.ministerioNombre}
                      </Badge>
                      {evento.tipoEventoTexto && (
                        <Badge variant="outline" className="bg-muted/50 border-0 text-muted-foreground text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md">
                          {evento.tipoEventoTexto}
                        </Badge>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 border-t border-border/40 mt-auto text-[11px] font-medium text-muted-foreground/80">
                      <span className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5 text-[#4682b4]/70 shrink-0" />
                        {formatDate(evento.fechaInicio)} · {formatTime(evento.fechaInicio)}
                      </span>
                      {evento.sedeNombre ? (
                        <span className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md max-w-[140px]">
                          <MapPin className="w-3.5 h-3.5 text-[#4682b4]/70 shrink-0" />
                          <span className="truncate">{evento.sedeNombre}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 bg-muted/20 px-2 py-1 rounded-md opacity-70">
                           <MapPin className="w-3.5 h-3.5 shrink-0" />
                           Sin sede
                        </span>
                      )}
                      <div className="flex items-center ml-auto">
                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${evento.cantidadTareas > 0 ? "bg-[#4682b4]/10 text-[#4682b4]" : "bg-muted/20 text-muted-foreground/50"}`}>
                          <ListTodo className="w-3.5 h-3.5 shrink-0" />
                          {evento.cantidadTareas} tareas
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      <Tabs defaultValue="eventos" className="w-full">
        <TabsList className="bg-card/40 backdrop-blur-md border border-border/50 p-1 rounded-xl mb-5">
          <TabsTrigger value="eventos" className="rounded-lg text-xs font-medium px-4 data-[state=active]:bg-[#1a7fa8] data-[state=active]:text-white data-[state=active]:shadow-md">
            Eventos
          </TabsTrigger>
          {canSeeBudget && (
            <TabsTrigger value="finanzas" className="rounded-lg text-xs font-medium px-4 data-[state=active]:bg-[#1a7fa8] data-[state=active]:text-white data-[state=active]:shadow-md">
              <Wallet className="w-3.5 h-3.5 mr-1.5" /> Finanzas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="eventos" className="mt-0 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 overflow-hidden"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
                <CalendarDays className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-0.5">Operaciones</p>
                <h1 className="text-4xl font-light tracking-tight text-foreground leading-tight">Eventos</h1>
                <p className="text-foreground text-xs sm:text-sm mt-1">Agenda y gestiona los eventos de la iglesia</p>
              </div>
            </div>
            {canShowCreateButton && (
              <Button
                onClick={() => setShowCreate(true)}
                disabled={!iglesiaActual}
                className="h-10 rounded-xl font-medium shrink-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transition-all"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Nuevo Evento
              </Button>
            )}
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, idx) => (
              <AnimatedCard key={s.label} index={idx} className="p-4 group">
                <div className="flex justify-between items-start mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg text-white`}>
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px] py-0 tracking-widest uppercase">KPI</Badge>
                </div>
                <div>
                  <p className="text-4xl font-light tracking-tight text-foreground">{s.value}</p>
                  <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{s.label}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Tabs defaultValue="todos">
              <TabsList className="bg-card/40 backdrop-blur-md border border-border/50 p-1 rounded-xl w-fit flex mb-5">
                <TabsTrigger value="todos" className="rounded-lg text-xs font-medium px-4 data-[state=active]:bg-[#1a7fa8] data-[state=active]:text-white data-[state=active]:shadow-md">Todos ({eventos.length})</TabsTrigger>
                <TabsTrigger value="global" className="rounded-lg text-xs font-medium px-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <Globe className="w-3.5 h-3.5 mr-1.5" /> Globales
                </TabsTrigger>
                <TabsTrigger value="ministerio" className="rounded-lg text-xs font-medium px-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <Users className="w-3.5 h-3.5 mr-1.5" /> Ministeriales
                </TabsTrigger>
              </TabsList>

              <AnimatePresence>
                {["todos", "global", "ministerio"].map((tab) => (
                  <TabsContent key={tab} value={tab} className="outline-none space-y-6 mt-0">
                    {renderEventsGrid(
                      tab === "todos" ? eventos :
                      tab === "global" ? eventos.filter((e) => !e.idMinisterio) :
                      eventos.filter((e) => !!e.idMinisterio)
                    )}
                  </TabsContent>
                ))}
              </AnimatePresence>
            </Tabs>
          </motion.div>
        </TabsContent>

        {canSeeBudget && (
          <TabsContent value="finanzas" className="mt-0">
            <FinanzasTab
              eventos={eventos}
              ministerios={ministerios}
              resumenEventos={resumenEventos}
              totalIngresosPlaneados={totalIngresosPlaneados}
              totalIngresosReales={totalIngresosReales}
              totalEgresosPlaneados={totalEgresosPlaneados}
              totalEgresosReales={totalEgresosReales}
              totalBalanceNeto={totalBalanceNeto}
              eventosConPresupuesto={eventosConPresupuesto}
              finanzasMinisterioFilter={finanzasMinisterioFilter}
              setFinanzasMinisterioFilter={setFinanzasMinisterioFilter}
              finanzasMes={finanzasMes}
              setFinanzasMes={setFinanzasMes}
              setPresupuestoEvento={setPresupuestoEvento}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Nuevo Evento
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Completa los datos para programar un nuevo evento.</p>
          </DialogHeader>
          <EventDialogFields form={createForm} setForm={setCreateForm} sedes={sedesParaSelector} ministerios={ministeriosDisponiblesParaCrear} />
          <DialogFooter className="border-t border-border/50 pt-4 mt-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</Button>
            <Button className="rounded-xl" onClick={handleCreateEvento} disabled={createEventoMutation.isPending}>
              {createEventoMutation.isPending ? "Creando..." : "Crear Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editEvento} onOpenChange={o => { if (!o) setEditEvento(null); }}>
        <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Editar Evento
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Modifica los datos del evento seleccionado.</p>
          </DialogHeader>
          <EventDialogFields form={editForm} setForm={setEditForm} sedes={sedes} ministerios={ministerios} />
          <DialogFooter className="border-t border-border/50 pt-4 mt-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setEditEvento(null)}>Cancelar</Button>
            <Button className="rounded-xl" onClick={handleUpdateEvento} disabled={updateEventoMutation.isPending}>
              {updateEventoMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          {selectedEvent && (() => {
            const isGlobal = !selectedEvent.idMinisterio;
            const scope = isGlobal ? scopeConfig.global : scopeConfig.ministerio;
            const estado = estadoConfig[selectedEvent.estado] ?? estadoConfig.programado;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex flex-col items-center justify-center text-white shadow-lg">
                      <span className="text-[9px] font-black uppercase leading-none opacity-80">{getMon(selectedEvent.fechaInicio)}</span>
                      <span className="text-2xl font-black leading-none mt-0.5">{getDay(selectedEvent.fechaInicio)}</span>
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold tracking-tight">{selectedEvent.nombre}</DialogTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className={`${estado.color} border-0 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 flex items-center gap-1.5 rounded-lg`}>
                          {estado.icon} {estado.label}
                        </Badge>
                        <Badge variant="outline" className={`${scope.color} border-0 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 flex items-center gap-1.5 rounded-lg`}>
                          {scope.icon} {isGlobal ? "Global" : selectedEvent.ministerioNombre}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-5 py-2">
                  {selectedEvent.descripcion && (
                    <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Descripción</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedEvent.descripcion}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Inicio</p>
                      <p className="text-sm font-medium">{formatDate(selectedEvent.fechaInicio)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(selectedEvent.fechaInicio)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fin</p>
                      <p className="text-sm font-medium">{formatDate(selectedEvent.fechaFin)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(selectedEvent.fechaFin)}</p>
                    </div>
                  </div>

                  {selectedEvent.tipoEventoTexto && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detalle:</span>
                      <Badge variant="outline" className="bg-white/5 border-0 text-muted-foreground text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg">
                        {selectedEvent.tipoEventoTexto}
                      </Badge>
                    </div>
                  )}

                  {selectedEvent.sedeNombre && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 text-[#4682b4]" />
                      <span>{selectedEvent.sedeNombre}</span>
                    </div>
                  )}

                  {selectedEvent.cantidadTareas > 0 && (
                    <div className="p-3 rounded-xl bg-[#4682b4]/5 border border-[#4682b4]/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#4682b4]/60 mb-1">Tareas asociadas</p>
                      <p className="text-sm font-medium text-[#4682b4]">{selectedEvent.cantidadTareas} tarea{selectedEvent.cantidadTareas > 1 ? "s" : ""}</p>
                    </div>
                  )}
                </div>
                <DialogFooter className="border-t border-border/50 pt-4">
                  <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedEvent(null)}>Cerrar</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <EventoPresupuestoDrawer
        evento={presupuestoEvento}
        onClose={() => setPresupuestoEvento(null)}
      />

      <ConfirmDialog
        isOpen={confirmDeleteEvento.isOpen}
        onClose={() => setConfirmDeleteEvento({ isOpen: false, id: 0, nombre: "" })}
        onConfirm={() => deleteEventoMutation.mutate(confirmDeleteEvento.id, {
          onSuccess: () => {
            toast.success(`Evento "${confirmDeleteEvento.nombre}" eliminado exitosamente`);
            setConfirmDeleteEvento({ isOpen: false, id: 0, nombre: "" });
          },
          onError: (error: any) => toast.error(`Error al eliminar evento: ${error.message}`)
        })}
        title="¿Eliminar Evento?"
        description={`¿Estás seguro de que quieres eliminar el evento "${confirmDeleteEvento.nombre}"?`}
      />
    </div>
  );
}
