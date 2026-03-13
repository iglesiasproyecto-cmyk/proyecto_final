import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useApp } from "../store/AppContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { motion, AnimatePresence } from "motion/react";
import { SEILogo } from "./SEILogo";
import {
  Church, LayoutDashboard, Building2, Users, CalendarDays, ListTodo,
  BookOpen, ClipboardCheck, Bell, User, LogOut, Menu, X, ChevronDown,
  Settings, FolderHeart, Globe, UserCheck, Settings2, Search,
  PanelLeftClose, PanelLeftOpen, ChevronRight, GraduationCap, Moon, Sun
} from "lucide-react";

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
  "/app/ciclos-lectivos": "Ciclos Lectivos",
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
        { label: "Miembros", path: "/app/miembros", icon: <Users className="w-5 h-5" />, section: "Iglesia" },
        { label: "Eventos", path: "/app/eventos", icon: <CalendarDays className="w-5 h-5" />, section: "Iglesia" },
        { label: "Ciclos Lectivos", path: "/app/ciclos-lectivos", icon: <GraduationCap className="w-5 h-5" />, section: "Formacion" },
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
  const { user, logout, notificaciones, iglesias, setActiveChurch, sidebarOpen, toggleSidebar, darkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [showChurchSelector, setShowChurchSelector] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  const unreadCount = notificaciones.filter((n) => !n.leida).length;
  const activeChurch = iglesias.find((ig) => ig.idIglesia === user.idIglesiaActiva);
  const navItems = getNavItemsForRole(user.rol);
  const navGroups = groupBySection(navItems);
  const showChurchSelectorPanel = user.rol !== "super_admin";
  const fullName = `${user.nombres} ${user.apellidos}`;
  const initials = `${user.nombres.charAt(0)}${user.apellidos.charAt(0)}`;
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
          <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
            {!isCollapsed ? (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a7fa8] to-[#2596be] flex items-center justify-center shrink-0 shadow-lg shadow-[#1a7fa8]/20">
                  <Church className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm text-white truncate tracking-tight">S.E.I.</h3>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">Soporte Estructural</p>
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a7fa8] to-[#2596be] flex items-center justify-center mx-auto shadow-lg shadow-[#1a7fa8]/20">
                <Church className="w-5 h-5 text-white" />
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-sidebar-foreground/60 hover:text-white ml-2"
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
                    {activeChurch?.nombre || "Seleccionar iglesia"}
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
                      {iglesias
                        .filter((ig) => ig.estado === "activa" && user.iglesiasIds.includes(ig.idIglesia))
                        .map((ig) => (
                          <button
                            key={ig.idIglesia}
                            onClick={() => {
                              setActiveChurch(ig.idIglesia);
                              setShowChurchSelector(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 text-xs hover:bg-sidebar-border transition-colors flex items-center gap-2 ${
                              ig.idIglesia === user.idIglesiaActiva
                                ? "text-sidebar-primary bg-sidebar-primary/10"
                                : "text-sidebar-foreground"
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ig.idIglesia === user.idIglesiaActiva ? "bg-sidebar-primary" : "bg-sidebar-foreground/30"}`} />
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
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
            {navGroups.map((group) => (
              <div key={group.section}>
                {group.section && !isCollapsed && (
                  <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-1.5">
                    {group.section}
                  </p>
                )}
                {isCollapsed && group.section && <div className="h-px bg-sidebar-border mx-2 mb-2" />}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      location.pathname === item.path ||
                      (item.path !== "/" && location.pathname.startsWith(item.path));
                    const isNotif = item.label === "Notificaciones" || item.label === "Notificaciones";

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
                            <div className="relative">
                              <button
                                onClick={() => {
                                  navigate(item.path);
                                  if (window.innerWidth < 1024) toggleSidebar();
                                }}
                                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all duration-150 justify-center ${
                                  isActive
                                    ? "bg-sidebar-primary text-white shadow-md shadow-sidebar-primary/20"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                                }`}
                              >
                                {navButtonContent}
                              </button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
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
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                          isActive
                            ? "bg-sidebar-primary text-white shadow-md shadow-sidebar-primary/20"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                        }`}
                      >
                        {navButtonContent}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Collapse Toggle (desktop only) */}
          <div className="hidden lg:flex px-3 py-2 border-t border-sidebar-border">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              {!isCollapsed && <span>Colapsar</span>}
            </button>
          </div>

          {/* User Section */}
          <div className="p-3 border-t border-sidebar-border">
            {!isCollapsed ? (
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a7fa8] to-[#2596be] flex items-center justify-center text-white text-xs shrink-0 shadow-md">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{fullName}</p>
                  <p className="text-[10px] text-sidebar-foreground/50">{roleLabels[user.rol]}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                      className="text-sidebar-foreground/40 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    Cerrar sesion
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Cerrar sesion ({fullName})
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-4 md:px-6 gap-4 shrink-0 sticky top-0 z-20">
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
                className={`hidden sm:inline-flex text-[10px] ${roleBadgeColors[user.rol]}`}
              >
                {roleLabels[user.rol]}
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

              <button
                onClick={() => navigate("/app/perfil")}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-accent transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#2596be] flex items-center justify-center text-primary-foreground text-xs shadow-sm">
                  {initials}
                </div>
                <span className="hidden md:block text-sm text-foreground truncate max-w-[120px]">
                  {user.nombres}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
              </button>
            </div>
          </header>

          {/* Main Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 lg:p-8">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}