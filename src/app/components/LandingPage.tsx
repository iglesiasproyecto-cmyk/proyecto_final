import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { SEILogo } from "./SEILogo";
import {
  Users, CalendarDays, BarChart3, FileText, TrendingUp, Activity,
  ArrowRight, ShieldCheck, Zap, Globe
} from "lucide-react";

// Advanced Background with HUD and Aurora effects
function BackgroundAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Aurora Pulses (Multi-color) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[20%] -left-[10%] w-[100%] h-[100%] bg-gradient-to-br from-purple-600/20 via-transparent to-cyan-500/20 rounded-full blur-[150px]"
      />
      
      {/* Technical Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(70,130,180,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(70,130,180,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />

      {/* Floating Dynamic Particles */}
      {[...Array(30)].map((_, i) => (
        <motion.div
           key={i}
           initial={{ 
             opacity: 0, 
             x: Math.random() * 100 + "%", 
             y: Math.random() * 100 + "%",
             scale: Math.random() * 0.5 + 0.2
           }}
           animate={{ 
             opacity: [0, 0.5, 0],
             y: [null, "-=" + (Math.random() * 200 + 100)],
             x: [null, i % 2 === 0 ? "+=100" : "-=100"]
           }}
           transition={{ 
             duration: Math.random() * 15 + 10, 
             repeat: Infinity, 
             ease: "linear",
             delay: Math.random() * 10
           }}
           className={`absolute w-1 h-1 ${i % 3 === 0 ? 'bg-purple-400' : 'bg-cyan-400'} rounded-full blur-[1px]`}
        />
      ))}
      
      {/* HUD Scanner Beam */}
      <motion.div 
        animate={{ y: ["-100%", "200%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent z-10"
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#4682b4]/5 rounded-full blur-[160px] animate-pulse" />
    </div>
  );
}

// Flying Eagle with Parallax Mouse Interaction
function FlyingEagle() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for natural movement
  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-15, 15]), springConfig);
  const translateX = useSpring(useTransform(mouseX, [-300, 300], [-20, 20]), springConfig);
  const translateY = useSpring(useTransform(mouseY, [-300, 300], [-20, 20]), springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const x = clientX - window.innerWidth / 2;
      const y = clientY - window.innerHeight / 2;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      style={{ rotateX, rotateY, x: translateX, y: translateY, perspective: 1000 }}
      initial={{ y: 100, opacity: 0, scale: 0.8 }}
      animate={{ 
        y: [100, 0], 
        opacity: [0, 1],
        scale: [0.8, 1]
      }}
      transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-30 mb-2 cursor-pointer group"
    >
      <motion.div
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 0.5, 0, -0.5, 0]
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="w-64 h-64 md:w-[550px] md:h-[350px] relative"
      >
        {/* Logo with massive glow */}
        <div className="absolute inset-0 bg-white/10 blur-[80px] rounded-full group-hover:bg-cyan-500/20 transition-colors duration-1000" />
        <SEILogo className="w-full h-full object-contain filter drop-shadow-[0_0_60px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_80px_rgba(34,211,238,0.5)] transition-all duration-700" />
      </motion.div>
      
      {/* Expansion shockwave effect */}
      <motion.div 
        animate={{ opacity: [0, 0.4, 0], scale: [1, 1.8, 1.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
        className="absolute inset-0 bg-cyan-400/10 rounded-full blur-3xl -z-10"
      />
    </motion.div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full bg-[#0c2340] flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Cinematic Deep Atmosphere */}
      <div className="absolute inset-0 bg-[#061424]" />
      <BackgroundAnimation />
      
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c2340]/40 to-[#061424] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-20 flex flex-col items-center text-center max-w-5xl mx-auto">
        <FlyingEagle />
        
        {/* Content Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="space-y-6"
        >
          {/* Title */}
          <div className="space-y-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1.2 }}
              className="text-[10px] font-black uppercase tracking-[0.8em] text-cyan-400 mb-1"
            >
              Protocolo de Acceso Seguro
            </motion.p>
            <motion.h1 
              className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase italic leading-[0.8] drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              Bienvenidos a <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-400 to-purple-400 animate-gradient-x">S.E.I.</span>
            </motion.h1>
          </div>

          {/* Subtitle / Description */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="space-y-4"
          >
            <p className="text-xl md:text-3xl font-black text-white max-w-2xl mx-auto leading-tight uppercase tracking-widest italic flex items-center justify-center gap-3">
              <span className="w-8 h-px bg-cyan-500/50" />
              Liderazgo con Visión Técnica
              <span className="w-8 h-px bg-cyan-500/50" />
            </p>
            <p className="text-[11px] md:text-xs text-slate-400 max-w-xl mx-auto font-bold uppercase tracking-[0.4em] leading-relaxed">
              La arquitectura digital definitiva para la expansión de ministerios locales con excelencia profesional.
            </p>
          </motion.div>

          {/* Primary Action */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="pt-10 flex flex-col items-center gap-4"
          >
            <Button
              onClick={() => navigate("/login")}
              className="group relative h-20 px-16 rounded-[40px] bg-white text-[#0c2340] font-black uppercase italic tracking-[5px] text-xl shadow-[0_25px_60px_rgba(255,255,255,0.2)] hover:bg-cyan-400 hover:text-white transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              <span className="relative flex items-center gap-4">
                Ingresar al Sistema
                <ArrowRight className="w-8 h-8 group-hover:translate-x-3 transition-transform duration-500" />
              </span>
            </Button>
            
            <motion.div 
               animate={{ opacity: [0.3, 0.6, 0.3] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-cyan-500/60"
            >
               <Zap className="w-3 h-3 fill-current" /> Encriptación AES-256 Activa
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Floating Interactive Elements */}
        <div className="absolute inset-x-0 top-0 h-full pointer-events-none opacity-30">
           <motion.div 
             animate={{ y: [0, -40, 0], rotate: [0, 10, 0] }} 
             transition={{ duration: 10, repeat: Infinity }}
             className="absolute top-[20%] left-[5%] hidden lg:block"
           ><ShieldCheck className="w-16 h-16 text-cyan-500" /></motion.div>
           
           <motion.div 
             animate={{ y: [0, 40, 0], rotate: [0, -10, 0] }} 
             transition={{ duration: 14, repeat: Infinity }}
             className="absolute bottom-[20%] right-[5%] hidden lg:block"
           ><Globe className="w-20 h-20 text-purple-500" /></motion.div>
        </div>
      </div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
        className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2"
      >
        <div className="w-24 h-px bg-white/5" />
        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.6em] italic">
          © MMXXVI &middot; SOPORTE ESTRUCTURAL DE IGLESIAS
        </p>
      </motion.div>
    </div>
  );
}