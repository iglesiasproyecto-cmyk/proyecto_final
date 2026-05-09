import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Mail } from "lucide-react";

interface ErrorStateProps {
  error?: string;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  showRetry?: boolean;
  showHome?: boolean;
  className?: string;
}

export function ErrorState({
  error,
  title = "Algo salió mal",
  description,
  onRetry,
  onGoHome,
  showRetry = true,
  showHome = false,
  className = "",
}: ErrorStateProps) {
  const defaultDescription =
    description ||
    (error
      ? typeof error === "string"
        ? error.length > 100
          ? `${error.substring(0, 100)}...`
          : error
        : "Ha ocurrido un error inesperado"
      : "No pudimos cargar esta información. Por favor, intenta de nuevo.");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-4 p-4 rounded-full bg-destructive/10"
      >
        <AlertTriangle
          size={48}
          className="text-destructive/70"
        />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-sm text-muted-foreground max-w-md mb-6"
      >
        {defaultDescription}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="flex flex-wrap gap-3 justify-center"
      >
        {showRetry && onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw size={16} />
            Reintentar
          </Button>
        )}
        {showHome && onGoHome && (
          <Button variant="outline" onClick={onGoHome} className="gap-2">
            <Home size={16} />
            Volver al inicio
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}

interface InlineErrorProps {
  error: string;
  onDismiss?: () => void;
  className?: string;
}

export function InlineError({
  error,
  onDismiss,
  className = "",
}: InlineErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 ${className}`}
    >
      <AlertTriangle size={20} className="text-destructive flex-shrink-0" />
      <p className="text-sm text-destructive flex-1">{error}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-destructive/60 hover:text-destructive transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      )}
    </motion.div>
  );
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorBoundaryFallback({
  error,
  resetError,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <ErrorState
        title="Error de aplicación"
        description={error.message}
        onRetry={resetError}
        showHome
        onGoHome={() => window.location.href = "/app"}
      />
    </div>
  );
}