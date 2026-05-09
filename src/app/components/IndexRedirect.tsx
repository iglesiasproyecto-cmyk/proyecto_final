// src/app/components/IndexRedirect.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useApp } from "../store/AppContext";

export function IndexRedirect() {
  const { rolActual, iglesiaActual, authLoading, usuarioActual, isHydrated, isClaimsReady } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isHydrated || !isClaimsReady) return;
    if (!usuarioActual) {
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (rolActual === "super_admin") {
      navigate("/app/global", { replace: true });
    } else if (iglesiaActual?.id != null) {
      navigate(`/app/${iglesiaActual.id}`, { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [isHydrated, usuarioActual, rolActual, iglesiaActual, navigate, location.pathname]);

  if (!isHydrated || authLoading || !isClaimsReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return null;
}
