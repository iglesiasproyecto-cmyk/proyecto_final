# Global Ministerios Management — Design Spec

**Date:** 2026-05-16  
**Scope:** Super admin can view and manage all ministries from all churches and sedes in a single global page.

---

## 1. Goal

Add a `/app/global/ministerios` route accessible only to `super_admin` that shows all ministerios across all iglesias and sedes, grouped by iglesia, with full CRUD.

The existing tenant route `/app/:idIglesia/ministerios` is not modified.

---

## 2. Architecture

### New files
- `src/app/components/GlobalMinisteriosPage.tsx` — new page component

### Modified files
| File | Change |
|---|---|
| `src/services/ministerios.service.ts` | Extend `getMinisteriosEnriquecidos(idIglesia?)` for global mode; add `iglesiaId` and `iglesiaNombre` to `MinisterioEnriquecido` type |
| `src/hooks/useMinisterios.ts` | Ensure `useMinisteriosEnriquecidos()` without param uses a distinct query key (`['ministerios', 'global']`) |
| `src/app/routes.ts` | Add `{ path: "ministerios", Component: GlobalMinisteriosPage }` under `/app/global/` children |
| `src/app/components/AppLayout.tsx` | Add "Ministerios" nav item to `super_admin` nav list |

---

## 3. Data Layer

### Type extension
```typescript
// ministerios.service.ts
export interface MinisterioEnriquecido {
  // ...existing fields...
  iglesiaId?: number      // new — populated only in global mode
  iglesiaNombre?: string  // new — populated only in global mode
}
```

### Service bifurcation
`getMinisteriosEnriquecidos(idIglesia?: number)`:
- **With `idIglesia`** (tenant mode): behavior unchanged — queries sedes for that iglesia, then ministerios by those sedes. Does NOT populate `iglesiaId` / `iglesiaNombre`.
- **Without `idIglesia`** (global mode): queries ALL sedes with a JOIN to `iglesia` table to get `id_iglesia` and `iglesia.nombre`. Then runs the same enrichment pipeline (leader name, member count). Populates `iglesiaId` and `iglesiaNombre` on every result.

### Hook query key
`useMinisteriosEnriquecidos()` without param must use query key `['ministerios-enriquecidos', 'global']` (not `['ministerios-enriquecidos', undefined]`) to avoid collisions with tenant queries.

---

## 4. UI Design

### Layout
```
┌─ Ministerios ──────────────────────────── [+ Nuevo Ministerio] ─┐
│  🔍 Buscar ministerio...          [Todos] [Activo] [Inactivo]    │
├──────────────────────────────────────────────────────────────────┤
│  ▼  Iglesia Central  · 3 ministerios                             │
│     [Card] Alabanza   Sede Norte   · 12 miembros  · Activo       │
│     [Card] Jóvenes    Sede Sur     · 8 miembros   · Activo       │
│     [Card] Damas      Sede Central · 5 miembros   · Inactivo     │
│                                                                  │
│  ▼  Iglesia El Shaddai  · 2 ministerios                          │
│     [Card] Intercesión  Sede Principal · 20 miembros · Activo    │
│     [Card] Niños        Sede B         · 15 miembros · Activo    │
└──────────────────────────────────────────────────────────────────┘
```

### Cards
Reuse visual design from `MinisteriosPage`. Add a **sede badge** below the ministerio name. Cards show: icon, nombre, sede badge, líder, miembros count, estado badge, action buttons (toggle estado, delete) for super_admin.

### Search & Filters
- Search bar: real-time filter across all groups by ministerio name
- Estado filter chips: Todos / Activo / Inactivo / Suspendido
- Groups with 0 matching results are hidden entirely
- Collapsible sections: click on iglesia header to collapse/expand

### Navigation item
In `AppLayout.tsx`, `super_admin` nav:
```
{ label: "Ministerios", path: "/app/global/ministerios", icon: <Settings2>, section: "Gestión Global" }
```

---

## 5. Detail View

Clicking a card opens a **Sheet** (right side panel) instead of replacing the list inline (which is what the tenant view does). This keeps the super admin on the global list.

Sheet content mirrors the existing `MinisterioDetail` sub-component:
- **Miembros tab**: active members list + "Agregar Miembro" button
- **Config tab**: ministerio name, description, sede, leader, estado

All mutations (toggle estado, delete ministerio, add/remove member) use the existing hooks — no new mutation logic needed.

---

## 6. Create Dialog

Two-step dialog:

**Step 1 — Select context:**
- Dropdown: iglesia (all active iglesias)
- Dropdown: sede (filtered to the selected iglesia's sedes, loaded reactively)

**Step 2 — Ministerio data:**
- Campo: nombre (required)
- Campo: descripción (optional)
- Derived: `id_sede` from step 1

Uses existing `useCreateMinisterio()` hook. On success, invalidates `['ministerios-enriquecidos', 'global']` query.

---

## 7. Permissions

| Action | Allowed for |
|---|---|
| View global ministerios page | `super_admin` only (GlobalLayout guard already enforces this) |
| Create ministerio | `super_admin` |
| Toggle estado | `super_admin` |
| Delete ministerio | `super_admin` |
| Add/remove members | `super_admin` |
| View member detail | `super_admin` |

No changes to existing permission logic for non-super_admin roles.

---

## 8. Out of Scope

- Editing ministerio name/description (Config tab remains read-only, matching existing tenant behavior)
- Bulk operations across multiple ministerios
- Ministerio analytics/reporting
- Changes to tenant `/app/:idIglesia/ministerios` route
