import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

function validatePassword(password: string): string | null {
  if (password.length < 8) return "La contrasena debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "Incluye al menos una mayuscula.";
  if (!/[0-9]/.test(password)) return "Incluye al menos un numero.";
  return null;
}

export function SetPasswordPage() {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const next = params.get("next") || "/app";
  const type = params.get("type") || "invite";

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) {
        navigate("/login", { replace: true });
      }
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("No se pudo actualizar la contrasena. Intenta nuevamente.");
      setLoading(false);
      return;
    }

    const fallbackNext = type === "recovery" ? "/login" : "/app";
    const safeNext = next === "/auth/set-password" ? fallbackNext : next;

    navigate(safeNext, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            {type === "recovery" ? "Nueva contrasena" : "Crea tu contrasena"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {type === "recovery"
              ? "Define una nueva clave para recuperar tu cuenta."
              : "Configura tu clave para activar tu cuenta invitada."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Contrasena nueva
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Minimo 8 caracteres"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirmar contrasena
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Repite tu contrasena"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar contrasena"}
          </button>
        </form>
      </div>
    </div>
  );
}
