# Bundle Size Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce frontend bundle size by removing duplicate/unused dependencies and implementing code splitting for large page components, targeting ~35-40% reduction.

**Architecture:** Progressive optimization in 4 phases:
1. Remove completely unused dependencies (MUI, @anthropic-ai/sdk, react-slick, next-themes, @popperjs/core, @hello-pangea/dnd, react-popper)
2. Remove duplicate motion library (keep framer-motion, remove motion)
3. Consolidate drag-drop (keep react-dnd + react-dnd-html5-backend, verified in use)
4. Implement route-based code splitting for large components (UsuariosPage, TasksPage, PastoresPage, SedesPage) using React.lazy() + Suspense

**Tech Stack:** Vite 6.3.5, React 18.3.1, React Router 7.13.0, Tailwind CSS v4, Radix UI (primary UI system)

---

## Phase 1: Remove Completely Unused Dependencies

### Task 1: Remove MUI and Emotion packages

**Files:**
- Modify: `package.json` (remove 5 packages)
- Verify: `src/app/components/` (grep confirms 0 @mui imports)

- [ ] **Step 1: Verify no MUI usage in codebase**

Run: `grep -r "from '@mui\|from \"@mui" /home/juanda/Proyectofinal/src --include="*.tsx" --include="*.ts" | wc -l`

Expected: `0` (zero matches)

- [ ] **Step 2: Remove MUI and Emotion from package.json**

Edit `/home/juanda/Proyectofinal/package.json`: Delete these 5 lines from `dependencies`:
- Line 18: `"@emotion/react": "11.14.0",`
- Line 19: `"@emotion/styled": "11.14.1",`
- Line 21: `"@mui/icons-material": "7.3.5",`
- Line 22: `"@mui/material": "7.3.5",`

After removal, the `dependencies` section should start with `@anthropic-ai/sdk` on line 17.

- [ ] **Step 3: Install dependencies to update lock file**

Run: `cd /home/juanda/Proyectofinal && npm install`

Expected: Installation completes, lock file updated

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "remove(deps): eliminate unused MUI and Emotion packages"
```

---

### Task 2: Remove other unused dependencies

**Files:**
- Modify: `package.json` (remove 7 packages)

- [ ] **Step 1: Verify no usage of these packages**

Run these commands to confirm zero usage:
```bash
grep -r "from '@anthropic-ai/sdk\|from \"@anthropic-ai/sdk" /home/juanda/Proyectofinal/src --include="*.tsx" --include="*.ts" | wc -l
grep -r "from 'react-slick\|from \"react-slick" /home/juanda/Proyectofinal/src --include="*.tsx" --include="*.ts" | wc -l
grep -r "from 'next-themes\|from \"next-themes" /home/juanda/Proyectofinal/src --include="*.tsx" --include="*.ts" | wc -l
grep -r "from '@popperjs\|from \"@popperjs" /home/juanda/Proyectofinal/src --include="*.tsx" --include="*.ts" | wc -l
grep -r "from 'react-popper\|from \"react-popper" /home/juanda/Proyectofinal/src --include="*.tsx" --include="*.ts" | wc -l
```

Expected: All commands return `0`

- [ ] **Step 2: Remove 7 unused packages from package.json dependencies**

Edit `/home/juanda/Proyectofinal/package.json` and remove these lines:
- `"@anthropic-ai/sdk": "^0.91.1",`
- `"@popperjs/core": "2.11.8",`
- `"react-popper": "2.3.0",`
- `"react-slick": "0.31.0",`
- `"next-themes": "0.4.6",`
- `"@hello-pangea/dnd": "^18.0.1",`

After removal, verify the `dependencies` section flows correctly with proper comma placement.

- [ ] **Step 3: Install dependencies**

Run: `cd /home/juanda/Proyectofinal && npm install`

Expected: Installation completes

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "remove(deps): eliminate unused @anthropic-ai/sdk, next-themes, react-slick, and popper packages"
```

---

## Phase 2: Remove Duplicate Motion Library

### Task 3: Consolidate motion libraries (keep framer-motion)

**Files:**
- Modify: `package.json` (remove motion package)
- Verify: Only 6 files use framer-motion, 0 use motion

- [ ] **Step 1: Verify motion package is not used**

Run: `grep -r "from 'motion\|from \"motion" /home/juanda/Proyectofinal/src --include="*.tsx" --include="*.ts" | wc -l`

Expected: `0`

- [ ] **Step 2: Remove motion package from dependencies**

Edit `/home/juanda/Proyectofinal/package.json` and remove this line:
- `"motion": "12.23.24",`

- [ ] **Step 3: Install dependencies**

Run: `cd /home/juanda/Proyectofinal && npm install`

Expected: Installation completes

- [ ] **Step 4: Verify framer-motion is still present**

Run: `grep "framer-motion" /home/juanda/Proyectofinal/package.json`

Expected: `"framer-motion": "^11.0.0",` is present

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "remove(deps): eliminate duplicate motion package, keep framer-motion"
```

---

## Phase 3: Verify react-dnd is the only DnD library in use

### Task 4: Confirm drag-drop consolidation

**Files:**
- Verify: `src/app/components/TasksPage.tsx`, `src/app/components/ModulosGestion.tsx`

- [ ] **Step 1: Verify only react-dnd is used (not @hello-pangea/dnd)**

Run:
```bash
grep -r "@hello-pangea/dnd" /home/juanda/Proyectofinal/src --include="*.tsx" --include="*.ts"
```

Expected: No output (confirmed removed in Task 2)

- [ ] **Step 2: Verify react-dnd is actively used**

Run:
```bash
grep -r "react-dnd" /home/juanda/Proyectofinal/src --include="*.tsx" --include="*.ts" | head -5
```

Expected: Shows usage in TasksPage.tsx and ModulosGestion.tsx (keep these packages)

- [ ] **Step 3: No commit needed**

The drag-drop consolidation is complete via Task 2 (removed @hello-pangea/dnd).

---

## Phase 4: Implement Code Splitting for Large Components

### Task 5: Update routes to use lazy loading

**Files:**
- Modify: `src/app/routes.ts`

- [ ] **Step 1: Review current routes file**

Read `/home/juanda/Proyectofinal/src/app/routes.ts` to identify routes that load:
- UsuariosPage
- TasksPage
- PastoresPage
- SedesPage

- [ ] **Step 2: Update routes.ts to use React.lazy()**

Replace the direct imports with lazy-loaded equivalents. Update the routes configuration section:

```typescript
import React from 'react';

// Lazy-loaded route components (code splitting)
const UsuariosPage = React.lazy(() => import('./components/UsuariosPage'));
const TasksPage = React.lazy(() => import('./components/TasksPage'));
const PastoresPage = React.lazy(() => import('./components/PastoresPage'));
const SedesPage = React.lazy(() => import('./components/SedesPage'));
const CursoDetallePage = React.lazy(() => import('./components/CursoDetallePage'));
const EventsPage = React.lazy(() => import('./components/EventsPage'));
const StatisticsPage = React.lazy(() => import('./components/StatisticsPage'));

// Keep other smaller routes as regular imports
import DashboardPage from './components/DashboardPage';
import ProfilePage from './components/ProfilePage';
// ... other imports ...
```

Update the routes array to reference these lazy components (no change to routes array itself, just the import mechanism).

- [ ] **Step 3: Verify file compiles**

Run: `cd /home/juanda/Proyectofinal && npm run typecheck`

Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/app/routes.ts
git commit -m "feat: implement code splitting for large page components via React.lazy()"
```

---

### Task 6: Add Suspense wrapper for lazy-loaded routes in layout

**Files:**
- Modify: `src/app/components/RootLayout.tsx` or `src/app/components/AppLayout.tsx` (whichever renders the route outlets)

- [ ] **Step 1: Identify where routes are rendered**

Read the main layout component (likely `RootLayout.tsx` or `AppLayout.tsx`) to find where `<Outlet />` or route components are rendered.

- [ ] **Step 2: Add Suspense component wrapper**

If routes render via `<Outlet />` from React Router:

```typescript
import React, { Suspense } from 'react';
import { Outlet } from 'react-router';
import LoadingSpinner from './LoadingSpinner'; // or use existing loading component

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
```

If there's no LoadingSpinner component, create a simple one:

```typescript
// In src/app/components/LoadingSpinner.tsx
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}
```

- [ ] **Step 3: Verify file compiles**

Run: `cd /home/juanda/Proyectofinal && npm run typecheck`

Expected: No TypeScript errors

- [ ] **Step 4: Test in browser**

Run: `cd /home/juanda/Proyectofinal && npm run dev`

Navigate to each lazily-loaded route (UsuariosPage, TasksPage, etc.) and verify:
- Page loads correctly
- Loading indicator appears briefly while chunk downloads
- No console errors

Expected: All pages load normally with brief loading state

- [ ] **Step 5: Commit**

```bash
git add src/app/components/
git commit -m "feat: add Suspense boundary for lazy-loaded route components"
```

---

## Phase 5: Verify Bundle Size Improvements

### Task 7: Analyze bundle before and after

**Files:**
- Check: Build output

- [ ] **Step 1: Build the production bundle**

Run: `cd /home/juanda/Proyectofinal && npm run build`

Expected: Build completes successfully

- [ ] **Step 2: Check build output summary**

After build completes, Vite prints a summary. Capture the main bundle sizes.

If not visible, run:
```bash
ls -lh /home/juanda/Proyectofinal/dist/assets/*.js | awk '{print $5, $9}'
```

This shows file sizes of JS chunks.

- [ ] **Step 3: Compare against initial analysis**

Expected improvements:
- Removed unused deps: ~600KB gzipped (MUI + dependencies + @anthropic-ai/sdk + others)
- Removed duplicate motion: ~35KB gzipped
- Code splitting: Main bundle reduced, lazy chunks for large pages loaded on demand

Total expected reduction: ~30-40% for initial bundle size

- [ ] **Step 4: Document results**

Create a file `/home/juanda/Proyectofinal/docs/BUNDLE_OPTIMIZATION_RESULTS.md`:

```markdown
# Bundle Optimization Results

## Date: 2026-05-18

### Changes Applied
1. Removed MUI ecosystem (@mui/material, @emotion/react, @emotion/styled)
2. Removed unused: @anthropic-ai/sdk, react-slick, next-themes, @popperjs/core, react-popper, @hello-pangea/dnd
3. Removed duplicate motion library (kept framer-motion)
4. Implemented code splitting via React.lazy() for large page components

### Bundle Size Impact
- Before optimization: [record from initial build]
- After optimization: [record from final build]
- Reduction: [percentage]

### Key Wins
- Eliminated unused UI system duplicate (~350KB)
- Removed unused dependencies (~150KB)
- Large pages now load on demand via code splitting

### Remaining Opportunities
- Further split large components (UsuariosPage, TasksPage > 1000 lines each)
- Consider virtual scrolling for large lists
- Profile image loading in lazy components
```

- [ ] **Step 5: Commit results documentation**

```bash
git add docs/BUNDLE_OPTIMIZATION_RESULTS.md
git commit -m "docs: record bundle optimization results and improvements"
```

---

## Summary of Changes

| Phase | Action | Est. Savings | Files Modified |
|-------|--------|-------------|-----------------|
| 1 | Remove MUI + Emotion | ~400KB | package.json |
| 2 | Remove duplicate motion | ~35KB | package.json |
| 3 | Unused deps (7 packages) | ~150KB | package.json |
| 4 | Code splitting | ~200KB (main) | src/app/routes.ts, layout |
| **Total** | | **~785KB** | **5 files** |

---

## Testing Checklist

- [ ] TypeScript compilation passes: `npm run typecheck`
- [ ] Dev server starts: `npm run dev`
- [ ] All routes load without errors
- [ ] Lazy-loaded pages show loading state briefly
- [ ] Production build succeeds: `npm run build`
- [ ] No console errors in browser DevTools
- [ ] E2E tests pass (if configured): `npm run test:e2e`

---

## Next Steps After Completion

1. Monitor Core Web Vitals (LCP, FID) in production
2. Set up bundle size monitoring in CI/CD
3. Consider further optimizations:
   - Image optimization for hero sections
   - Virtual scrolling for data-heavy tables
   - Splitting AppContext into smaller stores by domain
