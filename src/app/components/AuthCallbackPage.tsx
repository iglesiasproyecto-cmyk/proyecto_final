import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type CallbackState = "processing" | "error";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "recovery",
  "email",
  "email_change",
]);

function getHashParam(name: string): string | null {
  const rawHash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!rawHash) return null;
  const params = new URLSearchParams(rawHash);
  return params.get(name);
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const tokenHash = params.get("token_hash");
      const next = params.get("next") || "/app";
      const typeFromQuery = params.get("type");
      const typeFromHash = getHashParam("type");
      const typeRaw = typeFromQuery || typeFromHash;

      const otpType = typeRaw && OTP_TYPES.has(typeRaw as EmailOtpType)
        ? (typeRaw as EmailOtpType)
        : null;

      if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({
          type: otpType,
          token_hash: tokenHash,
        });

        if (error) {
          if (!alive) return;
          setState("error");
          setErrorMessage("El enlace es invalido o ya expiro. Solicita uno nuevo.");
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !data.session) {
        if (!alive) return;
        setState("error");
        setErrorMessage("No se pudo validar tu sesion desde el enlace.");
        return;
      }

      if (otpType === "invite" || otpType === "recovery") {
        navigate(`/auth/set-password?next=${encodeURIComponent(next)}&type=${otpType}`, {
          replace: true,
        });
        return;
      }

      navigate(next, { replace: true });
    };

    run().catch(() => {
      if (!alive) return;
      setState("error");
      setErrorMessage("Ocurrio un error al procesar el enlace de acceso.");
    });

    return () => {
      alive = false;
    };
  }, [navigate, params]);

  if (state === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Validando enlace</h1>
          <p className="text-sm text-muted-foreground">
            Estamos confirmando tu invitacion para continuar de forma segura.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-rose-300/40 bg-card p-8 text-center shadow-lg space-y-4">
        <ShieldAlert className="w-8 h-8 mx-auto text-rose-500" />
        <h1 className="text-xl font-semibold text-foreground">Enlace no valido</h1>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <button
          type="button"
          onClick={() => navigate("/login", { replace: true })}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Volver al login
        </button>
      </div>
    </div>
  );
}
