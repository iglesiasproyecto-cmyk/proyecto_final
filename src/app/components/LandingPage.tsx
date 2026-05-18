import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { SEILogo } from "./SEILogo";
import {
  BookOpen, Activity, Layers, ShieldCheck, Network, 
  TrendingUp, Globe, Users, Zap, Shield, 
  Cpu, ChevronRight, Sparkles, ArrowRight,
  Database, Layout, Share2, Compass
} from "lucide-react";

// --- Advanced Visual Systems ---

const ParticleSystem = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(30)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-[2px] h-[2px] bg-blue-400/30 rounded-full"
        initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%" }}
        animate={{ 
          y: ["0%", "-100%"], 
          opacity: [0, 1, 0],
          scale: [0, 1.5, 0]
        }}
        transition={{ 
          duration: Math.random() * 20 + 10, 
          repeat: Infinity, 
          ease: "linear",
          delay: Math.random() * 10
        }}
      />
    ))}
  </div>
);

const NetworkNodesBackground = () => {
  const { scrollY } = useScroll();
  const scrollOffset = useTransform(scrollY, [0, 5000], [0, -1000]);

  // Generate a consistent set of nodes for connectivity
  const nodeCount = 20;
  const nodes = Array.from({ length: nodeCount }).map((_, i) => ({
    x: (i % 5) * 25 + Math.random() * 10,
    y: Math.floor(i / 5) * 25 + Math.random() * 15,
  }));

  return (
    <motion.div 
      style={{ y: scrollOffset }}
      className="absolute inset-0 pointer-events-none z-0 opacity-40"
    >
      <svg className="w-full h-[5000px] preserve-3d">
        {nodes.map((node, i) => {
          // Connect each node to a few nearby nodes
          const connections = [
            nodes[(i + 1) % nodeCount],
            nodes[(i + 5) % nodeCount],
          ];

          return connections.map((target, j) => (
            <motion.line
              key={`${i}-${j}`}
              x1={`${node.x}%`}
              y1={`${node.y}%`}
              x2={`${target.x}%`}
              y2={`${target.y}%`}
              stroke="rgba(59,130,246,0.25)"
              strokeWidth="1.2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1, 0.5, 1],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{ 
                duration: Math.random() * 10 + 10, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
          ));
        })}
        
        {/* Large crossing lines for extra scale */}
        {[...Array(8)].map((_, i) => (
          <motion.line
            key={`long-${i}`}
            x1="0%"
            y1={`${i * 15}%`}
            x2="100%"
            y2={`${(i * 15) + (Math.random() * 20 - 10)}%`}
            stroke="rgba(59,130,246,0.15)"
            strokeWidth="0.8"
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              x1: ["-10%", "10%", "-10%"]
            }}
            transition={{ duration: 20, repeat: Infinity }}
          />
        ))}
      </svg>
    </motion.div>
  );
};

const CinematicGlow = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <motion.div 
      animate={{ 
        scale: [1, 1.4, 1],
        opacity: [0.05, 0.15, 0.05],
        x: [0, 50, 0],
        y: [0, 30, 0]
      }}
      transition={{ duration: 15, repeat: Infinity }}
      className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-600/10 blur-[180px] rounded-full" 
    />
    <motion.div 
      animate={{ 
        scale: [1.3, 1, 1.3],
        opacity: [0.05, 0.1, 0.05],
        x: [0, -40, 0],
        y: [0, -20, 0]
      }}
      transition={{ duration: 20, repeat: Infinity }}
      className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-500/10 blur-[180px] rounded-full" 
    />
    <motion.div 
      animate={{ 
        scale: [1, 1.5, 1],
        opacity: [0.03, 0.08, 0.03],
        x: [-30, 30, -30],
        y: [50, -50, 50]
      }}
      transition={{ duration: 25, repeat: Infinity }}
      className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-cyan-400/5 blur-[200px] rounded-full" 
    />
  </div>
);

const GlassModule = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    whileHover={{ y: -10, scale: 1.02 }}
    className={`bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4)] relative overflow-hidden group ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    {children}
  </motion.div>
);

const NetworkNode = ({ index }: { index: number }) => (
  <motion.div
    animate={{ 
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3]
    }}
    transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
    className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"
  />
);

const FloatingNodes = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(15)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-[1px] h-[1px] bg-blue-500/20"
        initial={{ 
          x: Math.random() * 100 + "%", 
          y: Math.random() * 100 + "%",
          opacity: 0
        }}
        animate={{ 
          x: [null, Math.random() * 100 + "%"],
          y: [null, Math.random() * 100 + "%"],
          opacity: [0, 0.5, 0]
        }}
        transition={{ 
          duration: Math.random() * 30 + 20, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        <div className="absolute w-[200px] h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent rotate-45 transform-gpu" />
      </motion.div>
    ))}
  </div>
);

const FloatingUIElements = ({ mousePos }: { mousePos: { x: number, y: number } }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 opacity-20">
    <motion.div
      animate={{ 
        x: mousePos.x * 20,
        y: mousePos.y * 20,
        rotate: [0, 5, 0]
      }}
      className="absolute top-[20%] right-[10%] w-64 h-40 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl"
    >
      <div className="w-12 h-2 bg-blue-500/20 rounded-full mb-4" />
      <div className="space-y-2">
        <div className="w-full h-1 bg-white/5 rounded-full" />
        <div className="w-3/4 h-1 bg-white/5 rounded-full" />
        <div className="w-1/2 h-1 bg-white/5 rounded-full" />
      </div>
    </motion.div>
    
    <motion.div
      animate={{ 
        x: mousePos.x * -30,
        y: mousePos.y * -30,
        rotate: [0, -5, 0]
      }}
      className="absolute bottom-[30%] left-[5%] w-48 h-32 bg-white/[0.02] backdrop-blur-lg border border-white/5 rounded-2xl p-4 shadow-xl"
    >
      <div className="flex gap-2 mb-4">
        <div className="w-2 h-2 bg-red-500/20 rounded-full" />
        <div className="w-2 h-2 bg-yellow-500/20 rounded-full" />
        <div className="w-2 h-2 bg-green-500/20 rounded-full" />
      </div>
      <div className="w-full h-12 bg-blue-500/5 rounded-lg" />
    </motion.div>
  </div>
);

const AdvancedParticleField = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(40)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: Math.random() * 3 + 1,
          height: Math.random() * 3 + 1,
          background: `radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)`,
          left: Math.random() * 100 + "%",
          top: Math.random() * 100 + "%",
        }}
        animate={{
          y: [0, -100, 0],
          x: [0, Math.random() * 50 - 25, 0],
          opacity: [0, 0.8, 0],
          scale: [0, 1, 0]
        }}
        transition={{
          duration: Math.random() * 15 + 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: Math.random() * 10
        }}
      />
    ))}
  </div>
);

const GrowthTimeline = () => (
  <div className="flex items-end gap-2 h-24">
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ height: 10 }}
        whileInView={{ height: [10, Math.random() * 80 + 20] }}
        transition={{ duration: 1, delay: i * 0.1 }}
        className="w-1 bg-blue-500/40 rounded-full"
      />
    ))}
  </div>
);

// --- Primary Page Component ---

export function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [radius, setRadius] = useState(200);

  const { scrollY } = useScroll();
  // Logo estático y centrado como se solicitó
  const contentOpacity = useTransform(scrollY, [0, 150], [1, 0]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setRadius(95);
      } else if (window.innerWidth < 1024) {
        setRadius(140);
      } else {
        setRadius(200);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ 
        x: (e.clientX / window.innerWidth - 0.5) * 40, 
        y: (e.clientY / window.innerHeight - 0.5) * 40 
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="bg-[#02060d] min-h-screen text-white font-sans selection:bg-blue-500/30 overflow-x-hidden relative">
      {/* --- BACKGROUND LAYERS (FULL PAGE) --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleSystem />
        <AdvancedParticleField />
        <FloatingNodes />
        <NetworkNodesBackground />
        <CinematicGlow />
      </div>
      
      <FloatingUIElements mousePos={mousePos} />

      {/* --- HERO SECTION: MASSIVE LOGO (FIRST FOLD) --- */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: [0, -15, 0],
            rotate: [-0.5, 0.5, -0.5]
          }}
          transition={{ 
            opacity: { duration: 2.5 },
            scale: { duration: 2.5 },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }}
          className="relative group cursor-pointer"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          {/* Subtle Glow behind logo */}
          <div className="absolute inset-0 bg-blue-500/10 blur-[150px] rounded-full animate-pulse" />
          
          <SEILogo 
            variant="dark-bg"
            className="w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] md:w-[580px] md:h-[580px] lg:w-[800px] lg:h-[800px] drop-shadow-[0_0_60px_rgba(59,130,246,0.3)]" 
            style={{ 
              imageRendering: "auto",
              WebkitFontSmoothing: "antialiased"
            } as any}
          />
        </motion.div>

        {/* Floating "Scroll to explore" indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 3, duration: 2 }}
          className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <p className="text-[8px] md:text-[10px] font-bold tracking-[0.3em] md:tracking-[0.4em] uppercase text-slate-500">Explorar</p>
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-8 md:h-12 bg-gradient-to-b from-blue-500 to-transparent"
          />
        </motion.div>
      </section>

      {/* --- CONTENT SECTION (BELOW FOLD) --- */}
      <section className="relative py-12 md:py-20 px-4 md:px-6 overflow-hidden z-20">
        <motion.div 
          className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="flex flex-col items-center w-full"
          >
            <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-8 md:mb-16 text-center w-full px-4 break-words">
              <span className="block w-full text-center">Liderazgo con</span>
              <span className="block w-full text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-white drop-shadow-[0_0_40px_rgba(59,130,246,0.4)]">
                Visión Técnica.
              </span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-slate-400 max-w-4xl mx-auto mb-12 md:mb-20 leading-relaxed font-medium text-center px-4 opacity-80">
              La plataforma definitiva para unificar la formación, <br className="hidden md:block" /> operaciones y crecimiento de tu iglesia local.
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 w-full max-w-5xl mb-12 md:mb-24 px-4">
              <GlassModule className="flex flex-col items-center text-center p-6 md:p-10 gap-4 border-white/5 hover:border-blue-500/30 transition-colors">
                <Globe className="w-6 h-6 md:w-10 md:h-10 text-blue-400 opacity-50" />
                <div className="space-y-2">
                  <div className="text-2xl md:text-4xl font-black">24/7</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">SOPORTE</div>
                </div>
              </GlassModule>
              <GlassModule className="flex flex-col items-center text-center p-6 md:p-10 gap-4 border-white/5 hover:border-blue-500/30 transition-colors">
                <Layers className="w-6 h-6 md:w-10 md:h-10 text-blue-400 opacity-50" />
                <div className="space-y-2">
                  <div className="text-2xl md:text-4xl font-black">Admin</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">MÓDULOS</div>
                </div>
              </GlassModule>
              <GlassModule className="flex flex-col items-center text-center p-6 md:p-10 gap-4 border-white/5 hover:border-blue-500/30 transition-colors">
                <Shield className="w-6 h-6 md:w-10 md:h-10 text-blue-400 opacity-50" />
                <div className="space-y-2">
                  <div className="text-2xl md:text-4xl font-black">Total</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">SEGURIDAD</div>
                </div>
              </GlassModule>
            </div>

            <Button 
              onClick={() => navigate("/login")}
              className="group relative bg-white text-black hover:bg-slate-100 rounded-[40px] px-8 md:px-16 h-12 md:h-20 text-lg md:text-2xl font-bold shadow-[0_20px_60px_rgba(255,255,255,0.1)] border-0 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3 md:gap-4">
                INICIAR SESIÓN <ArrowRight className="w-5 h-5 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform" />
              </span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-slate-200 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
              />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* --- IMMERSIVE ECOSYSTEM SECTION --- */}
      <section className="py-12 md:py-20 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-20 lg:gap-32 items-center">
            <div className="space-y-8">
              <motion.h2 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-5xl font-black leading-tight"
              >
                Un ecosistema <br />
                <span className="text-blue-500">vivo y fluido.</span>
              </motion.h2>
              <p className="text-slate-400 text-base md:text-lg leading-relaxed font-medium">
                Lumen no es una aplicación estática. Es un organismo digital que crece, conecta y coordina cada célula de tu organización.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                <GlassModule>
                  <div className="flex flex-col gap-3">
                    <Database className="w-8 h-8 text-blue-400" />
                    <h4 className="text-lg font-bold">Datos Inteligentes</h4>
                    <p className="text-slate-500 text-sm">Visualización masiva de miembros y misiones geolocalizadas.</p>
                  </div>
                </GlassModule>
                <GlassModule>
                  <div className="flex flex-col gap-3">
                    <Share2 className="w-8 h-8 text-cyan-400" />
                    <h4 className="text-lg font-bold">Red de Ministerios</h4>
                    <p className="text-slate-500 text-sm">Conexiones operativas entre departamentos y servidores.</p>
                  </div>
                </GlassModule>
              </div>
            </div>

            <div className="relative w-full max-w-[280px] sm:max-w-[400px] lg:max-w-none mx-auto">
              <div className="aspect-square bg-blue-600/5 rounded-full border border-white/5 flex items-center justify-center relative">
                {/* Ministry Network Visualization */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        rotate: 360,
                        x: Math.cos(i * 60 * (Math.PI / 180)) * radius,
                        y: Math.sin(i * 60 * (Math.PI / 180)) * radius
                      }}
                      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                      className="absolute"
                    >
                      <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                        <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                      </div>
                    </motion.div>
                  ))}
                  <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_100px_rgba(37,99,235,0.5)]">
                    <Cpu className="w-8 h-8 sm:w-16 sm:h-16 text-white animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- GROWTH TIMELINE & STATS --- */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-7xl mx-auto text-center mb-12 md:mb-20">
          <h3 className="text-2xl md:text-4xl font-black mb-4">Tracción y Crecimiento</h3>
          <p className="text-slate-500 font-medium text-sm md:text-base">Monitoreo histórico de expansión estructural.</p>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          <GlassModule className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 p-6 md:p-12">
            <div className="text-left space-y-4">
              <div className="text-3xl md:text-5xl font-black text-blue-400">+1.2k</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Nuevas Almas / Mes</div>
              <GrowthTimeline />
            </div>
            <div className="h-px w-full md:w-px md:h-32 bg-white/10" />
            <div className="text-left space-y-4">
              <div className="text-3xl md:text-5xl font-black text-white">98%</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Efectividad Operativa</div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => <ShieldCheck key={i} className="w-4 h-4 text-blue-500" />)}
              </div>
            </div>
            <div className="h-px w-full md:w-px md:h-32 bg-white/10" />
            <div className="text-left space-y-4">
              <div className="text-3xl md:text-5xl font-black text-cyan-400">12s</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Tiempo de Respuesta</div>
              <Activity className="w-8 h-8 md:w-12 h-12 text-cyan-500/50 animate-pulse" />
            </div>
          </GlassModule>
        </div>
      </section>

      {/* --- GEOGRAPHY MODULE --- */}
      <section className="py-12 md:py-20 px-4 md:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1 relative w-full flex justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
              className="w-full max-w-[280px] sm:max-w-[360px] lg:max-w-none aspect-square border border-blue-500/10 rounded-full flex items-center justify-center p-6 sm:p-12 mx-auto relative"
            >
              <Globe className="w-full h-full text-blue-500/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <NetworkNode index={1} />
                <div className="absolute top-1/4 left-1/4"><NetworkNode index={2} /></div>
                <div className="absolute bottom-1/3 right-1/4"><NetworkNode index={3} /></div>
              </div>
            </motion.div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <Compass className="w-10 h-10 md:w-16 md:h-16 text-blue-400" />
            <h2 className="text-2xl md:text-4xl font-black leading-tight">Expansión Territorial <br /><span className="text-blue-500">Geolocalizada.</span></h2>
            <p className="text-slate-400 text-base leading-relaxed">Visualiza el alcance real de tus misiones y sedes con una precisión quirúrgica. Lumen mapea tu crecimiento para una mejor cobertura pastoral.</p>
            <Button className="rounded-full px-6 md:px-8 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold h-10 md:h-12 text-sm">EXPLORAR MAPA</Button>
          </div>
        </div>
      </section>

      {/* --- CINEMATIC CTA --- */}
      <section className="py-16 md:py-32 px-4 md:px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="max-w-4xl mx-auto relative z-10"
        >
          <h2 className="text-2xl sm:text-4xl md:text-6xl font-black mb-8 md:mb-12 tracking-tight break-words px-4">
            EL FUTURO <br /> ES <span className="text-blue-500">ESTRUCTURAL.</span>
          </h2>
          <Button 
            onClick={() => navigate("/login")}
            className="bg-white text-black hover:bg-slate-100 rounded-[30px] px-8 md:px-16 h-12 md:h-20 text-base md:text-xl font-bold shadow-[0_20px_60px_rgba(255,255,255,0.1)] active:scale-95 transition-all w-full max-w-xs md:max-w-none"
          >
            INICIAR SESIÓN
          </Button>
        </motion.div>
      </section>

      {/* --- MINIMAL FUTURISTIC FOOTER --- */}
      <footer className="py-12 md:py-20 px-4 md:px-6 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 text-center md:text-left">
          <div className="flex items-center">
            <SEILogo variant="dark-bg" className="w-20 h-20 md:w-32 md:h-32 opacity-40 hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-500">
            <a href="#" className="hover:text-blue-400">Plataforma</a>
            <a href="#" className="hover:text-blue-400">Seguridad</a>
            <a href="#" className="hover:text-blue-400">Visión</a>
            <a href="#" className="hover:text-blue-400">Contacto</a>
          </div>
          <p className="text-[8px] md:text-[10px] font-bold text-slate-500 tracking-[0.3em] md:tracking-[0.5em] uppercase">
            © 2026 Lumen &middot; THE INTELLIGENT OPERATING SYSTEM
          </p>
        </div>
      </footer>
    </div>
  );
}