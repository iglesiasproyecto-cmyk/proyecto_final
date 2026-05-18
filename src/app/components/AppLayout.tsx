import React, { useState, useEffect, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useApp } from "../store/AppContext";
import { useUsuariosEnriquecidos } from "@/hooks/useUsuarios";
import { GlobalLoader } from "./GlobalLoader";
import { AuthRecovery } from "./AuthRecovery";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { motion, AnimatePresence } from "motion/react";
import LoadingSpinner from "./LoadingSpinner";
import {
  Church, LayoutDashboard, Building2, Users, CalendarDays, ListTodo,
  Bell, User, LogOut, Menu, X, ChevronDown,
  Settings, FolderHeart, Globe, UserCheck, Settings2,
  Moon, Sun, BookOpen, Cake, BarChart3
} from "lucide-react";
import logo1 from "../../assets/logo-1-lumen-.webp"; // Logo 1 (letras blancas) para fondo oscuro/azul
import { SEILogo, LumenIsotype } from "./SEILogo";

const roleLabels: Record<string, string> = {
  super_admin: "Super Administrador",
  admin_iglesia: "Administrador de Iglesia",
  admin_sede: "Administrador de Sede",
  lider: "Lider de Ministerio",
  servidor: "Servidor",
};

const roleBadgeColors: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-600 border-red-500/20",
  admin_iglesia: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  admin_sede: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  lider: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  servidor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
};

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  section?: string;
}

const pageTitles: Record<string, string> = {
  "/app/global": "Dashboard Global",
  "/app/global/iglesias": "Gestión de Iglesias",
  "/app/global/sedes": "Gestión de Sedes",
  "/app/global/administrador": "Administrador",
  "/app/global/usuarios": "Usuarios",
  "/app/global/geografia": "Geografía",
  "/app/global/notificaciones": "Notificaciones",
  "/app/global/perfil": "Mi Perfil",
  "/app/global/eventos": "Eventos Globales",
  "/app/global/tareas": "Tareas Globales",
  "/app/global/aula": "Aula Virtual Global",
};

function getDynamicPageTitle(pathname: string): string {
  if (pathname.match(/\/app\/\d+\/sedes/)) return "Sedes";
  if (pathname.match(/\/app\/\d+\/pastores/)) return "Pastores";
  if (pathname.match(/\/app\/\d+\/ministerios/)) return "Ministerios";
  if (pathname.match(/\/app\/\d+\/usuarios/)) return "Usuarios";
  if (pathname.match(/\/app\/\d+\/miembros/)) return "Miembros";
  if (pathname.match(/\/app\/\d+\/eventos/)) return "Eventos";
  if (pathname.match(/\/app\/\d+\/tareas/)) return "Tareas";
  if (pathname.match(/\/app\/\d+\/aula\/curso\/\d+\/servidor/)) return "Progreso Individual";
  if (pathname.match(/\/app\/\d+\/aula\/curso/)) return "Detalle del Curso";
  if (pathname.match(/\/app\/\d+\/aula/)) return "Aula de Formación";
  if (pathname.match(/\/app\/\d+\/mi-ministerio/)) return "Mi Ministerio";
  if (pathname.match(/\/app\/\d+\/notificaciones/)) return "Notificaciones";
  if (pathname.match(/\/app\/\d+\/perfil/)) return "Mi Perfil";
  if (pathname.match(/\/app\/(global\/)?cumpleanos/)) return "Cumpleaños";
  if (pathname.match(/\/app\/\d+$/)) return "Dashboard";
  return "Panel";
}

function getNavItemsForRole(
  role: string,
  iglesiaActual?: { id: number; nombre: string } | null
): NavItem[] {
  const t = iglesiaActual?.id != null ? `/app/${iglesiaActual.id}` : "/app";

  switch (role) {
    case "super_admin":
      return [
        { label: "Dashboard", path: "/app/global", icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Iglesias", path: "/app/global/iglesias", icon: <Building2 className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Sedes", path: "/app/global/sedes", icon: <Church className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Administrador", path: "/app/global/administrador", icon: <UserCheck className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Ministerios", path: "/app/global/ministerios", icon: <Settings2 className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Eventos", path: "/app/global/eventos", icon: <CalendarDays className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Tareas", path: "/app/global/tareas", icon: <ListTodo className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Aula Virtual", path: "/app/global/aula", icon: <BookOpen className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Usuarios", path: "/app/global/usuarios", icon: <Users className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Cumpleaños", path: "/app/global/cumpleanos", icon: <Cake className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Estadísticas", path: "/app/global/estadisticas", icon: <BarChart3 className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Geografía", path: "/app/global/geografia", icon: <Globe className="w-5 h-5" />, section: "Configuración" },
        { label: "Notificaciones", path: "/app/global/notificaciones", icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: "/app/global/perfil", icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "admin_iglesia":
      return [
        { label: "Dashboard", path: t, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Iglesia", path: `${t}/iglesia`, icon: <Church className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Sedes", path: `${t}/sedes`, icon: <Building2 className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Administrador", path: `${t}/administrador`, icon: <Settings className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Pastores", path: `${t}/pastores`, icon: <UserCheck className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Ministerios", path: `${t}/ministerios`, icon: <Settings2 className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Usuarios", path: `${t}/usuarios`, icon: <Users className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Miembros", path: `${t}/miembros`, icon: <Users className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Estadísticas", path: `${t}/estadisticas`, icon: <BarChart3 className="w-5 h-5" />, section: "Operaciones" },
        { label: "Cumpleaños", path: `${t}/cumpleanos`, icon: <Cake className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "lider":
      return [
        { label: "Dashboard", path: t, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Ministerio", path: `${t}/mi-ministerio`, icon: <FolderHeart className="w-5 h-5" />, section: "Ministerio" },
        { label: "Usuarios", path: `${t}/usuarios`, icon: <Users className="w-5 h-5" />, section: "Ministerio" },
        { label: "Miembros", path: `${t}/miembros`, icon: <Users className="w-5 h-5" />, section: "Ministerio" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Estadísticas", path: `${t}/estadisticas`, icon: <BarChart3 className="w-5 h-5" />, section: "Operaciones" },
        { label: "Cumpleaños", path: `${t}/cumpleanos`, icon: <Cake className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "admin_sede":
      return [
        { label: "Dashboard", path: t, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Ministerios", path: `${t}/ministerios`, icon: <Settings2 className="w-5 h-5" />, section: "Gestión" },
        { label: "Usuarios", path: `${t}/usuarios`, icon: <Users className="w-5 h-5" />, section: "Gestión" },
        { label: "Miembros", path: `${t}/miembros`, icon: <Users className="w-5 h-5" />, section: "Operaciones" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Estadísticas", path: `${t}/estadisticas`, icon: <BarChart3 className="w-5 h-5" />, section: "Operaciones" },
        { label: "Cumpleaños", path: `${t}/cumpleanos`, icon: <Cake className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "servidor":
      return [
        { label: "Dashboard", path: t, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Ministerio", path: `${t}/mi-ministerio`, icon: <FolderHeart className="w-5 h-5" />, section: "Ministerio" },
        { label: "Ministerios", path: `${t}/ministerios`, icon: <Settings2 className="w-5 h-5" />, section: "Ministerio" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Mis Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Estadísticas", path: `${t}/estadisticas`, icon: <BarChart3 className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    default:
      return [
        { label: "Dashboard", path: t, icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" /> },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" /> },
      ];
  }
}

function groupBySection(items: NavItem[]) {
  const groups: { section: string; items: NavItem[] }[] = [];
  items.forEach((item) => {
    const section = item.section || "";
    const existing = groups.find((g) => g.section === section);
    if (existing) existing.items.push(item);
    else groups.push({ section, items: [item] });
  });
  return groups;
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isHydrated,
    authLoading,
    authError,
    authReady,
    isInitializing,
    usuarioActual,
    rolActual,
    iglesiaActual,
    setIglesiaActual,
    logout,
    notificacionesCount,
    iglesiasDelUsuario,
    sidebarOpen,
    toggleSidebar,
    showChurchSelector,
    setShowChurchSelector,
    darkMode,
    toggleDarkMode,
  } = useApp();

  const authResolved = isHydrated && !authLoading;
  const { data: usuarios = [] } = useUsuariosEnriquecidos();

  const cumpleanosHoy = usuarios.filter((u) => {
    if (!u.activo || !u.fechaNacimiento) return false;
    const today = new Date();
    const [, month, day] = u.fechaNacimiento.split("-").map(Number);
    return today.getMonth() === month - 1 && today.getDate() === day;
  }).length;

  useEffect(() => {
    if (!authResolved) return;
    if (!usuarioActual && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [authResolved, usuarioActual, navigate, location.pathname]);

  useEffect(() => {
    const title = pageTitles[location.pathname] ?? getDynamicPageTitle(location.pathname);
    document.title = `${title} | Lumen`;
  }, [location.pathname]);

  if (authError) {
    return (
      <AuthRecovery
        title="Se detecto un problema de autenticacion"
        description="Tu sesion no se pudo hidratar correctamente. Cierra sesion para reintentar."
      />
    )
  }

  if (!authResolved || isInitializing) {
    return <GlobalLoader show={true} message="Cargando aplicación..." fullScreen={true} />
  }

  if (!usuarioActual) {
    return null
  }

  if (!authReady) {
    return <GlobalLoader show={true} message="Cargando aplicación..." fullScreen={true} />
  }

  const rol = rolActual;
  const unreadCount = notificacionesCount;
  const navItems = getNavItemsForRole(rol, iglesiaActual);
  const navGroups = groupBySection(navItems);
  const showChurchSelectorPanel = rol !== "super_admin";
  const fullName = `${usuarioActual.nombres} ${usuarioActual.apellidos}`;
  const initials = `${usuarioActual.nombres.charAt(0)}${usuarioActual.apellidos.charAt(0)}`;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
              onClick={toggleSidebar}
            />
          )}
        </AnimatePresence>

        {/* Sidebar — fixed icon-only */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-[72px] bg-gradient-to-b from-[#091320] via-[#0c1828] to-[#070f1a] text-sidebar-foreground flex flex-col shadow-[8px_0_32px_rgba(0,0,0,0.45)] border-r border-white/[0.06] backdrop-blur-xl relative overflow-hidden transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Ambient Glow / Blue Modern Illumination */}
          <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[35%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/10 via-blue-900/5 to-transparent pointer-events-none z-0" />
          {/* Sidebar Header — Mobile Touch-friendly Close */}
          <div className="h-14 shrink-0 flex items-center justify-end px-3 relative lg:hidden">
            <button 
              onClick={toggleSidebar} 
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Sidebar Header — Desktop minimal top edge */}
          <div className="h-3 shrink-0 relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-b from-sky-500/8 to-transparent pointer-events-none" />
          </div>

          {/* Church Selector — icon-only */}
          {showChurchSelectorPanel && (
            <div className="py-3 flex justify-center border-b border-white/[0.06]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowChurchSelector(!showChurchSelector)}
                    className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#4682b4]/10 border border-[#4682b4]/20 text-[#4682b4] hover:bg-[#4682b4]/25 hover:border-[#4682b4]/40 transition-all duration-200 relative"
                  >
                    <Building2 className="w-5 h-5" />
                    <AnimatePresence>
                      {showChurchSelector && (
                        <motion.div
                          initial={{ opacity: 0, x: 8, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 8, scale: 0.95 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="absolute left-full ml-3 top-0 w-56 bg-[#0c1828]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {iglesiasDelUsuario.map((ig) => (
                              <button
                                key={ig.id}
                                onClick={() => { setIglesiaActual(ig); setShowChurchSelector(false); }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-3 mb-1 last:mb-0 ${
                                  ig.id === iglesiaActual?.id
                                    ? "text-white bg-gradient-to-r from-[#4682b4] to-[#709dbd]"
                                    : "text-white/60 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <div className={`w-2 h-2 rounded-full shrink-0 ${ig.id === iglesiaActual?.id ? "bg-white" : "bg-white/20"}`} />
                                <span className="truncate">{ig.nombre}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#0c1828]/95 backdrop-blur-xl text-white border-white/10 text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xl">
                  {iglesiaActual?.nombre || "Seleccionar iglesia"}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Navigation — icon-only with glassmorphic tooltips */}
          <nav className="flex-1 overflow-y-auto pt-3 pb-4 flex flex-col items-center gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {navGroups.map((group, groupIndex) => (
              <React.Fragment key={group.section}>
                {groupIndex > 0 && (
                  <div className="w-8 h-px bg-white/[0.08] my-3" />
                )}
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== "/" && location.pathname.startsWith(item.path));
                  const isNotif = item.label === "Notificaciones";
                  const isCumpleanos = item.label === "Cumpleaños";
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            navigate(item.path);
                            if (window.innerWidth < 1024) toggleSidebar();
                          }}
                          className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none group ${
                            isActive
                              ? "bg-gradient-to-br from-[#4682b4] to-[#709dbd] text-white shadow-[0_4px_20px_rgba(70,130,180,0.45)] ring-1 ring-[#709dbd]/30"
                              : "text-white/35 hover:text-white/90 hover:bg-white/[0.08] hover:ring-1 hover:ring-white/[0.08]"
                          }`}
                        >
                          {/* Active left accent bar */}
                          {isActive && (
                            <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                          )}
                          <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                            {item.icon}
                          </span>
                          {isNotif && unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.7)]">
                              {unreadCount}
                            </span>
                          )}
                          {isCumpleanos && cumpleanosHoy > 0 && (
                            <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                              {cumpleanosHoy}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={14}
                        className="bg-[#0d1e30]/95 backdrop-blur-xl text-white border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-xs font-semibold px-3 py-1.5 rounded-lg tracking-wide"
                      >
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>

          {/* Logout at bottom */}
          <div className="py-4 flex justify-center border-t border-white/[0.06]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={async () => { await logout(); }}
                  className="w-11 h-11 flex items-center justify-center rounded-xl text-white/25 hover:text-red-400 hover:bg-red-500/[0.12] hover:ring-1 hover:ring-red-500/20 transition-all duration-200 group"
                >
                  <LogOut className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={14} className="bg-[#0d1e30]/95 backdrop-blur-xl text-red-400 border border-red-500/20 shadow-2xl text-xs font-semibold px-3 py-1.5 rounded-lg">
                Cerrar Sesión
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-32 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-3 sm:px-4 md:px-6 gap-3 sm:gap-6 shrink-0 sticky top-0 z-20">
            <button
              onClick={toggleSidebar}
              className="text-muted-foreground hover:text-foreground transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page Title — left aligned */}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground/50 leading-none mb-0.5 hidden sm:block">Panel</span>
              <span className="text-[14px] sm:text-[15px] font-black text-foreground truncate leading-tight hidden sm:block">
                {pageTitles[location.pathname] ?? getDynamicPageTitle(location.pathname)}
              </span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Header Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Badge
                variant="outline"
                className={`hidden sm:inline-flex text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-1 ${roleBadgeColors[rol] ?? ""}`}
              >
                {roleLabels[rol] ?? rol}
              </Badge>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {darkMode ? "Modo claro" : "Modo oscuro"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      const notifPath = rolActual === "super_admin"
                        ? "/app/global/notificaciones"
                        : iglesiaActual?.id != null ? `/app/${iglesiaActual.id}/notificaciones` : "/app";
                      navigate(notifPath);
                    }}
                    className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {unreadCount > 0 ? `${unreadCount} sin leer` : "Notificaciones"}
                </TooltipContent>
              </Tooltip>

              <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
              {/* User profile button */}
              <button
                onClick={() => {
                  const perfilPath = rolActual === "super_admin"
                    ? "/app/global/perfil"
                    : iglesiaActual?.id != null ? `/app/${iglesiaActual.id}/perfil` : "/app";
                  navigate(perfilPath);
                }}
                className="flex items-center gap-2 sm:gap-2.5 p-1.5 pr-2 sm:pr-3 rounded-xl hover:bg-accent transition-all duration-200 border border-transparent hover:border-border group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4682b4] to-[#709dbd] flex items-center justify-center text-white text-[11px] font-black shadow-[0_2px_8px_rgba(70,130,180,0.35)] ring-2 ring-[#4682b4]/20 shrink-0">
                  {initials}
                </div>
                <div className="hidden md:flex flex-col items-start min-w-0">
                  <span className="text-[12px] font-bold text-foreground truncate max-w-[110px] leading-tight">
                    {usuarioActual.nombres.split(" ")[0]} {usuarioActual.apellidos.split(" ")[0]}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 truncate">{roleLabels[rol] ?? rol}</span>
                </div>
              </button>

              {/* Logo — right corner */}
              <div className="h-6 w-px bg-border/60 mx-1 sm:mx-2 hidden sm:block shrink-0" />
              <div className="hidden sm:flex items-center justify-center shrink-0 overflow-hidden" style={{ width: '300px', height: '95px' }}>
                <SEILogo
                  style={{ width: '120px', height: '38px', transform: 'scale(2.4)', transformOrigin: 'center' }}
                  className="drop-shadow-[0_0_15px_rgba(59,130,246,0.1)] opacity-90 hover:opacity-100 transition-all duration-300"
                />
              </div>
            </div>
          </header>

          {/* Main Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="flex justify-center px-4 md:px-6 lg:px-8 min-h-full">
              <div className="w-full max-w-7xl py-4 md:py-6 lg:py-8">
                <Suspense fallback={<LoadingSpinner />}>
                  <Outlet />
                </Suspense>
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
