# Church Branding & Customization — Design Spec

**Date:** 2026-05-29  
**Author:** Juan David Aguilar  
**Status:** Approved for implementation

---

## Overview

Permit the `admin_iglesia` role to customize the platform's visual identity per church: upload a logo and configure a full color palette. Changes persist in Supabase and apply immediately across the entire app for that church's session.

This is a SaaS multi-tenant feature: each `iglesia` stores its own branding independently. No church sees another's colors or logo.

---

## Architecture

Three layers:

1. **Supabase** — persistence (schema + Storage bucket)
2. **AppContext** — runtime state and CSS injection
3. **UI** — dedicated settings page at `/app/configuracion`

---

## Data Model

### Schema migration

```sql
ALTER TABLE iglesia
  ADD COLUMN branding JSONB DEFAULT NULL,
  ADD COLUMN logo_url TEXT DEFAULT NULL;
```

### `branding` JSONB structure

```json
{
  "primary":    "#4682b4",
  "background": "#f0f7ff",
  "foreground": "#0c2340",
  "sidebar":    "#091320",
  "accent":     "#dbeafe",
  "card":       "#ffffff"
}
```

Each key maps 1:1 to a CSS custom property in `theme.css` (e.g. `primary` → `--primary`).

### Supabase Storage

- **Bucket:** `church-logos`
- **Read policy:** public (logo URL is served directly)
- **Write policy:** authenticated user whose `iglesia_id` matches the row being updated and has role `admin_iglesia`
- **File path convention:** `{iglesia_id}/{filename}` (overwrites on re-upload)
- **Accepted formats:** `.png`, `.webp`, `.svg`
- **Max size:** 2 MB

---

## AppContext Changes

### Extended `iglesiaActual` type

```ts
iglesiaActual: {
  id: number
  nombre: string
  branding: Record<string, string> | null
  logo_url: string | null
} | null
```

### New function: `aplicarBranding`

```ts
function aplicarBranding(branding: Record<string, string> | null) {
  const tokens = ['primary','background','foreground','sidebar','accent','card']
  tokens.forEach(token => {
    if (branding?.[token]) {
      document.documentElement.style.setProperty(`--${token}`, branding[token])
    } else {
      document.documentElement.style.removeProperty(`--${token}`)
    }
  })
}
```

Called automatically when `iglesiaActual` is set or changed. Removes overrides when `branding` is null (CSS falls back to `theme.css` defaults).

### New function: `actualizarBranding`

```ts
async function actualizarBranding(
  branding: Record<string, string>,
  logoFile?: File
): Promise<void>
```

Exposed via context. Called by the settings page on save. Handles:
1. Optional logo upload to Supabase Storage → gets public URL
2. `UPDATE iglesia SET branding=..., logo_url=... WHERE id=...`
3. Updates `iglesiaActual` in local state
4. Calls `aplicarBranding` with the new values

---

## UI — `/app/configuracion`

### Access control

- Route only renders for `rol === 'admin_iglesia'`
- Other roles are redirected to `/app` (dashboard)
- Nav item appears in sidebar only for `admin_iglesia`

### Page layout

Two-column layout (stacked on mobile):

**Left column — Controls:**
- **Logo section:** current logo preview (or placeholder icon), file input button, remove button. Shows filename after selection.
- **Color palette section:** 6 rows, one per token. Each row shows: token label, description, hex input, color swatch (native `<input type="color">` as picker trigger).
- **Action row:** "Restaurar valores" (secondary) + "Guardar cambios" (primary).

**Right column — Live preview:**
- Mini mockup of the app shell (sidebar + topbar + sample cards + buttons).
- Updates in real time as colors are adjusted (before saving).
- Logo preview updates immediately after file selection.

### Color tokens exposed to the admin

| Token | Label | Description |
|-------|-------|-------------|
| `primary` | Color Primario | Botones, links, acentos |
| `background` | Fondo Principal | Fondo de las páginas |
| `foreground` | Color de Texto | Texto principal |
| `sidebar` | Fondo del Menú Lateral | Barra de navegación |
| `accent` | Color de Acento | Fondos de tarjetas destacadas |
| `card` | Fondo de Tarjetas | Cards y paneles |

### Behavior

- Color changes are applied to the live preview immediately via `document.documentElement.style.setProperty` (same mechanism as `aplicarBranding`).
- Changes are **not** written to Supabase until the user clicks "Guardar cambios".
- "Restaurar valores" reverts the local form state and live preview to the currently saved branding (or theme.css defaults if no branding is saved). Does not trigger a Supabase write.
- On successful save: success toast "Cambios guardados correctamente".
- On save error: error toast, live preview reverts to previously saved values.

---

## Loading Flow

1. User logs in → `AppContext` fetches `iglesia` row including `branding` and `logo_url`.
2. `aplicarBranding(iglesiaActual.branding)` is called → CSS vars injected into `:root`.
3. `SEILogo` / sidebar logo reads `iglesiaActual.logo_url`; if set, renders `<img src={logo_url}>` instead of the Lumen logo assets.
4. When church is switched (multi-church users), `aplicarBranding` is called again with the new church's branding.
5. On logout, `aplicarBranding(null)` clears all overrides.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Logo file > 2 MB | Validation before upload; error toast, no upload attempted |
| Unsupported file format | Validation on file selection; error toast |
| Supabase Storage upload fails | Error toast; `logo_url` not updated |
| Supabase UPDATE fails | Error toast; live preview reverts to last saved state |
| Church has no branding (`null`) | No CSS injection; `theme.css` defaults apply |
| Non-admin accesses `/app/configuracion` | Redirect to `/app` |

---

## Out of Scope

- Dark mode variants of custom colors (dark mode continues to use `theme.css` dark vars)
- Custom fonts
- Per-sede branding (branding is at the `iglesia` level only)
- Branding preview as a shareable link
- Color contrast / accessibility validation

---

## Implementation Note — Hardcoded Colors in AppLayout

`AppLayout.tsx` currently uses hardcoded Tailwind arbitrary values for the sidebar gradient (`from-[#091320] via-[#0c1828] to-[#070f1a]`) and primary color elements (`bg-[#4682b4]`). These bypass the CSS custom properties system.

As part of this implementation, `AppLayout.tsx` must be updated to replace hardcoded hex values with CSS var references (e.g. `bg-[--sidebar]`, `from-[--sidebar]`) so that the branding injection actually takes effect visually. The same check applies to `AdministradorPage.tsx`.

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/app/components/ConfiguracionPage.tsx` | Create — main settings page |
| `src/app/components/AppLayout.tsx` | Modify — add nav item for admin_iglesia, use `logo_url` from context, replace hardcoded hex colors with CSS var references |
| `src/app/components/AdministradorPage.tsx` | Modify — replace hardcoded hex colors with CSS var references |
| `src/app/store/AppContext.tsx` | Modify — extend `iglesiaActual` type, add `aplicarBranding`, `actualizarBranding` |
| `src/app/App.tsx` / `routes.ts` | Modify — add `/app/configuracion` route |
| `src/app/components/SEILogo.tsx` | Modify — render church logo when `logo_url` is set |
| Supabase migration | Create — `ALTER TABLE iglesia ADD COLUMN branding JSONB, logo_url TEXT` |
