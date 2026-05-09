import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  iconSize?: number;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  iconSize = 48,
  title,
  description,
  action,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-4 p-4 rounded-full bg-muted/50"
        >
          <Icon
            size={iconSize}
            className="text-muted-foreground/50"
          />
        </motion.div>
      )}

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="text-sm text-muted-foreground max-w-md mb-6"
        >
          {description}
        </motion.p>
      )}

      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

interface NoResultsProps {
  searchQuery?: string;
  onClear?: () => void;
  className?: string;
}

export function NoResults({
  searchQuery,
  onClear,
  className = "",
}: NoResultsProps) {
  return (
    <EmptyState
      icon={Search}
      title={searchQuery ? "Sin resultados" : "Nada aquí todavía"}
      description={
        searchQuery
          ? `No se encontraron resultados para "${searchQuery}"`
          : "No hay elementos para mostrar"
      }
      action={
        searchQuery && onClear
          ? { label: "Limpiar búsqueda", onClick: onClear }
          : undefined
      }
      className={className}
    />
  );
}

import { Search, Inbox, FileX, Users, Calendar, BookOpen } from "lucide-react";