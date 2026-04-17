import { useState } from "react";
import { useEventosEnriquecidos, useDeleteEvento, useTiposEvento, useCreateEvento, useUpdateEvento } from "@/hooks/useEventos";
import type { EventoEnriquecido } from "@/services/eventos.service";
import { useApp } from "@/app/store/AppContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays, Plus, MapPin, Clock, Globe, Users, Pencil, Trash2,
  CheckCircle2, XCircle, PlayCircle, BookMarked,
} from "lucide-react";

const estadoConfig: Record<string, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  programado:  { label: "Programado",  color: "bg-blue-500/10 text-blue-400 border-blue-500/20",    dot: "bg-blue-400",    icon: <BookMarked className="w-3 h-3" /> },
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

function EventDialogFields({ form, setForm, tiposEvento }: { form: any; setForm: (f: any) => void; tiposEvento: any[] }) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <FieldLabel>Nombre del Evento</FieldLabel>
        <GlassInput value={form.nombre} onChange={e => setForm((p: any) => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Culto de Adoración Especial" />
      </div>
      <div>
        <FieldLabel>Tipo de Evento</FieldLabel>
        <GlassSelect value={form.idTipoEvento} onChange={v => setForm((p: any) => ({ ...p, idTipoEvento: v }))}>
          <option value={0}>Seleccionar tipo...</option>
          {tiposEvento.map(te => <option key={te.idTipoEvento} value={te.idTipoEvento}>{te.nombre}</option>)}
        </GlassSelect>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Inicio</FieldLabel>
          <GlassInput type="datetime-local" value={form.fechaInicio} onChange={e => setForm((p: any) => ({ ...p, fechaInicio: e.target.value }))} />
        </div>
        <div>
          <FieldLabel>Fin</FieldLabel>
          <GlassInput type="datetime-local" value={form.fechaFin} onChange={e => setForm((p: any) => ({ ...p, fechaFin: e.target.value }))} />
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

export function EventsPage() {
  const { iglesiaActual } = useApp();
  const { data: eventos = [], isLoading } = useEventosEnriquecidos(iglesiaActual?.id);
  const { data: tiposEvento = [] } = useTiposEvento();
  const createEventoMutation = useCreateEvento();
  const deleteEventoMutation = useDeleteEvento();
  const updateEventoMutation = useUpdateEvento();

  const [showCreate, setShowCreate] = useState(false);
  const [editEvento, setEditEvento] = useState<EventoEnriquecido | null>(null);

  const [createForm, setCreateForm] = useState({ nombre: "", descripcion: "", idTipoEvento: 0, fechaInicio: "", fechaFin: "" });
  const [editForm, setEditForm] = useState({ nombre: "", descripcion: "", idTipoEvento: 0, fechaInicio: "", fechaFin: "", estado: "programado" as string });

  const resetCreateForm = () => setCreateForm({ nombre: "", descripcion: "", idTipoEvento: 0, fechaInicio: "", fechaFin: "" });

  const openEditDialog = (ev: EventoEnriquecido) => {
    setEditEvento(ev);
    setEditForm({
      nombre: ev.nombre, descripcion: ev.descripcion ?? "",
      idTipoEvento: ev.idTipoEvento,
      fechaInicio: ev.fechaInicio?.slice(0, 16) ?? "",
      fechaFin: ev.fechaFin?.slice(0, 16) ?? "",
      estado: ev.estado,
    });
  };

  const handleCreateEvento = () => {
    if (!createForm.nombre.trim() || !createForm.idTipoEvento || !createForm.fechaInicio || !createForm.fechaFin) return;
    createEventoMutation.mutate(
      { nombre: createForm.nombre.trim(), descripcion: createForm.descripcion.trim() || null, idTipoEvento: createForm.idTipoEvento, fechaInicio: createForm.fechaInicio, fechaFin: createForm.fechaFin, idIglesia: iglesiaActual?.id ?? 0, idSede: null, idMinisterio: null },
      { onSuccess: () => { setShowCreate(false); resetCreateForm(); } }
    );
  };

  const handleUpdateEvento = () => {
    if (!editEvento || !editForm.nombre.trim()) return;
    updateEventoMutation.mutate(
      { id: editEvento.idEvento, data: { nombre: editForm.nombre.trim(), descripcion: editForm.descripcion.trim() || null, idTipoEvento: editForm.idTipoEvento, fechaInicio: editForm.fechaInicio, fechaFin: editForm.fechaFin || null, estado: editForm.estado } },
      { onSuccess: () => setEditEvento(null) }
    );
  };

  function handleDeleteEvento(id: number, nombre: string) {
    if (!confirm(`¿Eliminar evento "${nombre}"?`)) return;
    deleteEventoMutation.mutate(id);
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Cargando eventos...</span>
      </div>
    </div>
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es", { day: "numeric", month: "short" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  const getDay  = (d: string) => new Date(d).getDate();
  const getMon  = (d: string) => new Date(d).toLocaleDateString("es", { month: "short" }).toUpperCase();

  const stats = [
    { label: "Programados", value: eventos.filter(e => e.estado === "programado").length,  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/15" },
    { label: "En Curso",    value: eventos.filter(e => e.estado === "en_curso").length,    color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/15" },
    { label: "Finalizados", value: eventos.filter(e => e.estado === "finalizado").length,  color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/15" },
    { label: "Total",       value: eventos.length,                                         color: "text-primary",     bg: "bg-primary/10 border-primary/15" },
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
              <motion.div
                key={evento.idEvento}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group relative bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
              >
                {/* Glow hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="flex gap-4 relative z-10">
                  {/* Calendar chip */}
                  <div className="w-14 shrink-0 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex flex-col items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <span className="text-[10px] font-bold text-primary/70 uppercase leading-none">{getMon(evento.fechaInicio)}</span>
                    <span className="text-2xl font-black text-primary leading-none mt-0.5">{getDay(evento.fechaInicio)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-bold tracking-tight leading-snug group-hover:text-primary transition-colors truncate pr-1">{evento.nombre}</h4>
                      {/* Action buttons — appear on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all"
                          onClick={() => openEditDialog(evento)}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          disabled={deleteEventoMutation.isPending}
                          onClick={() => handleDeleteEvento(evento.idEvento, evento.nombre)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {evento.descripcion && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">{evento.descripcion}</p>
                    )}

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={`${estado.color} border text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 flex items-center gap-1`}>
                        {estado.icon} {estado.label}
                      </Badge>
                      <Badge variant="outline" className={`${scope.color} border text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 flex items-center gap-1`}>
                        {scope.icon} {isGlobal ? "Global" : evento.ministerioNombre}
                      </Badge>
                      {evento.tipoEventoNombre && (
                        <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5">
                          {evento.tipoEventoNombre}
                        </Badge>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-3 mt-2.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary/40 shrink-0" />
                        {formatDate(evento.fechaInicio)} · {formatTime(evento.fechaInicio)}
                      </span>
                      {evento.sedeNombre && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary/40 shrink-0" />
                          {evento.sedeNombre}
                        </span>
                      )}
                      {evento.cantidadTareas > 0 && (
                        <span className="bg-background/40 px-2 py-0.5 rounded-md border border-white/5">
                          {evento.cantidadTareas} tareas
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">
            Eventos
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Agenda y gestiona los eventos de la iglesia</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          disabled={!iglesiaActual}
          className="h-10 rounded-xl font-medium shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Evento
        </Button>
      </motion.div>

      {/* ── Stats row ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {stats.map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-4 flex items-center gap-4 backdrop-blur-xl group hover:shadow-lg hover:shadow-primary/5 transition-all`}>
            <div className="flex flex-col">
              <span className={`text-3xl font-black ${s.color} leading-none tracking-tighter`}>{s.value}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">{s.label}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Tabs + Events ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs defaultValue="todos">
          <TabsList className="bg-card/40 backdrop-blur-md border border-white/10 p-1 rounded-xl w-fit flex mb-5">
            <TabsTrigger value="todos" className="rounded-lg text-xs font-medium px-4">Todos ({eventos.length})</TabsTrigger>
            <TabsTrigger value="global" className="rounded-lg text-xs font-medium px-4">
              <Globe className="w-3.5 h-3.5 mr-1.5" /> Globales
            </TabsTrigger>
            <TabsTrigger value="ministerio" className="rounded-lg text-xs font-medium px-4">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Ministeriales
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {["todos", "global", "ministerio"].map((tab) => (
              <TabsContent key={tab} value={tab} className="outline-none space-y-6 mt-0">
                {renderEventsGrid(
                  tab === "todos" ? eventos :
                  tab === "global" ? eventos.filter(e => !e.idMinisterio) :
                  eventos.filter(e => !!e.idMinisterio)
                )}
              </TabsContent>
            ))}
          </AnimatePresence>
        </Tabs>
      </motion.div>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Nuevo Evento
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Completa los datos para programar un nuevo evento.</p>
          </DialogHeader>
          <EventDialogFields form={createForm} setForm={setCreateForm} tiposEvento={tiposEvento} />
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
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Editar Evento
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Modifica los datos del evento seleccionado.</p>
          </DialogHeader>
          <EventDialogFields form={editForm} setForm={setEditForm} tiposEvento={tiposEvento} />
          <DialogFooter className="border-t border-border/50 pt-4 mt-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setEditEvento(null)}>Cancelar</Button>
            <Button className="rounded-xl" onClick={handleUpdateEvento} disabled={updateEventoMutation.isPending}>
              {updateEventoMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
