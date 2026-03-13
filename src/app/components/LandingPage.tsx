import React from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { motion } from "motion/react";
import { SEILogo } from "./SEILogo";
import {
  Users, CalendarDays, BarChart3, FileText, TrendingUp, Activity
} from "lucide-react";

// Mock data para las tarjetas
const operationalData = [
  { icon: Users, value: "2,800", label: "Miembros Registrados", iconBg: "bg-[#0c2340]" },
  { icon: CalendarDays, value: "15", label: "Eventos Próximos", iconBg: "bg-[#0c2340]" },
  { icon: Activity, value: "40", label: "Grupos Activos", iconBg: "bg-[#0c2340]" },
  { icon: FileText, value: "120", label: "Reportes Generados", iconBg: "bg-[#0c2340]" },
];

const calendarData = [
  { day: "Dom", date: 26, events: [] },
  { day: "Lun", date: 27, events: [{ title: "Reunión de Enlace", time: "PM", color: "bg-blue-200" }] },
  { day: "Mar", date: 21, events: [{ title: "Taller de...", time: "AM", color: "bg-blue-100" }] },
  { day: "Mie", date: 29, events: [{ title: "Liderazgo", time: "AM", color: "bg-blue-200" }] },
  { day: "Jue", date: 1, events: [{ title: "Evento Bols", time: "PM", color: "bg-blue-100" }] },
  { day: "Vie", date: 2, events: [{ title: "Pin-azgo", time: "PM", color: "bg-blue-300" }] },
  { day: "Sab", date: 3, events: [] },
];

const financialData = [
  { id: 1, month: "Ene", actual: 800, projected: 750 },
  { id: 2, month: "Feb", actual: 900, projected: 850 },
  { id: 3, month: "Mar", actual: 850, projected: 900 },
  { id: 4, month: "Abr", actual: 950, projected: 920 },
  { id: 5, month: "May", actual: 1000, projected: 980 },
  { id: 6, month: "Jun", actual: 900, projected: 950 },
  { id: 7, month: "Jul", actual: 950, projected: 1000 },
  { id: 8, month: "Ago", actual: 1000, projected: 1050 },
  { id: 9, month: "Sep", actual: 1100, projected: 1100 },
  { id: 10, month: "Oct", actual: 1050, projected: 1150 },
  { id: 11, month: "Nov", actual: 1150, projected: 1200 },
  { id: 12, month: "Dic", actual: 1200, projected: 1250 },
];

// Simple SVG Area Chart Component
function SimpleAreaChart({ data }: { data: typeof financialData }) {
  const width = 100;
  const height = 100;
  const padding = 10;
  
  const maxValue = Math.max(...data.map(d => Math.max(d.actual, d.projected)));
  const minValue = Math.min(...data.map(d => Math.min(d.actual, d.projected)));
  const valueRange = maxValue - minValue;
  
  const getX = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding);
  const getY = (value: number) => height - padding - ((value - minValue) / valueRange) * (height - 2 * padding);
  
  const actualPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.actual)}`).join(' ');
  const projectedPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.projected)}`).join(' ');
  
  const actualAreaPath = `${actualPath} L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;
  const projectedAreaPath = `${projectedPath} L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGradientActual" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c2340" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#0c2340" stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id="areaGradientProjected" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2596be" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#2596be" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      
      {/* Projected area */}
      <path d={projectedAreaPath} fill="url(#areaGradientProjected)" />
      
      {/* Actual area */}
      <path d={actualAreaPath} fill="url(#areaGradientActual)" />
      
      {/* Projected line */}
      <path d={projectedPath} stroke="#2596be" strokeWidth="0.5" fill="none" />
      
      {/* Actual line */}
      <path d={actualPath} stroke="#0c2340" strokeWidth="0.5" fill="none" />
      
      {/* X-axis labels */}
      {data.map((d, i) => (
        <text
          key={`label-x-${d.id}`}
          x={getX(i)}
          y={height - 2}
          textAnchor="middle"
          fontSize="3"
          fill="#94a3b8"
        >
          {d.month}
        </text>
      ))}
    </svg>
  );
}

// Patrón geométrico de fondo
function GeometricPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-10">
      {/* Patrones en las esquinas */}
      <svg className="absolute top-0 left-0 w-64 h-64" viewBox="0 0 200 200">
        <path d="M 0,100 L 50,50 L 50,0" stroke="#0c2340" strokeWidth="1" fill="none" />
        <path d="M 10,100 L 60,50 L 60,0" stroke="#0c2340" strokeWidth="0.5" fill="none" />
        <path d="M 20,100 L 70,50 L 70,0" stroke="#0c2340" strokeWidth="0.5" fill="none" />
        <path d="M 30,100 L 80,50 L 80,0" stroke="#0c2340" strokeWidth="1" fill="none" />
        <path d="M 40,100 L 90,50 L 90,0" stroke="#0c2340" strokeWidth="0.5" fill="none" />
      </svg>
      <svg className="absolute top-0 right-0 w-64 h-64" viewBox="0 0 200 200">
        <path d="M 200,100 L 150,50 L 150,0" stroke="#0c2340" strokeWidth="1" fill="none" />
        <path d="M 190,100 L 140,50 L 140,0" stroke="#0c2340" strokeWidth="0.5" fill="none" />
        <path d="M 180,100 L 130,50 L 130,0" stroke="#0c2340" strokeWidth="0.5" fill="none" />
        <path d="M 170,100 L 120,50 L 120,0" stroke="#0c2340" strokeWidth="1" fill="none" />
        <path d="M 160,100 L 110,50 L 110,0" stroke="#0c2340" strokeWidth="0.5" fill="none" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-64 h-64" viewBox="0 0 200 200">
        <path d="M 0,100 L 50,150 L 50,200" stroke="#0c2340" strokeWidth="1" fill="none" />
        <path d="M 10,100 L 60,150 L 60,200" stroke="#0c2340" strokeWidth="0.5" fill="none" />
        <path d="M 20,100 L 70,150 L 70,200" stroke="#0c2340" strokeWidth="0.5" fill="none" />
        <path d="M 30,100 L 80,150 L 80,200" stroke="#0c2340" strokeWidth="1" fill="none" />
        <path d="M 40,100 L 90,150 L 90,200" stroke="#0c2340" strokeWidth="0.5" fill="none" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-64 h-64" viewBox="0 0 200 200">
        <path d="M 200,100 L 150,150 L 150,200" stroke="#0c2340" strokeWidth="1" fill="none" />
        <path d="M 190,100 L 140,150 L 140,200" stroke="#0c2340" strokeWidth="0.5" fill="none" />
        <path d="M 180,100 L 130,150 L 130,200" stroke="#0c2340" strokeWidth="0.5" fill="none" />
        <path d="M 170,100 L 120,150 L 120,200" stroke="#0c2340" strokeWidth="1" fill="none" />
        <path d="M 160,100 L 110,150 L 110,200" stroke="#0c2340" strokeWidth="0.5" fill="none" />
      </svg>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  // Memoize chart data to prevent unnecessary re-renders
  const chartData = React.useMemo(() => financialData.slice(-4), []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <header className="bg-[#0c2340] text-white px-8 py-4 relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1.5">
              <SEILogo className="w-full h-full" />
            </div>
            <h1 className="text-xl tracking-tight text-white">S.E.I. (Soporte Estructural de Iglesias)</h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button
              onClick={() => navigate("/login")}
              className="bg-[#2596be] hover:bg-[#1a7fa8] text-white px-6"
            >
              Iniciar Sesión
            </Button>
          </motion.div>
        </div>
      </header>

      {/* Background Pattern */}
      <GeometricPattern />

      {/* Main Content */}
      <main className="relative z-10 px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl tracking-tight mb-4">
              S.E.I. (Soporte Estructural de Iglesias)
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Un ecosistema operativo y estratégico para el fortalecimiento y la cohesión de comunidades eclesiales.
            </p>
          </motion.div>

          {/* Three Main Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel Operativo */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="p-6 bg-[#0c2340] text-white shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg text-white">Panel Operativo</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {operationalData.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="bg-white/5 rounded-xl p-4 backdrop-blur-sm">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 mb-3">
                          <Icon className="w-5 h-5 text-[#5cbcd6]" />
                        </div>
                        <p className="text-2xl md:text-3xl text-[#5cbcd6] mb-1">{item.value}</p>
                        <p className="text-xs text-white/70">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            {/* Calendario Integral */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="p-6 bg-[#0c2340] text-white shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg text-white">Calendario Integral</h3>
                </div>
                <div className="space-y-3">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/60 mb-2">
                    {calendarData.map((day, idx) => (
                      <div key={idx}>
                        <div className="mb-1">{day.day}</div>
                        <div className="text-white text-sm">{day.date}</div>
                      </div>
                    ))}
                  </div>
                  {/* Calendar Events */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarData.map((day, idx) => (
                      <div key={idx} className="min-h-[80px] bg-white/5 rounded-lg p-1">
                        {day.events.map((event, eventIdx) => (
                          <div
                            key={eventIdx}
                            className={`text-[9px] ${event.color} text-[#0c2340] rounded px-1 py-0.5 mb-1`}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Visión de Finanzas */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="p-6 bg-white shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-[#0c2340] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg">Visión de Finanzas</h3>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-4 mb-4 text-sm border-b border-border pb-2">
                  <button className="text-[#0c2340] font-medium border-b-2 border-[#2596be] pb-2">Dashboard</button>
                  <button className="text-muted-foreground hover:text-foreground">Rinomera</button>
                </div>

                {/* Eagle watermark */}
                <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-20">
                  <SEILogo className="w-32 h-32" />
                </div>

                {/* Chart */}
                <div className="h-48 relative z-10" style={{ minHeight: '192px' }}>
                  <SimpleAreaChart data={chartData} />
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#0c2340] rounded-sm"></div>
                    <span className="text-muted-foreground">Contribuciones Semanales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#2596be] rounded-sm"></div>
                    <span className="text-muted-foreground">Semana Actual 2023 • Contr. 2,773</span>
                  </div>
                </div>

                {/* Button */}
                <Button className="w-full mt-4 bg-[#5cbcd6] hover:bg-[#2596be] text-white">
                  Contribuciones
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}