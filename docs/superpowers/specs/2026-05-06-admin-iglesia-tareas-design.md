# Diseño: Gestión completa de tareas para admin_iglesia

**Fecha:** 2026-05-06  
**Alcance:** Módulo de Tareas (`TasksPage`, `useEventos`, `eventos.service`)  
**Rol objetivo:** `admin_iglesia` (y `super_admin` por herencia)

---

## Contexto y problema

El administrador de una iglesia necesita gestión completa sobre todas las tareas de su iglesia y sus sedes. El análisis identificó los siguientes problemas:

### Bug crítico
`useTareasEnriquecidas()` tiene `enabled: !!idEvento`, lo que significa que cuando se llama sin `idEvento` (como hace `TasksPage`), la query nunca se ejecuta. El tablero siempre aparece vacío para el admin.

### Problemas de funcionalidad
1. No se muestra el nombre del ministerio en las tarjetas del kanban.
2. No existe filtro por ministerio en la vista.
3. No hay modo edición para modificar título, descripción, fecha límite o prioridad de una tarea.
4. No existe acción para cancelar una tarea desde la UI (aunque el RPC de Supabase ya lo permite para admin).
5. El dropdown "Asignar usuario" trae todos los usuarios del sistema, no solo los de la iglesia.

### Lo que ya funciona correctamente
El RLS en Supabase está correctamente configurado para `admin_iglesia`:
- **SELECT:** puede ver tareas donde `ministerio → sede → iglesia ∈ get_user_iglesias()`
- **INSERT** (RPC `create_tarea`): puede crear tareas en cualquier ministerio de su iglesia
- **UPDATE** (RPC `update_tarea_estado_rpc`): puede hacer cualquier transición de estado
- **DELETE** (RPC `delete_tarea_rpc`): puede eliminar tareas de su iglesia

No se requieren cambios en el backend de permisos.

---

## Arquitectura de la solución

### Capa 1 — Servicio (`src/services/eventos.service.ts`)

**Función `getTareasEnriquecidas`**

Firma nueva:
```ts
getTareasEnriquecidas(idEvento?: number, idIglesia?: number): Promise<TareaEnriquecida[]>
```

Query nueva:
```ts
supabase
  .from('tarea')
  .select(`
    *,
    ministerio!inner(nombre, sede!inner(id_iglesia)),
    evento(nombre),
    tarea_asignada(*, usuario(nombres, apellidos))
  `)
  .order('creado_en', { ascending: false })
```

Filtros opcionales encadenados:
- `.eq('ministerio.sede.id_iglesia', idIglesia)` — cuando se pasa `idIglesia`
- `.eq('id_evento', idEvento)` — cuando se pasa `idEvento` (uso existente desde EventsPage)

El `!inner` en `ministerio` excluye automáticamente tareas sin ministerio asignado y habilita el filtro por `sede.id_iglesia` mediante dot notation de PostgREST.

**Tipo `TareaEnriquecida`**

Se agrega el campo:
```ts
ministerioNombre: string
```

El mapper incluye: `ministerioNombre: r.ministerio?.nombre ?? ''`

### Capa 2 — Hook (`src/hooks/useEventos.ts`)

**`useTareasEnriquecidas`**

Firma nueva:
```ts
useTareasEnriquecidas(idEvento?: number, idIglesia?: number)
```

Cambios:
- Eliminar `enabled: !!idEvento` — la query siempre se ejecuta
- Agregar `idIglesia` al `queryKey` para invalidación correcta si el admin cambia de iglesia
- Pasar `idIglesia` a `getTareasEnriquecidas`

### Capa 3 — Componente (`src/app/components/TasksPage.tsx`)

#### Nuevo estado
```ts
const [ministerioFilter, setMinisterioFilter] = useState<number>(0)
const [editMode, setEditMode] = useState(false)
const [editForm, setEditForm] = useState({
  titulo: '', descripcion: '', fechaLimite: '', prioridad: 'media' as Tarea['prioridad']
})
```

#### Cambio en la llamada al hook
```ts
// Antes:
useTareasEnriquecidas()

// Después:
useTareasEnriquecidas(undefined, iglesiaActual?.id)
```

#### Usuarios para asignar
En lugar de `useUsuarios()` global, se construye la lista de usuarios asignables desde `useMinisteriosEnriquecidos(iglesiaActual?.id)`, que ya trae los miembros de cada ministerio. Se deduplicam por `idUsuario`. Esto garantiza que el admin solo vea miembros de su iglesia sin una query adicional.

```ts
const usuariosDeIglesia = useMemo(() => {
  const seen = new Set<number>()
  return ministerios.flatMap(m => m.miembros ?? []).filter(u => {
    if (seen.has(u.idUsuario)) return false
    seen.add(u.idUsuario)
    return u.activo !== false
  })
}, [ministerios])
```

#### Filtrado del kanban
El filtro por ministerio se aplica sobre `filteredAndSortedTareas` antes de renderizar las columnas:

```ts
const visibleTareas = ministerioFilter
  ? filteredAndSortedTareas.filter(t => t.idMinisterio === ministerioFilter)
  : filteredAndSortedTareas
```

---

## Cambios en la UI

### Barra de filtros (solo visible para `isAdmin`)
Se agrega un `<select>` de ministerio junto a los filtros existentes de fecha y orden. La opción `0` significa "Todos los ministerios".

### Tarjetas del kanban
Se agrega un badge con `ministerioNombre` debajo del título de cada tarea, visible para todos los roles.

```tsx
{t.ministerioNombre && (
  <p className="text-[10px] font-bold text-primary/60 mb-2 truncate uppercase tracking-wider">
    {t.ministerioNombre}
  </p>
)}
```

### Dialog de detalle — modo vista
- Para `isAdmin`: icono de lápiz en la cabecera que activa `editMode`
- Para `isAdmin`: botón **"Cancelar tarea"** en el footer (con diálogo de confirmación, distinto de cerrar el dialog)

### Dialog de detalle — modo edición (solo `isAdmin`)
Cuando `editMode === true`, los campos de la tarea se reemplazan por inputs editables:
- Título (Input)
- Descripción (Input)
- Fecha límite (Input type="date")
- Prioridad (select)

El footer muestra **"Guardar"** y **"Cancelar edición"** (vuelve a modo vista sin guardar).

Al guardar se llama `useUpdateTarea()` con los campos modificados. Al completar, se invalida `tareas-enriquecidas`.

### Acción "Cancelar tarea"
```ts
// Solo disponible para isAdmin
// Llama al mismo updateEstadoMutation existente:
updateEstadoMutation.mutate({ id: task.idTarea, estado: 'cancelada' })
```

El `update_tarea_estado_rpc` ya permite a `admin_iglesia` hacer cualquier transición, incluida `cancelada`. No se requiere cambio en el backend.

---

## Flujo completo del admin

```
Admin abre TasksPage
  → useTareasEnriquecidas(undefined, iglesiaActual.id) ejecuta
  → Trae todas las tareas de todos los ministerios de la iglesia
  → Kanban muestra tareas con badge de ministerio

Admin filtra por ministerio
  → Dropdown selecciona ministerio X
  → visibleTareas filtra client-side

Admin crea tarea
  → Selecciona ministerio del dropdown (todos los ministerios de la iglesia)
  → create_tarea RPC valida scope → inserta

Admin edita tarea
  → Click en lápiz → editMode = true
  → Modifica campos → "Guardar" → updateTarea → invalida cache

Admin cancela tarea
  → "Cancelar tarea" en footer → confirm dialog
  → update_tarea_estado_rpc(id, 'cancelada') → actualiza cache

Admin asigna usuario
  → Dropdown muestra solo miembros de la iglesia (de ministeriosEnriquecidos)
  → createTareaAsignada → RLS valida

Admin elimina tarea
  → Botón Trash → confirmación → delete_tarea_rpc → elimina
```

---

## Archivos a modificar

| Archivo | Tipo de cambio |
|---|---|
| `src/services/eventos.service.ts` | Extender `getTareasEnriquecidas` con `idIglesia`, agregar `ministerioNombre` al tipo y mapper |
| `src/hooks/useEventos.ts` | Extender `useTareasEnriquecidas` con `idIglesia`, eliminar `enabled: !!idEvento` |
| `src/app/components/TasksPage.tsx` | Nuevo estado, ministerio filter UI, edit mode dialog, cancel action, badge en tarjetas, usuarios de iglesia |

No se requieren migraciones ni cambios en el esquema de Supabase.

---

## Fuera de alcance

- Rediseño completo del tablero (vista admin vs. vista servidor)
- Notificaciones por cambio de estado de tarea
- Historial de cambios de una tarea
- Asignación masiva de tareas
