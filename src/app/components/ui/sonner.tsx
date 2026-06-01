"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";

/**
 * App-wide toast notifications.
 *
 * Design: instead of fully saturated colored fills, each toast is a neutral
 * "card" with a colored accent rail + tinted icon per type. This keeps text
 * highly legible and stays aligned with the soft teal/navy/cream brand.
 * Per-type accent colors live in theme.css (`[data-sonner-toast][data-type=...]`).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      closeButton
      gap={10}
      offset={16}
      duration={4500}
      toastOptions={{
        classNames: {
          toast: "app-toast",
          title: "app-toast__title",
          description: "app-toast__description",
          icon: "app-toast__icon",
          closeButton: "app-toast__close",
          actionButton: "app-toast__action",
          cancelButton: "app-toast__cancel",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5" strokeWidth={2.25} />,
        error: <XCircle className="h-5 w-5" strokeWidth={2.25} />,
        warning: <AlertTriangle className="h-5 w-5" strokeWidth={2.25} />,
        info: <Info className="h-5 w-5" strokeWidth={2.25} />,
        loading: <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
