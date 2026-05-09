import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  backdrop?: boolean;
  transparent?: boolean;
}

export function LoadingOverlay({ 
  show, 
  message, 
  backdrop = true,
  transparent = false 
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={
            backdrop 
              ? `absolute inset-0 z-50 flex items-center justify-center ${transparent ? 'bg-transparent' : 'bg-background/80 backdrop-blur-sm'}`
              : 'relative'
          }
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            {!transparent && (
              <div className="relative">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            {message && (
              <p className="text-sm text-muted-foreground font-medium">
                {message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface InlineLoaderProps {
  size?: 'sm' | 'md' | 'lg';
}

export function InlineLoader({ size = 'md' }: InlineLoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 className={`${sizeClasses[size]} text-primary animate-spin`} />
  );
}

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}

export function LoadingButton({ loading, children, className }: LoadingButtonProps) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <InlineLoader size="sm" />
        </span>
      )}
    </span>
  );
}