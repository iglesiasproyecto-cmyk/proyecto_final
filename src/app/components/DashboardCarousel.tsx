import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

// --- IMPORTA TUS FOTOS AQUÍ ---
// Ajusta la ruta si la carpeta assets está en otro lugar (../../assets es lo común)
import foto1 from "../../assets/foto1.png";
import foto2 from "../../assets/foto2.png";
import foto3 from "../../assets/foto3.png";

const screenshots = [
  {
    url: foto1, // Usamos la variable importada
    title: "Módulo Operativo",
    desc: "Gestión y seguimiento de tareas en tiempo real."
  },
  {
    url: foto2,
    title: "Calendario de Eventos",
    desc: "Organización cronológica de actividades eclesiales."
  },
  {
    url: foto3,
    title: "Aula Virtual",
    desc: "Capacitación y recursos para todos los servidores."
  }
];

export function DashboardCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      nextStep();
    }, 5000);
    return () => clearInterval(timer);
  }, [index]);

  const nextStep = () => {
    setIndex((prev) => (prev === screenshots.length - 1 ? 0 : prev + 1));
  };

  const prevStep = () => {
    setIndex((prev) => (prev === 0 ? screenshots.length - 1 : prev - 1));
  };

  return (
    <div className="relative group w-full h-[300px] md:h-[400px] rounded-[32px] overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <img
            src={screenshots[index].url}
            alt={screenshots[index].title}
            className="w-full h-full object-cover object-top"
          />
          {/* Overlay oscuro para que el texto se lea bien */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c2340] via-transparent to-transparent opacity-80" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
            <h4 className="text-white text-xl font-black tracking-tight">{screenshots[index].title}</h4>
            <p className="text-blue-200/70 text-sm font-medium">{screenshots[index].desc}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Botones de navegación */}
      <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button onClick={prevStep} className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all">
          <ChevronLeft size={20} />
        </button>
        <button onClick={nextStep} className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Indicadores */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {screenshots.map((_, i) => (
          <div 
            key={i} 
            className={`h-1 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-[#2596be]' : 'w-2 bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}