import { useState } from "react";
import { useEventosEnriquecidos, useDeleteEvento, useTiposEvento, useCreateEvento, useUpdateEvento } from "@/hooks/useEventos";
import type { EventoEnriquecido } from "@/services/eventos.service";
import { useApp } from "@/app/store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { motion } from "motion/react";
import { CalendarDays, Plus, MapPin, Clock, Globe, Users, Pencil } from "lucide-react";

const scopeConfig = {
  global: { label: "Global", color: "bg-indigo-100 text-indigo-700", icon: <Globe className="w-3.5 h-3.5" /> },
  ministerio: { label: "Ministerial", color: "bg-emerald-100 text-emerald-700", icon: <Users className="w-3.5 h-3.5" /> },
};

const estadoColors: Record<string, string> = {
  programado: "bg-blue-100 text-blue-700",
  en_curso: "bg-amber-100 text-amber-700",
  finalizado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

export function EventsPage() {
  const { iglesiaActual } = useApp();
  const { data: eventos = [], isLoading } = useEventosEnriquecidos(iglesiaActual?.id);
  const { data: tiposEvento = [] } = useTiposEvento();
  const createEventoMutation = useCreateEvento();
  const deleteEventoMutation = useDeleteEvento();
  const updateEventoMutation = useUpdateEvento();
  const [showCreate, setShowCreate] = useState(false);
  const [editEvento, setEditEvento] = useState<EventoEnriquecido | null>(null);
  const [createForm, setCreateForm] = useState({
    nombre: "",
    descripcion: "",
    idTipoEvento: 0,
    fechaInicio: "",
    fechaFin: "",
  });
  const [editForm, setEditForm] = useState({
    nombre: "",
    descripcion: "",
    idTipoEvento: 0,
    fechaInicio: "",
    fechaFin: "",
    estado: "programado" as string,
  });

  const resetCreateForm = () => setCreateForm({ nombre: "", descripcion: "", idTipoEvento: 0, fechaInicio: "", fechaFin: "" });

  const openEditDialog = (ev: EventoEnriquecido) => {
    setEditEvento(ev);
    setEditForm({
      nombre: ev.nombre,
      descripcion: ev.descripcion ?? "",
      idTipoEvento: ev.idTipoEvento,
      fechaInicio: ev.fechaInicio?.slice(0, 16) ?? "",
      fechaFin: ev.fechaFin?.slice(0, 16) ?? "",
      estado: ev.estado,
    });
  };

  const handleCreateEvento = () => {
    if (!createForm.nombre.trim() || !createForm.idTipoEvento || !createForm.fechaInicio || !createForm.fechaFin) return;
    createEventoMutation.mutate(
      {
        nombre: createForm.nombre.trim(),
        descripcion: createForm.descripcion.trim() || null,
        idTipoEvento: createForm.idTipoEvento,
        fechaInicio: createForm.fechaInicio,
        fechaFin: createForm.fechaFin,
        idIglesia: iglesiaActual?.id ?? 0,
        idSede: null,
        idMinisterio: null,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          resetCreateForm();
        },
      }
    );
  };

  const handleUpdateEvento = () => {
    if (!editEvento || !editForm.nombre.trim()) return;
    updateEventoMutation.mutate(
      {
        id: editEvento.idEvento,
        data: {
          nombre: editForm.nombre.trim(),
          descripcion: editForm.descripcion.trim() || null,
          idTipoEvento: editForm.idTipoEvento,
          fechaInicio: editForm.fechaInicio,
          fechaFin: editForm.fechaFin || null,
          estado: editForm.estado,
        },
      },
      {
        onSuccess: () => setEditEvento(null),
      }
    );
  };

  function handleDeleteEvento(id: number, nombre: string) {
    if (!confirm(`¿Eliminar evento "${nombre}"? Se eliminarán sus tareas asociadas.`)) return;
    deleteEventoMutation.mutate(id);
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" }) +
      " " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  };

  const renderEventsList = (eventsToRender: typeof eventos) => {
    const grouped: Record<string, typeof eventos> = {};
    eventsToRender.forEach((e) => {
      const month = new Date(e.fechaInicio).toLocaleDateString("es", { month: "long", year: "numeric" });
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(e);
    });

    return Object.entries(grouped).map(([month, monthEvents]) => (
      <div key={month} className="mt-5">
        <h3 className="text-xs text-muted-foreground mb-3 capitalize tracking-wider uppercase">{month}</h3>
        <div className="space-y-2.5">
          {monthEvents.map((evento, i) => {
            const isGlobal = !evento.idMinisterio;
            const scope = isGlobal ? scopeConfig.global : scopeConfig.ministerio;
            return (
              <motion.div
                key={evento.idEvento}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-primary uppercase">{new Date(evento.fechaInicio).toLocaleDateString("es", { month: "short" })}</span>
                      <span className="text-lg text-primary">{new Date(evento.fechaInicio).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm">{evento.nombre}</h4>
                        <div className="flex gap-1.5 shrink-0 items-center">
                          <Badge variant="outline" className={`${scope.color} border-0 text-[10px] flex items-center gap-1`}>
                            {scope.icon} {isGlobal ? "Global" : evento.ministerioNombre}
                          </Badge>
                          <Badge variant="outline" className={`${estadoColors[evento.estado]} border-0 text-[10px]`}>{evento.estado}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                            onClick={() => openEditDialog(evento)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            disabled={deleteEventoMutation.isPending}
                            onClick={() => handleDeleteEvento(evento.idEvento, evento.nombre)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                      {evento.descripcion && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{evento.descripcion}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {evento.sedeNombre && (
                          <span className="flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded-full">
                            <MapPin className="w-3 h-3" /> {evento.sedeNombre}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDateTime(evento.fechaInicio)}
                        </span>
                        {evento.tipoEventoNombre && <Badge variant="secondary" className="text-[10px]">{evento.tipoEventoNombre}</Badge>}
                        {evento.cantidadTareas > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">
                            {evento.cantidadTareas} tareas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Eventos de la Iglesia</h1>
          <p className="text-muted-foreground text-sm">Gestiona los eventos de la iglesia</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!iglesiaActual} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Evento
        </Button>
      </motion.div>

      <Tabs defaultValue="todos">
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="global">Globales</TabsTrigger>
          <TabsTrigger value="ministerio">Ministeriales</TabsTrigger>
        </TabsList>
        {["todos", "global", "ministerio"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {renderEventsList(tab === "todos" ? eventos : tab === "global" ? eventos.filter((e) => !e.idMinisterio) : eventos.filter((e) => !!e.idMinisterio))}
          </TabsContent>
        ))}
      </Tabs>

      {eventos.length === 0 && (
        <Card className="p-16 text-center">
          <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-muted-foreground mb-1">Sin eventos programados</h3>
          <p className="text-sm text-muted-foreground">Los eventos apareceran aqui cuando sean creados.</p>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nombre *</label>
              <Input
                value={createForm.nombre}
                onChange={(e) => setCreateForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre del evento"
                className="bg-input-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo de Evento *</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm"
                value={createForm.idTipoEvento}
                onChange={(e) => setCreateForm(p => ({ ...p, idTipoEvento: Number(e.target.value) }))}
              >
                <option value={0}>Seleccionar tipo...</option>
                {tiposEvento.map(te => (
                  <option key={te.idTipoEvento} value={te.idTipoEvento}>{te.nombre}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Inicio *</label>
                <Input
                  type="datetime-local"
                  value={createForm.fechaInicio}
                  onChange={(e) => setCreateForm(p => ({ ...p, fechaInicio: e.target.value }))}
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fin *</label>
                <Input
                  type="datetime-local"
                  value={createForm.fechaFin}
                  onChange={(e) => setCreateForm(p => ({ ...p, fechaFin: e.target.value }))}
                  className="bg-input-background"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
              <Input
                value={createForm.descripcion}
                onChange={(e) => setCreateForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción opcional"
                className="bg-input-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</Button>
            <Button onClick={handleCreateEvento} disabled={createEventoMutation.isPending}>
              {createEventoMutation.isPending ? "Creando..." : "Crear Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Event Dialog ── */}
      <Dialog open={!!editEvento} onOpenChange={o => { if (!o) setEditEvento(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nombre *</label>
              <Input
                value={editForm.nombre}
                onChange={(e) => setEditForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre del evento"
                className="bg-input-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo de Evento *</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm"
                value={editForm.idTipoEvento}
                onChange={(e) => setEditForm(p => ({ ...p, idTipoEvento: Number(e.target.value) }))}
              >
                <option value={0}>Seleccionar tipo...</option>
                {tiposEvento.map(te => (
                  <option key={te.idTipoEvento} value={te.idTipoEvento}>{te.nombre}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Inicio *</label>
                <Input
                  type="datetime-local"
                  value={editForm.fechaInicio}
                  onChange={(e) => setEditForm(p => ({ ...p, fechaInicio: e.target.value }))}
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fin *</label>
                <Input
                  type="datetime-local"
                  value={editForm.fechaFin}
                  onChange={(e) => setEditForm(p => ({ ...p, fechaFin: e.target.value }))}
                  className="bg-input-background"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Estado</label>
              <Select value={editForm.estado} onValueChange={v => setEditForm(p => ({ ...p, estado: v }))}>
                <SelectTrigger className="bg-input-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="programado">Programado</SelectItem>
                  <SelectItem value="en_curso">En Curso</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
              <Input
                value={editForm.descripcion}
                onChange={(e) => setEditForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción opcional"
                className="bg-input-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEvento(null)}>Cancelar</Button>
            <Button onClick={handleUpdateEvento} disabled={updateEventoMutation.isPending}>
              {updateEventoMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
