# Diseño: Membresía, Formularios por Rol y UX Contextual por Ministerio

**Fecha:** 2026-05-13  
**Estado:** Aprobado — listo para implementación

---

## Contexto

El sistema maneja una jerarquía estricta: **Iglesia → Sede → Ministerio**. Un ministerio siempre pertenece a una sede (`ministerio.id_sede` NOT NULL). Los usuarios pueden pertenecer a múltiples ministerios con roles distintos en cada uno (`rol_en_ministerio`: lider | servidor).

Este diseño cubre tres áreas interrelacionadas:
1. Modelo de membresía (¿cómo se incorpora una persona al sistema?)
2. Formularios de creación (evento, tarea, curso) adaptados por rol de sistema
3. UX contextual por ministerio (UI adapta permisos según `rol_en_ministerio` activo)

---

## 1. Modelo de Membresía

### Decisión: Sede primero, luego ministerio

Una persona se incorpora primero a una **sede** como "feligrés", y después se asigna a uno o más ministerios. Esto permite registrar personas en la sede aunque aún no tengan ministerio asignado.

### Cambio de esquema requerido

Nueva tabla:
```sql
CREATE TABLE usuario_sede (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario   uuid NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_sede      uuid NOT NULL REFERENCES sede(id_sede) ON DELETE CASCADE,
  fecha_ingreso date NOT NULL DEFAULT CURRENT_DATE,
  estado        text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  UNIQUE (id_usuario, id_sede)
);
```

Tabla existente sin cambios:
```sql
-- miembro_ministerio ya tiene: id_usuario, id_ministerio, rol_en_ministerio, fecha_ingreso
```

### Flujo de incorporación

```
1. Admin asigna usuario → Sede Norte          (crea fila en usuario_sede)
2. Admin asigna usuario → Ministerio Alabanza  (crea fila en miembro_ministerio, rol_en_ministerio = 'lider')
3. Admin asigna usuario → Ministerio Contabilidad  (crea fila en miembro_ministerio, rol_en_ministerio = 'servidor')
```

Una persona puede ser "feligrés" de la sede sin estar en ningún ministerio. La página de **Miembros** muestra todas las personas en `usuario_sede`, no solo las de ministerios.

### Pastores

Un pastor se asigna a **una sola sede** (relación en `pastor_sede`). El modelo de pastor itinerante (múltiples sedes) no está en el alcance de esta iteración.

---

## 2. Formularios por Rol de Sistema

Los formularios de **crear evento**, **crear tarea** y **crear curso** adaptan sus campos según el rol del usuario en el sistema.

### Comportamiento por rol

| Rol | Campo Sede | Campo Ministerio |
|-----|-----------|-----------------|
| `super_admin` | Selector libre (todas las iglesias → todas las sedes) | Selector filtrado por sede elegida |
| `admin_iglesia` | Selector de sedes de su iglesia | Selector filtrado por sede elegida |
| `admin_sede` | Pre-fijado (su sede, no editable) | Selector de ministerios de su sede |
| `lider` | Pre-fijado (sede de su ministerio, no editable) | Pre-fijado (su ministerio, no editable) |

### Regla general

**El selector de ministerio siempre se filtra por la sede seleccionada.** No puede aparecer un ministerio de Sede Sur cuando la sede elegida es Sede Norte.

### Eventos generales de iglesia

Para `super_admin` y `admin_iglesia`, existe la opción de crear un evento **sin sede ni ministerio** (alcance: iglesia completa). Ejemplo: "Vigilia General". Esta opción se implementa como un toggle "Evento general de iglesia" que oculta los selectores de sede y ministerio.

### Comportamiento en cascada (sede → ministerio)

- Al cambiar la sede, el ministerio seleccionado se limpia si ya no pertenece a esa sede.
- Al seleccionar un ministerio, la sede se auto-completa con la sede de ese ministerio (para casos donde el ministerio se selecciona primero).

---

## 3. Modelo de Roles Duales

### Distinción clave

| Concepto | Descripción |
|---------|------------|
| **Rol de sistema** | Controla acceso a secciones de la app (admin_sede, lider, servidor, etc.) |
| **`rol_en_ministerio`** | Rol organizacional dentro de un ministerio específico (lider \| servidor) |

Son independientes. Un usuario puede tener rol de sistema `lider` (porque es lider en Alabanza) y al mismo tiempo ser `servidor` en Contabilidad.

### Regla de permisos de creación

- El **rol de sistema** es el más alto que el usuario tiene en cualquier ministerio.
- Las **acciones de creación** (evento, tarea, curso) solo están permitidas para los ministerios donde `rol_en_ministerio = 'lider'`.

```sql
-- Nueva función RLS requerida:
CREATE OR REPLACE FUNCTION get_my_ministerios_as_lider()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id_ministerio
  FROM miembro_ministerio
  WHERE id_usuario = get_my_usuario_id()
    AND rol_en_ministerio = 'lider';
$$;
```

Esta función reemplaza `get_my_ministerios()` en las políticas WITH CHECK de evento, tarea y curso.

---

## 4. UX Contextual por Ministerio

### Comportamiento

Cuando el usuario selecciona un ministerio en cualquier página (EventsPage, TasksPage, MinisteriosPage, CoursesPage), el sistema detecta su `rol_en_ministerio` para ese ministerio y **adapta la UI automáticamente**.

| `rol_en_ministerio` activo | UI mostrada |
|---------------------------|-------------|
| `lider` | Botones: + Crear evento / + Crear tarea / + Crear curso; gestión de miembros |
| `servidor` | Solo lectura — sin botones de gestión |

### Sin selector de "contexto activo" global

La UI adapta permisos al ministerio **seleccionado en el filtro actual**, sin necesidad de que el usuario cambie un modo global. Cuando Juan cambia el filtro de "Alabanza" a "Contabilidad", los botones de creación desaparecen automáticamente porque en Contabilidad su `rol_en_ministerio` es `servidor`.

### Páginas afectadas

- **EventsPage**: botón "+ Crear evento" visible solo si `rol_en_ministerio = 'lider'` en el ministerio filtrado
- **TasksPage**: botón "+ Crear tarea" visible solo si `rol_en_ministerio = 'lider'` en el ministerio filtrado; añadir selector de sede antes del selector de ministerio
- **MinisteriosPage (miembros)**: botones de gestión de miembros visibles solo para lider en ese ministerio
- **CoursesPage**: botón "+ Crear curso / módulo" visible solo si `rol_en_ministerio = 'lider'`

Los roles de sistema `admin_iglesia`, `admin_sede` y `super_admin` **siempre tienen acceso completo** independientemente de `rol_en_ministerio`, ya que administran desde arriba de la jerarquía de ministerios.

---

## 5. RLS — Cambios Requeridos

### Nueva función

```sql
get_my_ministerios_as_lider() → SETOF uuid
```

### Políticas a actualizar

| Tabla | Política | Cambio |
|-------|---------|--------|
| `evento` | INSERT / UPDATE WITH CHECK para `lider` | Cambiar `get_my_ministerios()` → `get_my_ministerios_as_lider()` |
| `tarea` | INSERT / UPDATE WITH CHECK para `lider` | Cambiar `get_my_ministerios()` → `get_my_ministerios_as_lider()` |
| `curso` | INSERT / UPDATE WITH CHECK para `lider` | Cambiar `get_my_ministerios()` → `get_my_ministerios_as_lider()` |
| `usuario_sede` | Todas | Nueva tabla — crear políticas completas |

### RLS para `usuario_sede`

```
SELECT: admin_iglesia ve todos en su iglesia; admin_sede ve los de su sede; lider/servidor ven los de sus sedes
INSERT: admin_iglesia y admin_sede (dentro de su scope)
UPDATE: admin_iglesia y admin_sede (dentro de su scope)  
DELETE: admin_iglesia y admin_sede (dentro de su scope)
```

---

## 6. Componentes Frontend Nuevos / Modificados

### Componente reutilizable: `SedeMinisterioSelector`

Un selector en dos pasos — sede primero, ministerio filtrado — reutilizable en EventsPage, TasksPage y CoursesPage. Props:

```tsx
interface SedeMinisterioSelectorProps {
  sedes: Sede[]
  ministerios: Ministerio[]
  selectedSedeId: string | null
  selectedMinisterioId: string | null
  onSedeChange: (id: string | null) => void
  onMinisterioChange: (id: string | null) => void
  sedeReadOnly?: boolean        // true para admin_sede y lider
  ministerioReadOnly?: boolean  // true para lider
  allowGeneral?: boolean        // true para super_admin y admin_iglesia (evento sin sede/ministerio)
}
```

### Hook: `useMinisterioRole`

```tsx
// Devuelve el rol_en_ministerio del usuario autenticado en un ministerio dado
function useMinisterioRole(ministerioId: string | null): 'lider' | 'servidor' | null
```

Usado por EventsPage, TasksPage, MinisteriosPage y CoursesPage para mostrar/ocultar botones de gestión.

### Página nueva: Gestión de Miembros de Sede

Dentro de la sección de cada sede, mostrar:
- Lista de personas en `usuario_sede` (feligreses)
- Indicación de en qué ministerios están y con qué rol
- Botón "Asignar a ministerio" (abre modal que precarga la sede)

---

## Alcance de esta iteración

**Incluido:**
- Tabla `usuario_sede` con RLS
- Función `get_my_ministerios_as_lider()` y actualización de políticas
- Componente `SedeMinisterioSelector` reutilizable
- Hook `useMinisterioRole`
- Actualización de EventsPage, TasksPage, MinisteriosPage, CoursesPage
- Selector de sede en TasksPage (actualmente solo tiene ministerio)
- Gestión básica de `usuario_sede` (página de miembros por sede)

**No incluido (futuras iteraciones):**
- Pastores itinerantes (múltiples sedes)
- Claims JWT con `ministerio_roles` para evitar consultas en RLS
- Notificaciones por cambio de rol en ministerio
