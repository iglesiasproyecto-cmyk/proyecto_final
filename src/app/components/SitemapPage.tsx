import React from "react";
import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";
import {
  LayoutDashboard, Building2, Church, UserCheck, Users, Globe, Settings2,
  Bell, User, Settings, CalendarDays, GraduationCap, FolderHeart, ListTodo,
  BookOpen, ClipboardCheck, ArrowRight, ShieldCheck, UserCircle, Users2
} from "lucide-react";

const allRoutes = [
  { label: "Dashboard", path: "/app", icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
  { label: "Iglesias", path: "/app/iglesias", icon: <Building2 className="w-5 h-5" />, section: "Gestion" },
  { label: "Sedes", path: "/app/sedes", icon: <Church className="w-5 h-5" />, section: "Gestion" },
  { label: "Pastores", path: "/app/pastores", icon: <UserCheck className="w-5 h-5" />, section: "Gestion" },
  { label: "Usuarios", path: "/app/usuarios", icon: <Users className="w-5 h-5" />, section: "Gestion" },
  { label: "Geografia", path: "/app/geografia", icon: <Globe className="w-5 h-5" />, section: "Configuracion" },
  { label: "Catalogos", path: "/app/catalogos", icon: <Settings2 className="w-5 h-5" />, section: "Configuracion" },
  { label: "Ministerios", path: "/app/departamentos", icon: <Settings className="w-5 h-5" />, section: "Iglesia" },
  { label: "Miembros", path: "/app/miembros", icon: <Users className="w-5 h-5" />, section: "Iglesia/Ministerio" },
  { label: "Eventos", path: "/app/eventos", icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
  { label: "Mi Ministerio", path: "/app/mi-departamento", icon: <FolderHeart className="w-5 h-5" />, section: "Ministerio" },
  { label: "Tareas", path: "/app/tareas", icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
  { label: "Aula", path: "/app/aula", icon: <BookOpen className="w-5 h-5" />, section: "Formacion" },
  { label: "Evaluaciones", path: "/app/evaluaciones", icon: <ClipboardCheck className="w-5 h-5" />, section: "Formacion" },
  { label: "Ciclos Lectivos", path: "/app/ciclos-lectivos", icon: <GraduationCap className="w-5 h-5" />, section: "Formacion" },
  { label: "Notificaciones", path: "/app/notificaciones", icon: <Bell className="w-5 h-5" />, section: "Personal" },
  { label: "Perfil", path: "/app/perfil", icon: <User className="w-5 h-5" />, section: "Personal" },
];

const roles = [
  { id: "super_admin", label: "Super Admin", icon: <ShieldCheck className="w-4 h-4" />, color: "bg-red-500" },
  { id: "admin_iglesia", label: "Admin Iglesia", icon: <Building2 className="w-4 h-4" />, color: "bg-indigo-500" },
  { id: "lider", label: "Lider", icon: <UserCircle className="w-4 h-4" />, color: "bg-amber-500" },
  { id: "servidor", label: "Servidor", icon: <Users2 className="w-4 h-4" />, color: "bg-cyan-500" },
];

export function SitemapPage() {
  const navigate = useNavigate();
  const { isMockMode, setMockMode, mockRol, setMockRol } = useApp();

  const sections = Array.from(new Set(allRoutes.map(r => r.section)));

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa del Sitio (UI Explorer)</h1>
          <p className="text-muted-foreground mt-1">Explora todas las páginas del sistema independientemente del backend.</p>
        </div>
        
        <div className="flex items-center gap-3 p-1 bg-muted rounded-xl border border-border">
          <button
            onClick={() => setMockMode(!isMockMode)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${isMockMode ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-muted-foreground/10"}`}
          >
            {isMockMode ? "Mock Mode: ON" : "Mock Mode: OFF"}
          </button>
        </div>
      </div>

      {isMockMode && (
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="shrink-0">
              <p className="text-sm font-medium mb-3">Simular Rol UI:</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setMockRol(r.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all border ${
                      mockRol === r.id 
                        ? "bg-white text-foreground shadow-sm border-primary/30" 
                        : "bg-transparent text-muted-foreground hover:bg-white/50 border-transparent"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${r.color}`} />
                    {r.icon}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 text-sm text-muted-foreground border-l border-border/50 pl-6">
              <p>Ciertas páginas solo son visibles o tienen diferentes vistas según el rol seleccionado. Cambia el rol para ver cómo se adapta la UI.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <div key={section} className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">{section}</h3>
            <div className="space-y-2">
              {allRoutes.filter(r => r.section === section).map((route) => (
                <motion.div
                  key={route.path}
                  whileHover={{ x: 4 }}
                  className="group"
                >
                  <Card 
                    className="p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all border-transparent bg-card/50"
                    onClick={() => navigate(route.path)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                      {route.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{route.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{route.path}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-border">
        <h3 className="text-lg font-semibold mb-4">¿Por qué usar el Modo Mock?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="p-4 rounded-xl bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Sin Backend
            </h4>
            <p className="text-muted-foreground">Permite ver la estructura de las páginas incluso si el servidor de Supabase no responde o no hay datos.</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Pruebas de Roles
            </h4>
            <p className="text-muted-foreground">Visualiza instantáneamente qué menús y acciones tiene cada tipo de usuario sin cambiar de cuenta.</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-primary" /> Mejora de Diseño
            </h4>
            <p className="text-muted-foreground">Ideal para trabajar puramente en CSS, espaciados y estética sin preocuparse por la lógica de negocio.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SitemapPage;
