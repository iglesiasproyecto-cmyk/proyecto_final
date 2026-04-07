# Route Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the auth race condition that redirects authenticated users to `/login` on hard refresh, and add proper route protection so unauthenticated users cannot access `/app/*` routes.

**Architecture:** The root cause is that `AppContext` has no `authLoading` state — both `session` and `usuarioActual` start as `null`, causing `AppLayout` to redirect to `/login` before Supabase's `onAuthStateChange` fires with the existing session. The fix adds `authLoading: boolean` (starts `true`, set to `false` after the first auth event resolves) to `AppContext`, updates `AppLayout` to show a spinner while loading, and adds a redirect in `LoginPage` for already-authenticated users.

**Tech Stack:** @supabase/supabase-js v2 (`onAuthStateChange` fires `INITIAL_SESSION` on mount), React Router v7, React 18, TypeScript, project `/home/juanda/Proyectofinal`

---

## File Map

| Action | Path | What changes |
|--------|------|--------------|
| Modify | `src/app/store/AppContext.tsx` | Add `authLoading` state + expose in context |
| Modify | `src/app/components/AppLayout.tsx` | Show spinner while `authLoading`; redirect only when `!authLoading && !session` |
| Modify | `src/app/components/LoginPage.tsx` | Redirect to `/app` if already authenticated |

---

## Task 1: authLoading state in AppContext + AppLayout guard

**Files:**
- Modify: `src/app/store/AppContext.tsx`
- Modify: `src/app/components/AppLayout.tsx`

### Context

`AppContext` current auth init (lines 40–83):
```typescript
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
  })
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    setSession(session)
    if (session) {
      // fetch usuario...
    } else {
      setUsuarioActual(null)
    }
  })
  return () => subscription.unsubscribe()
}, [])
```

The problem: `session` starts `null`, `onAuthStateChange` fires async → `AppLayout` renders, sees `usuarioActual === null`, fires `navigate('/login')`. By the time the auth event fires and sets `session`, the user is already on `/login`.

Supabase v2 always fires `onAuthStateChange` with `event === 'INITIAL_SESSION'` on mount (even when no session exists). We use this to know when auth initialization is done.

`AppLayout` current guard (lines 134–138):
```typescript
useEffect(() => {
  if (!usuarioActual) navigate("/login");
}, [usuarioActual, navigate]);

if (!usuarioActual) return null;
```

`AppState` interface (lines 5–16) needs `authLoading: boolean` added.

- [ ] **Step 1: Add `authLoading` to AppContext**

Read `src/app/store/AppContext.tsx` first (full file).

1a. Add `authLoading: boolean` to the `AppState` interface after `isAuthenticated`:
```typescript
interface AppState {
  session: Session | null
  usuarioActual: Usuario | null
  isAuthenticated: boolean
  authLoading: boolean       // ← add this
  sidebarOpen: boolean
  notificacionesCount: number
  darkMode: boolean
  toggleSidebar: () => void
  toggleDarkMode: () => void
  logout: () => Promise<void>
}
```

1b. Add state inside `AppProvider` after the `usuarioActual` state:
```typescript
const [authLoading, setAuthLoading] = useState(true)
```

1c. Update the auth `useEffect`. Replace the entire useEffect that calls `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()` with:
```typescript
useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    setSession(session)
    if (session) {
      const { data } = await supabase
        .from('usuario')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single()
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
        const { count } = await supabase
          .from('notificacion')
          .select('*', { count: 'exact', head: true })
          .eq('id_usuario', data.id_usuario)
          .eq('leida', false)
        setNotificacionesCount(count ?? 0)
      }
    } else {
      setUsuarioActual(null)
      setNotificacionesCount(0)
    }
    setAuthLoading(false)
  })

  return () => subscription.unsubscribe()
}, [])
```

Key change: removed the separate `getSession()` call (Supabase v2's `onAuthStateChange` fires `INITIAL_SESSION` synchronously on mount, making `getSession()` redundant). `setAuthLoading(false)` is called after every auth event, so it becomes `false` once the initial session check resolves — whether or not a session exists.

1d. Add `authLoading` to the context value in the `return` block:
```typescript
return (
  <AppContext.Provider
    value={{
      session,
      usuarioActual,
      isAuthenticated: !!session,
      authLoading,
      sidebarOpen,
      notificacionesCount,
      darkMode,
      toggleSidebar: () => setSidebarOpen((p) => !p),
      toggleDarkMode: () => setDarkMode((p) => !p),
      logout,
    }}
  >
    {children}
  </AppContext.Provider>
)
```

- [ ] **Step 2: Update AppLayout to use authLoading**

Read `src/app/components/AppLayout.tsx` (focus on lines 120–145).

2a. Destructure `authLoading` from `useApp()`:
```typescript
const { usuarioActual, logout, notificacionesCount, sidebarOpen, toggleSidebar, darkMode, toggleDarkMode, authLoading } = useApp();
```

2b. Replace the auth guard (lines 134–138) with one that respects `authLoading`:
```typescript
useEffect(() => {
  if (!authLoading && !usuarioActual) navigate("/login");
}, [authLoading, usuarioActual, navigate]);

if (authLoading) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}

if (!usuarioActual) return null;
```

The spinner uses the project's CSS variable `bg-background` and `border-primary` (defined in `src/styles/theme.css`) so it respects light/dark mode automatically.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | grep -E "error TS|AppContext|AppLayout" | head -20
```

Expected: no errors in these two files.

- [ ] **Step 4: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/store/AppContext.tsx src/app/components/AppLayout.tsx
git commit -m "feat: add authLoading state to fix redirect race on page refresh"
```

---

## Task 2: LoginPage guard for already-authenticated users

**Files:**
- Modify: `src/app/components/LoginPage.tsx`

### Context

Currently `LoginPage` does not check if the user is already authenticated. An authenticated user who navigates to `/login` sees the login form. The fix: read `session` and `authLoading` from `useApp()` and redirect to `/app` if already logged in.

Current LoginPage starts with:
```typescript
const navigate = useNavigate()
```
And has no `useApp()` call.

- [ ] **Step 1: Wire the redirect in LoginPage**

Read `src/app/components/LoginPage.tsx` first.

1a. Add `useApp` import:
```typescript
import { useApp } from "../store/AppContext";
```

1b. Inside the component body, after `const navigate = useNavigate()`, add:
```typescript
const { session, authLoading } = useApp();

useEffect(() => {
  if (!authLoading && session) navigate("/app");
}, [authLoading, session, navigate]);

if (authLoading) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}
```

Note: `useEffect` must be called before any conditional early return (Rules of Hooks). The spinner while `authLoading` prevents the login form from flashing before the redirect fires for already-authenticated users.

- [ ] **Step 2: Add missing `useEffect` import if needed**

Check if `useEffect` is already imported from `react` in the file. If not, add it:
```typescript
import { useState, useEffect } from "react";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | grep -E "error TS|LoginPage" | head -20
```

Expected: no errors.

- [ ] **Step 4: Verify full build**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`

- [ ] **Step 5: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/components/LoginPage.tsx
git commit -m "feat: redirect authenticated users away from LoginPage"
```
