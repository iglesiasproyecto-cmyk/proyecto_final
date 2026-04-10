# Phase 0: Vercel Deploy + Contexto Multi-iglesia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure Vercel deployment and move iglesia context from local AppLayout state into AppContext so all pages can scope their queries.

**Architecture:** Add `iglesiaActual` + `iglesiasDelUsuario` to AppContext, populated from `usuario_rol` after login. AppLayout's existing church selector reads from and writes to context instead of local state. Fix role derivation to come from `usuario_rol` data.

**Tech Stack:** React 18, Supabase JS v2, TanStack Query v5, Vercel

---

## File Structure

| File | Change |
|------|--------|
| `vercel.json` | Create — SPA rewrite rule |
| `src/app/store/AppContext.tsx` | Modify — add `iglesiaActual`, `setIglesiaActual`, `iglesiasDelUsuario`, `rolActual` |
| `src/app/components/AppLayout.tsx` | Modify — read `iglesiaActual` from context, remove local `activeChurchId` state, fix `rol` derivation |

---

### Task 1: Create vercel.json

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create the file**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Verify build works locally**

```bash
npm run build
```

Expected: `dist/` folder generated without errors.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: add vercel.json SPA rewrite rule for React Router"
```

---

### Task 2: Extend AppContext with iglesia context and real role

**Files:**
- Modify: `src/app/store/AppContext.tsx`

The current `AppContext` (117 lines) needs 3 new fields in `AppState` and new state variables populated after auth.

- [ ] **Step 1: Update `AppState` interface** — add fields after `authLoading`:

```typescript
// src/app/store/AppContext.tsx — replace the AppState interface block (lines 6-17)
interface AppState {
  session: Session | null
  usuarioActual: Usuario | null
  isAuthenticated: boolean
  authLoading: boolean
  iglesiaActual: { id: number; nombre: string } | null
  setIglesiaActual: (ig: { id: number; nombre: string } | null) => void
  iglesiasDelUsuario: { id: number; nombre: string }[]
  rolActual: string
  sidebarOpen: boolean
  notificacionesCount: number
  darkMode: boolean
  toggleSidebar: () => void
  toggleDarkMode: () => void
  logout: () => Promise<void>
}
```

- [ ] **Step 2: Add new state variables** — add after `useState(true)` on line 24:

```typescript
// After: const [authLoading, setAuthLoading] = useState(true)
const [iglesiaActual, setIglesiaActual] = useState<{ id: number; nombre: string } | null>(null)
const [iglesiasDelUsuario, setIglesiasDelUsuario] = useState<{ id: number; nombre: string }[]>([])
const [rolActual, setRolActual] = useState<string>('servidor')
```

- [ ] **Step 3: Populate iglesias + role from usuario_rol** — inside `onAuthStateChange`, replace the block that currently sets `usuarioActual` (lines 56-77) with:

```typescript
if (data) {
  setUsuarioActual({
    idUsuario: data.id_usuario,
    nombres: data.nombres,
    apellidos: data.apellidos,
    correo: data.correo,
    contrasenaHash: data.contrasena_hash,
    telefono: data.telefono,
    activo: data.activo,
    ultimoAcceso: data.ultimo_acceso,
    authUserId: data.auth_user_id ?? null,
    creadoEn: data.creado_en,
    actualizadoEn: data.updated_at,
  })

  // Fetch roles and iglesias for this user
  const { data: roles } = await supabase
    .from('usuario_rol')
    .select('id_rol, fecha_fin, rol(nombre), iglesia(id_iglesia, nombre)')
    .eq('id_usuario', data.id_usuario)
    .is('fecha_fin', null)
  if (callId !== callCounter) return

  const rolesData = (roles as any[]) || []

  // Derive highest role: super_admin > admin_iglesia > lider > servidor
  const roleNames = rolesData.map((r: any) => r.rol?.nombre ?? '')
  let derivedRol = 'servidor'
  if (roleNames.includes('Super Administrador')) derivedRol = 'super_admin'
  else if (roleNames.includes('Administrador de Iglesia')) derivedRol = 'admin_iglesia'
  else if (roleNames.includes('Líder')) derivedRol = 'lider'
  setRolActual(derivedRol)

  // Build unique iglesia list from roles
  const iglesiasMap = new Map<number, string>()
  rolesData.forEach((r: any) => {
    if (r.iglesia?.id_iglesia) {
      iglesiasMap.set(r.iglesia.id_iglesia, r.iglesia.nombre)
    }
  })
  const iglesias = Array.from(iglesiasMap.entries()).map(([id, nombre]) => ({ id, nombre }))
  setIglesiasDelUsuario(iglesias)

  // Auto-select if only one iglesia
  if (iglesias.length === 1) {
    setIglesiaActual(iglesias[0])
  } else {
    setIglesiaActual(null)
  }

  const { count } = await supabase
    .from('notificacion')
    .select('*', { count: 'exact', head: true })
    .eq('id_usuario', data.id_usuario)
    .eq('leida', false)
  if (callId !== callCounter) return
  setNotificacionesCount(count ?? 0)
}
```

- [ ] **Step 4: Reset new state on logout** — in the `else` branch (lines 78-82), add resets:

```typescript
} else {
  if (callId !== callCounter) return
  setUsuarioActual(null)
  setNotificacionesCount(0)
  setIglesiaActual(null)
  setIglesiasDelUsuario([])
  setRolActual('servidor')
}
```

- [ ] **Step 5: Expose new values in Provider** — replace the `value={{...}}` block (lines 95-107):

```typescript
value={{
  session,
  usuarioActual,
  isAuthenticated: !!session,
  authLoading,
  iglesiaActual,
  setIglesiaActual,
  iglesiasDelUsuario,
  rolActual,
  sidebarOpen,
  notificacionesCount,
  darkMode,
  toggleSidebar: () => setSidebarOpen((p) => !p),
  toggleDarkMode: () => setDarkMode((p) => !p),
  logout,
}}
```

- [ ] **Step 6: Build to check for TypeScript errors**

```bash
npm run build 2>&1 | head -40
```

Expected: No TypeScript errors about AppState.

---

### Task 3: Wire AppLayout to AppContext iglesia and role

**Files:**
- Modify: `src/app/components/AppLayout.tsx`

AppLayout currently has local `activeChurchId` state and derives `rol` incorrectly. It already has the church selector UI — we just need to wire it to context.

- [ ] **Step 1: Update `useApp()` destructure** — replace line 126:

```typescript
// Before:
const { usuarioActual, logout, notificacionesCount, sidebarOpen, toggleSidebar, darkMode, toggleDarkMode, authLoading } = useApp();
// After:
const { usuarioActual, logout, notificacionesCount, sidebarOpen, toggleSidebar, darkMode, toggleDarkMode, authLoading, iglesiaActual, setIglesiaActual, iglesiasDelUsuario, rolActual } = useApp();
```

- [ ] **Step 2: Remove local state, replace with context** — remove line 132:

```typescript
// Remove this line:
const [activeChurchId, setActiveChurchId] = useState<number | null>(null);
```

- [ ] **Step 3: Fix `rol` derivation** — replace line 149:

```typescript
// Before:
const rol = (usuarioActual as unknown as { rol?: string }).rol ?? "servidor";
// After:
const rol = rolActual;
```

- [ ] **Step 4: Update `activeChurch` and selector** — replace line 151:

```typescript
// Before:
const activeChurch = iglesias.find((ig) => ig.idIglesia === activeChurchId);
// After:
const activeChurch = iglesiaActual;
```

- [ ] **Step 5: Update selector to use context iglesias** — replace the `iglesias.filter(...)` map inside the church selector dropdown (around line 232):

```typescript
// Before:
{iglesias
  .filter((ig) => ig.estado === "activa")
  .map((ig) => (
    <button
      key={ig.idIglesia}
      onClick={() => {
        setActiveChurchId(ig.idIglesia);
        setShowChurchSelector(false);
      }}
      className={`... ${ig.idIglesia === activeChurchId ? "..." : "..."}`}
    >
      ...
      {ig.nombre}
    </button>
  ))}

// After:
{iglesiasDelUsuario.map((ig) => (
  <button
    key={ig.id}
    onClick={() => {
      setIglesiaActual(ig);
      setShowChurchSelector(false);
    }}
    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-sidebar-border transition-colors flex items-center gap-2 ${
      ig.id === iglesiaActual?.id
        ? "text-sidebar-primary bg-sidebar-primary/10"
        : "text-sidebar-foreground"
    }`}
  >
    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ig.id === iglesiaActual?.id ? "bg-sidebar-primary" : "bg-sidebar-foreground/30"}`} />
    {ig.nombre}
  </button>
))}
```

- [ ] **Step 6: Update selector display name** — replace line 219:

```typescript
// Before:
{activeChurch?.nombre || "Seleccionar iglesia"}
// After:
{iglesiaActual?.nombre || "Seleccionar iglesia"}
```

- [ ] **Step 7: Remove unused `useIglesias` import** since we no longer need the full iglesia list in AppLayout:

```typescript
// Remove this import from AppLayout.tsx line 4:
import { useIglesias } from "@/hooks/useIglesias";
// And remove line 127:
const { data: iglesias = [] } = useIglesias();
```

- [ ] **Step 8: Build and verify**

```bash
npm run build 2>&1 | head -40
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/store/AppContext.tsx src/app/components/AppLayout.tsx
git commit -m "feat: add iglesiaActual + rolActual to AppContext, wire church selector"
```

---

### Task 4: Fix EventsPage hardcoded idIglesia

**Files:**
- Modify: `src/app/components/EventsPage.tsx`

- [ ] **Step 1: Read the relevant section**

Open [src/app/components/EventsPage.tsx](src/app/components/EventsPage.tsx) and find line ~48 with `idIglesia: 1`.

- [ ] **Step 2: Import and use iglesiaActual**

Find where `useApp()` is destructured and add `iglesiaActual`:

```typescript
const { usuarioActual, iglesiaActual } = useApp()
```

- [ ] **Step 3: Replace hardcoded id**

```typescript
// Before:
idIglesia: 1,
// After:
idIglesia: iglesiaActual!.id,
```

- [ ] **Step 4: Disable create button when no iglesia**

Find the "Nuevo Evento" / create button and add `disabled={!iglesiaActual}`.

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/EventsPage.tsx
git commit -m "fix: use iglesiaActual.id instead of hardcoded 1 in EventsPage"
```

---

### Task 5: Deploy to Vercel

- [ ] **Step 1: Connect repo in Vercel dashboard**

Go to vercel.com → New Project → Import `iglesiasproyecto-cmyk/proyecto_final`.

Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.

- [ ] **Step 2: Add environment variables in Vercel dashboard**

```
VITE_SUPABASE_URL = https://heibyjbvfiokmduwwawm.supabase.co
VITE_SUPABASE_ANON_KEY = <your anon key from supabase dashboard>
```

- [ ] **Step 3: Deploy and verify**

Click Deploy. After deploy, open the Vercel URL, go directly to `/app` — should redirect to `/login` (not 404).

- [ ] **Step 4: Push (triggers automatic redeploy)**

```bash
git push origin main
```

Expected: Vercel CI builds and deploys automatically.
