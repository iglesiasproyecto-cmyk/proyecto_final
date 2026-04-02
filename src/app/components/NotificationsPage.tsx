import { useState } from "react";
import { useNotificaciones } from "@/hooks/useNotificaciones";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, ListTodo, Info, AlertTriangle, BookOpen, CheckCheck, Check, Inbox } from "lucide-react";

const typeConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  evento: { label: "Evento", color: "text-blue-700", bg: "bg-blue-100", icon: <CalendarDays className="w-4 h-4" /> },
  tarea: { label: "Tarea", color: "text-amber-700", bg: "bg-amber-100", icon: <ListTodo className="w-4 h-4" /> },
  curso: { label: "Curso", color: "text-purple-700", bg: "bg-purple-100", icon: <BookOpen className="w-4 h-4" /> },
  alerta: { label: "Alerta", color: "text-red-700", bg: "bg-red-100", icon: <AlertTriangle className="w-4 h-4" /> },
  informacion: { label: "Info", color: "text-gray-700", bg: "bg-gray-100", icon: <Info className="w-4 h-4" /> },
};

export function NotificationsPage() {
  const { usuarioActual } = useApp();
  const { data: notificaciones = [], isLoading } = useNotificaciones(usuarioActual?.idUsuario ?? 0);
  const [activeTab, setActiveTab] = useState("todas");

  // Stub mutations — Phase 3
  const markNotificationRead = (_id: number) => { /* Phase 3 */ };
  const markAllNotificationsRead = () => { /* Phase 3 */ };

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const unreadCount = notificaciones.filter((n) => !n.leida).length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return "Hace un momento";
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString("es", { day: "numeric", month: "short" });
  };

  const filtered = activeTab === "todas" ? notificaciones : activeTab === "no_leidas" ? notificaciones.filter(n => !n.leida) : notificaciones.filter(n => n.tipo === activeTab);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Notificaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Todas leidas"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllNotificationsRead} className="shrink-0">
            <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas
          </Button>
        )}
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="no_leidas">
            Sin leer
            {unreadCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="evento">Eventos</TabsTrigger>
          <TabsTrigger value="tarea">Tareas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((n, i) => {
            const cfg = typeConfig[n.tipo] || typeConfig.informacion;
            return (
              <motion.div
                key={n.idNotificacion}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
              >
                <Card
                  className={`p-4 transition-all duration-200 hover:shadow-md cursor-pointer group ${
                    !n.leida ? "border-l-4 border-l-primary bg-primary/[0.02] hover:bg-primary/[0.04]" : "hover:bg-accent/30"
                  }`}
                  onClick={() => !n.leida && markNotificationRead(n.idNotificacion)}
                >
                  <div className="flex gap-3.5">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm">{n.titulo}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.mensaje}</p>
                        </div>
                        {!n.leida && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2.5">
                        <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-0 text-[10px]`}>{cfg.label}</Badge>
                        <span className="text-[11px] text-muted-foreground">{formatDate(n.creadoEn)}</span>
                        {n.leida && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Check className="w-3 h-3" /> Leida
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="p-16 text-center">
            <Inbox className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-muted-foreground mb-1">Sin notificaciones</h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === "no_leidas" ? "Has leido todas tus notificaciones" : "No tienes notificaciones en esta categoria"}
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
