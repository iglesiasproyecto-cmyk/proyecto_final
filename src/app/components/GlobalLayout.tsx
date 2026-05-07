// src/app/components/GlobalLayout.tsx
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useApp } from "../store/AppContext";

export function GlobalLayout() {
  const { rolActual, authLoading, usuarioActual, iglesiaActual } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!usuarioActual) {
      navigate("/login");
      return;
    }
    if (rolActual !== "super_admin") {
      const destino = iglesiaActual?.id ? `/app/${iglesiaActual.id}` : "/app";
      navigate(destino, { replace: true });
    }
  }, [authLoading, usuarioActual, rolActual, iglesiaActual, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <Outlet />;
}
