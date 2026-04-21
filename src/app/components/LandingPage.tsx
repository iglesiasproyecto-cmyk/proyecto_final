import React from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { motion } from "framer-motion"; 
import { SEILogo } from "./SEILogo";
import {
  BookOpen, Activity, 
  Layers, ShieldCheck, Network, TrendingUp
} from "lucide-react"; 
import { DashboardCarousel } from "./DashboardCarousel";

// --- Componentes Auxiliares ---

function GeometricPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
      <svg className="absolute top-0 left-0 w-64 h-64" viewBox="0 0 200 200">
        <path d="M 0,100 L 50,50 L 50,0" stroke="#0c2340" strokeWidth="1" fill="none" />
        <path d="M 30,100 L 80,50 L 80,0" stroke="#0c2340" strokeWidth="1" fill="none" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-64 h-64 rotate-180" viewBox="0 0 200 200">
        <path d="M 0,100 L 50,50 L 50,0" stroke="#0c2340" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  const modules = [
    {
      title: "Multi-Iglesia (SaaS)",
      desc: "Gestión centralizada para misiones. Creación de sedes y asignación de administradores locales.",
      icon: Layers,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "Módulo Operativo",
      desc: "Eventos y tareas con estados: Pendiente, En Proceso y Completada por departamento.",
      icon: Activity,
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    },
    {
      title: "Aula Virtual",
      desc: "Capacitación interna con lecciones, quizzes y recursos externos (YouTube/Drive).",
      icon: BookOpen,
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    {
      title: "Gestión Organizacional",
      desc: "Estructura por departamentos y subgrupos. Control total de miembros y roles jerárquicos.",
      icon: Network,
      color: "text-indigo-500",
      bg: "bg-indigo-50"
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden font-sans">
      {/* Header Fijo */}
      <header className="fixed top-0 w-full bg-[#0c2340]/95 backdrop-blur-md text-white py-4 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5">
              <SEILogo className="w-full h-full" />
            </div>
            <span className="font-bold text-xl tracking-tight">S.E.I.</span>
          </div>
          <Button 
            onClick={() => navigate("/login")} 
            className="bg-[#2596be] hover:bg-[#1a7fa8] text-white px-8 rounded-full font-bold transition-all hover:scale-105"
          >
            Iniciar Sesión
          </Button>
        </div>
      </header>

      {/* Hero Section (AQUÍ SE CORRIGIÓ LA ESTRUCTURA DEL CARRUSEL) */}
      <section className="relative pt-40 pb-24 px-6 bg-[#0c2340] text-white rounded-b-[60px]">
        <GeometricPattern />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          
          {/* LADO IZQUIERDO: Textos e Información */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              Soporte Estructural de <span className="text-[#5cbcd6]">Iglesias.</span>
            </h1>
            <p className="text-xl text-blue-100/70 mb-10 leading-relaxed max-w-xl">
              Plataforma SaaS multi-iglesia para la gestión organizacional, operativa y formativa estructurada por departamentos o comités.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-[#2596be] text-white rounded-2xl px-10 h-16 text-lg font-bold shadow-2xl transition-transform hover:scale-105">
                Empezar Gestión
              </Button>
            </div>
          </motion.div>

          {/* LADO DERECHO: Carrusel de Fotos (Ecosistema Estratégico) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8 }} 
            className="w-full relative"
          >
            {/* Luces de fondo decorativas */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#2596be]/10 rounded-full blur-3xl animate-pulse"></div>
            
            <div className="relative z-10 p-2 bg-white/5 rounded-[40px] border border-white/10 backdrop-blur-sm shadow-2xl">
              <DashboardCarousel />
            </div>

            {/* Badge flotante */}
            <div className="absolute -bottom-4 -right-4 bg-[#2596be] text-white text-[10px] font-black px-4 py-2 rounded-full shadow-xl tracking-widest uppercase z-20">
              Vista Previa del Sistema
            </div>
          </motion.div>
        </div>
      </section>

      {/* Módulos del Sistema */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-[#0c2340] mb-6">Módulos del Sistema</h2>
          <div className="w-24 h-2 bg-[#2596be] mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {modules.map((m, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -15 }} 
              className="bg-white p-10 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-50 transition-all group"
            >
              <div className={`w-16 h-16 rounded-3xl ${m.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                <m.icon className={`w-9 h-9 ${m.color}`} />
              </div>
              <h3 className="text-2xl font-bold text-[#0c2340] mb-4 leading-tight">{m.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Jerarquía y Roles */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="lg:w-1/2">
            <h2 className="text-4xl font-black text-[#0c2340] mb-8">Estructura Jerárquica</h2>
            <div className="space-y-4">
              {[
                { r: "Super Admin", d: "Crea iglesias y asigna administradores locales." },
                { r: "Admin Iglesia", d: "Gestiona la estructura interna y eventos globales." },
                { r: "Líder / Coordinador", d: "Gestiona la operación diaria del departamento." },
                { r: "Servidor", d: "Visualiza tareas, cronograma y accede al aula." }
              ].map((role, idx) => (
                <div key={idx} className="flex items-center gap-5 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-[#0c2340] text-white flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#0c2340]">{role.r}</h4>
                    <p className="text-slate-500 text-sm">{role.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="lg:w-1/2 w-full">
             <div className="bg-[#0c2340] p-12 rounded-[50px] text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="text-3xl font-bold mb-6">Reglas de Visibilidad</h3>
                   <ul className="space-y-6">
                      <li className="flex items-start gap-4">
                        <ShieldCheck className="text-[#5cbcd6] mt-1 flex-shrink-0" />
                        <p className="text-blue-100/80"><span className="font-bold text-white">Super Admin:</span> Acceso total a todas las iglesias y configuraciones del sistema.</p>
                      </li>
                      <li className="flex items-start gap-4">
                        <ShieldCheck className="text-[#5cbcd6] mt-1 flex-shrink-0" />
                        <p className="text-blue-100/80"><span className="font-bold text-white">Líder:</span> Gestión exclusiva de su departamento y miembros asignados.</p>
                      </li>
                      <li className="flex items-start gap-4">
                        <ShieldCheck className="text-[#5cbcd6] mt-1 flex-shrink-0" />
                        <p className="text-blue-100/80"><span className="font-bold text-white">Servidor:</span> Acceso a tareas propias, cronograma y material educativo del aula.</p>
                      </li>
                   </ul>
                </div>
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-[#2596be]/10 rounded-full blur-3xl"></div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-white text-center border-t border-slate-100">
        <div className="flex justify-center mb-8">
          <SEILogo className="w-16 h-16 grayscale opacity-30" />
        </div>
        <p className="text-slate-400 font-medium">© 2026 S.E.I. Soporte Estructural de Iglesias. <br/> Fortaleciendo la visión eclesial a través de la tecnología.</p>
      </footer>
    </div>
  );
}