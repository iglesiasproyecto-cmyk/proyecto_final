import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";
import { Button } from "./ui/button";

export function NoChurchAssignedPage() {
  const navigate = useNavigate();
  const { logout, usuarioActual } = useApp();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-lg w-full bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-foreground">
          No tienes una iglesia asignada
        </h1>
        <p className="text-sm text-muted-foreground mt-3">
          Tu usuario ({usuarioActual?.correo}) no tiene una iglesia vinculada. Contacta a un administrador para que te asigne una.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/login")} variant="outline">
            Volver al login
          </Button>
          <Button onClick={() => { logout().then(() => navigate("/login", { replace: true })) }}>
            Cerrar sesion
          </Button>
        </div>
      </div>
    </div>
  );
}
