import logoImageDarkBg from "../../../imagenes/logo.png";
import logoImageLightBg from "../../../imagenes/SEI-removebg-preview.png logo .png";

interface SEILogoProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: "dark-bg" | "light-bg";
}

export function SEILogo({ className = "w-20 h-20", style, variant = "dark-bg" }: SEILogoProps) {
  const imgSrc = variant === "light-bg" ? logoImageLightBg : logoImageDarkBg;

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={style}>
      <img 
        src={imgSrc} 
        alt="S.E.I. Logo" 
        className="w-full h-full object-contain scale-[2.2] transition-transform duration-500"
        draggable={false}
      />
    </div>
  );
}