// src/app/components/GlobalLayout.tsx
import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useApp } from "../store/AppContext";
import { GlobalLoader } from "./GlobalLoader";
import { AuthRecovery } from "./AuthRecovery";

export function GlobalLayout() {
  const { rolActual, authLoading, usuarioActual, iglesiaActual, isHydrated, isInitializing, isClaimsReady, authError } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isHydrated || authLoading || !isClaimsReady) return;

    if (!usuarioActual) {
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (rolActual !== "super_admin") {
      const destino = iglesiaActual?.id != null ? `/app/${iglesiaActual.id}` : "/app";
      navigate(destino, { replace: true });
    }
  }, [isHydrated, authLoading, usuarioActual, rolActual, iglesiaActual, navigate, location.pathname]);

  if (!isHydrated || authLoading || isInitializing || (!isClaimsReady && !authError)) {
    return <GlobalLoader show={true} message="Cargando..." fullScreen={false} />
  }

  if (authError) {
    return (
      <AuthRecovery
        title="Se detecto un problema de autenticacion"
        description="Tu sesion no se pudo hidratar correctamente. Cierra sesion para reintentar."
      />
    )
  }

  return <Outlet />;
}
