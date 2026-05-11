// src/app/components/IndexRedirect.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useApp } from "../store/AppContext";

export function IndexRedirect() {
  const { rolActual, iglesiaActual, authLoading, usuarioActual, isHydrated, authReady } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const authResolved = isHydrated && !authLoading;

  useEffect(() => {
    console.log('[IndexRedirect] run:', {
      isHydrated, authReady, authLoading,
      usuarioActual: !!usuarioActual,
      rolActual, iglesiaActual: !!iglesiaActual,
      path: location.pathname,
    })
    if (!authResolved) return;
    if (!usuarioActual) {
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (!authReady) return;

    if (rolActual === "super_admin") {
      navigate("/app/global", { replace: true });
    } else if (iglesiaActual?.id != null) {
      navigate(`/app/${iglesiaActual.id}`, { replace: true });
    } else {
      navigate("/app/sin-iglesia", { replace: true });
    }
  }, [authResolved, authReady, usuarioActual, rolActual, iglesiaActual, navigate, location.pathname]);

  if (!authResolved) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return null;
}
