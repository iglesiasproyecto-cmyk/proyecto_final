# Finanzas Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all finance screens usable and visually stable on mobile, tablet, and desktop.

**Architecture:** Keep existing event finance logic intact and adjust only responsive layout classes in `EventoPresupuestoDrawer.tsx` and the `FinanzasTab` section of `EventsPage.tsx`. Avoid new dependencies and avoid extracting new components unless the existing files become harder to read.

**Tech Stack:** React 18, Vite, Tailwind CSS v4 utilities, shadcn/Radix `Sheet`, `Tabs`, `Dialog`, existing motion components.

---

## File Structure

- Modify `src/app/components/EventoPresupuestoDrawer.tsx`: responsive sheet width, item cards, tabs, totals, add/edit dialog layout.
- Modify `src/app/components/EventsPage.tsx`: responsive `FinanzasTab` banner, KPI grid, filters, event list cards.
- Verify with `npx vite build --debug` because this environment has shown `npm run build` can hang while direct Vite exits correctly.

## Task 1: Make Budget Drawer Full-Width On Mobile

**Files:**
- Modify: `src/app/components/EventoPresupuestoDrawer.tsx:221-259`

- [ ] **Step 1: Update sheet container classes**

Replace the `SheetContent` class at line 222 with:

```tsx
<SheetContent className="w-screen max-w-none sm:w-[440px] sm:max-w-[440px] h-dvh sm:h-auto bg-card/95 backdrop-blur-2xl border-border/50 overflow-y-auto px-4 sm:px-6 pb-6">
```

- [ ] **Step 2: Make header wrap safely**

Replace the header flex wrapper at line 224 with:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
```

Replace the title container at line 225 with:

```tsx
<div className="min-w-0 flex-1">
```

Replace the balance card at line 229 with:

```tsx
<div className={`w-full sm:w-auto rounded-xl px-3 py-2 text-left sm:text-right border ${balanceNeto >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
```

- [ ] **Step 3: Run quick build check**

Run: `npx vite build --debug`

Expected: command exits successfully.

## Task 2: Make Budget Items Responsive

**Files:**
- Modify: `src/app/components/EventoPresupuestoDrawer.tsx:44-78`

- [ ] **Step 1: Improve item card spacing and action targets**

In `ItemRow`, replace the root card with:

```tsx
<div className="bg-card/40 border border-border/50 rounded-xl p-3 sm:p-4 space-y-3">
```

Replace the header wrapper with:

```tsx
<div className="flex items-start justify-between gap-3">
```

Replace the title container with:

```tsx
<div className="min-w-0 flex-1">
```

Replace both action button classes with:

```tsx
className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
```

For delete, keep `hover:text-destructive` instead of `hover:text-foreground`:

```tsx
className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
```

- [ ] **Step 2: Make money cells stack on small screens**

Replace the amount grid at line 59 with:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
```

Replace each amount cell class with:

```tsx
className="bg-background/50 rounded-lg p-2.5 min-w-0"
```

Replace money `<p>` value classes with `break-words` included, for example:

```tsx
<p className="font-semibold break-words">{fmt(item.montoPlaneado)}</p>
```

- [ ] **Step 3: Run quick build check**

Run: `npx vite build --debug`

Expected: command exits successfully.

## Task 3: Improve Tabs, Totals, And Add Item Area

**Files:**
- Modify: `src/app/components/EventoPresupuestoDrawer.tsx:112-135,239-247,262-327`

- [ ] **Step 1: Increase add button touch area**

Replace the add button class with:

```tsx
className="w-full min-h-11 border border-dashed border-primary/40 rounded-xl p-3 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
```

- [ ] **Step 2: Make totals rows wrap safely**

Replace the totals wrapper with:

```tsx
<div className="bg-card/30 border border-border/50 rounded-xl p-3 space-y-2 text-sm">
```

Replace each total row with this pattern:

```tsx
<div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
```

Use `break-words text-left sm:text-right` on the value spans.

- [ ] **Step 3: Make tabs more touch-friendly**

Replace `TabsList` class with:

```tsx
className="w-full bg-card/40 border border-border/50 p-1 rounded-xl mb-4 h-auto"
```

Replace both `TabsTrigger` classes with:

```tsx
className="flex-1 min-h-10 rounded-lg text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
```

For egreso keep `data-[state=active]:bg-rose-600`.

- [ ] **Step 4: Make add/edit dialog usable on mobile**

Replace `DialogContent` class with:

```tsx
className="w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl bg-card/95 backdrop-blur-2xl border-white/10"
```

Replace the amount inputs grid with:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

Replace `DialogFooter` with:

```tsx
<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
```

Set both footer buttons to `className="w-full sm:w-auto rounded-xl"`, preserving `bg-primary` on save.

- [ ] **Step 5: Run quick build check**

Run: `npx vite build --debug`

Expected: command exits successfully.

## Task 4: Improve Finanzas Tab Layout

**Files:**
- Modify: `src/app/components/EventsPage.tsx:410-607`

- [ ] **Step 1: Make role banner responsive**

Replace the banner class with:

```tsx
className={`relative overflow-hidden flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 px-4 py-3 rounded-2xl border ${roleBanner.color}`}
```

Replace the badge class at line 423 with:

```tsx
className="relative z-10 text-[10px] font-semibold px-2 py-1 rounded-lg bg-primary/15 text-primary border border-primary/25 sm:ml-auto self-start sm:self-auto"
```

- [ ] **Step 2: Make KPI text robust on narrow screens**

In KPI card value `<p>` elements, add `break-words` and mobile size:

```tsx
className="text-xl sm:text-2xl font-bold text-primary leading-tight tracking-tight break-words"
```

Apply the same pattern to egresos, balance and coverage values with their existing color classes preserved.

- [ ] **Step 3: Make filters full-width on mobile**

Replace the filters container with:

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center rounded-xl border border-border/50 bg-card/40 px-2.5 py-2">
```

Replace filter `SelectTrigger` widths with:

```tsx
className="h-9 bg-background/60 border-border/60 rounded-xl text-xs w-full sm:w-44"
```

For month select use `sm:w-32`.

- [ ] **Step 4: Make event rows become cards on mobile**

Replace event row class at line 547 with:

```tsx
className="group bg-card/50 border border-border/50 rounded-2xl px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 cursor-pointer hover:border-primary/50 hover:bg-card transition-all duration-200"
```

Replace the meta row class at line 552 with:

```tsx
className="flex flex-wrap items-center gap-2"
```

Replace right-side wrapper at line 583 with:

```tsx
className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end"
```

Replace balance pill class with:

```tsx
className={`min-w-0 flex-1 sm:flex-none text-left sm:text-right px-3 py-1.5 rounded-xl border text-sm font-bold tracking-tight break-words ${r.balanceNeto >= 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-[var(--color-chart-5)]/20 border-[var(--color-chart-5)]/30 text-[var(--color-chart-3)]'}`}
```

- [ ] **Step 5: Run quick build check**

Run: `npx vite build --debug`

Expected: command exits successfully.

## Task 5: Final Verification

**Files:**
- Verify: `src/app/components/EventoPresupuestoDrawer.tsx`
- Verify: `src/app/components/EventsPage.tsx`

- [ ] **Step 1: Build**

Run: `npx vite build --debug`

Expected: exits successfully.

- [ ] **Step 2: Manual responsive smoke test**

Run: `npm run dev`

Open the finance tab and drawer at these widths:

```text
360px: drawer uses full screen width, no horizontal overflow, item values stack.
768px: drawer remains readable, cards use two-column/grid behavior where appropriate.
Desktop: drawer remains side panel, finance event rows remain compact.
```

- [ ] **Step 3: Review diff**

Run: `git diff -- src/app/components/EventoPresupuestoDrawer.tsx src/app/components/EventsPage.tsx`

Expected: only responsive class/layout changes, no budget calculation or Supabase query changes.

- [ ] **Step 4: Commit only if explicitly requested**

Do not commit unless the user asks for a commit.
