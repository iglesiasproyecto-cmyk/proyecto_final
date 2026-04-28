import logoImage from "../../assets/sei_logo_improved.png";

interface SEILogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SEILogo({ className = "w-20 h-20", style }: SEILogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={style}>
      <img 
        src={logoImage} 
        alt="S.E.I. Logo" 
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
}