# Toast Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface mutation errors as toast notifications so users see feedback when a Supabase operation fails instead of silent no-op.

**Architecture:** Mount the existing `<Toaster>` component (from `src/app/components/ui/sonner.tsx`, wrapping the `sonner` v2 library) in `App.tsx`. Add a global `MutationCache.onError` handler in `main.tsx` so every mutation error across all 7 hook files triggers a toast automatically — no per-hook changes needed.

**Tech Stack:** sonner v2.0.3, @tanstack/react-query v5 (`MutationCache`), React 18, project `/home/juanda/Proyectofinal`

---

## File Map

| Action | Path | What changes |
|--------|------|--------------|
| Modify | `src/main.tsx` | Add `MutationCache` with global `onError` → `toast.error()` |
| Modify | `src/app/App.tsx` | Mount `<Toaster richColors position="top-right" />` |

---

## Task 1: Global error toasts

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/app/App.tsx`

### Context

`src/main.tsx` currently:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
  },
})
```

`src/app/App.tsx` currently:
```typescript
import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return <RouterProvider router={router} />;
}
```

`src/app/components/ui/sonner.tsx` exports `Toaster` (already configured with theme support).

- [ ] **Step 1: Add MutationCache to `src/main.tsx`**

Read `src/main.tsx` first.

Replace the file content with:

```typescript
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { toast } from 'sonner'
import App from './app/App.tsx'
import './styles/index.css'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Ha ocurrido un error')
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
```

- [ ] **Step 2: Mount Toaster in `src/app/App.tsx`**

Replace the file content with:

```typescript
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/juanda/Proyectofinal && npx tsc --noEmit 2>&1 | grep "error TS" | head -10
```

Expected: no new errors (only pre-existing unused-import warnings are acceptable).

- [ ] **Step 4: Verify build**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`

- [ ] **Step 5: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/main.tsx src/app/App.tsx
git commit -m "feat: global mutation error toasts via MutationCache + mount Toaster"
```
