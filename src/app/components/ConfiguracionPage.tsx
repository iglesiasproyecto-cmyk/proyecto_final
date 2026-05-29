import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Palette, Upload, RefreshCw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../store/AppContext";

const DEFAULT_BRANDING: Record<string, string> = {
  primary: "#4682b4",
  background: "#f0f7ff",
  foreground: "#0c2340",
  sidebar: "#091320",
  accent: "#dbeafe",
  card: "#ffffff",
};

const TOKEN_LABELS: Record<string, { label: string; description: string }> = {
  primary: { label: "Color Primario", description: "Botones, links, acentos" },
  background: { label: "Fondo Principal", description: "Fondo de las páginas" },
  foreground: { label: "Color de Texto", description: "Texto principal" },
  sidebar: { label: "Fondo del Menú Lateral", description: "Barra de navegación" },
  accent: { label: "Color de Acento", description: "Fondos de tarjetas destacadas" },
  card: { label: "Fondo de Tarjetas", description: "Cards y paneles" },
};

export function ConfiguracionPage() {
  const navigate = useNavigate();
  const { rolActual, iglesiaActual, iglesiaBranding, iglesiaLogoUrl, actualizarBranding } = useApp();

  const savedBrandingRef = useRef(iglesiaBranding);
  useEffect(() => {
    savedBrandingRef.current = iglesiaBranding;
  }, [iglesiaBranding]);

  const [colors, setColors] = useState<Record<string, string>>(
    iglesiaBranding ?? DEFAULT_BRANDING
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(iglesiaLogoUrl);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (rolActual && rolActual !== "admin_iglesia") {
      navigate("/app", { replace: true });
    }
  }, [rolActual, navigate]);

  // Sync initial state when saved branding loads
  useEffect(() => {
    setColors(iglesiaBranding ?? DEFAULT_BRANDING);
    setLogoPreview(iglesiaLogoUrl);
  }, [iglesiaBranding, iglesiaLogoUrl]);

  // Apply colors as live preview while on this page
  useEffect(() => {
    Object.entries(colors).forEach(([token, value]) => {
      document.documentElement.style.setProperty(`--${token}`, value);
    });
  }, [colors]);

  // Restore saved branding on unmount (cancel preview)
  useEffect(() => {
    return () => {
      const saved = savedBrandingRef.current ?? DEFAULT_BRANDING;
      Object.entries(saved).forEach(([token, value]) => {
        document.documentElement.style.setProperty(`--${token}`, value);
      });
    };
  }, []);

  const handleColorChange = (token: string, value: string) => {
    setColors((prev) => ({ ...prev, [token]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo excede el tamaño máximo de 2MB");
      return;
    }
    const allowed = ["image/png", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato no soportado. Usa PNG, WebP o SVG");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleRestore = () => {
    const restored = iglesiaBranding ?? DEFAULT_BRANDING;
    setColors(restored);
    setLogoFile(null);
    setLogoPreview(iglesiaLogoUrl);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await actualizarBranding(colors, logoFile ?? undefined);
      toast.success("Cambios guardados correctamente");
      setLogoFile(null);
    } catch {
      toast.error("Error al guardar los cambios. Inténtalo de nuevo.");
      handleRestore();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Palette className="w-7 h-7 text-primary" />
            Personalización
          </h1>
          <p className="text-muted-foreground mt-1">
            Adapta la apariencia de la plataforma a la identidad de{" "}
            <span className="font-semibold text-foreground">{iglesiaActual?.nombre}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-6">
            {/* Logo section */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                Logo de la Iglesia
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-primary/40 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Vista previa del logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Upload className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Subir logo (.png, .webp, .svg)
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Máx. 2MB · Recomendado: 200×200px
                  </p>
                  <div className="flex gap-2">
                    <label className="cursor-pointer bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                      Seleccionar archivo
                      <input
                        type="file"
                        accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </label>
                    {logoPreview && (
                      <button
                        onClick={handleRemoveLogo}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Color palette */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                Paleta de Colores
              </h2>
              <div className="space-y-4">
                {Object.entries(TOKEN_LABELS).map(([token, { label, description }]) => (
                  <div key={token} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={colors[token] ?? ""}
                        onChange={(e) => handleColorChange(token, e.target.value)}
                        className="w-24 text-xs font-mono bg-background border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <label className="cursor-pointer">
                        <div
                          className="w-9 h-9 rounded-lg border-2 border-border"
                          style={{ backgroundColor: colors[token] }}
                        />
                        <input
                          type="color"
                          value={colors[token] ?? "#000000"}
                          onChange={(e) => handleColorChange(token, e.target.value)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleRestore}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-semibold hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Restaurar valores
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>

          {/* Right: Live preview */}
          <div>
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                Vista Previa en Tiempo Real
              </h2>
              <div className="rounded-xl overflow-hidden border border-border shadow-md">
                <div className="flex" style={{ minHeight: 280 }}>
                  {/* Mini sidebar */}
                  <div
                    className="w-12 flex flex-col items-center py-3 gap-3"
                    style={{ backgroundColor: colors.sidebar }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          className="w-full h-full object-contain"
                          alt=""
                        />
                      ) : (
                        <span className="text-white text-[10px] font-black">L</span>
                      )}
                    </div>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-lg"
                        style={{
                          backgroundColor:
                            i === 1 ? colors.primary : `${colors.sidebar}99`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Mini content */}
                  <div
                    className="flex-1 p-3"
                    style={{ backgroundColor: colors.background }}
                  >
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {(
                        [
                          ["Miembros", "248", false],
                          ["Ministerios", "12", false],
                          ["Eventos", "5", true],
                        ] as [string, string, boolean][]
                      ).map(([label, val, isAccent]) => (
                        <div
                          key={label}
                          className="rounded-lg p-2"
                          style={{
                            backgroundColor: isAccent ? colors.accent : colors.card,
                            border: `1px solid ${colors.accent}`,
                          }}
                        >
                          <p
                            className="text-[9px] mb-0.5"
                            style={{ color: colors.foreground, opacity: 0.6 }}
                          >
                            {label}
                          </p>
                          <p
                            className="text-sm font-bold"
                            style={{ color: colors.foreground }}
                          >
                            {val}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <div
                        className="rounded px-2 py-1 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: colors.primary }}
                      >
                        Acción primaria
                      </div>
                      <div
                        className="rounded px-2 py-1 text-[10px] font-semibold"
                        style={{
                          backgroundColor: colors.accent,
                          color: colors.foreground,
                        }}
                      >
                        Secundaria
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                La vista previa y la plataforma se actualizan en tiempo real. Los
                cambios persisten solo al guardar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
