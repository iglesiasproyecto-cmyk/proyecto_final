import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { motion } from "motion/react";
import { CalendarDays, Plus, MapPin, Clock, Globe, Users, Inbox } from "lucide-react";

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
  const { eventos, user, ministerios, tiposEvento } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  if (!user) return null;
  const role = user.rol;

  let visibleEvents = eventos.filter((e) => e.idIglesia === user.idIglesiaActiva);
  if (role !== "admin_iglesia") {
    visibleEvents = visibleEvents.filter((e) => !e.idMinisterio || e.idMinisterio === user.idMinisterio);
  }

  const canCreate = role !== "servidor" && role !== "super_admin";
  const showTabs = role === "admin_iglesia";
  const pageTitle = role === "servidor" ? "Cronograma de Eventos" : role === "admin_iglesia" ? "Eventos de la Iglesia" : "Eventos";

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" }) +
      " " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  };

  const renderEventsList = (eventsToRender: typeof visibleEvents) => {
    const grouped: Record<string, typeof visibleEvents> = {};
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
                        <div className="flex gap-1.5 shrink-0">
                          <Badge variant="outline" className={`${scope.color} border-0 text-[10px] flex items-center gap-1`}>
                            {scope.icon} {isGlobal ? "Global" : evento.ministerioNombre}
                          </Badge>
                          <Badge variant="outline" className={`${estadoColors[evento.estado]} border-0 text-[10px]`}>{evento.estado}</Badge>
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
          <h1>{pageTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {role === "servidor" ? "Eventos globales y de tu ministerio" : "Gestiona los eventos de la iglesia"}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Evento
          </Button>
        )}
      </motion.div>

      {showTabs ? (
        <Tabs defaultValue="todos">
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="global">Globales</TabsTrigger>
            <TabsTrigger value="ministerio">Ministeriales</TabsTrigger>
          </TabsList>
          {["todos", "global", "ministerio"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              {renderEventsList(tab === "todos" ? visibleEvents : tab === "global" ? visibleEvents.filter((e) => !e.idMinisterio) : visibleEvents.filter((e) => !!e.idMinisterio))}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        renderEventsList(visibleEvents)
      )}

      {visibleEvents.length === 0 && (
        <Card className="p-16 text-center">
          <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-muted-foreground mb-1">Sin eventos programados</h3>
          <p className="text-sm text-muted-foreground">Los eventos apareceran aqui cuando sean creados.</p>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nuevo Evento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Nombre</label>
              <Input placeholder="Nombre del evento" className="bg-input-background h-11" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Descripcion</label>
              <textarea placeholder="Descripcion del evento" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-input-background min-h-[80px] resize-y" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Tipo de Evento</label>
              <select className="w-full border rounded-xl px-3 py-2.5 text-sm bg-input-background h-11">
                {tiposEvento.map((te) => <option key={te.idTipoEvento} value={te.idTipoEvento}>{te.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Fecha inicio</label>
                <Input type="datetime-local" className="bg-input-background h-11" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Fecha fin</label>
                <Input type="datetime-local" className="bg-input-background h-11" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => setShowCreate(false)}>Crear Evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
