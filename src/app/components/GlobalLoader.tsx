import { motion, AnimatePresence } from "motion/react";
import { SEILogo } from "./SEILogo";

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
          <div className="relative flex flex-col items-center gap-8">
            <div className="relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <SEILogo className="w-16 h-16" />
              </motion.div>
              
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="w-20 h-20 rounded-full border-2 border-primary/30"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{
                      borderTopColor: 'rgba(26, 127, 168, 0.8)',
                      borderRightColor: 'rgba(26, 127, 168, 0.4)',
                      borderBottomColor: 'rgba(26, 127, 168, 0.2)',
                    }}
                  />
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center"
            >
              {message ? (
                <p className="text-primary-foreground/80 text-sm font-medium">
                  {message}
                </p>
              ) : (
                <>
                  <p className="text-white text-lg font-semibold tracking-wide">
                    IGLESIABD
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    Cargando...
                  </p>
                </>
              )}
            </motion.div>
          </div>

          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
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