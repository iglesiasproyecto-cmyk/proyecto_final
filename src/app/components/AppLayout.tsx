import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useApp } from "../store/AppContext";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { motion, AnimatePresence } from "motion/react";
import {
  Church, LayoutDashboard, Building2, Users, CalendarDays, ListTodo,
  BookOpen, ClipboardCheck, Bell, User, LogOut, Menu, X, ChevronDown,
  Settings, FolderHeart, Globe, UserCheck, Settings2,
  PanelLeftClose, PanelLeftOpen, GraduationCap, Moon, Sun
} from "lucide-react";
import { SEILogo } from "./SEILogo";

const roleLabels: Record<string, string> = {
  super_admin: "Super Administrador",
  admin_iglesia: "Admin. de Iglesia",
  lider: "Lider de Ministerio",
  servidor: "Servidor",
};

const roleBadgeColors: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-600 border-red-500/20",
  admin_iglesia: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
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
  "/app": "Dashboard",
  "/app/iglesias": "Gestion de Iglesias",
  "/app/sedes": "Gestion de Sedes",
  "/app/geografia": "Geografia",
  "/app/pastores": "Pastores",
  "/app/usuarios": "Usuarios",
  "/app/catalogos": "Catalogos",
  "/app/departamentos": "Ministerios",
  "/app/mi-departamento": "Mi Ministerio",
  "/app/miembros": "Miembros",
  "/app/eventos": "Eventos",
  "/app/tareas": "Tareas",
  "/app/aula": "Aula de Formacion",
  "/app/evaluaciones": "Evaluaciones",
  "/app/notificaciones": "Notificaciones",
  "/app/perfil": "Mi Perfil",
};

function getNavItemsForRole(role: string): NavItem[] {
  switch (role) {
    case "super_admin":
      return [
        { label: "Dashboard", path: "/app", icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Iglesias", path: "/app/iglesias", icon: <Building2 className="w-5 h-5" />, section: "Gestion" },
        { label: "Sedes", path: "/app/sedes", icon: <Church className="w-5 h-5" />, section: "Gestion" },
        { label: "Pastores", path: "/app/pastores", icon: <UserCheck className="w-5 h-5" />, section: "Gestion" },
        { label: "Usuarios", path: "/app/usuarios", icon: <Users className="w-5 h-5" />, section: "Gestion" },
        { label: "Geografia", path: "/app/geografia", icon: <Globe className="w-5 h-5" />, section: "Configuracion" },
        { label: "Catalogos", path: "/app/catalogos", icon: <Settings2 className="w-5 h-5" />, section: "Configuracion" },
        { label: "Notificaciones", path: "/app/notificaciones", icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: "/app/perfil", icon: <User className="w-5 h-5" />, section: "Personal" },
      ];
    case "admin_iglesia":
      return [
        { label: "Dashboard", path: "/app", icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Ministerios", path: "/app/departamentos", icon: <Settings className="w-5 h-5" />, section: "Iglesia" },
        { label: "Usuarios", path: "/app/usuarios", icon: <Users className="w-5 h-5" />, section: "Iglesia" },
        { label: "Miembros", path: "/app/miembros", icon: <Users className="w-5 h-5" />, section: "Iglesia" },
        { label: "Eventos", path: "/app/eventos", icon: <CalendarDays className="w-5 h-5" />, section: "Iglesia" },
        { label: "Notificaciones", path: "/app/notificaciones", icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: "/app/perfil", icon: <User className="w-5 h-5" />, section: "Personal" },
      ];
    case "lider":
      return [
        { label: "Dashboard", path: "/app", icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Ministerio", path: "/app/mi-departamento", icon: <FolderHeart className="w-5 h-5" />, section: "Ministerio" },
        { label: "Miembros", path: "/app/miembros", icon: <Users className="w-5 h-5" />, section: "Ministerio" },
        { label: "Eventos", path: "/app/eventos", icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: "/app/tareas", icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula", path: "/app/aula", icon: <BookOpen className="w-5 h-5" />, section: "Formacion" },
        { label: "Mis Cursos", path: "/app/mis-cursos", icon: <BookOpen className="w-5 h-5" />, section: "Formacion" },
        { label: "Evaluaciones", path: "/app/evaluaciones", icon: <ClipboardCheck className="w-5 h-5" />, section: "Formacion" },
        { label: "Ciclos Lectivos", path: "/app/ciclos-lectivos", icon: <GraduationCap className="w-5 h-5" />, section: "Formacion" },
        { label: "Notificaciones", path: "/app/notificaciones", icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: "/app/perfil", icon: <User className="w-5 h-5" />, section: "Personal" },
      ];
    case "servidor":
      return [
        { label: "Dashboard", path: "/app", icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Ministerio", path: "/app/mi-departamento", icon: <FolderHeart className="w-5 h-5" />, section: "Ministerio" },
        { label: "Eventos", path: "/app/eventos", icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Mis Tareas", path: "/app/tareas", icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula", path: "/app/aula", icon: <BookOpen className="w-5 h-5" />, section: "Formacion" },
        { label: "Mis Cursos", path: "/app/mis-cursos", icon: <BookOpen className="w-5 h-5" />, section: "Formacion" },
        { label: "Mis Evaluaciones", path: "/app/evaluaciones", icon: <ClipboardCheck className="w-5 h-5" />, section: "Formacion" },
        { label: "Mis Ciclos", path: "/app/ciclos-lectivos", icon: <GraduationCap className="w-5 h-5" />, section: "Formacion" },
        { label: "Notificaciones", path: "/app/notificaciones", icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: "/app/perfil", icon: <User className="w-5 h-5" />, section: "Personal" },
      ];
    default:
      return [
        { label: "Dashboard", path: "/app", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Notificaciones", path: "/app/notificaciones", icon: <Bell className="w-5 h-5" /> },
        { label: "Mi Perfil", path: "/app/perfil", icon: <User className="w-5 h-5" /> },
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
  const { usuarioActual, logout, notificacionesCount, sidebarOpen, toggleSidebar, darkMode, toggleDarkMode, authLoading, iglesiaActual, setIglesiaActual, iglesiasDelUsuario, rolActual } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [showChurchSelector, setShowChurchSelector] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!authLoading && !usuarioActual) navigate("/login");
  }, [authLoading, usuarioActual, navigate]);

  useEffect(() => {
    const sectionTitle = pageTitles[location.pathname] || "Panel"
    document.title = `${sectionTitle} | IGLESIABD`
  }, [location.pathname]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!usuarioActual) return null;

  const rol = rolActual;
  const unreadCount = notificacionesCount;
  const activeChurch = iglesiaActual;
  const navItems = getNavItemsForRole(rol);
  const navGroups = groupBySection(navItems);
  const showChurchSelectorPanel = rol !== "super_admin";
  const fullName = `${usuarioActual.nombres} ${usuarioActual.apellidos}`;
  const initials = `${usuarioActual.nombres.charAt(0)}${usuarioActual.apellidos.charAt(0)}`;
  const currentPageTitle = pageTitles[location.pathname] || "S.E.I.";

  const sidebarWidth = isCollapsed ? "w-[72px]" : "w-64";

  return (
    <TooltipProvider delayDuration={200}>
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

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 ${sidebarWidth} bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Sidebar Header */}
          <div className="h-20 flex items-center px-5 border-b border-sidebar-border shrink-0 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
            {!isCollapsed ? (
              <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden group-hover:shadow-primary/20 transition-all duration-500">
                   <motion.div 
                     className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                     animate={{ x: ["-150%", "150%"] }}
                     transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 1 }}
                   />
                  <SEILogo className="w-10 h-10 relative z-10 drop-shadow-md group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 tracking-tight drop-shadow-sm">S.E.I.</h3>
                  <p className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-[0.2em] mt-0.5">Soporte Estr.</p>
                </div>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center mx-auto shadow-lg relative overflow-hidden group-hover:shadow-primary/20 transition-all duration-500">
                   <motion.div 
                     className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                     animate={{ x: ["-150%", "150%"] }}
                     transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 1 }}
                   />
                <SEILogo className="w-10 h-10 relative z-10 drop-shadow-md group-hover:scale-110 transition-transform duration-500" />
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-sidebar-foreground/60 hover:text-white ml-2 relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Church Selector */}
          {showChurchSelectorPanel && !isCollapsed && (
            <div className="px-3 py-2.5 border-b border-sidebar-border">
              <div className="relative">
                <button
                  onClick={() => setShowChurchSelector(!showChurchSelector)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-sidebar-foreground bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors"
                >
                  <Building2 className="w-4 h-4 text-sidebar-primary shrink-0" />
                  <span className="flex-1 text-left truncate text-xs">
                    {iglesiaActual?.nombre || "Seleccionar iglesia"}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showChurchSelector ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showChurchSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scaleY: 0.95 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -5, scaleY: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-sidebar-accent rounded-lg border border-sidebar-border shadow-xl z-50 overflow-hidden origin-top"
                    >
                      {iglesiasDelUsuario.map((ig) => (
                        <button
                          key={ig.id}
                          onClick={() => {
                            setIglesiaActual(ig);
                            setShowChurchSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs hover:bg-sidebar-border transition-colors flex items-center gap-2 ${
                            ig.id === iglesiaActual?.id
                              ? "text-sidebar-primary bg-sidebar-primary/10"
                              : "text-sidebar-foreground"
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ig.id === iglesiaActual?.id ? "bg-sidebar-primary" : "bg-sidebar-foreground/30"}`} />
                          {ig.nombre}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {navGroups.map((group, groupIndex) => (
              <div key={group.section}>
                {group.section && !isCollapsed && (
                  <p className={`text-[10px] font-black uppercase tracking-[0.25em] text-sidebar-foreground/40 px-3 mb-2 ${groupIndex > 0 ? "mt-6" : ""}`}>
                    {group.section}
                  </p>
                )}
                {isCollapsed && group.section && groupIndex > 0 && <div className="w-8 h-[2px] rounded-full bg-sidebar-foreground/10 mx-auto my-4" />}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive =
                      location.pathname === item.path ||
                      (item.path !== "/" && location.pathname.startsWith(item.path));
                    const isNotif = item.label === "Notificaciones";

                    const navButtonContent = (
                      <>
                        <span className="shrink-0">{item.icon}</span>
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {isNotif && unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                {unreadCount}
                              </span>
                            )}
                          </>
                        )}
                        {isCollapsed && isNotif && unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </>
                    );

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.path}>
                          <TooltipTrigger asChild>
                            <div className="relative group/nav mb-1 w-full">
                              <button
                                onClick={() => {
                                  navigate(item.path);
                                  if (window.innerWidth < 1024) toggleSidebar();
                                }}
                                className={`w-full flex items-center justify-center gap-3 px-2 py-3 rounded-2xl text-sm transition-all duration-300 relative overflow-hidden focus:outline-none ${
                                  isActive ? "text-white" : "text-sidebar-foreground/60"
                                }`}
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="active-nav-bg"
                                    className="absolute inset-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] rounded-2xl z-0 shadow-[0_4px_25px_rgba(70,157,189,0.3)] overflow-hidden"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                  >
                                     <div className="absolute top-0 left-0 bottom-0 w-1 bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                                     <motion.div 
                                       className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                                       animate={{ x: ["-200%", "300%"] }}
                                       transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 1 }}
                                     />
                                  </motion.div>
                                )}
                                {!isActive && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/30 to-blue-900/10 opacity-0 group-hover/nav:opacity-100 transition-all duration-500 rounded-2xl z-0 border border-cyan-500/0 group-hover/nav:border-cyan-500/20 scale-95 group-hover/nav:scale-100" />
                                )}
                                <span className={`relative z-10 shrink-0 transition-transform duration-500 ${isActive ? "scale-125 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "group-hover/nav:scale-125 group-hover/nav:text-cyan-400 group-hover/nav:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"}`}>
                                  {item.icon}
                                </span>
                                {isCollapsed && isNotif && unreadCount > 0 && (
                                  <span className="absolute top-1.5 right-1.5 z-10 bg-red-500 outline outline-2 outline-sidebar text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                    {unreadCount}
                                  </span>
                                )}
                              </button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-[#709dbd] to-[#4682b4] text-white border-none shadow-[0_0_20px_rgba(70,157,189,0.4)]">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          if (window.innerWidth < 1024) toggleSidebar();
                        }}
                        className={`group/nav w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all duration-300 relative overflow-hidden focus:outline-none ${
                          isActive ? "text-white" : "text-sidebar-foreground/60"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-nav-bg"
                            className="absolute inset-0 bg-gradient-to-r from-[#1a7fa8] to-[#1a7fa8] rounded-2xl z-0 shadow-[0_4px_25px_rgba(26,127,168,0.3)] overflow-hidden"
                            initial={false}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          >
                             <div className="absolute top-0 left-0 bottom-0 w-1 bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                             <motion.div 
                               className="absolute inset-y-0 w-[40%] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[20deg]"
                               animate={{ x: ["-200%", "400%"] }}
                               transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 0.5 }}
                             />
                          </motion.div>
                        )}
                        {!isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/30 to-blue-900/10 opacity-0 group-hover/nav:opacity-100 transition-all duration-500 rounded-2xl z-0 border border-cyan-500/0 group-hover/nav:border-cyan-500/20 scale-95 group-hover/nav:scale-100" />
                        )}
                        <span className={`relative z-10 shrink-0 transition-transform duration-500 ${isActive ? "scale-125 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "group-hover/nav:scale-125 group-hover/nav:text-cyan-400 group-hover/nav:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"}`}>
                          {item.icon}
                        </span>
                        <span className={`relative z-10 flex-1 text-left truncate transition-all duration-500 ${isActive ? "font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70" : "font-semibold tracking-wide group-hover/nav:translate-x-1.5 group-hover/nav:text-white"}`}>
                          {item.label}
                        </span>
                        {isNotif && unreadCount > 0 && (
                          <span className="relative z-10 bg-red-500 text-white text-[10px] rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-bold shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Collapse Toggle (desktop only) */}
          <div className={`hidden lg:flex py-4 border-t border-sidebar-border mt-auto shrink-0 transition-all ${isCollapsed ? "justify-center" : "px-4"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="w-10 h-10 rounded-xl bg-sidebar-accent/30 flex items-center justify-center text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent transition-all duration-300 outline-none"
                >
                  {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-bold px-3 py-1.5">
                {isCollapsed ? "Expandir Menú" : "Ocultar Menú"}
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 md:px-6 gap-4 shrink-0 sticky top-0 z-20">
            <button
              onClick={toggleSidebar}
              className="text-muted-foreground hover:text-foreground transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page Title & Breadcrumb */}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm truncate">{currentPageTitle}</h2>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`hidden sm:inline-flex text-[10px] ${roleBadgeColors[rol] ?? ""}`}
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
                    onClick={() => navigate("/app/notificaciones")}
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
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-bold">Cerrar Sesión</TooltipContent>
              </Tooltip>

              <button
                onClick={() => navigate("/app/perfil")}
                className="flex items-center gap-3 p-1.5 pr-4 rounded-xl hover:bg-accent transition-colors border border-transparent hover:border-border"
              >
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                  {initials}
                </div>
                <div className="hidden md:flex flex-col items-start min-w-0">
                  <span className="text-[13px] font-bold text-foreground truncate max-w-[120px] leading-tight transition-colors">
                    {usuarioActual.nombres.split(" ")[0]} {usuarioActual.apellidos.split(" ")[0]}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 truncate">{roleLabels[rol] ?? rol}</span>
                </div>
              </button>
            </div>
          </header>

          {/* Main Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="flex justify-center px-4 md:px-6 lg:px-8 min-h-full">
              <div className="w-full max-w-7xl py-4 md:py-6 lg:py-8">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <Outlet />
                </motion.div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
