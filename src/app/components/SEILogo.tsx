import React from "react";
import logo1 from "../../assets/logo-1-lumen-.webp"; // Logo 1 (letras blancas) para fondo oscuro/azul
import logo2 from "../../assets/logo-2-lumen.webp"; // Logo 2 (letras azules) para fondo claro/blanco
import { useApp } from "../store/AppContext";

interface SEILogoProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: "dark-bg" | "light-bg";
}

export function LumenLogo({ className = "w-20 h-20", style, variant }: SEILogoProps) {
  let isDarkMode = false;
  try {
    const app = useApp();
    isDarkMode = app.darkMode;
  } catch (e) {
    // Fallback si se usa fuera de AppProvider
    if (typeof window !== "undefined") {
      isDarkMode = document.documentElement.classList.contains("dark") || 
                   window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  }

  // Determinar qué logo mostrar
  // Si se especifica una variante, la respetamos. Si no, dependemos del tema oscuro global.
  const logoSrc = variant 
    ? (variant === "dark-bg" ? logo1 : logo2) 
    : (isDarkMode ? logo1 : logo2);

  return (
    <div className={`relative flex items-center justify-center transition-all duration-500 hover:scale-105 ${className}`} style={style}>
      {/* Premium Glow effect behind the logo */}
      <div className="absolute inset-0 bg-sky-500/10 rounded-full blur-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <img 
        src={logoSrc} 
        alt="Lumen Logo" 
        className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(56,189,248,0.25)] transition-transform duration-500"
        draggable={false}
      />
    </div>
  );
}

export function LumenIsotype({ className = "w-10 h-10", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={style}>
      {/* Soft radial glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl blur-md opacity-25 group-hover:opacity-40 transition-opacity duration-500" />
      
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 filter drop-shadow-[0_4px_12px_rgba(56,189,248,0.3)]">
        {/* Glassmorphic card container */}
        <rect x="1" y="1" width="38" height="38" rx="12" fill="url(#iso-bg-grad)" stroke="url(#iso-border-grad)" strokeWidth="1.5" />
        
        {/* Futuristic stylized "L" & Book fusion */}
        {/* Spine / Vertical Pillar of the "L" */}
        <rect x="12" y="10" width="5" height="20" rx="2.5" fill="url(#spine-grad)" />
        
        {/* Horizontal Base of the "L" / Glowing bookmark */}
        <path d="M12 25C12 25 18 25 24 25.5C25.5 25.625 27 27 27 28.5C27 30 25.5 30 12 30" stroke="url(#base-grad)" strokeWidth="4" strokeLinecap="round" />
        
        {/* Neon digital spark (symbolizing the Light / Lumen) */}
        <circle cx="27" cy="12" r="3" fill="#38bdf8" />
        <circle cx="27" cy="12" r="6" fill="#38bdf8" opacity="0.35" className="animate-pulse" />

        <defs>
          <linearGradient id="iso-bg-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="iso-border-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#1e293b" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="spine-grad" x1="12" y1="10" x2="17" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="base-grad" x1="12" y1="25" x2="27" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Export as SEILogo for seamless backwards compatibility
export { LumenLogo as SEILogo };
export default LumenLogo;