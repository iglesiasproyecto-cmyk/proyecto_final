import { motion } from "motion/react";
import * as React from "react";

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  onClick?: () => void;
  noAnimation?: boolean;
}

export function AnimatedCard({ 
  children, 
  index = 0, 
  className = "", 
  onClick,
  noAnimation = false
}: AnimatedCardProps) {
  // Extract grid-related classes (like lg:col-span-2) to apply to the motion.div wrapper
  const colSpanClasses = className.split(" ").filter(c => 
    c.includes("col-span") || c.includes("row-span") || c.includes("grid-") || c.includes("md:") || c.includes("lg:") || c.includes("xl:")
  ).join(" ");
  
  const innerClasses = className.split(" ").filter(c => 
    !c.includes("col-span") && !c.includes("row-span") && !c.includes("grid-") && !c.includes("md:") && !c.includes("lg:") && !c.includes("xl:")
  ).join(" ");

  const content = (
    <div 
      className={`h-full relative overflow-hidden rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 dark:border-white/10 dark:bg-card/20 ${onClick ? "cursor-pointer hover:shadow-lg hover:bg-card/60 hover:-translate-y-1" : ""} ${innerClasses}`}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
      <div className="relative z-10 flex flex-col h-full">
        {children}
      </div>
    </div>
  );

  if (noAnimation) {
    return <div className={`h-full ${colSpanClasses}`}>{content}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
      className={`h-full ${colSpanClasses}`}
    >
      {content}
    </motion.div>
  );
}
