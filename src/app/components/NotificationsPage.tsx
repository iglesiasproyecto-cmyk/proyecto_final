import { useState } from "react";
import { useNotificaciones, useMarkNotificacionRead, useMarkAllNotificacionesRead } from "@/hooks/useNotificaciones";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, ListTodo, Info, AlertTriangle, BookOpen, CheckCheck, Check, Inbox } from "lucide-react";

import { Bell } from "lucide-react";

const typeConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  evento: { label: "Evento", color: "text-[#4682b4] dark:text-[#709dbd]", bg: "bg-[#4682b4]/10", icon: <CalendarDays className="w-5 h-5" /> },
  tarea: { label: "Tarea", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10", icon: <ListTodo className="w-5 h-5" /> },
  curso: { label: "Curso", color: "text-[#4682b4] dark:text-[#709dbd]", bg: "bg-[#4682b4]/10", icon: <BookOpen className="w-5 h-5" /> },
  alerta: { label: "Alerta", color: "text-red-700 dark:text-red-400", bg: "bg-red-500/10", icon: <AlertTriangle className="w-5 h-5" /> },
  informacion: { label: "Info", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-600/10", icon: <Info className="w-5 h-5" /> },
};

export function NotificationsPage() {
  const { usuarioActual } = useApp();
  const { data: notificaciones = [], isLoading } = useNotificaciones(usuarioActual?.idUsuario ?? 0);
  const [activeTab, setActiveTab] = useState("todas");

  const markReadMutation = useMarkNotificacionRead();
  const markAllReadMutation = useMarkAllNotificacionesRead();

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
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/30 shrink-0">
            <Bell className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Mi Bandeja</p>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">Notificaciones</h1>
            <p className="text-muted-foreground text-[13px] font-medium mt-1">
              {unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : "Estás al día con tus notificaciones"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => usuarioActual && markAllReadMutation.mutate(usuarioActual.idUsuario)} disabled={markAllReadMutation.isPending} className="shrink-0 rounded-xl bg-card/40 backdrop-blur-xl border-[#4682b4]/40 text-[#4682b4] hover:bg-[#4682b4]/10 font-bold shadow-sm transition-all pb-1 pt-1 h-auto">
            <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas
          </Button>
        )}
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="bg-card/40 backdrop-blur-xl border border-white/10 p-1.5 h-auto rounded-2xl w-full sm:w-auto inline-flex shadow-xl shadow-black/5 flex-wrap gap-1">
          <TabsTrigger value="todas" className="rounded-xl px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#709dbd] data-[state=active]:to-[#4682b4] data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Todas</TabsTrigger>
          <TabsTrigger value="no_leidas" className="rounded-xl px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#709dbd] data-[state=active]:to-[#4682b4] data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            Sin leer
            {unreadCount > 0 && (
              <span className="ml-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-sm">{unreadCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="evento" className="rounded-xl px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#709dbd] data-[state=active]:to-[#4682b4] data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Eventos</TabsTrigger>
          <TabsTrigger value="tarea" className="rounded-xl px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#709dbd] data-[state=active]:to-[#4682b4] data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Tareas</TabsTrigger>
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
                <div
                  className={`group flex items-start gap-4 p-5 rounded-3xl backdrop-blur-2xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
                    !n.leida ? "bg-[#4682b4]/5 border-[#4682b4]/20 shadow-lg shadow-blue-900/5" : "bg-card/40 border-white/10 dark:border-white/5 shadow-xl hover:shadow-2xl"
                  }`}
                  onClick={() => !n.leida && markReadMutation.mutate(n.idNotificacion)}
                >
                  <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-[15px] tracking-tight ${!n.leida ? "font-bold text-foreground" : "font-semibold text-foreground/80 group-hover:text-[#4682b4] transition-colors"}`}>{n.titulo}</p>
                        <p className={`text-[13px] mt-1 line-clamp-2 leading-relaxed ${!n.leida ? "font-medium text-foreground/90" : "text-muted-foreground"}`}>{n.mensaje}</p>
                      </div>
                      {!n.leida && (
                        <div className="w-3 h-3 rounded-full bg-[#4682b4] shadow-[0_0_10px_rgba(70,130,180,0.5)] animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5">
                      <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-0 text-[9px] uppercase tracking-widest font-bold px-2 py-0`}>{cfg.label}</Badge>
                      <span className="text-[11px] font-medium text-muted-foreground">{formatDate(n.creadoEn)}</span>
                      {n.leida && (
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto tracking-widest uppercase">
                          <Check className="w-3 h-3 text-[#4682b4]" /> Leida
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
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#709dbd]/10 to-[#4682b4]/5 flex items-center justify-center mx-auto mb-6">
              <Inbox className="w-10 h-10 text-[#4682b4]/50" />
            </div>
            <h3 className="text-lg font-bold text-foreground/90 tracking-tight mb-2">Bandeja Vacía</h3>
            <p className="text-[13px] font-medium text-muted-foreground">
              {activeTab === "no_leidas" ? "Has leído todas tus notificaciones" : "No tienes notificaciones en esta categoría"}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
