import React from "react";

interface SEILogoProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: "dark-bg" | "light-bg";
}

export function LumenLogo({ className = "w-20 h-20", style, variant }: SEILogoProps) {
  return (
    <div className={`relative flex items-center justify-center transition-all duration-500 hover:scale-105 ${className}`} style={style}>
      {/* Premium Glow effect behind the logo */}
      <div className="absolute inset-0 bg-sky-500/10 rounded-full blur-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <img 
        src="/lumen.png" 
        alt="Lumen Logo" 
        className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(56,189,248,0.25)] transition-transform duration-500"
        draggable={false}
      />
    </div>
  );
}

// Export as SEILogo for seamless backwards compatibility
export { LumenLogo as SEILogo };
export default LumenLogo;