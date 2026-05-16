import logoSei from "../../assets/logo-sei.png";

interface SEILogoProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: "dark-bg" | "light-bg";
}

export function SEILogo({ className = "w-20 h-20", style }: SEILogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={style}>
      <img 
        src={logoSei} 
        alt="S.E.I. Logo" 
        className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-500"
        draggable={false}
      />
    </div>
  );
}