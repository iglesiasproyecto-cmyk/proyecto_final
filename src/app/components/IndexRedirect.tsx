// src/app/components/IndexRedirect.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";

export function IndexRedirect() {
  const { rolActual, iglesiaActual, authLoading, usuarioActual } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!usuarioActual) {
      navigate("/login", { replace: true });
      return;
    }

    if (rolActual === "super_admin") {
      navigate("/app/global", { replace: true });
    } else if (iglesiaActual?.id) {
      navigate(`/app/${iglesiaActual.id}`, { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [authLoading, usuarioActual, rolActual, iglesiaActual, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
