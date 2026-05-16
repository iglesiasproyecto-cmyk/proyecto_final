import { motion, AnimatePresence } from "motion/react";

interface GlobalLoaderProps {
  show: boolean;
  message?: string;
  fullScreen?: boolean;
}

export function GlobalLoader({ show, message, fullScreen = true }: GlobalLoaderProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={
            fullScreen
              ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0c2340]"
              : "relative flex flex-col items-center justify-center min-h-[200px]"
          }
          style={!fullScreen ? { backgroundColor: 'transparent' } : undefined}
        >
          <div className="relative flex flex-col items-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <motion.div
                className="w-20 h-20 rounded-full border-4 border-primary/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                style={{
                  borderTopColor: '#709dbd',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                  borderLeftColor: 'transparent',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-white/5" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Cargando..." }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 animate-spin" 
          style={{
            borderTopColor: 'rgba(26, 127, 168, 0.8)',
          }}
        />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}