import { motion } from "motion/react";
import { Badge } from "./badge";
import { CARD_COLORS } from "@/app/constants/cardColors";

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sublabel?: string;
  index: number;
  onClick?: () => void;
  colorIndex?: number;
  className?: string;
  animated?: boolean;
}

/**
 * StatCard - Tarjeta de estadística estandarizada
 * Utiliza la paleta de colores global para mantener consistencia
 */
export function StatCard({ 
  icon, 
  value, 
  label, 
  sublabel, 
  index,
  onClick,
  colorIndex,
  className = "",
  animated = true
}: StatCardProps) {
  const color = CARD_COLORS[(colorIndex ?? index) % CARD_COLORS.length];
  
  const cardContent = (
    <div 
      className={`h-full relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 dark:border-white/10 dark:bg-card/20 ${onClick ? "cursor-pointer hover:shadow-lg hover:bg-card/60 hover:-translate-y-1" : ""} p-4 group flex flex-col ${className}`}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
      
      <div className="relative z-10 flex justify-between items-start mb-3">
        <div 
          className="w-[42px] h-[42px] rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg text-white"
          style={{ backgroundImage: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
        >
          {icon}
        </div>
        {sublabel && (
          <Badge variant="secondary" className="bg-primary/10 text-primary dark:bg-primary/20 border-0 text-[10px] py-0">
            {sublabel}
          </Badge>
        )}
      </div>
      
      <div className="relative z-10">
        <p className="text-4xl font-light tracking-tight text-foreground">{value}</p>
        <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );

  if (!animated) {
    return cardContent;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
      className="h-full"
    >
      {cardContent}
    </motion.div>
  );
}
