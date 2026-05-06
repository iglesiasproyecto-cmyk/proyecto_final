# Diseño: Gestión académica completa para admin_iglesia (Aula de Formación)

**Fecha:** 2026-05-06  
**Alcance:** Módulo Aula — routing, sidebar, nuevos componentes admin, adaptación de CrearCursoDialog y CursoDetallePage  
**Rol objetivo:** `admin_iglesia` (y `super_admin` por herencia)

---

## Contexto y problema

El `admin_iglesia` actualmente cae en `ServidorAulaPage` (vista de estudiante) porque `AulaPage` solo distingue entre `lider` y cualquier otro rol. El administrador necesita gestión académica completa de toda su iglesia: crear, editar y publicar cursos en cualquier ministerio, gestionar módulos y evaluaciones, ver inscripciones y progreso de todos los servidores, y emitir certificados.

El RLS de Supabase **ya está configurado** para `admin_iglesia` en todas las tablas del aula (`aula_curso`, `aula_modulo`, `aula_inscripcion`, `aula_certificado`, etc.). No se requieren migraciones.

---

## Enfoque elegido

**Opción B — Nueva `AdminAulaPage` dedicada.** Componente separado de `LiderAulaPage` para evitar mezclar comportamientos. Reutiliza los componentes internos existentes (`CursoDetallePage`, `CrearCursoDialog`, `DashboardLider`) con adaptaciones puntuales.

Cursos "nivel iglesia" (sin ministerio) quedan fuera de alcance en este ciclo. El admin puede crear cursos en cualquier ministerio de su iglesia.

---

## Arquitectura de la solución

### Capa 1 — Routing (`src/app/components/AulaPage.tsx`)

Se agrega una tercera rama al switch de roles:

```ts
// Antes:
rolActual === "lider" → LiderAulaPage
cualquier otro        → ServidorAulaPage

// Después:
rolActual === "admin_iglesia" || rolActual === "super_admin" → AdminAulaPage
rolActual === "lider"                                        → LiderAulaPage
cualquier otro                                               → ServidorAulaPage
```

### Capa 2 — Sidebar (`src/app/components/AppLayout.tsx`)

Se agrega al `case "admin_iglesia"` el item de navegación:

```ts
{ label: "Aula de Formación", path: "/app/aula", icon: <BookOpen className="w-5 h-5" />, section: "Formación" }
```

Se inserta después de "Eventos" y antes de "Tareas" en la sección de gestión de la iglesia.

---

## Nuevos componentes

### `AdminAulaPage` (`src/app/components/AdminAulaPage.tsx`)

Estructura general:

```
AdminAulaPage
├── Header
│   ├── Título "Gestión Académica" + badge con nombre de la iglesia
│   └── Botón "Crear Curso" (siempre visible, no depende de ser líder)
└── Tabs
    ├── "Todos los Cursos"  → CursosAdminList
    └── "Estadísticas"      → DashboardAdmin (query church-wide)
```

Datos necesarios:
- `iglesiaActual` desde `useApp()`
- `useMinisteriosEnriquecidos(iglesiaActual?.id)` para el picker de ministerio y el filtro
- `internalUserId` desde `getInternalUserId(user.id)` para pasar al `CrearCursoDialog`

### `CursosAdminList` (`src/app/components/CursosAdminList.tsx`)

Lista de todos los cursos de la iglesia. Query principal:

```ts
supabase
  .from('aula_curso')
  .select(`
    *,
    ministerio!inner(nombre, sede!inner(id_iglesia)),
    aula_modulo(count)
  `)
  .eq('ministerio.sede.id_iglesia', iglesiaActual.id)
  .order('creado_en', { ascending: false })
```

Usa el mismo patrón `!inner` aplicado en tareas. El `queryKey` incluye `iglesiaActual.id`.

**Por tarjeta de curso:**
- Título, descripción truncada
- Badge de ministerio (`ministerio.nombre`)
- Badge de estado (activo / borrador)
- Contador de módulos
- Acciones: **Ver detalle** → navega a `/app/aula/curso/:idCurso`, **Publicar/Despublicar**, **Eliminar** (con confirmación)

**Filtros:**
- Búsqueda por texto (título)
- Selector de ministerio (client-side, lista de ministerios de la iglesia)
- Selector de estado: todos / activos / borradores

---

## Componentes modificados

### `CrearCursoDialog` (`src/app/components/CrearCursoDialog.tsx`)

**Problema actual:** la lista de ministerios se construye internamente filtrando por `rol_en_ministerio === 'Líder de Ministerio'`. El admin no es líder de ningún ministerio, así que el selector queda vacío.

**Cambio:** se agrega un prop opcional `ministeriosDisponibles`:

```ts
interface CrearCursoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  internalUserId: number | null
  ministeriosDisponibles?: { id_ministerio: number; nombre: string }[]  // nuevo
}
```

Cuando se pasa `ministeriosDisponibles`, se usa esa lista en lugar de la consulta interna. Cuando no se pasa (uso del lider), el comportamiento actual se mantiene sin cambios.

**Caller en `AdminAulaPage`:**
```ts
<CrearCursoDialog
  ministeriosDisponibles={ministerios.map(m => ({
    id_ministerio: m.idMinisterio,
    nombre: m.nombre,
  }))}
  ...
/>
```

**Caller en `LiderAulaPage`:**
```ts
<CrearCursoDialog ... />  // sin cambio, prop omitido
```

### `CursoDetallePage` (`src/app/components/CursoDetallePage.tsx`)

**Problema:** los botones de gestión (editar módulos, agregar personas, toggle publicación) probablemente verifican `id_usuario_creador === internalUserId`. El admin no creó el curso pero debe poder gestionarlo.

**Cambio:** se obtiene `rolActual` de `useApp()` y se agrega `isAdmin` a las verificaciones:

```ts
const { rolActual, iglesiaActual } = useApp()
const isAdmin = rolActual === "admin_iglesia" || rolActual === "super_admin"

// Antes:
const canManage = internalUserId === curso.id_usuario_creador

// Después:
const canManage = isAdmin || internalUserId === curso.id_usuario_creador
```

Esto afecta: botones de editar curso, toggle publicación, gestión de módulos, gestión de inscripciones, emisión de certificados.

### Dashboard de estadísticas church-wide

`DashboardLider` filtra por `id_usuario_creador = internalUserId`. Para el panel de admin se pasa un prop `idIglesia` que cambia el scope de las queries:

```ts
// En AdminAulaPage:
<DashboardAdmin idIglesia={iglesiaActual?.id} />
```

Alternativa si `DashboardLider` es difícil de parametrizar: crear `DashboardAdmin` como componente nuevo que replica la estructura visual pero con queries filtradas por `ministerio.sede.id_iglesia = idIglesia`.

Las métricas del dashboard admin:
- Total cursos activos en la iglesia
- Total cursos en borrador
- Total servidores inscritos (unique)
- Tasa de completado promedio
- Tabla de cursos con más inscripciones

---

## Flujo completo del admin

```
Admin abre /app/aula
  → AulaPage detecta admin_iglesia → AdminAulaPage

Tab "Todos los Cursos"
  → CursosAdminList carga todos los cursos via !inner join por iglesia
  → Filtro por ministerio disponible
  → Click "Ver detalle" → /app/aula/curso/:idCurso
    → CursoDetallePage con isAdmin = true → todos los botones de gestión visibles
      → Puede editar módulos, evaluaciones, inscripciones, certificados

Crear curso nuevo
  → "Crear Curso" → CrearCursoDialog con ministeriosDisponibles = todos los ministerios
  → Admin elige ministerio → guarda → course aparece en CursosAdminList

Tab "Estadísticas"
  → DashboardAdmin con stats church-wide
```

---

## Archivos a crear

| Archivo | Descripción |
|---|---|
| `src/app/components/AdminAulaPage.tsx` | Página principal del aula para admin |
| `src/app/components/CursosAdminList.tsx` | Lista de cursos de toda la iglesia |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/app/components/AulaPage.tsx` | Agregar rama admin en el switch de roles |
| `src/app/components/AppLayout.tsx` | Agregar "Aula de Formación" al nav de admin_iglesia |
| `src/app/components/CrearCursoDialog.tsx` | Prop `ministeriosDisponibles` opcional |
| `src/app/components/CursoDetallePage.tsx` | `canManage = isAdmin \|\| id_usuario_creador === internalUserId` |

## Sin cambios

- Esquema de base de datos — no se requieren migraciones
- RLS — ya está configurado para `admin_iglesia` en todas las tablas del aula
- `LiderAulaPage` — sin cambios
- `ServidorAulaPage` — sin cambios
- Rutas (`routes.ts`) — sin cambios, `/app/aula` ya existe

---

## Fuera de alcance

- Cursos "nivel iglesia" sin ministerio asignado (requiere migración de esquema, ciclo posterior)
- Notificaciones automáticas al inscribir servidores
- Exportación de reportes de progreso
