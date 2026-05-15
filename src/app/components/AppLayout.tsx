<<<<<<< HEAD
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useApp } from "../store/AppContext";
import { GlobalLoader } from "./GlobalLoader";
import { AuthRecovery } from "./AuthRecovery";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { motion, AnimatePresence } from "motion/react";
import {
  Church, LayoutDashboard, Building2, Users, CalendarDays, ListTodo,
  Bell, User, LogOut, Menu, X, ChevronDown,
  Settings, FolderHeart, Globe, UserCheck, Settings2,
  PanelLeftClose, PanelLeftOpen, Moon, Sun, BookOpen
} from "lucide-react";
import { SEILogo } from "./SEILogo";

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
=======
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useApp } from "../store/AppContext";
import { useUsuariosEnriquecidos } from "@/hooks/useUsuarios";
import { GlobalLoader } from "./GlobalLoader";
import { AuthRecovery } from "./AuthRecovery";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { motion, AnimatePresence } from "motion/react";
import {
  Church, LayoutDashboard, Building2, Users, CalendarDays, ListTodo,
  Bell, User, LogOut, Menu, X, ChevronDown,
  Settings, FolderHeart, Globe, UserCheck, Settings2,
  PanelLeftClose, PanelLeftOpen, Moon, Sun, BookOpen, Cake
} from "lucide-react";
import logoLight from "../../assets/logo-light.png";
import logoDark from "../../assets/logo-dark.png";

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
>>>>>>> f8bede3a1b804d235670346cf83fdf6a26664106
  if (pathname.match(/\/app\/\d+\/aula/)) return "Aula de Formación";
  if (pathname.match(/\/app\/\d+\/mi-ministerio/)) return "Mi Ministerio";
  if (pathname.match(/\/app\/\d+\/notificaciones/)) return "Notificaciones";
  if (pathname.match(/\/app\/\d+\/perfil/)) return "Mi Perfil";
<<<<<<< HEAD
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
        { label: "Usuarios", path: "/app/global/usuarios", icon: <Users className="w-5 h-5" />, section: "Gestión Global" },
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
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "lider":
      return [
        { label: "Dashboard", path: t, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Ministerio", path: `${t}/mi-ministerio`, icon: <FolderHeart className="w-5 h-5" />, section: "Ministerio" },
        { label: "Miembros", path: `${t}/miembros`, icon: <Users className="w-5 h-5" />, section: "Ministerio" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "admin_sede":
      return [
        { label: "Dashboard", path: t, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Miembros", path: `${t}/miembros`, icon: <Users className="w-5 h-5" />, section: "Operaciones" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
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
=======
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
        { label: "Usuarios", path: "/app/global/usuarios", icon: <Users className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Cumpleaños", path: "/app/global/cumpleanos", icon: <Cake className="w-5 h-5" />, section: "Gestión Global" },
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
        { label: "Cumpleaños", path: `${t}/cumpleanos`, icon: <Cake className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "lider":
      return [
        { label: "Dashboard", path: t, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Ministerio", path: `${t}/mi-ministerio`, icon: <FolderHeart className="w-5 h-5" />, section: "Ministerio" },
        { label: "Miembros", path: `${t}/miembros`, icon: <Users className="w-5 h-5" />, section: "Ministerio" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Cumpleaños", path: `${t}/cumpleanos`, icon: <Cake className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "admin_sede":
      return [
        { label: "Dashboard", path: t, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Miembros", path: `${t}/miembros`, icon: <Users className="w-5 h-5" />, section: "Operaciones" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
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
>>>>>>> f8bede3a1b804d235670346cf83fdf6a26664106
    iglesiaActual,
    setIglesiaActual,
    logout,
    notificacionesCount,
<<<<<<< HEAD
    iglesiasDelUsuario,
    sidebarOpen,
    toggleSidebar,
    showChurchSelector,
    setShowChurchSelector,
    darkMode,
    toggleDarkMode,
  } = useApp();

=======
    iglesiasDelUsuario,
    sidebarOpen,
    toggleSidebar,
    showChurchSelector,
    setShowChurchSelector,
    darkMode,
    toggleDarkMode,
  } = useApp();

>>>>>>> f8bede3a1b804d235670346cf83fdf6a26664106
  const [isHovered, setIsHovered] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const isExpanded = !isCollapsed || isHovered;
  const authResolved = isHydrated && !authLoading;
<<<<<<< HEAD

  useEffect(() => {
    if (!authResolved) return;
    if (!usuarioActual && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [authResolved, usuarioActual, navigate, location.pathname]);

  useEffect(() => {
    const title = pageTitles[location.pathname] ?? getDynamicPageTitle(location.pathname);
    document.title = `${title} | IGLESIABD`;
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
  const activeChurch = iglesiaActual;
  const navItems = getNavItemsForRole(rol, iglesiaActual);
  const navGroups = groupBySection(navItems);
  const showChurchSelectorPanel = rol !== "super_admin";
  const initials = `${usuarioActual.nombres.charAt(0)}${usuarioActual.apellidos.charAt(0)}`;
  const sidebarWidth = isExpanded ? "w-72" : "w-[78px]";

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
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`fixed lg:static inset-y-0 left-0 z-40 ${sidebarWidth} bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-[4px_0_24px_rgba(0,0,0,0.3)] border-r border-sidebar-border/30 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Sidebar Header */}
          <div className="h-28 flex items-center px-4 border-b border-sidebar-border/30 shrink-0 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            <AnimatePresence mode="wait">
              {isExpanded ? (
                <motion.div 
                  key="expanded-header"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center justify-center flex-1 min-w-0 relative z-10 w-full h-full"
                >
                  <SEILogo className="w-28 h-28" />
                </motion.div>
              ) : (
                <motion.div 
                  key="collapsed-header"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-full h-full flex justify-center items-center"
                >
                  <SEILogo className="w-8 h-8" />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-sidebar-foreground/60 hover:text-white ml-2 relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Church Selector */}
          {showChurchSelectorPanel && (
            <div className={`px-3 py-4 border-b border-sidebar-border/30 bg-gradient-to-b from-sidebar-accent/20 to-transparent transition-all duration-500 ${!isExpanded ? "flex justify-center" : ""}`}>
              {isExpanded ? (
                <div className="relative">
                  <button
                    onClick={() => setShowChurchSelector(!showChurchSelector)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold text-sidebar-foreground bg-white/[0.03] hover:bg-white/[0.08] transition-all duration-300 border border-white/[0.05] hover:border-sidebar-primary/40 shadow-inner group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-sidebar-primary/20 flex items-center justify-center shrink-0 group-hover:bg-sidebar-primary/30 transition-colors">
                      <Building2 className="w-4 h-4 text-sidebar-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="flex-1 text-left truncate tracking-tight">
                      {iglesiaActual?.nombre || "Seleccionar iglesia"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-sidebar-primary/70 shrink-0 transition-all duration-300 ${showChurchSelector ? "rotate-180 text-sidebar-primary" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showChurchSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden origin-top backdrop-blur-xl"
                      >
                        <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {iglesiasDelUsuario.map((ig) => (
                            <button
                              key={ig.id}
                              onClick={() => {
                                setIglesiaActual(ig);
                                setShowChurchSelector(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-3 mb-1 last:mb-0 ${
                                ig.id === iglesiaActual?.id
                                  ? "text-white bg-gradient-to-r from-[#709dbd] to-[#4682b4] shadow-lg"
                                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${ig.id === iglesiaActual?.id ? "bg-white scale-100" : "bg-white/20 scale-75"}`} />
                              {ig.nombre}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowChurchSelector(!showChurchSelector)}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center bg-sidebar-primary/10 border border-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/20 transition-all"
                    >
                      <Building2 className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-bold">
                    {iglesiaActual?.nombre || "Cambiar Iglesia"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {navGroups.map((group, groupIndex) => (
              <div key={group.section} className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {group.section && isExpanded && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70 px-3 mb-3"
                    >
                      {group.section}
                    </motion.p>
                  )}
                  {!isExpanded && groupIndex > 0 && (
                    <motion.div 
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="w-8 h-[1px] bg-white/10 mx-auto mb-4" 
                    />
                  )}
                </AnimatePresence>
                
                <div className="space-y-1.5">
                  {group.items.map((item) => {
=======
  const { data: usuarios = [] } = useUsuariosEnriquecidos();

  const cumpleanosHoy = usuarios.filter((u) => {
    if (!u.fechaNacimiento) return false;
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
    document.title = `${title} | IGLESIABD`;
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
  const activeChurch = iglesiaActual;
  const navItems = getNavItemsForRole(rol, iglesiaActual);
  const navGroups = groupBySection(navItems);
  const showChurchSelectorPanel = rol !== "super_admin";
  const fullName = `${usuarioActual.nombres} ${usuarioActual.apellidos}`;
  const initials = `${usuarioActual.nombres.charAt(0)}${usuarioActual.apellidos.charAt(0)}`;
  const sidebarWidth = isExpanded ? "w-72" : "w-[78px]";

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
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`fixed lg:static inset-y-0 left-0 z-40 ${sidebarWidth} bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-[4px_0_24px_rgba(0,0,0,0.3)] border-r border-sidebar-border/30 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Sidebar Header */}
          <div className="h-28 flex items-center px-4 border-b border-sidebar-border/30 shrink-0 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
            <AnimatePresence mode="wait">
              {isExpanded ? (
                <motion.div 
                  key="expanded-header"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center justify-center flex-1 min-w-0 relative z-10 w-full h-full"
                >
                  <img src={darkMode ? logoLight : logoDark} alt="SEI Logo" className="h-22 w-auto max-w-[90%] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:scale-105 transition-transform duration-500" />
                </motion.div>
              ) : (
                <motion.div 
                  key="collapsed-header"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-full h-full flex justify-center items-center"
                >
                  <img src={darkMode ? logoLight : logoDark} alt="SEI Logo" className="h-22 w-auto max-w-[85%] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:scale-105 transition-transform duration-500" />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-sidebar-foreground/60 hover:text-white ml-2 relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Church Selector */}
          {showChurchSelectorPanel && (
            <div className={`px-3 py-4 border-b border-sidebar-border/30 bg-gradient-to-b from-sidebar-accent/20 to-transparent transition-all duration-500 ${!isExpanded ? "flex justify-center" : ""}`}>
              {isExpanded ? (
                <div className="relative">
                  <button
                    onClick={() => setShowChurchSelector(!showChurchSelector)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold text-sidebar-foreground bg-white/[0.03] hover:bg-white/[0.08] transition-all duration-300 border border-white/[0.05] hover:border-sidebar-primary/40 shadow-inner group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-sidebar-primary/20 flex items-center justify-center shrink-0 group-hover:bg-sidebar-primary/30 transition-colors">
                      <Building2 className="w-4 h-4 text-sidebar-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="flex-1 text-left truncate tracking-tight">
                      {iglesiaActual?.nombre || "Seleccionar iglesia"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-sidebar-primary/70 shrink-0 transition-all duration-300 ${showChurchSelector ? "rotate-180 text-sidebar-primary" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showChurchSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden origin-top backdrop-blur-xl"
                      >
                        <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {iglesiasDelUsuario.map((ig) => (
                            <button
                              key={ig.id}
                              onClick={() => {
                                setIglesiaActual(ig);
                                setShowChurchSelector(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-3 mb-1 last:mb-0 ${
                                ig.id === iglesiaActual?.id
                                  ? "text-white bg-gradient-to-r from-sidebar-primary to-blue-600 shadow-lg"
                                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${ig.id === iglesiaActual?.id ? "bg-white scale-100" : "bg-white/20 scale-75"}`} />
                              {ig.nombre}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowChurchSelector(!showChurchSelector)}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center bg-sidebar-primary/10 border border-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/20 transition-all"
                    >
                      <Building2 className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-bold">
                    {iglesiaActual?.nombre || "Cambiar Iglesia"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {navGroups.map((group, groupIndex) => (
              <div key={group.section} className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {group.section && isExpanded && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400/50 px-3 mb-3"
                    >
                      {group.section}
                    </motion.p>
                  )}
                  {!isExpanded && groupIndex > 0 && (
                    <motion.div 
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="w-8 h-[1px] bg-white/10 mx-auto mb-4" 
                    />
                  )}
                </AnimatePresence>
                
                <div className="space-y-1.5">
                  {group.items.map((item) => {
>>>>>>> f8bede3a1b804d235670346cf83fdf6a26664106
                    const isActive =
                      location.pathname === item.path ||
                      (item.path !== "/" && location.pathname.startsWith(item.path));
                    const isNotif = item.label === "Notificaciones";
<<<<<<< HEAD

                    if (!isExpanded) {
                      return (
                        <Tooltip key={item.path}>
                          <TooltipTrigger asChild>
                            <div className="relative group/nav w-full flex justify-center">
                              <button
                                onClick={() => {
                                  navigate(item.path);
                                  if (window.innerWidth < 1024) toggleSidebar();
                                }}
                                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 relative overflow-hidden focus:outline-none ${
                                  isActive 
                                    ? "text-white bg-gradient-to-br from-[#709dbd] to-[#4682b4] shadow-lg shadow-blue-900/40" 
                                    : "text-sidebar-foreground/40 hover:text-primary hover:bg-white/[0.05]"
                                }`}
                              >
                                <span className={`relative z-10 transition-transform duration-500 ${isActive ? "scale-110" : "group-hover/nav:scale-110"}`}>
                                  {item.icon}
                                </span>
=======
                    const isCumpleanos = item.label === "Cumpleaños";

                    if (!isExpanded) {
                      return (
                        <Tooltip key={item.path}>
                          <TooltipTrigger asChild>
                            <div className="relative group/nav w-full flex justify-center">
                              <button
                                onClick={() => {
                                  navigate(item.path);
                                  if (window.innerWidth < 1024) toggleSidebar();
                                }}
                                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 relative overflow-hidden focus:outline-none ${
                                  isActive 
                                    ? "text-white bg-gradient-to-br from-sidebar-primary to-blue-600 shadow-[0_8px_20px_rgba(26,127,168,0.4)]" 
                                    : "text-sidebar-foreground/40 hover:text-cyan-400 hover:bg-white/[0.05]"
                                }`}
                              >
                                <span className={`relative z-10 transition-transform duration-500 ${isActive ? "scale-110" : "group-hover/nav:scale-110"}`}>
                                  {item.icon}
                                </span>
>>>>>>> f8bede3a1b804d235670346cf83fdf6a26664106
                                {isNotif && unreadCount > 0 && (
                                  <span className="absolute top-2 right-2 z-10 bg-red-500 outline outline-2 outline-sidebar text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse">
                                    {unreadCount}
                                  </span>
                                )}
<<<<<<< HEAD
                              </button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs font-bold px-3 py-1.5 bg-[#0f172a] text-white border-white/10 shadow-2xl">
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
                          isActive ? "text-white shadow-lg shadow-blue-900/40" : "text-sidebar-foreground/60 hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-nav-bg"
                            className="absolute inset-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] z-0"
                            initial={false}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        {!isActive && (
                          <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300 z-0" />
                        )}
                        <span className={`relative z-10 shrink-0 transition-all duration-500 ${isActive ? "scale-110 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "group-hover/nav:scale-110 group-hover/nav:text-primary"}`}>
                          {item.icon}
                        </span>
                        <span className={`relative z-10 flex-1 text-left truncate transition-all duration-300 ${isActive ? "font-black tracking-tight" : "font-bold tracking-tight group-hover/nav:translate-x-1"}`}>
                          {item.label}
                        </span>
                        {isNotif && unreadCount > 0 && (
                          <span className="relative z-10 bg-red-500 text-white text-[10px] rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-bold shadow-lg animate-pulse">
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
          <div className={`hidden lg:flex py-6 border-t border-sidebar-border/30 mt-auto shrink-0 transition-all duration-500 ${!isExpanded ? "justify-center" : "px-6"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={`flex items-center justify-center transition-all duration-500 outline-none ${
                    !isExpanded 
                    ? "w-12 h-12 rounded-2xl bg-white/[0.03] text-sidebar-foreground/40 hover:text-white hover:bg-white/10" 
                    : "gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] text-sidebar-foreground/60 hover:text-white hover:bg-white/10 w-full"
                  }`}
                >
                  {isCollapsed ? <PanelLeftOpen className="w-5 h-5 shrink-0" /> : <PanelLeftClose className="w-5 h-5 shrink-0" />}
                  {isExpanded && (
                    <span className="text-sm font-bold truncate">
                      {isCollapsed ? "Fijar Menú" : "Contraer Menú"}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-bold px-3 py-1.5">
                {isCollapsed ? "Expandir y Fijar" : "Permitir auto-contraer"}
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
              {/* Page title removed */}
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
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={async () => {
                      await logout();
                      navigate("/login", { replace: true });
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-bold">Cerrar Sesión</TooltipContent>
              </Tooltip>

              <button
                onClick={() => {
                  const perfilPath = rolActual === "super_admin"
                    ? "/app/global/perfil"
                    : iglesiaActual?.id != null ? `/app/${iglesiaActual.id}/perfil` : "/app";
                  navigate(perfilPath);
                }}
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
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
=======
                                {isCumpleanos && cumpleanosHoy > 0 && (
                                  <span className="absolute top-2 right-2 z-10 bg-red-500 outline outline-2 outline-sidebar text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                    {cumpleanosHoy}
                                  </span>
                                )}
                              </button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs font-bold px-3 py-1.5 bg-[#0f172a] text-white border-white/10 shadow-2xl">
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
                          isActive ? "text-white shadow-lg" : "text-sidebar-foreground/60 hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-nav-bg"
                            className="absolute inset-0 bg-gradient-to-r from-sidebar-primary to-blue-600 z-0"
                            initial={false}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        {!isActive && (
                          <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300 z-0" />
                        )}
                        <span className={`relative z-10 shrink-0 transition-all duration-500 ${isActive ? "scale-110 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "group-hover/nav:scale-110 group-hover/nav:text-cyan-400"}`}>
                          {item.icon}
                        </span>
                        <span className={`relative z-10 flex-1 text-left truncate transition-all duration-300 ${isActive ? "font-black tracking-tight" : "font-bold tracking-tight group-hover/nav:translate-x-1"}`}>
                          <span className="flex items-center gap-2">
                            {item.label}
                            {isCumpleanos && cumpleanosHoy > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                                {cumpleanosHoy}
                              </span>
                            )}
                          </span>
                        </span>
                        {isNotif && unreadCount > 0 && (
                          <span className="relative z-10 bg-red-500 text-white text-[10px] rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-bold shadow-lg animate-pulse">
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
          <div className={`hidden lg:flex py-6 border-t border-sidebar-border/30 mt-auto shrink-0 transition-all duration-500 ${!isExpanded ? "justify-center" : "px-6"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={`flex items-center justify-center transition-all duration-500 outline-none ${
                    !isExpanded 
                    ? "w-12 h-12 rounded-2xl bg-white/[0.03] text-sidebar-foreground/40 hover:text-white hover:bg-white/10" 
                    : "gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] text-sidebar-foreground/60 hover:text-white hover:bg-white/10 w-full"
                  }`}
                >
                  {isCollapsed ? <PanelLeftOpen className="w-5 h-5 shrink-0" /> : <PanelLeftClose className="w-5 h-5 shrink-0" />}
                  {isExpanded && (
                    <span className="text-sm font-bold truncate">
                      {isCollapsed ? "Fijar Menú" : "Contraer Menú"}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-bold px-3 py-1.5">
                {isCollapsed ? "Expandir y Fijar" : "Permitir auto-contraer"}
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
              {/* Page title removed */}
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
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={async () => {
                      await logout();
                      navigate("/login", { replace: true });
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-bold">Cerrar Sesión</TooltipContent>
              </Tooltip>

              <button
                onClick={() => {
                  const perfilPath = rolActual === "super_admin"
                    ? "/app/global/perfil"
                    : iglesiaActual?.id != null ? `/app/${iglesiaActual.id}/perfil` : "/app";
                  navigate(perfilPath);
                }}
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
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
>>>>>>> f8bede3a1b804d235670346cf83fdf6a26664106
