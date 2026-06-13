# Disponibilidad: Badges en Asignación y Página de Equipo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar indicadores de disponibilidad al asignar tareas en TasksPage y crear una página `/disponibilidad` con calendario de equipo con alcance por rol.

**Architecture:** Tres cambios independientes: (1) badge inline en el panel de asignación existente, (2) nueva página full-width con layout sidebar-calendar, (3) ruta y entrada de navegación. Todos reutilizan los hooks y componentes ya existentes (`useDisponibilidadEquipo`, `estaDisponible`, `CalendarioMensual`).

**Tech Stack:** React 18, TanStack Query, Framer Motion, Tailwind CSS v4, Lucide React, React Router v7.

---

## File Map

| Acción  | Archivo |
|---------|---------|
| Modify  | `src/app/components/TasksPage.tsx` |
| Create  | `src/app/components/DisponibilidadPage.tsx` |
| Modify  | `src/app/routes.ts` |
| Modify  | `src/app/components/AppLayout.tsx` |

---

## Task 1: Badge de disponibilidad en panel "Agregar Asignación" (TasksPage)

**Files:**
- Modify: `src/app/components/TasksPage.tsx`

Cuando el líder o admin selecciona usuarios para asignar a una tarea que tiene `fechaLimite`, cada usuario en la lista muestra un icono `AlertTriangle` ámbar si no está disponible ese día.

- [ ] **Step 1: Agregar imports en TasksPage.tsx**

En `src/app/components/TasksPage.tsx`, línea 24 (bloque de lucide-react), agregar `AlertTriangle`:

```typescript
import {
  ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Calendar,
  ChevronRight, Inbox, Trash2, UserPlus, X, Pencil, Search, CalendarDays,
  AlertTriangle
} from "lucide-react";
```

Línea 5, al final del import de hooks de eventos NO tocar. Agregar NUEVO import después de la línea `import { EquipoDisponibilidadPanel } from "./disponibilidad/EquipoDisponibilidadPanel";`:

```typescript
import { useDisponibilidadEquipo, estaDisponible } from "@/hooks/useDisponibilidad";
```

- [ ] **Step 2: Agregar hook y computed para IDs no disponibles**

Después del bloque `usuariosAsignables` useMemo (línea ~191, que termina con `}, [ministerioAsignacionId, ministerios, task?.asignados, usuariosDeIglesia]);`), agregar:

```typescript
  const asignablesIds = useMemo(
    () => usuariosAsignables.map(u => u.idUsuario),
    [usuariosAsignables]
  )
  const { data: reglasPanelAsignacion = [] } = useDisponibilidadEquipo(asignablesIds)

  const idsNoDisponibles = useMemo(() => {
    if (!task?.fechaLimite || reglasPanelAsignacion.length === 0) return new Set<number>()
    const fecha = new Date(task.fechaLimite + 'T12:00:00')
    return new Set(
      usuariosAsignables
        .filter(u => {
          const reglasU = reglasPanelAsignacion.filter(r => r.usuarioId === u.idUsuario)
          return !estaDisponible(u.idUsuario, fecha, reglasU).disponible
        })
        .map(u => u.idUsuario)
    )
  }, [task?.fechaLimite, reglasPanelAsignacion, usuariosAsignables])
```

- [ ] **Step 3: Mostrar el icono en cada usuario de la lista**

Localizar el bloque del panel de asignación (línea ~1073), el `label` de cada usuario:

```tsx
// ANTES:
<label key={u.idUsuario} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-xs font-medium text-foreground/80">
  <input
    type="checkbox"
    className="rounded border-white/20 text-primary focus:ring-primary/30 bg-background"
    checked={assignScope.selectedUserIds.includes(u.idUsuario)}
    onChange={e => {
      setAssignScope(prev => {
        const selectedUserIds = e.target.checked
          ? [...prev.selectedUserIds, u.idUsuario]
          : prev.selectedUserIds.filter(id => id !== u.idUsuario);
        return {
          ...prev,
          selectedUserIds,
          assignAll: selectedUserIds.length === usuariosAsignables.length && usuariosAsignables.length > 0,
        };
      });
    }}
  />
  {u.nombres} {u.apellidos}
</label>
```

```tsx
// DESPUÉS:
<label key={u.idUsuario} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-xs font-medium text-foreground/80">
  <input
    type="checkbox"
    className="rounded border-white/20 text-primary focus:ring-primary/30 bg-background"
    checked={assignScope.selectedUserIds.includes(u.idUsuario)}
    onChange={e => {
      setAssignScope(prev => {
        const selectedUserIds = e.target.checked
          ? [...prev.selectedUserIds, u.idUsuario]
          : prev.selectedUserIds.filter(id => id !== u.idUsuario);
        return {
          ...prev,
          selectedUserIds,
          assignAll: selectedUserIds.length === usuariosAsignables.length && usuariosAsignables.length > 0,
        };
      });
    }}
  />
  <span className="flex-1">{u.nombres} {u.apellidos}</span>
  {task?.fechaLimite && idsNoDisponibles.has(u.idUsuario) && (
    <span title="No disponible en la fecha límite" className="shrink-0">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
    </span>
  )}
</label>
```

- [ ] **Step 4: Verificar que compila**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -20
```

Esperado: `✓ built in` sin errores TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/TasksPage.tsx
git commit -m "feat(tareas): badge AlertTriangle para servidores no disponibles en fecha límite"
```

---

## Task 2: Crear DisponibilidadPage

**Files:**
- Create: `src/app/components/DisponibilidadPage.tsx`

Página full-width con layout sidebar-calendar. Alcance de usuarios según rol:
- `admin_iglesia` / `super_admin` → todos los usuarios de la iglesia
- `admin_sede` → usuarios en ministerios de sus sedes
- `lider` → usuarios en sus ministerios
- `servidor` → redirige a `/perfil`

- [ ] **Step 1: Crear el archivo**

Crear `src/app/components/DisponibilidadPage.tsx` con el siguiente contenido completo:

```tsx
import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Search, X, Users } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useMinisteriosEnriquecidos, useMinisteriosIdsDeUsuario } from '@/hooks/useMinisterios'
import { useUsuariosDeIglesia } from '@/hooks/useUsuariosDeIglesia'
import { useDisponibilidadEquipo, estaDisponible } from '@/hooks/useDisponibilidad'
import { CalendarioMensual } from './disponibilidad/CalendarioMensual'

export function DisponibilidadPage() {
  const { idIglesia } = useParams<{ idIglesia: string }>()
  const navigate = useNavigate()
  const idIglesiaNum = Number(idIglesia) || undefined
  const { rolActual, usuarioActual, sedesDelUsuario } = useApp()

  useEffect(() => {
    if (rolActual === 'servidor') {
      navigate(`/app/${idIglesia}/perfil`, { replace: true })
    }
  }, [rolActual, navigate, idIglesia])

  const { data: ministerios = [] } = useMinisteriosEnriquecidos(idIglesiaNum)
  const { data: usuariosDeIglesia = [] } = useUsuariosDeIglesia(idIglesiaNum)
  const { data: usuarioMinisterioIds = [] } = useMinisteriosIdsDeUsuario(
    rolActual === 'lider' ? usuarioActual?.idUsuario : undefined
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [filtroMinisterioId, setFiltroMinisterioId] = useState(0)
  const [filtroPersonaId, setFiltroPersonaId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Usuarios dentro del alcance del rol
  const usuariosBase = useMemo(() => {
    if (rolActual === 'admin_iglesia' || rolActual === 'super_admin') {
      return usuariosDeIglesia
    }
    if (rolActual === 'admin_sede') {
      const sedeIds = new Set(sedesDelUsuario.map(s => s.id))
      const sedeMinisterioNames = new Set(
        ministerios.filter(m => sedeIds.has(m.idSede)).map(m => m.nombre)
      )
      return usuariosDeIglesia.filter(u =>
        u.ministerios.some(n => sedeMinisterioNames.has(n))
      )
    }
    if (rolActual === 'lider') {
      const misNombres = new Set(
        ministerios
          .filter(m => usuarioMinisterioIds.includes(m.idMinisterio))
          .map(m => m.nombre)
      )
      return usuariosDeIglesia.filter(u =>
        u.ministerios.some(n => misNombres.has(n))
      )
    }
    return []
  }, [rolActual, usuariosDeIglesia, sedesDelUsuario, ministerios, usuarioMinisterioIds])

  // Ministerios para el selector de filtro (solo roles admin)
  const ministeriosFiltro = useMemo(() => {
    if (rolActual === 'admin_iglesia' || rolActual === 'super_admin') {
      return ministerios
    }
    if (rolActual === 'admin_sede') {
      const sedeIds = new Set(sedesDelUsuario.map(s => s.id))
      return ministerios.filter(m => sedeIds.has(m.idSede))
    }
    return []
  }, [rolActual, ministerios, sedesDelUsuario])

  const showMinisterioFilter = ministeriosFiltro.length > 0

  // Usuarios después de aplicar filtros de UI
  const usuariosFiltrados = useMemo(() => {
    let base = usuariosBase
    if (filtroMinisterioId) {
      const nombre = ministerios.find(m => m.idMinisterio === filtroMinisterioId)?.nombre
      if (nombre) base = base.filter(u => u.ministerios.includes(nombre))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      base = base.filter(u => u.nombreCompleto.toLowerCase().includes(q))
    }
    return base
  }, [usuariosBase, filtroMinisterioId, searchQuery, ministerios])

  const ids = useMemo(() => usuariosFiltrados.map(u => u.idUsuario), [usuariosFiltrados])
  const { data: reglas = [], isLoading } = useDisponibilidadEquipo(ids)

  // Si hay una persona seleccionada en el sidebar, el calendario solo muestra sus ausencias
  const usuariosEfectivos = useMemo(() =>
    filtroPersonaId !== null
      ? usuariosFiltrados.filter(u => u.idUsuario === filtroPersonaId)
      : usuariosFiltrados
  , [filtroPersonaId, usuariosFiltrados])

  function ausenciasDia(date: Date) {
    return usuariosEfectivos.filter(u => {
      const reglasU = reglas.filter(r => r.usuarioId === u.idUsuario)
      return !estaDisponible(u.idUsuario, date, reglasU).disponible
    })
  }

  // Personas con ALGUNA ausencia en el mes actual (para el punto rojo en el sidebar)
  const usuariosConAusenciaMes = useMemo(() => {
    const ahora = new Date()
    const año = ahora.getFullYear()
    const mes = ahora.getMonth()
    const diasMes = new Date(año, mes + 1, 0).getDate()
    const con = new Set<number>()
    for (let d = 1; d <= diasMes; d++) {
      const fecha = new Date(año, mes, d)
      for (const u of usuariosFiltrados) {
        if (con.has(u.idUsuario)) continue
        const reglasU = reglas.filter(r => r.usuarioId === u.idUsuario)
        if (!estaDisponible(u.idUsuario, fecha, reglasU).disponible) {
          con.add(u.idUsuario)
        }
      }
    }
    return con
  }, [usuariosFiltrados, reglas])

  const ausenciasSelectedDate = selectedDate ? ausenciasDia(selectedDate) : []
  const ausenciasIds = new Set(ausenciasSelectedDate.map(u => u.idUsuario))
  const disponiblesSelectedDate = selectedDate
    ? usuariosEfectivos.filter(u => !ausenciasIds.has(u.idUsuario))
    : []

  const rolLabel: Record<string, string> = {
    admin_iglesia: 'Toda la iglesia',
    super_admin: 'Toda la iglesia',
    admin_sede: 'Mi sede',
    lider: 'Mi ministerio',
  }

  if (rolActual === 'servidor') return null

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Disponibilidad del Equipo
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {usuariosBase.length} {usuariosBase.length === 1 ? 'servidor' : 'servidores'} ·{' '}
            <span className="text-primary/70">{rolLabel[rolActual] ?? 'Tu alcance'}</span>
          </p>
        </div>

        {showMinisterioFilter && (
          <select
            value={filtroMinisterioId}
            onChange={e => {
              setFiltroMinisterioId(Number(e.target.value))
              setFiltroPersonaId(null)
            }}
            className="h-9 rounded-xl border border-white/10 bg-background/50 px-3 text-xs text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value={0}>Todos los ministerios</option>
            {ministeriosFiltro.map(m => (
              <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: lista de personas */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-4 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
              Equipo ({usuariosFiltrados.length})
            </p>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar servidor..."
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-white/10 bg-background/50 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {/* Person list */}
            <div className="space-y-0.5 max-h-[400px] overflow-y-auto pr-0.5">
              {usuariosFiltrados.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-6">
                  No hay servidores en este alcance.
                </p>
              ) : usuariosFiltrados.map(u => {
                const tieneAusencia = usuariosConAusenciaMes.has(u.idUsuario)
                const isSelected = filtroPersonaId === u.idUsuario
                return (
                  <button
                    key={u.idUsuario}
                    onClick={() => setFiltroPersonaId(isSelected ? null : u.idUsuario)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/20 text-foreground'
                        : 'hover:bg-white/5 text-foreground/80 border border-transparent'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-[10px] text-white font-black shrink-0">
                      {u.nombreCompleto.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 font-medium truncate">{u.nombreCompleto}</span>
                    {tieneAusencia && (
                      <span
                        className="w-2 h-2 rounded-full bg-rose-400 shrink-0"
                        title="Tiene ausencias este mes"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex flex-col gap-1.5 px-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50 inline-block shrink-0" />
              Algunos no disponibles
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50 inline-block shrink-0" />
              Todos no disponibles
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block shrink-0" />
              Tiene ausencias este mes
            </span>
          </div>
        </div>

        {/* Calendario + detalle */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50">
            {filtroPersonaId !== null && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-[10px] text-primary/70">
                  Mostrando ausencias de{' '}
                  <strong>{usuariosFiltrados.find(u => u.idUsuario === filtroPersonaId)?.nombreCompleto}</strong>
                </span>
                <button
                  onClick={() => setFiltroPersonaId(null)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-xs text-muted-foreground">
                Cargando disponibilidad...
              </div>
            ) : (
              <CalendarioMensual
                onDayClick={date => setSelectedDate(prev =>
                  prev?.toDateString() === date.toDateString() ? null : date
                )}
                renderDay={({ date, isCurrentMonth }) => {
                  if (!isCurrentMonth) return null
                  const ausentes = ausenciasDia(date)
                  if (ausentes.length === 0) return null
                  const allAbsent =
                    ausentes.length === usuariosEfectivos.length && usuariosEfectivos.length > 0
                  return (
                    <div className={`absolute inset-0 rounded-xl pointer-events-none ${
                      allAbsent
                        ? 'bg-rose-500/15 border border-rose-500/30'
                        : 'bg-amber-500/10 border border-amber-500/20'
                    }`}>
                      <div className="absolute bottom-0.5 left-0 right-0 flex flex-wrap justify-center gap-0.5 px-0.5">
                        {ausentes.slice(0, 3).map(u => (
                          <span
                            key={u.idUsuario}
                            title={u.nombreCompleto}
                            className="w-3.5 h-3.5 rounded-full bg-rose-400/80 text-[6px] text-white font-black flex items-center justify-center leading-none"
                          >
                            {u.nombreCompleto.charAt(0).toUpperCase()}
                          </span>
                        ))}
                        {ausentes.length > 3 && (
                          <span className="w-3.5 h-3.5 rounded-full bg-rose-400/40 text-[6px] text-rose-200 font-black flex items-center justify-center">
                            +{ausentes.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                }}
              />
            )}
          </div>

          {/* Detalle del día seleccionado */}
          <AnimatePresence>
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-4 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold capitalize">
                    {selectedDate.toLocaleDateString('es-CO', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">
                      No disponibles ({ausenciasSelectedDate.length})
                    </p>
                    {ausenciasSelectedDate.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">Todos disponibles</p>
                    ) : (
                      <div className="space-y-1">
                        {ausenciasSelectedDate.map(u => (
                          <div key={u.idUsuario} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-rose-500/20 flex items-center justify-center text-[9px] text-rose-300 font-black shrink-0">
                              {u.nombreCompleto.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-foreground/80 truncate">{u.nombreCompleto}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                      Disponibles ({disponiblesSelectedDate.length})
                    </p>
                    {disponiblesSelectedDate.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">Ninguno disponible</p>
                    ) : (
                      <div className="space-y-1">
                        {disponiblesSelectedDate.map(u => (
                          <div key={u.idUsuario} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[9px] text-primary font-black shrink-0">
                              {u.nombreCompleto.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-foreground/80 truncate">{u.nombreCompleto}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -20
```

Esperado: `✓ built in` sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/DisponibilidadPage.tsx
git commit -m "feat: DisponibilidadPage calendario de equipo con alcance por rol"
```

---

## Task 3: Ruta y navegación

**Files:**
- Modify: `src/app/routes.ts`
- Modify: `src/app/components/AppLayout.tsx`

- [ ] **Step 1: Agregar ruta en routes.ts**

En `src/app/routes.ts`, agregar import lazy después del import de `StatisticsPage` (línea ~59):

```typescript
const DisponibilidadPage = React.lazy(() =>
  loadLazyRoute(() => import("./components/DisponibilidadPage")).then(mod => ({ default: mod.DisponibilidadPage }))
);
```

Luego en el bloque de tenant routes (línea ~122, después de `{ path: "tareas", Component: TasksPage, ErrorBoundary: ErrorPage }`), agregar:

```typescript
              { path: "disponibilidad", Component: DisponibilidadPage, ErrorBoundary: ErrorPage },
```

- [ ] **Step 2: Agregar título dinámico en AppLayout.tsx**

En `src/app/components/AppLayout.tsx`, función `getDynamicPageTitle` (línea ~63), después de la línea `if (pathname.match(/\/app\/\d+\/tareas/)) return "Tareas";`, agregar:

```typescript
  if (pathname.match(/\/app\/\d+\/disponibilidad/)) return "Disponibilidad del Equipo";
```

- [ ] **Step 3: Agregar entradas de navegación en getNavItemsForRole**

Para `case "admin_iglesia"` (línea ~115, después de la entrada de Estadísticas):

```typescript
        { label: "Disponibilidad", path: `${t}/disponibilidad`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
```

Para `case "lider"` (línea ~131, después de la entrada de Estadísticas):

```typescript
        { label: "Disponibilidad", path: `${t}/disponibilidad`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
```

Para `case "admin_sede"` (línea ~145, después de la entrada de Estadísticas):

```typescript
        { label: "Disponibilidad", path: `${t}/disponibilidad`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
```

Nota: `CalendarDays` ya está importado en AppLayout.tsx (línea 12).

- [ ] **Step 4: Verificar build final**

```bash
cd /home/juanda/Proyectofinal && npm run build 2>&1 | tail -20
```

Esperado: `✓ built in` sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/routes.ts src/app/components/AppLayout.tsx
git commit -m "feat(nav): ruta y navegación /disponibilidad para admin y lider"
```
