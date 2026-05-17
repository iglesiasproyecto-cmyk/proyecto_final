import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface StatisticsSummaryCardProps {
  statsPath: string;
  index?: number;
  compact?: boolean;
}

export function StatisticsSummaryCard({ statsPath, index = 0, compact = false }: StatisticsSummaryCardProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <Button
        variant="outline"
        className="h-full w-full rounded-2xl border border-border/50 bg-card/40 backdrop-blur-2xl hover:bg-card/60 hover:-translate-y-1 transition-all gap-3 p-4 flex items-center justify-between shadow-sm"
        onClick={() => navigate(statsPath)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Estadísticas</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ver análisis completo</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="h-full"
    >
      <div
        className="h-full relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 dark:border-white/10 dark:bg-card/20 cursor-pointer hover:shadow-lg hover:bg-card/60 hover:-translate-y-1 p-4 group"
        onClick={() => navigate(statsPath)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-[48px] h-[48px] rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-foreground">Estadísticas</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Métricas detalladas de iglesia, ministerios, eventos y aula</p>
          </div>
          <ArrowRight className="w-5 h-5 text-primary/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>
    </motion.div>
  );
}
