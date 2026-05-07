# Admin Iglesia — Aula de Formación Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `admin_iglesia` full academic management over their church's Aula de Formación — creating courses in any ministerio, managing modules/evaluations, tracking inscriptions and progress, and issuing certificates.

**Architecture:** New `AdminAulaPage` (routed from `AulaPage`) with a new `CursosAdminList` and `DashboardAdmin`. Existing `CrearCursoDialog` and `CursoDetallePage` receive minimal targeted changes. No DB migrations needed — RLS already covers `admin_iglesia`.

**Tech Stack:** React 18, Vite, Tailwind CSS v4, TanStack Query v5, Supabase JS v2, Framer Motion, shadcn/ui, React Router v7.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/app/components/AppLayout.tsx` | Add "Aula de Formación" to admin_iglesia sidebar |
| Modify | `src/app/components/AulaPage.tsx` | Route admin_iglesia → AdminAulaPage |
| Modify | `src/app/components/CursoDetallePage.tsx` | Let admin manage any course regardless of creator |
| Modify | `src/app/components/CrearCursoDialog.tsx` | Accept external `ministeriosDisponibles` prop |
| Create | `src/app/components/CursosAdminList.tsx` | Church-wide course list with filters |
| Create | `src/app/components/DashboardAdmin.tsx` | Church-wide academic stats |
| Create | `src/app/components/AdminAulaPage.tsx` | Top-level admin aula page |

---

## Task 1: Add "Aula de Formación" to admin_iglesia sidebar

**Files:**
- Modify: `src/app/components/AppLayout.tsx`

- [x] **Step 1: Locate the admin_iglesia nav items array**

Open `src/app/components/AppLayout.tsx`. Find the `case "admin_iglesia":` block (around line 71). The current items end with `"Tareas"` and then `"Notificaciones"`. Insert `"Aula de Formación"` between `"Tareas"` and `"Notificaciones"`:

```ts
{ label: "Tareas", path: "/app/tareas", icon: <ListTodo className="w-5 h-5" />, section: "Iglesia" },
{ label: "Aula de Formación", path: "/app/aula", icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
{ label: "Notificaciones", path: "/app/notificaciones", icon: <Bell className="w-5 h-5" />, section: "Personal" },
```

`BookOpen` is already imported in this file — no import change needed.

- [x] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ built in` with no TypeScript errors.

- [x] **Step 3: Commit**

```bash
git add src/app/components/AppLayout.tsx
git commit -m "feat: add Aula de Formación to admin_iglesia sidebar"
```

---

## Task 2: Route admin_iglesia to AdminAulaPage in AulaPage

**Files:**
- Modify: `src/app/components/AulaPage.tsx`

- [x] **Step 1: Add import for AdminAulaPage**

At the top of `src/app/components/AulaPage.tsx`, add:

```ts
import { AdminAulaPage } from './AdminAulaPage'
```

(This file doesn't exist yet — the import will cause a build error until Task 7. That's acceptable; build errors are resolved in order.)

- [x] **Step 2: Add the admin branch to the AnimatePresence render**

The current render (around line 62) is:
```tsx
key={rolActual === "lider" ? 'lider' : 'servidor'}
initial={{ opacity: 0, x: rolActual === "lider" ? 20 : -20 }}
...
{rolActual === "lider" ? <LiderAulaPage /> : <ServidorAulaPage />}
```

Replace the entire `<motion.div>` inside `<AnimatePresence mode="wait">` with:

```tsx
<motion.div
  key={
    rolActual === "admin_iglesia" || rolActual === "super_admin"
      ? 'admin'
      : rolActual === "lider"
      ? 'lider'
      : 'servidor'
  }
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ duration: 0.3 }}
>
  {rolActual === "admin_iglesia" || rolActual === "super_admin" ? (
    <AdminAulaPage />
  ) : rolActual === "lider" ? (
    <LiderAulaPage />
  ) : (
    <ServidorAulaPage />
  )}
</motion.div>
```

- [x] **Step 3: Commit (will have unresolved import — note in commit message)**

```bash
git add src/app/components/AulaPage.tsx
git commit -m "feat: route admin_iglesia to AdminAulaPage in AulaPage (wip: AdminAulaPage pending)"
```

---

## Task 3: CursoDetallePage — admin can manage any course

**Files:**
- Modify: `src/app/components/CursoDetallePage.tsx`

- [x] **Step 1: Extend the useAuth destructure to include rolActual**

Find this line (around line 9 in the file):
```ts
const { user } = useAuth()
```
Replace with:
```ts
const { user, rolActual } = useAuth()
```

- [x] **Step 2: Add isAdmin computed variable**

Find the `isLider` declaration (around line 86):
```ts
const isLider = internalUserId !== null && curso?.id_usuario_creador === internalUserId
```
Add right below it:
```ts
const isAdmin = rolActual === "admin_iglesia" || rolActual === "super_admin"
```

- [x] **Step 3: Update the access gate to include admin**

Find the `puedeAcceder` line (around line 127):
```ts
const puedeAcceder = isLider || isServidorInscrito
```
Replace with:
```ts
const puedeAcceder = isAdmin || isLider || isServidorInscrito
```

- [x] **Step 4: Replace all isLider UI guards with isLider || isAdmin**

There are three occurrences. Replace each:

**Occurrence 1** (around line 230) — "Agregar personas" button:
```tsx
// Before:
{isLider && (
  <Button onClick={() => setShowAgregarPersonas(true)} ...>

// After:
{(isLider || isAdmin) && (
  <Button onClick={() => setShowAgregarPersonas(true)} ...>
```

**Occurrence 2** (around line 326) — ModulosGestion vs ModulosNavegacion:
```tsx
// Before:
{isLider ? (
  <ModulosGestion ... />
) : (
  <ModulosNavegacion idCurso={parseInt(idCurso!)} />
)}

// After:
{(isLider || isAdmin) ? (
  <ModulosGestion ... />
) : (
  <ModulosNavegacion idCurso={parseInt(idCurso!)} />
)}
```

**Occurrence 3** (around line 346) — AgregarPersonasCursoDialog:
```tsx
// Before:
{isLider && idCurso && (
  <AgregarPersonasCursoDialog ...

// After:
{(isLider || isAdmin) && idCurso && (
  <AgregarPersonasCursoDialog ...
```

- [x] **Step 5: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ built in` (with one known import error for AdminAulaPage from Task 2 — that's acceptable until Task 7).

- [x] **Step 6: Commit**

```bash
git add src/app/components/CursoDetallePage.tsx
git commit -m "feat: allow admin_iglesia to manage any course in CursoDetallePage"
```

---

## Task 4: CrearCursoDialog — accept external ministeriosDisponibles prop

**Files:**
- Modify: `src/app/components/CrearCursoDialog.tsx`

- [x] **Step 1: Extend the props interface**

Find:
```ts
interface CrearCursoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  internalUserId: number | null
}
```
Replace with:
```ts
interface CrearCursoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  internalUserId: number | null
  ministeriosDisponibles?: { id_ministerio: number; nombre: string }[]
}
```

- [x] **Step 2: Accept the prop in the component signature**

Find:
```ts
export function CrearCursoDialog({ open, onOpenChange, internalUserId }: CrearCursoDialogProps) {
```
Replace with:
```ts
export function CrearCursoDialog({ open, onOpenChange, internalUserId, ministeriosDisponibles }: CrearCursoDialogProps) {
```

- [x] **Step 3: Use ministeriosDisponibles when provided**

Find the `ministeriosFiltrados` declaration (around line 57):
```ts
const ministeriosFiltrados = miembriaMinisterios
  .filter(m => m.rol_en_ministerio === 'Líder de Ministerio')
  .map(m => (m.ministerio as any))
  .filter(Boolean)
```
Replace with:
```ts
const ministeriosFiltrados = ministeriosDisponibles
  ? ministeriosDisponibles
  : miembriaMinisterios
      .filter(m => m.rol_en_ministerio === 'Líder de Ministerio')
      .map(m => (m.ministerio as any))
      .filter(Boolean)
```

- [x] **Step 4: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ built in`.

- [x] **Step 5: Commit**

```bash
git add src/app/components/CrearCursoDialog.tsx
git commit -m "feat: add ministeriosDisponibles prop to CrearCursoDialog for admin use"
```

---

## Task 5: Create CursosAdminList — church-wide course list

**Files:**
- Create: `src/app/components/CursosAdminList.tsx`

- [x] **Step 1: Create the file**

```tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useApp } from '@/app/store/AppContext'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import { AnimatedCard } from '@/app/components/ui/AnimatedCard'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { BookOpen, Eye, EyeOff, Trash2, ChevronRight, Inbox, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'

interface CursoAdmin {
  id_aula_curso: number
  titulo: string
  descripcion: string | null
  estado: string
  ministerio: { nombre: string } | null
  aula_modulo: { count: number }[]
}

interface CursosAdminListProps {
  ministerios: { idMinisterio: number; nombre: string }[]
}

export function CursosAdminList({ ministerios }: CursosAdminListProps) {
  const { iglesiaActual } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [ministerioFilter, setMinisterioFilter] = useState(0)
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number; titulo: string }>({
    open: false, id: 0, titulo: '',
  })

  const { data: cursos = [], isLoading } = useQuery<CursoAdmin[]>({
    queryKey: ['cursos-admin', iglesiaActual?.id],
    queryFn: async () => {
      if (!iglesiaActual?.id) return []
      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          descripcion,
          estado,
          ministerio!inner(nombre, sede!inner(id_iglesia)),
          aula_modulo(count)
        `)
        .eq('ministerio.sede.id_iglesia', iglesiaActual.id)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as CursoAdmin[]
    },
    enabled: !!iglesiaActual?.id,
    staleTime: 2 * 60 * 1000,
  })

  const visible = useMemo(() => {
    return cursos.filter(c => {
      if (search && !c.titulo.toLowerCase().includes(search.toLowerCase())) return false
      if (ministerioFilter && ministerios.find(m => m.idMinisterio === ministerioFilter)?.nombre !== c.ministerio?.nombre) return false
      if (estadoFilter !== 'todos' && c.estado !== estadoFilter) return false
      return true
    })
  }, [cursos, search, ministerioFilter, estadoFilter, ministerios])

  const togglePublicacion = async (id: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'activo' ? 'borrador' : 'activo'
    const { error } = await supabase
      .from('aula_curso')
      .update({ estado: nuevoEstado })
      .eq('id_aula_curso', id)
    if (error) {
      toast.error('Error al cambiar estado del curso')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['cursos-admin', iglesiaActual?.id] })
    toast.success(`Curso ${nuevoEstado === 'activo' ? 'publicado' : 'despublicado'}`)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    const { error } = await supabase
      .from('aula_curso')
      .delete()
      .eq('id_aula_curso', deleteConfirm.id)
    if (error) {
      toast.error('Error al eliminar curso')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['cursos-admin', iglesiaActual?.id] })
    toast.success('Curso eliminado')
    setDeleteConfirm({ open: false, id: 0, titulo: '' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Cargando cursos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card/40 backdrop-blur-xl border border-border/50 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar curso..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 bg-background/50 border-white/10 rounded-xl"
          />
        </div>
        <select
          value={ministerioFilter}
          onChange={e => setMinisterioFilter(Number(e.target.value))}
          className="h-10 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value={0}>Todos los ministerios</option>
          {ministerios.map(m => (
            <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>
          ))}
        </select>
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="borrador">Borradores</option>
        </select>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {visible.map((curso, idx) => {
            const moduloCount = curso.aula_modulo?.[0]?.count ?? 0
            return (
              <AnimatedCard key={curso.id_aula_curso} index={idx} className="p-5 group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase font-black tracking-widest border-0 rounded-lg px-2 py-0.5 ${
                        curso.estado === 'activo'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {curso.estado}
                    </Badge>
                    {curso.ministerio?.nombre && (
                      <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-0 rounded-lg px-2 py-0.5 bg-primary/10 text-primary">
                        {curso.ministerio.nombre}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                    {moduloCount} módulo{moduloCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <h3 className="font-bold text-sm leading-snug tracking-tight group-hover:text-primary transition-colors mb-2 uppercase italic line-clamp-2">
                  {curso.titulo}
                </h3>
                {curso.descripcion && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                    {curso.descripcion}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <Button
                    size="sm"
                    className="flex-1 h-8 rounded-xl text-xs"
                    onClick={() => navigate(`/app/aula/curso/${curso.id_aula_curso}`)}
                  >
                    <ChevronRight className="w-3.5 h-3.5 mr-1" /> Ver detalle
                  </Button>
                  <button
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all"
                    onClick={() => togglePublicacion(curso.id_aula_curso, curso.estado)}
                    title={curso.estado === 'activo' ? 'Despublicar' : 'Publicar'}
                  >
                    {curso.estado === 'activo' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    onClick={() => setDeleteConfirm({ open: true, id: curso.id_aula_curso, titulo: curso.titulo })}
                    title="Eliminar curso"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </AnimatedCard>
            )
          })}
        </AnimatePresence>
      </div>

      {visible.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
        >
          <Inbox className="w-10 h-10 opacity-20" />
          <p className="text-sm">
            {cursos.length === 0 ? 'No hay cursos en esta iglesia todavía.' : 'Ningún curso coincide con los filtros.'}
          </p>
        </motion.div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={open => setDeleteConfirm(p => ({ ...p, open }))}>
        <DialogContent className="sm:max-w-sm rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-rose-400" />
              </div>
              <DialogTitle className="text-lg font-bold text-center">¿Eliminar curso?</DialogTitle>
              <p className="text-sm text-muted-foreground text-center">
                Estás a punto de eliminar <span className="font-semibold text-foreground">"{deleteConfirm.titulo}"</span>. Esta acción no se puede deshacer.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button variant="ghost" className="rounded-xl w-full" onClick={() => setDeleteConfirm({ open: false, id: 0, titulo: '' })}>
              Cancelar
            </Button>
            <Button className="rounded-xl w-full bg-rose-500 hover:bg-rose-600 text-white" onClick={confirmDelete}>
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [x] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ built in`.

- [x] **Step 3: Commit**

```bash
git add src/app/components/CursosAdminList.tsx
git commit -m "feat: add CursosAdminList — church-wide course management for admin"
```

---

## Task 6: Create DashboardAdmin — church-wide academic stats

**Files:**
- Create: `src/app/components/DashboardAdmin.tsx`

- [x] **Step 1: Create the file**

```tsx
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { motion } from 'motion/react'
import { BookOpen, Users, Award, TrendingUp, CheckCircle2, FileEdit } from 'lucide-react'

interface DashboardAdminProps {
  idIglesia: number
}

export function DashboardAdmin({ idIglesia }: DashboardAdminProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-admin-aula', idIglesia],
    queryFn: async () => {
      const { data: cursos, error: cursosError } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          estado,
          ministerio!inner(nombre, sede!inner(id_iglesia)),
          aula_inscripcion(count),
          aula_modulo(count)
        `)
        .eq('ministerio.sede.id_iglesia', idIglesia)

      if (cursosError) throw cursosError

      const activos = (cursos ?? []).filter(c => c.estado === 'activo').length
      const borradores = (cursos ?? []).filter(c => c.estado !== 'activo').length

      const { data: inscripciones, error: inscError } = await supabase
        .from('aula_inscripcion')
        .select('id_usuario, porcentaje_progreso')
        .eq('activo', true)
        .in(
          'id_aula_curso',
          (cursos ?? []).map(c => c.id_aula_curso)
        )

      if (inscError) throw inscError

      const uniqueServidores = new Set((inscripciones ?? []).map(i => i.id_usuario)).size
      const progresos = (inscripciones ?? []).map(i => Number(i.porcentaje_progreso ?? 0))
      const promedio = progresos.length
        ? Math.round(progresos.reduce((a, b) => a + b, 0) / progresos.length)
        : 0

      const topCursos = (cursos ?? [])
        .map(c => ({
          id: c.id_aula_curso,
          titulo: c.titulo,
          ministerio: (c.ministerio as any)?.nombre ?? '',
          inscritos: (c.aula_inscripcion as any)?.[0]?.count ?? 0,
          modulos: (c.aula_modulo as any)?.[0]?.count ?? 0,
        }))
        .sort((a, b) => b.inscritos - a.inscritos)
        .slice(0, 5)

      return { activos, borradores, uniqueServidores, promedio, topCursos, total: (cursos ?? []).length }
    },
    enabled: !!idIglesia,
    staleTime: 3 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const kpis = [
    { icon: <BookOpen className="w-5 h-5" />, label: 'Cursos activos', value: stats.activos, color: 'from-emerald-500 to-teal-600' },
    { icon: <FileEdit className="w-5 h-5" />, label: 'Borradores', value: stats.borradores, color: 'from-amber-500 to-orange-500' },
    { icon: <Users className="w-5 h-5" />, label: 'Servidores inscritos', value: stats.uniqueServidores, color: 'from-[#709dbd] to-[#4682b4]' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'Progreso promedio', value: `${stats.promedio}%`, color: 'from-violet-500 to-purple-600' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07 }}
          >
            <Card className="border-white/10 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                    {kpi.icon}
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px] py-0 tracking-widest uppercase">KPI</Badge>
                </div>
                <p className="text-4xl font-light tracking-tight text-foreground">{kpi.value}</p>
                <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Top courses table */}
      {stats.topCursos.length > 0 && (
        <Card className="border-white/10 bg-card/40 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-[0.15em] text-foreground/70 flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Cursos con más inscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topCursos.map((curso, idx) => (
                <div key={curso.id} className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-black text-primary shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{curso.titulo}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{curso.ministerio} · {curso.modulos} módulos</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Progress value={Math.min((curso.inscritos / Math.max(stats.uniqueServidores, 1)) * 100, 100)} className="w-20 h-1.5" />
                    <span className="text-xs font-bold text-foreground/60 w-12 text-right">{curso.inscritos} insc.</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.total === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 opacity-20" />
          <p className="text-sm">No hay cursos en la iglesia todavía. ¡Crea el primero!</p>
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ built in`.

- [x] **Step 3: Commit**

```bash
git add src/app/components/DashboardAdmin.tsx
git commit -m "feat: add DashboardAdmin — church-wide academic stats for admin_iglesia"
```

---

## Task 7: Create AdminAulaPage — main admin aula page

**Files:**
- Create: `src/app/components/AdminAulaPage.tsx`

- [x] **Step 1: Create the file**

```tsx
import { useState, useEffect } from 'react'
import { useApp } from '@/app/store/AppContext'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { useMinisteriosEnriquecidos } from '@/hooks/useMinisterios'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { motion } from 'motion/react'
import { GraduationCap, BookOpen, TrendingUp, Plus, Building2 } from 'lucide-react'
import { CursosAdminList } from './CursosAdminList'
import { DashboardAdmin } from './DashboardAdmin'
import { CrearCursoDialog } from './CrearCursoDialog'

export function AdminAulaPage() {
  const { iglesiaActual } = useApp()
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [showCrearCurso, setShowCrearCurso] = useState(false)

  useEffect(() => {
    if (user?.id) {
      getInternalUserId(user.id).then(id => setInternalUserId(id))
    }
  }, [user?.id])

  const { data: ministerios = [] } = useMinisteriosEnriquecidos(iglesiaActual?.id)

  const ministeriosDisponibles = ministerios.map(m => ({
    id_ministerio: m.idMinisterio,
    nombre: m.nombre,
  }))

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4682b4]/15 via-[#709dbd]/5 to-transparent border border-[#4682b4]/20 p-8"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <GraduationCap className="h-40 w-40 -rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="bg-[#4682b4]/20 text-[#4682b4] hover:bg-[#4682b4]/30 border-none px-3 py-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest">
                <GraduationCap className="h-3.5 w-3.5" />
                Gestión Académica
              </Badge>
              {iglesiaActual?.nombre && (
                <Badge variant="outline" className="border-white/20 text-foreground/60 text-[11px] px-3 py-1 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  {iglesiaActual.nombre}
                </Badge>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-2 text-foreground">
              Aula <span className="text-[#4682b4]">Virtual</span>
            </h2>
            <p className="text-muted-foreground font-medium leading-relaxed text-sm">
              Gestiona cursos, módulos, inscripciones y progreso de todos los servidores de tu iglesia.
            </p>
          </div>
          <Button
            onClick={() => setShowCrearCurso(true)}
            disabled={ministeriosDisponibles.length === 0}
            className="bg-gradient-to-r from-[#4682b4] to-[#709dbd] hover:from-[#3b6d96] hover:to-[#5b84a1] text-white rounded-2xl px-6 py-6 h-auto shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="font-bold">Crear Nuevo Curso</span>
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="cursos" className="w-full">
        <div className="flex items-center mb-6 overflow-x-auto pb-2">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md inline-flex">
            <TabsTrigger
              value="cursos"
              className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-[#4682b4] transition-all"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Todos los Cursos
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-[#4682b4] transition-all"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Estadísticas
            </TabsTrigger>
          </TabsList>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <TabsContent value="cursos" className="mt-0">
            <CursosAdminList ministerios={ministeriosDisponibles.map(m => ({ idMinisterio: m.id_ministerio, nombre: m.nombre }))} />
          </TabsContent>
          <TabsContent value="stats" className="mt-0">
            {iglesiaActual?.id ? (
              <DashboardAdmin idIglesia={iglesiaActual.id} />
            ) : (
              <p className="text-muted-foreground text-sm">No hay iglesia seleccionada.</p>
            )}
          </TabsContent>
        </motion.div>
      </Tabs>

      <CrearCursoDialog
        open={showCrearCurso}
        onOpenChange={setShowCrearCurso}
        internalUserId={internalUserId}
        ministeriosDisponibles={ministeriosDisponibles}
      />
    </div>
  )
}
```

- [x] **Step 2: Verify full build passes with no errors**

```bash
npm run build 2>&1 | tail -10
```
Expected: `✓ built in` with no TypeScript errors. The unresolved import from Task 2 should now resolve since `AdminAulaPage` exists.

- [x] **Step 3: Commit**

```bash
git add src/app/components/AdminAulaPage.tsx
git commit -m "feat: add AdminAulaPage — full academic management for admin_iglesia"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by |
|---|---|
| Route admin_iglesia to admin view | Task 2 (AulaPage) |
| Add Aula to admin sidebar | Task 1 (AppLayout) |
| Church-wide course list with filters | Task 5 (CursosAdminList) |
| Create courses in any ministerio | Task 4 (CrearCursoDialog prop) + Task 7 (AdminAulaPage passes all ministerios) |
| Admin manages any course (not just own) | Task 3 (CursoDetallePage isAdmin) |
| Modules/evaluations/inscripciones/certificates | Task 3 — all guarded by isLider now include isAdmin |
| Church-wide stats dashboard | Task 6 (DashboardAdmin) |
| No DB migrations | All tasks — confirmed, no migrations |

### Type consistency
- `CursosAdminList` receives `ministerios: { idMinisterio: number; nombre: string }[]`
- `AdminAulaPage` passes `ministeriosDisponibles.map(m => ({ idMinisterio: m.id_ministerio, nombre: m.nombre }))` ✓
- `DashboardAdmin` receives `idIglesia: number` — `AdminAulaPage` passes `iglesiaActual.id` ✓
- `CrearCursoDialog` receives `ministeriosDisponibles?: { id_ministerio: number; nombre: string }[]` — `AdminAulaPage` passes `ministeriosDisponibles` which uses `id_ministerio` key ✓

### No placeholders
All steps contain complete code. No TBDs. ✓
