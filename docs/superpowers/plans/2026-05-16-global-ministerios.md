# Global Ministerios Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/app/global/ministerios` so super_admin can view and manage all ministries from all churches and sedes in a single grouped page.

**Architecture:** Extend `getMinisteriosEnriquecidos()` to JOIN iglesia data when called without `idIglesia`. Extract `MinisterioDetail` to a shared `MinisterioDetailPanel` component. Build `GlobalMinisteriosPage` with groups-by-iglesia, search/filter, Sheet detail, and a 2-step create dialog.

**Tech Stack:** React 18, Supabase JS, TanStack Query, shadcn/ui (Sheet, Dialog, Badge), Framer Motion, Lucide icons, Tailwind CSS v4.

---

### Task 1: Extend service — add iglesia data to `MinisterioEnriquecido`

**Files:**
- Modify: `src/services/ministerios.service.ts`

- [ ] **Step 1: Update `MinisterioEnriquecido` interface** — add two optional fields after `liderNombre`

```typescript
export interface MinisterioEnriquecido extends Ministerio {
  cantidadMiembros: number
  sedeNombre: string
  liderNombre: string
  iglesiaId?: number
  iglesiaNombre?: string
}
```

- [ ] **Step 2: Update `MinisterioEnriquecidoRow` type** — extend sede to include iglesia join

Replace:
```typescript
type MinisterioEnriquecidoRow = MinisterioRow & {
  sede: { nombre: string | null } | null
  miembro_ministerio: MinisterioMiembroRelacion[] | null
}
```
With:
```typescript
type MinisterioEnriquecidoRow = MinisterioRow & {
  sede: {
    nombre: string | null
    id_iglesia: number | null
    iglesia: { id_iglesia: number | null; nombre: string | null } | null
  } | null
  miembro_ministerio: MinisterioMiembroRelacion[] | null
}
```

- [ ] **Step 3: Update `mapMinisterioEnriquecidoRow`** — populate `iglesiaId` and `iglesiaNombre`

Replace the return statement in `mapMinisterioEnriquecidoRow`:
```typescript
  return {
    ...mapMinisterio(r),
    cantidadMiembros: miembrosActivos.length,
    sedeNombre: r.sede?.nombre ?? '',
    liderNombre: lider?.usuario
      ? `${lider.usuario.nombres ?? ''} ${lider.usuario.apellidos ?? ''}`.trim()
      : '',
    iglesiaId: r.sede?.id_iglesia ?? undefined,
    iglesiaNombre: r.sede?.iglesia?.nombre ?? undefined,
  }
```

- [ ] **Step 4: Update the `.select()` call in `getMinisteriosEnriquecidos`** — include iglesia join

Replace:
```typescript
    .select('*, sede(nombre), miembro_ministerio(rol_en_ministerio, fecha_salida, usuario(nombres, apellidos))')
```
With:
```typescript
    .select('*, sede(nombre, id_iglesia, iglesia(id_iglesia, nombre)), miembro_ministerio(rol_en_ministerio, fecha_salida, usuario(nombres, apellidos))')
```

- [ ] **Step 5: Start dev server and verify tenant ministerios page still loads**

```bash
npm run dev
```
Navigate to `/app/:idIglesia/ministerios` — cards should load normally, no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/ministerios.service.ts
git commit -m "feat(ministerios): add iglesiaId/iglesiaNombre to MinisterioEnriquecido via iglesia join"
```

---

### Task 2: Add `useMinisteriosGlobal` hook

**Files:**
- Modify: `src/hooks/useMinisterios.ts`

- [ ] **Step 1: Add `useMinisteriosGlobal` after `useMinisteriosEnriquecidos`**

```typescript
export function useMinisteriosGlobal() {
  return useQuery({
    queryKey: ['ministerios-enriquecidos', 'global'],
    queryFn: () => getMinisteriosEnriquecidos(),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMinisterios.ts
git commit -m "feat(ministerios): add useMinisteriosGlobal hook with isolated query key"
```

---

### Task 3: Extract `MinisterioDetailPanel` shared component

**Files:**
- Create: `src/app/components/MinisterioDetailPanel.tsx`
- Modify: `src/app/components/MinisteriosPage.tsx` (remove inline definition, add import)

- [ ] **Step 1: Create `src/app/components/MinisterioDetailPanel.tsx`** with the extracted component

```typescript
import { useState } from "react";
import {
  useMiembrosMinisterioEnriquecidos, useCreateMiembroMinisterio,
} from "@/hooks/useMinisterios";
import { useCanManageMinisterio } from "@/hooks/useMinisterioRole";
import { useUsuariosEnriquecidos } from "@/hooks/useUsuarios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { MinisterioEnriquecido } from "@/services/ministerios.service";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Users, Plus, UserCog, UsersRound } from "lucide-react";
import { toast } from "sonner";

const rolLabels: Record<string, string> = { lider: "Líder", servidor: "Servidor" };
const rolColors: Record<string, string> = {
  lider: "bg-indigo-100 text-indigo-700",
  servidor: "bg-gray-100 text-gray-700",
};

function normalizeRol(rol?: string | null) {
  const normalized = `${rol ?? ""}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (normalized.includes('lider')) return 'lider'
  return 'servidor'
}

export function MinisterioDetailPanel({
  min,
  onBack,
}: {
  min: MinisterioEnriquecido
  onBack: () => void
}) {
  const { data: minMembers = [] } = useMiembrosMinisterioEnriquecidos(min.idMinisterio);
  const { data: allUsers = [] } = useUsuariosEnriquecidos();
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ idUsuario: "", rolEnMinisterio: "servidor" });
  const createMemberMutation = useCreateMiembroMinisterio();
  const canManageMembers = useCanManageMinisterio(min.idMinisterio);

  const availableUsers = allUsers.filter(
    (user) => !minMembers.some((member) => member.idUsuario === user.idUsuario)
  );

  const handleAddMember = () => {
    if (!memberForm.idUsuario) { toast.error('Por favor selecciona un usuario'); return; }
    createMemberMutation.mutate(
      {
        idUsuario: parseInt(memberForm.idUsuario),
        idMinisterio: min.idMinisterio,
        rolEnMinisterio: memberForm.rolEnMinisterio,
        fechaIngreso: new Date().toISOString().split('T')[0],
      },
      {
        onSuccess: () => {
          toast.success('Miembro agregado exitosamente');
          setShowAddMember(false);
          setMemberForm({ idUsuario: "", rolEnMinisterio: "servidor" });
        },
        onError: (error: any) => toast.error(`Error al agregar miembro: ${error.message}`),
      }
    );
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto motion-preset-fade px-4 md:px-0">
      <div className="bg-card/40 backdrop-blur-xl border border-border/50 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-background/50 border border-white/5 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors hover:-translate-x-1 shrink-0"
          >
            &larr;
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none mb-1">{min.nombre}</h1>
              <p className="text-muted-foreground text-xs hidden sm:block">{min.descripcion}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge
            variant={min.estado === "activo" ? "default" : "secondary"}
            className={`px-2 sm:px-3 py-1 text-[10px] uppercase font-bold tracking-widest ${min.estado === 'activo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' : ''}`}
          >
            {min.estado === "activo" ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="miembros" className="w-full">
        <TabsList className="bg-card/40 backdrop-blur-md border border-border/50 p-1 rounded-xl mb-4 w-fit mx-auto sm:mx-0 flex">
          <TabsTrigger value="miembros" className="rounded-lg text-xs font-medium px-3 sm:px-4">
            <UsersRound className="w-4 h-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Directorio</span>
            <span className="sm:hidden">Team</span> ({minMembers.length})
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-lg text-xs font-medium px-3 sm:px-4">
            <UserCog className="w-4 h-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="miembros" className="outline-none">
          <Card className="bg-card/40 backdrop-blur-xl border border-border/50 p-0 overflow-hidden shadow-sm rounded-2xl">
            <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/20">
              <div>
                <h3 className="font-bold text-sm">Equipo Ministerial</h3>
                <p className="text-xs text-muted-foreground">Gestiona los servidores y líderes asignados a esta área.</p>
              </div>
              {canManageMembers && (
                <Button size="sm" className="h-9 rounded-xl text-xs transition-colors shadow-sm" onClick={() => setShowAddMember(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Miembro
                </Button>
              )}
            </div>
            <div className="divide-y divide-border/30">
              {minMembers.map((mm) => (
                <div key={mm.idMiembroMinisterio} className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#709dbd]/10 to-[#4682b4]/5 flex items-center justify-center text-primary text-xs font-bold ring-2 ring-background shadow-inner">
                      {(mm.nombreCompleto || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{mm.nombreCompleto}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{mm.correo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0 justify-end">
                    <Badge variant="outline" className={`${rolColors[normalizeRol(mm.rolEnMinisterio)]} border-white/10 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5`}>
                      {rolLabels[normalizeRol(mm.rolEnMinisterio)] || mm.rolEnMinisterio}
                    </Badge>
                    <Badge
                      variant={mm.activo ? "secondary" : "outline"}
                      className={`text-[10px] ${mm.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' : 'bg-background/50 border-white/5'}`}
                    >
                      {mm.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              ))}
              {minMembers.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-3">
                    <UsersRound className="w-6 h-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Ministerio sin equipo</p>
                  <p className="text-xs">Usa el botón superior para añadir personas.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="outline-none">
          <Card className="bg-card/40 backdrop-blur-xl border-white/10 p-6 shadow-sm rounded-2xl max-w-2xl">
            <div className="space-y-5">
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Nombre del Ministerio</label>
                <Input value={min.nombre} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" readOnly />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Descripción del Propósito</label>
                <Input value={min.descripcion || ""} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" readOnly />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Líder Asignado</label>
                  <Input value={min.liderNombre || "No asignado"} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" readOnly />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Estado del Ministerio</label>
                  <Input value={min.estado} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm capitalize" readOnly />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {canManageMembers && (
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                Agregar Miembro
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Agregar un nuevo servidor al ministerio {min.nombre}</p>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Seleccionar Usuario</label>
                <Select value={memberForm.idUsuario} onValueChange={(v) => setMemberForm(p => ({ ...p, idUsuario: v }))}>
                  <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.idUsuario} value={user.idUsuario.toString()}>
                        {user.nombres} {user.apellidos} ({user.correo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Rol en el Ministerio</label>
                <Select value={memberForm.rolEnMinisterio} onValueChange={(v) => setMemberForm(p => ({ ...p, rolEnMinisterio: v }))}>
                  <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servidor">Servidor</SelectItem>
                    <SelectItem value="lider">Líder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-2 border-t border-border/50 pt-4">
              <Button variant="ghost" className="rounded-xl" onClick={() => { setShowAddMember(false); setMemberForm({ idUsuario: "", rolEnMinisterio: "servidor" }); }}>
                Cancelar
              </Button>
              <Button
                variant="default"
                className="rounded-xl"
                onClick={handleAddMember}
                disabled={!memberForm.idUsuario || createMemberMutation.isPending}
              >
                {createMemberMutation.isPending ? "Agregando..." : "Agregar Miembro"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `MinisteriosPage.tsx`** — remove inline `MinisterioDetail` function and import from panel

At the top of `MinisteriosPage.tsx`, replace the import block to add `MinisterioDetailPanel`:
```typescript
import { MinisterioDetailPanel } from "./MinisterioDetailPanel";
```

Remove the entire `function MinisterioDetail(...)` definition (lines 35–243).

Replace the usage inside `MinisteriosPage` (the render that returns `<MinisterioDetail ...>`):
```typescript
  if (selectedMin && min) {
    return <MinisterioDetailPanel min={min} onBack={() => setSelectedMin(null)} />;
  }
```

Also remove these now-unused imports from MinisteriosPage (they moved to MinisterioDetailPanel):
```
useMiembrosMinisterioEnriquecidos, useCreateMiembroMinisterio
useCanManageMinisterio (keep it — MinisteriosPage still uses it for the list)
useUsuariosEnriquecidos
```
Keep `useCanManageMinisterio` — it's still used in MinisteriosPage for the card actions and create button.
Remove: `useMiembrosMinisterioEnriquecidos`, `useCreateMiembroMinisterio`, `useUsuariosEnriquecidos`.
Remove from lucide imports: `UserCog`, `UsersRound` (only if not referenced elsewhere in MinisteriosPage).

- [ ] **Step 3: Verify tenant ministerios page still works**

```bash
npm run dev
```
Navigate to `/app/:idIglesia/ministerios`. Click a card — detail panel should open exactly as before.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/MinisterioDetailPanel.tsx src/app/components/MinisteriosPage.tsx
git commit -m "refactor(ministerios): extract MinisterioDetailPanel as shared component"
```

---

### Task 4: Create `GlobalMinisteriosPage`

**Files:**
- Create: `src/app/components/GlobalMinisteriosPage.tsx`

- [ ] **Step 1: Create the file with the full component**

```typescript
import { useState, useMemo } from "react";
import {
  useMinisteriosGlobal,
  useToggleMinisterioEstado,
  useDeleteMinisterio,
  useCreateMinisterio,
} from "@/hooks/useMinisterios";
import { useIglesias, useSedes } from "@/hooks/useIglesias";
import { MinisterioDetailPanel } from "./MinisterioDetailPanel";
import type { MinisterioEnriquecido } from "@/services/ministerios.service";
import type { Iglesia } from "@/types/app.types";
import { Sheet, SheetContent } from "./ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings2, Search, Plus, Building2, ChevronDown,
  Users, UserCog, UsersRound, Power, PowerOff, Trash2,
} from "lucide-react";
import { toast } from "sonner";

type EstadoFilter = "all" | "activo" | "inactivo" | "suspendido";

// ── Create dialog ──────────────────────────────────────────────────────────

function CreateMinisterioDialog({
  open,
  onClose,
  iglesias,
}: {
  open: boolean;
  onClose: () => void;
  iglesias: Iglesia[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ iglesiaId: "", sedeId: "", nombre: "", descripcion: "" });
  const { data: sedes = [] } = useSedes(form.iglesiaId ? Number(form.iglesiaId) : undefined);
  const createMutation = useCreateMinisterio();

  const reset = () => {
    setStep(1);
    setForm({ iglesiaId: "", sedeId: "", nombre: "", descripcion: "" });
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.sedeId) {
      toast.error("Completa nombre y sede");
      return;
    }
    createMutation.mutate(
      { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, idSede: Number(form.sedeId), estado: "activo" },
      {
        onSuccess: () => { toast.success("Ministerio creado exitosamente"); handleClose(); },
        onError: (e: any) => toast.error(`Error al crear: ${e.message}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Nuevo Ministerio
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Paso {step} de 2 — {step === 1 ? "Selecciona iglesia" : "Datos del ministerio"}
          </p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Iglesia</label>
              <Select value={form.iglesiaId} onValueChange={(v) => setForm(p => ({ ...p, iglesiaId: v, sedeId: "" }))}>
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona una iglesia" />
                </SelectTrigger>
                <SelectContent>
                  {iglesias.map((ig) => (
                    <SelectItem key={ig.idIglesia} value={ig.idIglesia.toString()}>{ig.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Sede</label>
              <Select value={form.sedeId} onValueChange={(v) => setForm(p => ({ ...p, sedeId: v }))}>
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((s) => (
                    <SelectItem key={s.idSede} value={s.idSede.toString()}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Nombre del Ministerio</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej. Alabanza y Adoración"
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Descripción</label>
              <Input
                value={form.descripcion}
                onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Propósito y enfoque del ministerio"
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-2 border-t border-border/50 pt-4">
          <Button variant="ghost" className="rounded-xl" onClick={step === 1 ? handleClose : () => setStep(1)}>
            {step === 1 ? "Cancelar" : "Atrás"}
          </Button>
          {step === 1 ? (
            <Button className="rounded-xl" onClick={() => setStep(2)} disabled={!form.iglesiaId}>
              Siguiente
            </Button>
          ) : (
            <Button
              className="rounded-xl"
              onClick={handleSubmit}
              disabled={!form.nombre.trim() || !form.sedeId || createMutation.isPending}
            >
              {createMutation.isPending ? "Creando..." : "Crear Ministerio"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Ministerio card ─────────────────────────────────────────────────────────

function MinisterioCard({
  m,
  onSelect,
  onToggle,
  onDelete,
  togglePending,
  deletePending,
}: {
  m: MinisterioEnriquecido;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  togglePending: boolean;
  deletePending: boolean;
}) {
  return (
    <Card
      className={`group relative p-4 h-full bg-card/40 backdrop-blur-xl border border-border/50 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl flex flex-col justify-between overflow-hidden ${m.estado !== "activo" ? "opacity-70 grayscale-[20%]" : ""}`}
      onClick={onSelect}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <Badge
            variant={m.estado === "activo" ? "default" : "secondary"}
            className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 ${m.estado === 'activo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' : ''}`}
          >
            {m.estado}
          </Badge>
        </div>

        <div className="relative z-10">
          <h3 className="font-bold text-[15px] tracking-tight mb-0.5 group-hover:text-primary transition-colors leading-tight">{m.nombre}</h3>
          {m.sedeNombre && (
            <p className="text-[10px] text-primary/70 font-semibold uppercase tracking-wider mb-1">{m.sedeNombre}</p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-[34px]">{m.descripcion || "Sin descripción asignada."}</p>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="w-6 h-6 rounded-full bg-accent/60 flex items-center justify-center shrink-0">
                <UserCog className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[11px] font-medium text-foreground/80 truncate">{m.liderNombre || "Sin líder asignado"}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-background/50 px-2 py-1 rounded-lg border border-white/5">
              <UsersRound className="w-3.5 h-3.5 text-primary/70" />
              <span className="text-[11px] font-bold text-foreground/80">{m.cantidadMiembros}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-3 flex gap-2 w-full pt-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-xl transition-all ${m.estado === "activo" ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}
          disabled={togglePending}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          {m.estado === "activo" ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/50 hover:bg-red-500/10 hover:text-red-500 border border-white/5 text-muted-foreground shrink-0"
          disabled={deletePending}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export function GlobalMinisteriosPage() {
  const { data: ministerios = [], isLoading } = useMinisteriosGlobal();
  const { data: iglesias = [] } = useIglesias();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("all");
  const [selectedMin, setSelectedMin] = useState<MinisterioEnriquecido | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

  const toggleMutation = useToggleMinisterioEstado();
  const deleteMutation = useDeleteMinisterio();

  const grouped = useMemo(() => {
    const filtered = ministerios.filter((m) => {
      const matchSearch = m.nombre.toLowerCase().includes(search.toLowerCase());
      const matchEstado = estadoFilter === "all" || m.estado === estadoFilter;
      return matchSearch && matchEstado;
    });
    const groups = new Map<number, { iglesiaNombre: string; items: MinisterioEnriquecido[] }>();
    filtered.forEach((m) => {
      const igId = m.iglesiaId ?? 0;
      if (!groups.has(igId)) groups.set(igId, { iglesiaNombre: m.iglesiaNombre ?? "Sin iglesia", items: [] });
      groups.get(igId)!.items.push(m);
    });
    return Array.from(groups.entries()).map(([iglesiaId, g]) => ({ iglesiaId, ...g }));
  }, [ministerios, search, estadoFilter]);

  const toggleGroup = (igId: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(igId)) next.delete(igId);
      else next.add(igId);
      return next;
    });
  };

  const handleDelete = (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar ministerio "${nombre}"? Esta acción no se puede deshacer.`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Ministerio "${nombre}" eliminado`),
      onError: (e: any) => toast.error(`Error: ${e.message}`),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-48 rounded-2xl" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const estadoFilters: { value: EstadoFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "activo", label: "Activo" },
    { value: "inactivo", label: "Inactivo" },
    { value: "suspendido", label: "Suspendido" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <Settings2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-1">Global</p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">
              Ministerios
            </h1>
            <p className="text-foreground/60 font-normal text-xs sm:text-sm mt-1">
              {ministerios.length} ministerios en {grouped.length} iglesias
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="w-full md:w-auto h-10 rounded-xl font-medium bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Ministerio
        </Button>
      </motion.div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 px-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar ministerio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm text-sm"
          />
        </div>
        <div className="flex gap-2">
          {estadoFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setEstadoFilter(f.value)}
              className={`px-3 h-10 rounded-xl text-xs font-bold border transition-all ${
                estadoFilter === f.value
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-background/60 border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped sections */}
      <div className="space-y-6 px-1">
        {grouped.map((group) => {
          const isCollapsed = collapsedGroups.has(group.iglesiaId);
          return (
            <div key={group.iglesiaId} className="space-y-3">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.iglesiaId)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/40 hover:border-primary/30 hover:bg-card/60 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <span className="flex-1 font-bold text-sm tracking-tight">{group.iglesiaNombre}</span>
                <Badge variant="secondary" className="text-[10px] font-bold px-2">
                  {group.items.length} ministerio{group.items.length !== 1 ? "s" : ""}
                </Badge>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isCollapsed ? "-rotate-90" : ""}`}
                />
              </button>

              {/* Cards */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
                      {group.items.map((m, i) => (
                        <motion.div
                          key={m.idMinisterio}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, ease: "easeOut" }}
                        >
                          <MinisterioCard
                            m={m}
                            onSelect={() => setSelectedMin(m)}
                            onToggle={() => toggleMutation.mutate(m.idMinisterio)}
                            onDelete={() => handleDelete(m.idMinisterio, m.nombre)}
                            togglePending={toggleMutation.isPending}
                            deletePending={deleteMutation.isPending}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {grouped.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 opacity-40" />
            </div>
            <p className="font-semibold text-sm">No se encontraron ministerios</p>
            <p className="text-xs">Prueba con otros términos de búsqueda o crea uno nuevo.</p>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedMin} onOpenChange={(open) => !open && setSelectedMin(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          {selectedMin && (
            <MinisterioDetailPanel min={selectedMin} onBack={() => setSelectedMin(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <CreateMinisterioDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        iglesias={iglesias}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify the file has no TypeScript errors**

```bash
npm run build 2>&1 | head -40
```
Expected: build succeeds or only pre-existing errors appear (no new errors from GlobalMinisteriosPage).

- [ ] **Step 3: Commit**

```bash
git add src/app/components/GlobalMinisteriosPage.tsx
git commit -m "feat(ministerios): add GlobalMinisteriosPage with iglesia groups, search, and Sheet detail"
```

---

### Task 5: Wire route and navigation

**Files:**
- Modify: `src/app/routes.ts`
- Modify: `src/app/components/AppLayout.tsx`

- [ ] **Step 1: Add import and route in `src/app/routes.ts`**

Add import after line 35 (after NoChurchAssignedPage import):
```typescript
import { GlobalMinisteriosPage } from "./components/GlobalMinisteriosPage";
```

Add route inside the `global` children array, after the `administrador` route:
```typescript
{ path: "ministerios", Component: GlobalMinisteriosPage, ErrorBoundary: ErrorPage },
```

- [ ] **Step 2: Add nav item in `src/app/components/AppLayout.tsx`**

In the `getNavItemsForRole` function, inside the `"super_admin"` case, add after the `"Administrador"` item:
```typescript
{ label: "Ministerios", path: "/app/global/ministerios", icon: <Settings2 className="w-5 h-5" />, section: "Gestión Global" },
```

`Settings2` is already imported in AppLayout — verify it's in the import list at the top. If not, add it to the lucide imports.

- [ ] **Step 3: Verify `Settings2` is already imported in AppLayout**

Check the import line at the top of `AppLayout.tsx`:
```typescript
import { ..., Settings2, ... } from "lucide-react";
```
If missing, add `Settings2` to that import.

- [ ] **Step 4: Start dev server and do full verification**

```bash
npm run dev
```

Check in browser:
1. Log in as `super_admin` (super@test.dev) — sidebar should show "Ministerios" under Gestión Global
2. Click "Ministerios" — `/app/global/ministerios` loads with grouped cards
3. Search filters cards across all groups
4. Estado filter chips (Todos/Activo/Inactivo) work
5. Click a group header — it collapses and expands
6. Click a card — Sheet slides in from the right with the detail panel
7. Click "Agregar Miembro" in the Sheet — dialog opens, user can be added
8. Click "Nuevo Ministerio" — 2-step dialog: iglesia selector, then sede + nombre + desc
9. Create a ministerio — it appears in the correct iglesia group
10. Toggle estado and delete from cards — mutations work
11. Navigate to a tenant `/app/:idIglesia/ministerios` as any user — still works correctly (no regression)

- [ ] **Step 5: Commit**

```bash
git add src/app/routes.ts src/app/components/AppLayout.tsx
git commit -m "feat(ministerios): wire /app/global/ministerios route and super_admin nav item"
```
