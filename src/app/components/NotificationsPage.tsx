import { useState } from "react";
import { useNavigate } from "react-router";
import { useNotificaciones, useMarkNotificacionRead, useMarkAllNotificacionesRead } from "@/hooks/useNotificaciones";
import { useApp } from "../store/AppContext";
import { extractTaskIdFromNotificationMessage } from "@/services/notificaciones.service";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, ListTodo, Info, AlertTriangle, BookOpen, CheckCheck, Check, Inbox, X } from "lucide-react";

import { Bell } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { NotificationSkeleton } from "./loading/skeletons";

const typeConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  evento: { label: "Evento", color: "text-primary", bg: "bg-primary/10", icon: <CalendarDays className="w-5 h-5" /> },
  tarea: { label: "Tarea", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10", icon: <ListTodo className="w-5 h-5" /> },
  curso: { label: "Curso", color: "text-primary", bg: "bg-primary/10", icon: <BookOpen className="w-5 h-5" /> },
  alerta: { label: "Alerta", color: "text-red-700 dark:text-red-400", bg: "bg-red-500/10", icon: <AlertTriangle className="w-5 h-5" /> },
  informacion: { label: "Info", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-600/10", icon: <Info className="w-5 h-5" /> },
};

export function NotificationsPage() {
  const { usuarioActual, iglesiaActual } = useApp();
  const navigate = useNavigate();
  const { data: notificaciones = [], isLoading } = useNotificaciones(usuarioActual?.idUsuario ?? 0, iglesiaActual?.id);
  const [activeTab, setActiveTab] = useState("todas");
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const markReadMutation = useMarkNotificacionRead();
  const markAllReadMutation = useMarkAllNotificacionesRead();

  const handleOpenNotification = (n: any) => {
    if (!n.leida) markReadMutation.mutate(n.idNotificacion);

    // Use the iglesia from the notification itself (idIglesia), falling back
    // to iglesiaActual. A servidor may have no iglesiaActual if they lack a
    // system role, so relying solely on iglesiaActual causes navigation to
    // "/app/tareas" which is not a registered route and redirects to "/".
    const iglesiaId = n.idIglesia || iglesiaActual?.id;
    const base = iglesiaId ? `/app/${iglesiaId}` : "/app";

    // Navigate using referenciaTipo + referenciaId if available
    if (n.referenciaTipo === 'evento' && n.referenciaId) {
      navigate(`${base}/eventos?openEvent=${n.referenciaId}`);
      return;
    }
    if (n.referenciaTipo === 'tarea' && n.referenciaId) {
      navigate(`${base}/tareas?openTask=${n.referenciaId}`);
      return;
    }

    // Legacy fallback: extract TASK_ID from message
    if (n.tipo === 'tarea') {
      const taskId = extractTaskIdFromNotificationMessage(n.mensaje || "");
      if (taskId) {
        navigate(`${base}/tareas?openTask=${taskId}`);
        return;
      }
    }

    setSelectedNotification(n);
  };

  if (isLoading) return (
    <div className="space-y-6 max-w-4xl mx-auto px-4">
      <div className="flex items-center gap-4 p-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <NotificationSkeleton items={6} />
    </div>
  );

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
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
          </div>
          <div>
            <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[8px] sm:text-[10px] mb-0.5">Mi Bandeja</p>
            <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-foreground leading-tight">Notificaciones</h1>
            <p className="text-foreground text-[10px] sm:text-sm mt-0.5">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Estás al día"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => usuarioActual && markAllReadMutation.mutate(usuarioActual.idUsuario)} disabled={markAllReadMutation.isPending} className="shrink-0 rounded-xl bg-card/40 backdrop-blur-xl border-primary/40 text-primary hover:bg-primary/10 font-bold shadow-sm transition-all pb-1 pt-1 h-auto">
            <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas
          </Button>
        )}
      </motion.div>

      <div className="overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/40 backdrop-blur-xl border border-white/10 p-1 h-auto rounded-2xl inline-flex shadow-xl shadow-black/5 whitespace-nowrap">
            <TabsTrigger value="todas" className="rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">Todas</TabsTrigger>
            <TabsTrigger value="no_leidas" className="rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              Sin leer
              {unreadCount > 0 && (
                <span className="ml-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-4.5 flex items-center justify-center px-1 shadow-sm">{unreadCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="evento" className="rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">Eventos</TabsTrigger>
            <TabsTrigger value="tarea" className="rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">Tareas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
                <div
                  className={`group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-3xl backdrop-blur-2xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
                    !n.leida ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5" : "bg-card/40 border-white/10 dark:border-white/5 shadow-xl hover:shadow-2xl"
                  }`}
                  onClick={() => handleOpenNotification(n)}
                >
                  <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-[15px] tracking-tight ${!n.leida ? "font-bold text-foreground" : "font-semibold text-foreground/80 group-hover:text-primary transition-colors"}`}>{n.titulo}</p>
                        <p className={`text-[13px] mt-1 leading-relaxed ${!n.leida ? "font-medium text-foreground/90" : "text-muted-foreground"}`}>{n.mensaje?.replace(/\s*\[TASK_ID:\d+\]/g, '')}</p>
                      </div>
                      {!n.leida && (
                        <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5">
                      <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-0 text-[9px] uppercase tracking-widest font-bold px-2 py-0`}>{cfg.label}</Badge>
                      <span className="text-[11px] font-medium text-muted-foreground">{formatDate(n.creadoEn)}</span>
                      {n.leida && (
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto tracking-widest uppercase">
                          <Check className="w-3 h-3 text-primary" /> Leida
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="p-16 text-center rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-xl">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <Inbox className="w-10 h-10 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold text-foreground/90 tracking-tight mb-2">Bandeja Vacía</h3>
            <p className="text-[13px] font-bold text-muted-foreground">
              {activeTab === "no_leidas" ? "Has leído todas tus notificaciones" : "No tienes notificaciones en esta categoría"}
            </p>
          </div>
        </motion.div>
      )}

      {/* Modal de detalle de notificación */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <div className="flex items-start gap-3 mb-4">
              {selectedNotification && (
                <>
                  <div className={`w-12 h-12 rounded-2xl ${typeConfig[selectedNotification.tipo]?.bg} flex items-center justify-center shrink-0 ${typeConfig[selectedNotification.tipo]?.color}`}>
                    {typeConfig[selectedNotification.tipo]?.icon}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-lg font-bold">{selectedNotification.titulo}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(selectedNotification.creadoEn)}</p>
                  </div>
                </>
              )}
            </div>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              <div>
                <p className="text-sm leading-relaxed text-foreground/90 bg-background/40 rounded-xl p-4 border border-white/5">
                  {selectedNotification.mensaje?.replace(/\s*\[TASK_ID:\d+\]/g, '')}
                </p>
              </div>
              
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <Badge variant="outline" className={`${typeConfig[selectedNotification.tipo]?.bg} ${typeConfig[selectedNotification.tipo]?.color} border-0 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5`}>
                  {typeConfig[selectedNotification.tipo]?.label}
                </Badge>
                {selectedNotification.leida && (
                  <span className="text-xs font-semibold text-[#4682b4] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Leída
                  </span>
                )}
              </div>

              <Button 
                onClick={() => setSelectedNotification(null)}
                className="w-full rounded-xl h-10 bg-gradient-to-r from-primary/80 to-primary hover:opacity-90 text-primary-foreground font-semibold"
              >
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
