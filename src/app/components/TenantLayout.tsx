// src/app/components/TenantLayout.tsx
import { useEffect } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router";
import { useApp } from "../store/AppContext";
import { GlobalLoader } from "./GlobalLoader";
import { AuthRecovery } from "./AuthRecovery";

export function TenantLayout() {
  const { idIglesia } = useParams<{ idIglesia: string }>();
  const { rolActual, iglesiaActual, authLoading, usuarioActual, isHydrated, isInitializing, authError, authReady } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const authResolved = isHydrated && !authLoading;

  useEffect(() => {
    if (!authResolved) return;

    if (!usuarioActual) {
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    const tenantId = Number(idIglesia);
    if (isNaN(tenantId)) {
      navigate("/app");
      return;
    }

    if (rolActual === "super_admin") return;

    if (iglesiaActual?.id !== tenantId) {
      if (iglesiaActual?.id != null) {
        navigate(`/app/${iglesiaActual.id}`, { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    }
  }, [authResolved, usuarioActual, rolActual, iglesiaActual, idIglesia, navigate, location.pathname]);

  if (!authResolved || isInitializing) {
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

  if (!usuarioActual) {
    return null;
  }

  if (!authReady) {
    return <GlobalLoader show={true} message="Cargando..." fullScreen={false} />
  }

  return <Outlet />;
}
