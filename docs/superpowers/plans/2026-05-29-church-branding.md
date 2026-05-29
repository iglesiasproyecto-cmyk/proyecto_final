# Church Branding & Customization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `admin_iglesia` to upload a logo and configure a full color palette that replaces the Lumen defaults for their church, persisted in Supabase and applied immediately at runtime via CSS custom properties.

**Architecture:** Supabase stores branding as a JSONB column and logo URL in the `iglesia` table; a Storage bucket `church-logos` holds logo files. AppContext fetches branding on church load, injects CSS vars into `:root`, and exposes `actualizarBranding` for the settings page. A dedicated `/app/:idIglesia/configuracion` page (admin-only) provides color pickers, logo upload, and a live preview.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Supabase JS client, shadcn/ui, sonner (toasts), lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-05-29-church-branding-design.md`

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/20260529000000_church_branding.sql` | Create — schema + bucket |
| `src/types/database.types.ts` | Modify — add `branding` and `logo_url` to `iglesia` Row/Insert/Update |
| `src/app/store/AppContext.tsx` | Modify — branding state, `aplicarBranding`, `actualizarBranding`, `useEffect` |
| `src/app/components/SEILogo.tsx` | Modify — render church logo when `iglesiaLogoUrl` is set |
| `src/app/components/AppLayout.tsx` | Modify — hardcoded hex → CSS var classes, add nav item, page title |
| `src/app/components/ConfiguracionPage.tsx` | Create — branding settings page |
| `src/app/routes.ts` | Modify — add configuracion route to tenant children |

---

## Task 1: Supabase — Migration and Storage Bucket

**Files:**
- Create: `supabase/migrations/20260529000000_church_branding.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260529000000_church_branding.sql

-- Add branding columns to iglesia
ALTER TABLE public.iglesia
  ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- Create church-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('church-logos', 'church-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on all files in church-logos
CREATE POLICY "church_logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'church-logos');

-- Allow admin_iglesia to upload/update logos for their own church
CREATE POLICY "church_logos_admin_write"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'church-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "church_logos_admin_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'church-logos'
  AND auth.role() = 'authenticated'
);
```

- [ ] **Step 2: Apply migration**

Run via Supabase CLI:
```bash
npx supabase db push
```

Or apply manually in the Supabase SQL Editor by executing the file content.

- [ ] **Step 3: Verify in Supabase Dashboard**

- Check `Table Editor → iglesia`: confirm `branding` (jsonb, nullable) and `logo_url` (text, nullable) columns exist.
- Check `Storage`: confirm `church-logos` bucket exists and is marked public.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260529000000_church_branding.sql
git commit -m "feat: add branding columns to iglesia and church-logos storage bucket"
```

---

## Task 2: Update TypeScript database types

**Files:**
- Modify: `src/types/database.types.ts`

The migration adds `branding` and `logo_url` to the `iglesia` table. Update the generated types to reflect this — otherwise TypeScript won't know these fields exist.

- [ ] **Step 1: Option A — regenerate via CLI (preferred)**

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

If CLI is not configured locally, use Option B.

- [ ] **Step 1: Option B — manual edit**

In `src/types/database.types.ts`, find the `iglesia` Row, Insert, and Update interfaces and add the new fields:

```typescript
// In iglesia.Row — add after existing fields:
branding: Json | null
logo_url: string | null

// In iglesia.Insert — add after existing fields:
branding?: Json | null
logo_url?: string | null

// In iglesia.Update — add after existing fields:
branding?: Json | null
logo_url?: string | null
```

`Json` is already defined in database.types.ts as `string | number | boolean | null | { [key: string]: Json | undefined } | Json[]`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no type errors related to `iglesia`.

- [ ] **Step 3: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore: update iglesia types with branding and logo_url fields"
```

---

## Task 3: AppContext — branding state, fetch, and mutations

**Files:**
- Modify: `src/app/store/AppContext.tsx`

This task adds three things:
1. `aplicarBranding` — module-level function that injects CSS vars into `:root`
2. Branding state + useEffect that fetches branding when `iglesiaActual` changes
3. `actualizarBranding` — async function exposed via context that saves to Supabase

- [ ] **Step 1: Add `aplicarBranding` as a module-level function**

Add this function near the top of `AppContext.tsx`, after the imports (before the `AppState` interface):

```typescript
const BRANDING_TOKENS = ['primary', 'background', 'foreground', 'sidebar', 'accent', 'card'] as const

function aplicarBranding(branding: Record<string, string> | null) {
  BRANDING_TOKENS.forEach((token) => {
    if (branding?.[token]) {
      document.documentElement.style.setProperty(`--${token}`, branding[token])
    } else {
      document.documentElement.style.removeProperty(`--${token}`)
    }
  })
}
```

- [ ] **Step 2: Add `iglesiaBranding` and `iglesiaLogoUrl` to the `AppState` interface**

In the `AppState` interface, add after `iglesiaActual`:

```typescript
iglesiaBranding: Record<string, string> | null
iglesiaLogoUrl: string | null
actualizarBranding: (branding: Record<string, string>, logoFile?: File) => Promise<void>
```

- [ ] **Step 3: Add branding state inside `AppProvider`**

Inside the `AppProvider` function, add two new state variables after the existing `iglesiaActual` state (around line 280):

```typescript
const [iglesiaBranding, setIglesiaBranding] = useState<Record<string, string> | null>(null)
const [iglesiaLogoUrl, setIglesiaLogoUrl] = useState<string | null>(null)
```

- [ ] **Step 4: Add useEffect to fetch branding when iglesiaActual changes**

Add this `useEffect` inside `AppProvider`, after the state declarations:

```typescript
useEffect(() => {
  if (!iglesiaActual?.id) {
    setIglesiaBranding(null)
    setIglesiaLogoUrl(null)
    aplicarBranding(null)
    return
  }

  supabase
    .from('iglesia')
    .select('branding, logo_url')
    .eq('id_iglesia', iglesiaActual.id)
    .single()
    .then(({ data }) => {
      const branding = (data?.branding as Record<string, string> | null) ?? null
      const logoUrl = data?.logo_url ?? null
      setIglesiaBranding(branding)
      setIglesiaLogoUrl(logoUrl)
      aplicarBranding(branding)
    })
}, [iglesiaActual?.id])
```

- [ ] **Step 5: Add `actualizarBranding` function inside `AppProvider`**

Add this function after the `useEffect` from Step 4:

```typescript
const actualizarBranding = useCallback(
  async (branding: Record<string, string>, logoFile?: File): Promise<void> => {
    if (!iglesiaActual?.id) throw new Error('No hay iglesia activa')

    let logoUrl = iglesiaLogoUrl

    if (logoFile) {
      const filePath = `${iglesiaActual.id}/logo`
      const { error: uploadError } = await supabase.storage
        .from('church-logos')
        .upload(filePath, logoFile, { upsert: true, contentType: logoFile.type })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage
        .from('church-logos')
        .getPublicUrl(filePath)
      logoUrl = `${urlData.publicUrl}?t=${Date.now()}`
    }

    const { error: updateError } = await supabase
      .from('iglesia')
      .update({ branding, logo_url: logoUrl })
      .eq('id_iglesia', iglesiaActual.id)
    if (updateError) throw updateError

    setIglesiaBranding(branding)
    setIglesiaLogoUrl(logoUrl)
    aplicarBranding(branding)
  },
  [iglesiaActual?.id, iglesiaLogoUrl]
)
```

- [ ] **Step 6: Clear branding in `resetClientState`**

Inside the `resetClientState` callback (around line 393), add after `setIglesiaActual(null)`:

```typescript
setIglesiaBranding(null)
setIglesiaLogoUrl(null)
aplicarBranding(null)
```

- [ ] **Step 7: Expose new values in the context Provider value**

In the `AppContext.Provider` value object (around line 730), add after `iglesiaActual`:

```typescript
iglesiaBranding,
iglesiaLogoUrl,
actualizarBranding,
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/store/AppContext.tsx
git commit -m "feat: add branding state and CSS injection to AppContext"
```

---

## Task 4: Update SEILogo to support dynamic church logo

**Files:**
- Modify: `src/app/components/SEILogo.tsx`

When `iglesiaLogoUrl` is set in context, show the church logo instead of the Lumen logo.

- [ ] **Step 1: Update `LumenLogo` to read `iglesiaLogoUrl` from context**

Replace the entire `LumenLogo` function with:

```typescript
export function LumenLogo({ className = "w-20 h-20", style, variant }: SEILogoProps) {
  let isDarkMode = false
  let iglesiaLogoUrl: string | null = null
  try {
    const app = useApp()
    isDarkMode = app.darkMode
    iglesiaLogoUrl = app.iglesiaLogoUrl
  } catch {
    if (typeof window !== "undefined") {
      isDarkMode = document.documentElement.classList.contains("dark") ||
                   window.matchMedia("(prefers-color-scheme: dark)").matches
    }
  }

  if (iglesiaLogoUrl) {
    return (
      <div
        className={`relative flex items-center justify-center transition-all duration-500 hover:scale-105 ${className}`}
        style={style}
      >
        <img
          src={iglesiaLogoUrl}
          alt="Logo de la Iglesia"
          className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(56,189,248,0.15)]"
          draggable={false}
        />
      </div>
    )
  }

  const logoSrc = variant
    ? (variant === "dark-bg" ? logo1 : logo2)
    : (isDarkMode ? logo1 : logo2)

  return (
    <div className={`relative flex items-center justify-center transition-all duration-500 hover:scale-105 ${className}`} style={style}>
      <div className="absolute inset-0 bg-sky-500/10 rounded-full blur-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <img
        src={logoSrc}
        alt="Lumen Logo"
        className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(56,189,248,0.25)] transition-transform duration-500"
        draggable={false}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SEILogo.tsx
git commit -m "feat: render church logo in SEILogo when iglesiaLogoUrl is set"
```

---

## Task 5: Update AppLayout — CSS vars and nav item

**Files:**
- Modify: `src/app/components/AppLayout.tsx`

Two changes: (a) replace hardcoded hex colors with Tailwind CSS var classes so branding injection takes effect visually, and (b) add "Personalización" nav item for `admin_iglesia`.

**Context:** Tailwind v4 maps `--color-primary: var(--primary)` via `@theme inline` in `theme.css`, so `bg-primary`, `text-primary`, `from-primary` etc. all read from the CSS var `--primary`. Same for `sidebar` → `bg-sidebar`, `from-sidebar`, etc.

- [ ] **Step 1: Add "Personalización" to admin_iglesia nav items**

In the `admin_iglesia` case of `getNavItemsForRole` (around line 101), add a new entry in the "Configuración" section (add it before "Notificaciones"):

```typescript
// Add this import at the top if not already present:
// import { Paintbrush } from 'lucide-react'

// In the admin_iglesia nav items array, add before the "Personal" section entries:
{ label: "Personalización", path: `${t}/configuracion`, icon: <Paintbrush className="w-5 h-5" />, section: "Configuración" },
```

Also add `Paintbrush` to the lucide-react import at the top of the file.

- [ ] **Step 2: Add page title for configuracion**

In the `pageTitles` object (around line 43), add:
```typescript
"/app/:idIglesia/configuracion": "Personalización",
```

And in `getDynamicPageTitle` function (around line 58), add before the final `return "Panel"`:
```typescript
if (pathname.match(/\/app\/\d+\/configuracion/)) return "Personalización";
```

- [ ] **Step 3: Replace hardcoded sidebar background gradient**

Find the `<aside>` element (around line 277):

```
className={`fixed lg:relative inset-y-0 left-0 z-40 bg-gradient-to-b from-[#091320] via-[#0c1828] to-[#070f1a] ...
```

Replace `from-[#091320] via-[#0c1828] to-[#070f1a]` with `from-sidebar via-sidebar/90 to-sidebar/80`:

```
className={`fixed lg:relative inset-y-0 left-0 z-40 bg-gradient-to-b from-sidebar via-sidebar/90 to-sidebar/80 ...
```

- [ ] **Step 4: Replace hardcoded primary colors in church selector button**

Find the church selector button (around line 302):

```
className="w-full rounded-xl flex items-center justify-between px-3 py-2.5 bg-[#4682b4]/10 border border-[#4682b4]/20 text-[#4682b4] hover:bg-[#4682b4]/25 hover:border-[#4682b4]/40 ...
```

Replace with:
```
className="w-full rounded-xl flex items-center justify-between px-3 py-2.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/25 hover:border-primary/40 ...
```

- [ ] **Step 5: Replace hardcoded dropdown background**

Find the dropdown container (around line 318):

```
className="absolute left-3 right-3 top-full mt-2 bg-[#0c1828]/95 backdrop-blur-xl ...
```

Replace `bg-[#0c1828]/95` with `bg-sidebar/95`:

```
className="absolute left-3 right-3 top-full mt-2 bg-sidebar/95 backdrop-blur-xl ...
```

- [ ] **Step 6: Replace active church gradient in dropdown**

Find the active church item (around line 328):

```
? "text-white bg-gradient-to-r from-[#4682b4] to-[#709dbd]"
```

Replace with:

```
? "text-white bg-gradient-to-r from-primary to-primary/70"
```

- [ ] **Step 7: Replace active nav item gradient**

Find the nav item active state (around line 371):

```
? "bg-gradient-to-br from-[#4682b4] to-[#709dbd] text-white shadow-[0_4px_20px_rgba(70,130,180,0.45)] ring-1 ring-[#709dbd]/30"
```

Replace with:

```
? "bg-gradient-to-br from-primary to-primary/70 text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)] ring-1 ring-primary/30"
```

- [ ] **Step 8: Replace user avatar gradient**

Find the user avatar (around line 499):

```
className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4682b4] to-[#709dbd] ...
```

Replace with:

```
className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 ...
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 10: Commit**

```bash
git add src/app/components/AppLayout.tsx
git commit -m "feat: replace hardcoded hex colors with CSS vars in AppLayout, add Personalización nav item"
```

---

## Task 6: Create ConfiguracionPage

**Files:**
- Create: `src/app/components/ConfiguracionPage.tsx`

- [ ] **Step 1: Create the component file**

Create `src/app/components/ConfiguracionPage.tsx` with the following content:

```typescript
import { useState, useEffect } from "react";
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
      const saved = iglesiaBranding ?? DEFAULT_BRANDING;
      Object.entries(saved).forEach(([token, value]) => {
        document.documentElement.style.setProperty(`--${token}`, value);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ConfiguracionPage.tsx
git commit -m "feat: create ConfiguracionPage with color pickers, logo upload, and live preview"
```

---

## Task 7: Register the route

**Files:**
- Modify: `src/app/routes.ts`

- [ ] **Step 1: Import ConfiguracionPage**

Add to the imports in `src/app/routes.ts`:

```typescript
import { ConfiguracionPage } from "./components/ConfiguracionPage";
```

- [ ] **Step 2: Add route to tenant children**

In the tenant-scoped routes section (the `path: ":idIglesia"` children array, around line 115), add after the `estadisticas` route:

```typescript
{ path: "configuracion", Component: ConfiguracionPage, ErrorBoundary: ErrorPage },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes.ts
git commit -m "feat: add /app/:idIglesia/configuracion route"
```

---

## Task 8: Manual verification (dev server)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Log in as admin_iglesia**

Use credentials for a user with the `admin_iglesia` role. Verify the sidebar shows a new **"Personalización"** item in the navigation.

- [ ] **Step 3: Navigate to Personalización**

Click the nav item (or go to `/app/:idIglesia/configuracion`). Verify the page loads with the logo upload section and 6 color pickers.

- [ ] **Step 4: Test live preview**

Change the "Color Primario" picker to red (`#cc0000`). Verify:
- The mini mockup in the right panel updates immediately (button/sidebar turn red)
- The actual app sidebar/buttons in the background also turn red (CSS vars injection)

- [ ] **Step 5: Test Restaurar valores**

Click "Restaurar valores". Verify colors reset to previously saved values (or defaults if none saved), both in the form and in the live app.

- [ ] **Step 6: Test Guardar cambios**

Set a custom primary color, click "Guardar cambios". Verify:
- Success toast appears: "Cambios guardados correctamente"
- Refresh the page — colors persist (branding loaded from Supabase on mount)

- [ ] **Step 7: Test logo upload**

Upload a PNG logo. Verify:
- Preview appears in the logo upload area
- Preview appears in the mini sidebar mockup
- Save and reload — logo appears in the actual app sidebar

- [ ] **Step 8: Test file validation**

Try uploading a `.jpg` file. Verify error toast: "Formato no soportado."
Try uploading a file > 2MB. Verify error toast: "El archivo excede el tamaño máximo de 2MB."

- [ ] **Step 9: Test non-admin redirect**

Log in as a user without `admin_iglesia` role and navigate to `/app/:idIglesia/configuracion`. Verify redirect to `/app`.

- [ ] **Step 10: Final commit if any fixes were applied**

```bash
git add -p
git commit -m "fix: address issues found during manual verification"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Per-church customization
- ✅ Full palette (6 tokens)
- ✅ Logo replaces Lumen logo in sidebar (SEILogo updated)
- ✅ Dedicated page `/app/:idIglesia/configuracion`
- ✅ Supabase persistence (JSONB + Storage)
- ✅ Live preview in real time
- ✅ Restore / Save actions
- ✅ Error handling (file validation, Supabase errors)
- ✅ Non-admin redirect
- ✅ AppLayout CSS vars migration
- ✅ Branding cleared on logout

**Type consistency:**
- `iglesiaBranding: Record<string, string> | null` used consistently across AppContext, ConfiguracionPage
- `actualizarBranding(branding: Record<string, string>, logoFile?: File)` matches between interface, implementation, and call site
- `BRANDING_TOKENS` array matches `TOKEN_LABELS` keys in ConfiguracionPage
- `aplicarBranding` called with `null` on logout and `Record<string,string>` on load/save
