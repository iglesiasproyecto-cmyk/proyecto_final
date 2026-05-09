import { useApp } from "../store/AppContext";
import { Button } from "./ui/button";

export function AuthRecovery({ title, description }: { title: string; description: string }) {
  const { logout } = useApp();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button onClick={logout}>Cerrar sesion</Button>
      </div>
    </div>
  );
}
