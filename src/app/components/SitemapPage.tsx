import React from "react";
import { useNavigate } from "react-router";
import { Card } from "./ui/card";
import { motion } from "motion/react";
import {
  LayoutDashboard, Building2, Church, UserCheck, Users, Globe, Settings2,
  Bell, Settings, CalendarDays, GraduationCap, FolderHeart, ListTodo,
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
  { label: "Perfil", path: "/app/perfil", icon: <Users className="w-5 h-5" />, section: "Personal" },
];

const roles = [
  { id: "super_admin", label: "Super Admin", icon: <ShieldCheck className="w-4 h-4" />, color: "bg-red-500" },
  { id: "admin_iglesia", label: "Admin Iglesia", icon: <Building2 className="w-4 h-4" />, color: "bg-indigo-500" },
  { id: "lider", label: "Lider", icon: <UserCircle className="w-4 h-4" />, color: "bg-amber-500" },
  { id: "servidor", label: "Servidor", icon: <Users2 className="w-4 h-4" />, color: "bg-cyan-500" },
];

export function SitemapPage() {
  const navigate = useNavigate();

  const sections = Array.from(new Set(allRoutes.map(r => r.section)));

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa del Sitio</h1>
          <p className="text-muted-foreground mt-1">Explora todas las p&aacute;ginas del sistema.</p>
        </div>
      </div>

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
    </div>
  );
}

export default SitemapPage;

