// src/app/components/TenantLayout.tsx
import { useEffect } from "react";
import { Outlet, useNavigate, useParams } from "react-router";
import { useApp } from "../store/AppContext";

export function TenantLayout() {
  const { idIglesia } = useParams<{ idIglesia: string }>();
  const { rolActual, iglesiaActual, authLoading, usuarioActual } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!usuarioActual) {
      navigate("/login");
      return;
    }

    const tenantId = Number(idIglesia);
    if (isNaN(tenantId)) {
      navigate("/app");
      return;
    }

    // super_admin puede acceder a cualquier tenant
    if (rolActual === "super_admin") return;

    // Todos los demás solo pueden acceder a su propia iglesia
    if (iglesiaActual?.id !== tenantId) {
      if (iglesiaActual?.id) {
        navigate(`/app/${iglesiaActual.id}`, { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    }
  }, [authLoading, usuarioActual, rolActual, iglesiaActual, idIglesia, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <Outlet />;
}
