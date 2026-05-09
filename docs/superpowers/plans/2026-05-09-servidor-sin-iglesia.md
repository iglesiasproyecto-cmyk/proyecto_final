# Servidor Sin Iglesia Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the `/login` ↔ `/app` loop by routing authenticated non-super_admin users without iglesia to `/app/sin-iglesia`.

**Architecture:** Add a dedicated in-app route and component for the “no iglesia assigned” state, and update redirect/login logic to send users there when `iglesiaActual` is null. Keep existing super_admin flow unchanged.

**Tech Stack:** React 18, React Router v7, Playwright E2E.

---

## File Map

- Create: `src/app/components/NoChurchAssignedPage.tsx`
- Modify: `src/app/routes.ts`
- Modify: `src/app/components/IndexRedirect.tsx`
- Modify: `src/app/components/LoginPage.tsx`
- Modify: `e2e/auth.setup.ts`
- Modify: `e2e/specs/01-routes-guard.spec.ts`

---

### Task 1: Add failing E2E coverage for “sin iglesia” redirect

**Files:**
- Modify: `e2e/auth.setup.ts`
- Modify: `e2e/specs/01-routes-guard.spec.ts`

- [ ] **Step 1: Write the failing test (routes guard)**

Add this test to `e2e/specs/01-routes-guard.spec.ts` (near other route-guard tests):

```ts
test('servidor sin iglesia queda en /app/sin-iglesia', async ({ page, role }) => {
  test.skip(role !== 'servidor', 'Solo aplica a servidor')

  await page.goto(`${BASE_URL}/app`)
  await expect(page).toHaveURL(/\/app\/sin-iglesia/, { timeout: 12_000 })
})
```

- [ ] **Step 2: Update auth setup expectation for servidor (still failing before implementation)**

Modify the servidor entry in `e2e/auth.setup.ts`:

```ts
  {
    role: 'servidor',
    email: process.env.TEST_SERVIDOR_EMAIL!,
    password: process.env.TEST_SERVIDOR_PASSWORD!,
    authFile: '.auth/servidor.json',
    expectedUrlPattern: /\/app\/(\d+|sin-iglesia)/,
  },
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
npm run test:e2e -- e2e/specs/01-routes-guard.spec.ts
```

Expected: FAIL or timeout waiting for `/app/sin-iglesia` (current app still loops /login ↔ /app).

- [ ] **Step 4: Commit the failing test**

```bash
git add e2e/specs/01-routes-guard.spec.ts e2e/auth.setup.ts
git commit -m "test: cover servidor without iglesia redirect"
```

---

### Task 2: Add “Sin iglesia asignada” page

**Files:**
- Create: `src/app/components/NoChurchAssignedPage.tsx`

- [ ] **Step 1: Write minimal component**

Create `src/app/components/NoChurchAssignedPage.tsx`:

```tsx
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
          <Button onClick={() => logout()}>
            Cerrar sesion
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit the new page**

```bash
git add src/app/components/NoChurchAssignedPage.tsx
git commit -m "feat: add no-iglesia placeholder page"
```

---

### Task 3: Add route for `/app/sin-iglesia`

**Files:**
- Modify: `src/app/routes.ts`

- [ ] **Step 1: Import component and add route**

Update `src/app/routes.ts`:

```ts
import { NoChurchAssignedPage } from "./components/NoChurchAssignedPage";
```

Add child route under `/app` (near `IndexRedirect`):

```ts
{ path: "sin-iglesia", Component: NoChurchAssignedPage, ErrorBoundary: ErrorPage },
```

- [ ] **Step 2: Commit route update**

```bash
git add src/app/routes.ts
git commit -m "feat: add /app/sin-iglesia route"
```

---

### Task 4: Redirect non-super_admin without iglesia to `/app/sin-iglesia`

**Files:**
- Modify: `src/app/components/IndexRedirect.tsx`

- [ ] **Step 1: Update redirect logic**

Replace the final `else` in `src/app/components/IndexRedirect.tsx`:

```ts
    if (rolActual === "super_admin") {
      navigate("/app/global", { replace: true });
    } else if (iglesiaActual?.id != null) {
      navigate(`/app/${iglesiaActual.id}`, { replace: true });
    } else {
      navigate("/app/sin-iglesia", { replace: true });
    }
```

Ensure the dependency array includes `isClaimsReady` and `authLoading`:

```ts
  }, [isHydrated, isClaimsReady, authLoading, usuarioActual, rolActual, iglesiaActual, navigate, location.pathname]);
```

- [ ] **Step 2: Commit redirect update**

```bash
git add src/app/components/IndexRedirect.tsx
git commit -m "fix: redirect no-iglesia users to /app/sin-iglesia"
```

---

### Task 5: Adjust login success routing for no-iglesia users

**Files:**
- Modify: `src/app/components/LoginPage.tsx`

- [ ] **Step 1: Add required state and route logic**

Update the hook usage and logic in `src/app/components/LoginPage.tsx`:

```tsx
  const { session, usuarioActual, authLoading, isHydrated, rolActual, iglesiaActual, isClaimsReady } = useApp()
```

Update `handleLoginSuccess`:

```tsx
  const handleLoginSuccess = useCallback(() => {
    setShowTransitionLoader(true)

    setTimeout(() => {
      setShowTransitionLoader(false)

      if (rolActual !== "super_admin" && !iglesiaActual?.id) {
        navigate("/app/sin-iglesia")
        return
      }

      navigate('/app')
    }, 500)
  }, [navigate, rolActual, iglesiaActual])
```

Update the effect guard:

```tsx
  useEffect(() => {
    if (!authLoading && session && usuarioActual && isHydrated && isClaimsReady) {
      handleLoginSuccess()
    }
  }, [authLoading, session, usuarioActual, isHydrated, isClaimsReady, handleLoginSuccess])
```

Update the submit success branch to use the same routing:

```tsx
      toast.success('¡Bienvenido!')
      handleLoginSuccess()
```

- [ ] **Step 2: Commit login routing update**

```bash
git add src/app/components/LoginPage.tsx
git commit -m "fix: route no-iglesia users to /app/sin-iglesia after login"
```

---

### Task 6: Verify tests go green

**Files:**
- Test: `e2e/specs/01-routes-guard.spec.ts`

- [ ] **Step 1: Run the route guard spec**

```bash
npm run test:e2e -- e2e/specs/01-routes-guard.spec.ts
```

Expected: PASS for the new `/app/sin-iglesia` check.

- [ ] **Step 2: Commit final changes**

```bash
git add src/app/components/NoChurchAssignedPage.tsx src/app/routes.ts src/app/components/IndexRedirect.tsx src/app/components/LoginPage.tsx
git commit -m "fix: prevent login loop for users without iglesia"
```

---

## Plan Self-Review

- Spec coverage: redirects, new route, UI placeholder, login routing, test coverage.
- Placeholder scan: none.
- Type consistency: uses `rolActual` and `iglesiaActual` from `useApp` consistently.
