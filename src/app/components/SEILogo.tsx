import logoImage from "figma:asset/c213986cba199fbbd1eb1e261be133808f51b787.png";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface SEILogoProps {
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export function SEILogo({ className = "w-12 h-12", alt = "S.E.I. Logo", style }: SEILogoProps) {
  return (
    <ImageWithFallback
      src={logoImage} 
      alt={alt}
      className={className}
      style={style}
      draggable={false}
    />
  );
}