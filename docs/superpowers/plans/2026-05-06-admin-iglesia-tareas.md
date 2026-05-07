# Admin Iglesia Tareas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two dead-code / missing-import issues in `TasksPage.tsx` — all spec features were already implemented in commit `811d80b`.

**Architecture:** All spec requirements (ministerio filter, edit mode, cancel action, ministerio badge on cards, iglesia-scoped user list, useTareasEnriquecidas idIglesia param) are already live in the codebase. Only TypeScript hygiene remains.

**Tech Stack:** React 18, TypeScript, `src/services/eventos.service.ts` (exports `TareaEnriquecida`)

---

### Context: What is already done

The following spec requirements are fully implemented (verified by reading current code):

| Requirement | Location | Status |
|---|---|---|
| `useTareasEnriquecidas(undefined, idIglesiaNum)` | `TasksPage.tsx:44` | ✅ Done |
| `ministerioFilter` dropdown | `TasksPage.tsx:319–330` | ✅ Done |
| `ministerioNombre` badge on kanban cards | `TasksPage.tsx:391–395` | ✅ Done |
| Edit mode (title, description, date, priority) | `TasksPage.tsx:494–536` | ✅ Done |
| Save / Cancel edición buttons | `TasksPage.tsx:673–698` | ✅ Done |
| "Cancelar Tarea" button with confirm | `TasksPage.tsx:702–715` | ✅ Done |
| `usuariosDeIglesia` from ministeriosEnriquecidos | `TasksPage.tsx:74–81` | ✅ Done |
| No `enabled: !!idEvento` bug in hook | `useEventos.ts:113–119` | ✅ Done |
| `getTareasEnriquecidas(idEvento?, idIglesia?)` | `eventos.service.ts:252` | ✅ Done |
| `ministerioNombre` in `TareaEnriquecida` | `eventos.service.ts:225–231` | ✅ Done |

---

### Task 1: Fix imports in TasksPage.tsx

**Files:**
- Modify: `src/app/components/TasksPage.tsx:1-10`

Two problems:
1. `TareaEnriquecida` is used as a type on line 68 (`prioridad: "media" as TareaEnriquecida['prioridad']`) but is never imported — TypeScript error.
2. `useUsuarios` is imported on line 4 but is never used — dead import.

- [ ] **Step 1: Remove `useUsuarios` import and add `TareaEnriquecida` import**

Replace line 4 (the `useUsuarios` import) and add the `TareaEnriquecida` named import from `@/services/eventos.service`.

Current lines 1–5:
```typescript
import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router";
import { useTareasEnriquecidas, useCreateTarea, useUpdateTarea, useUpdateTareaEstado, useDeleteTarea, useCreateTareaAsignada, useDeleteTareaAsignada, useTareaEvidencias, useCreateTareaEvidencia } from "@/hooks/useEventos";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useMinisteriosEnriquecidos } from "@/hooks/useMinisterios";
```

Replace with:
```typescript
import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router";
import { useTareasEnriquecidas, useCreateTarea, useUpdateTarea, useUpdateTareaEstado, useDeleteTarea, useCreateTareaAsignada, useDeleteTareaAsignada, useTareaEvidencias, useCreateTareaEvidencia } from "@/hooks/useEventos";
import type { TareaEnriquecida } from "@/services/eventos.service";
import { useMinisteriosEnriquecidos } from "@/hooks/useMinisterios";
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/TasksPage.tsx
git commit -m "fix(tasks): import TareaEnriquecida type, remove unused useUsuarios import"
```
