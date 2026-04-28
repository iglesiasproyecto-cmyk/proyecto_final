import { useState } from "react";
import { useEventosEnriquecidos, useDeleteEvento, useTiposEvento, useCreateEvento, useUpdateEvento } from "@/hooks/useEventos";
import type { EventoEnriquecido } from "@/services/eventos.service";
import { useApp } from "@/app/store/AppContext";
import { AnimatedCard } from "./ui/AnimatedCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays, Plus, MapPin, Clock, Globe, Users, Pencil, Trash2, Eye,
  CheckCircle2, XCircle, PlayCircle, BookMarked,
} from "lucide-react";

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
  const { iglesiaActual, rolActual } = useApp();
  const { data: eventos = [], isLoading } = useEventosEnriquecidos(iglesiaActual?.id);
  const { data: tiposEvento = [] } = useTiposEvento();
  const createEventoMutation = useCreateEvento();
  const deleteEventoMutation = useDeleteEvento();
  const updateEventoMutation = useUpdateEvento();

  const [showCreate, setShowCreate] = useState(false);
  const [editEvento, setEditEvento] = useState<EventoEnriquecido | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventoEnriquecido | null>(null);

  const [createForm, setCreateForm] = useState({ nombre: "", descripcion: "", idTipoEvento: 0, fechaInicio: "", fechaFin: "" });
  const [editForm, setEditForm] = useState({ nombre: "", descripcion: "", idTipoEvento: 0, fechaInicio: "", fechaFin: "", estado: "programado" as string });

  const canManageEvents = rolActual === "lider" || rolActual === "admin_iglesia" || rolActual === "super_admin";

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
                className="p-5 group"
              >
                <div className="flex gap-5 relative z-10">
                  {/* Calendar chip */}
                  <div className="w-16 shrink-0 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex flex-col items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform text-white">
                    <span className="text-[10px] font-black uppercase leading-none opacity-80">{getMon(evento.fechaInicio)}</span>
                    <span className="text-3xl font-black leading-none mt-1">{getDay(evento.fechaInicio)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-lg font-bold tracking-tight leading-snug group-hover:text-[#4682b4] transition-colors truncate pr-1 uppercase italic">{evento.nombre}</h4>
                      {/* Action buttons — appear on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          <button
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-all"
                            onClick={() => setSelectedEvent(evento)}
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManageEvents && (
                            <>
                              <button
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-[#4682b4] hover:bg-[#4682b4]/10 transition-all"
                                onClick={() => openEditDialog(evento)}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
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

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge variant="outline" className={`${estado.color} border-0 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 flex items-center gap-1.5 rounded-lg`}>
                        {estado.icon} {estado.label}
                      </Badge>
                      <Badge variant="outline" className={`${scope.color} border-0 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 flex items-center gap-1.5 rounded-lg`}>
                        {scope.icon} {isGlobal ? "Global" : evento.ministerioNombre}
                      </Badge>
                      {evento.tipoEventoNombre && (
                        <Badge variant="outline" className="bg-white/5 border-0 text-muted-foreground text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg">
                          {evento.tipoEventoNombre}
                        </Badge>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-4 pt-3 border-t border-white/5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#4682b4]/50 shrink-0" />
                        {formatDate(evento.fechaInicio)} · {formatTime(evento.fechaInicio)}
                      </span>
                      {evento.sedeNombre && (
                        <span className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#4682b4]/50 shrink-0" />
                          {evento.sedeNombre}
                        </span>
                      )}
                      {evento.cantidadTareas > 0 && (
                        <span className="bg-[#4682b4]/10 text-[#4682b4] px-2 py-0.5 rounded-md border-0">
                          {evento.cantidadTareas} tareas
                        </span>
                      )}
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

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Operaciones</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">
              Eventos
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">Agenda y gestiona los eventos de la iglesia</p>
          </div>
        </div>
        {canManageEvents && (
          <Button
            onClick={() => setShowCreate(true)}
            disabled={!iglesiaActual}
            className="h-10 rounded-xl font-medium shrink-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo Evento
          </Button>
        )}
      </motion.div>

      {/* ── Stats row ── */}
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


      {/* ── Tabs + Events ── */}
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

      {/* ── Detail Dialog ── */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
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

                  {selectedEvent.tipoEventoNombre && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo:</span>
                      <Badge variant="outline" className="bg-white/5 border-0 text-muted-foreground text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg">
                        {selectedEvent.tipoEventoNombre}
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
    </div>
  );
}
