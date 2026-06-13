# Calendario de Disponibilidad de Usuarios

**Fecha:** 2026-06-13
**Estado:** Aprobado
**Alcance:** Servidores marcan su disponibilidad; líderes la consultan al asignar tareas

---

## Contexto y Problema

Al asignar tareas a servidores de un ministerio, el líder no tiene forma de saber si esa persona está disponible en la fecha elegida. Esto genera conflictos: tareas asignadas en días que el servidor no puede cumplir (vacaciones, trabajo, compromisos personales).

**Necesidad:** Un sistema liviano donde los servidores registren sus no-disponibilidades y los líderes puedan consultarlas antes y durante la asignación de tareas.

---

## Decisiones de Diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Modelo de disponibilidad | Lista negra (se marca lo que NO se puede) | Los servidores están disponibles por defecto; solo marcan excepciones |
| Granularidad | Día completo | Suficiente para el contexto; horarios añaden complejidad innecesaria |
| Notas | Opcionales por regla | Contexto útil sin ser obligatorio |
| Patrones recurrentes | Semanal y mensual | Reduce trabajo repetitivo (ej. "todos los domingos trabajo") |
| Capa de datos | AppContext (mock) con estructura idéntica al schema Supabase | Consistente con la arquitectura actual; migración trivial futura |
| Warning al asignar | No bloqueante | El líder puede tener información adicional; la decisión final es suya |

---

## Modelo de Datos

### Interfaz TypeScript

```typescript
interface DisponibilidadRegla {
  id: string;
  usuarioId: string;
  tipo: 'fecha_especifica' | 'recurrente';

  // Para tipo 'fecha_especifica':
  fecha?: string;       // 'YYYY-MM-DD'
  fechaFin?: string;    // 'YYYY-MM-DD' — opcional, para rangos

  // Para tipo 'recurrente':
  patron?: {
    tipo: 'semanal' | 'mensual';
    diasSemana?: number[];   // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
    semanaDelMes?: number;   // 1–4, o -1 = última semana
  };

  nota?: string;   // Ej: "Trabajo", "Viaje familiar", "Médico"
  activo: boolean;
}
```

### Schema Supabase (futuro)

```sql
CREATE TABLE disponibilidad (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('fecha_especifica', 'recurrente')),
  fecha       DATE,
  fecha_fin   DATE,
  patron      JSONB,
  nota        TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON disponibilidad(usuario_id);
CREATE INDEX ON disponibilidad(fecha);
```

### Cambios en AppContext

- Nuevo array `disponibilidadReglas: DisponibilidadRegla[]` en el estado global
- Acciones nuevas:
  - `agregarDisponibilidadRegla(regla: Omit<DisponibilidadRegla, 'id'>): void`
  - `eliminarDisponibilidadRegla(id: string): void`
  - `toggleDisponibilidadRegla(id: string): void`
- Mock inicial: 3–4 reglas de ejemplo distribuidas entre servidores para que la funcionalidad sea visible desde el primer arranque

---

## Lógica de Resolución

Hook `useDisponibilidad` en `src/app/hooks/useDisponibilidad.ts`:

```typescript
function estaDisponible(
  usuarioId: string,
  fecha: Date,
  reglas: DisponibilidadRegla[]
): { disponible: boolean; nota?: string }
```

**Algoritmo:**
1. Filtrar reglas activas del usuario
2. Evaluar fechas específicas primero (mayor precedencia que recurrentes)
   - Si `fecha <= target <= fechaFin` (o `fecha === target` si no hay rango) → no disponible
3. Si no hay match en específicas, evaluar recurrentes
   - `semanal`: verificar si el día de la semana de `target` está en `diasSemana`
   - `mensual`: verificar semana del mes + día de semana de `target`
4. Primer match encontrado → `{ disponible: false, nota }`
5. Sin match → `{ disponible: true }`

**Solapamiento de rangos:** La regla más reciente (mayor `created_at`) tiene precedencia si dos rangos se solapan.

---

## Componentes de UI

### 1. `DisponibilidadTab` — Perfil Personal

**Ubicación:** Nueva tab "Disponibilidad" en `ProfilePage.tsx`
**Visible para:** Todos los roles (servidor, líder, admin)

**Sub-vista "Fechas":**
- Calendario mensual navegable (botones ‹ y › para cambiar mes)
- Días no disponibles: fondo rojo suave + icono X
- Click en día libre → drawer con formulario:
  - Fecha única o toggle para activar rango (fecha inicio + fecha fin)
  - Campo de nota (placeholder: "Ej: Trabajo, Viaje, Cita médica...")
  - Botón "Guardar"
- Click en día marcado → popover con nota + botón "Eliminar"

**Sub-vista "Recurrentes":**
- Lista de patrones activos con chip descriptivo (ej. "Todos los domingos — Trabajo")
- Toggle activo/inactivo por fila
- Botón "Agregar patrón" → formulario:
  - Selector: Semanal / Mensual
  - Si semanal: checkboxes de días (Dom–Sáb)
  - Si mensual: selector de semana (1ª, 2ª, 3ª, 4ª, Última) + selector de día
  - Campo de nota opcional
- Botón eliminar por fila

---

### 2. `EquipoDisponibilidadPanel` — Página de Tareas

**Ubicación:** Botón "Ver disponibilidad del equipo" en la cabecera de `TasksPage.tsx`
**Visible para:** Solo líderes

**Comportamiento:**
- Abre un panel lateral (sheet) o expande una sección sobre la lista de tareas
- Calendario mensual navegable
- Cada día muestra chips con los nombres/avatares de quienes **no** están disponibles
- Días sin ausencias: fondo normal, sin chips
- Días con todas las ausencias: color de advertencia en el fondo del día
- Filtro: dropdown para ver solo un miembro específico del ministerio
- Hover sobre chip de nombre → tooltip con nota de la regla

---

### 3. `DisponibilidadBadge` — Diálogo de Asignación de Tarea

**Ubicación:** Dentro del formulario/dialog donde el líder asigna un servidor a una tarea
**Trigger:** Cuando cambia el campo de servidor asignado O la fecha de la tarea

**Estados:**
- `disponible` → badge verde discreto: "✓ Disponible"
- `no_disponible` → banner amarillo: "⚠ [Nombre] no está disponible este día — [nota si existe]"
- `sin_datos` → nada (no se muestra si el usuario nunca configuró nada)

**Comportamiento:** No bloqueante — el líder puede asignar igual. El banner es informativo.

---

## Flujo Completo

```
[Servidor]
  → Perfil → Tab "Disponibilidad"
  → Marca días específicos o patrones recurrentes
  → Agrega nota opcional

[Líder — planificación]
  → Tareas → "Ver disponibilidad del equipo"
  → Ve calendario mensual con ausencias del ministerio
  → Filtra por persona si necesita

[Líder — asignación]
  → Abre diálogo de asignación de tarea
  → Selecciona servidor + fecha
  → DisponibilidadBadge muestra estado en tiempo real
  → Asigna o ajusta fecha/persona según la información
```

---

## Casos Borde

| Caso | Comportamiento |
|------|----------------|
| Tarea ya asignada a un día no disponible | Indicador visual en la tarjeta de tarea (no bloquea retroactivamente) |
| Servidor sin reglas configuradas | Se asume disponible; no se muestra badge |
| Rangos de fechas solapados | La regla con mayor `created_at` tiene precedencia |
| Lider intenta ver equipo de otro ministerio | Solo ve miembros de su ministerio asignado |
| Servidor desactivado / inactivo | Sus reglas no se evalúan |

---

## Archivos Nuevos y Modificados

### Nuevos
- `src/app/hooks/useDisponibilidad.ts` — lógica de resolución pura
- `src/app/components/disponibilidad/DisponibilidadTab.tsx` — gestión personal
- `src/app/components/disponibilidad/CalendarioMensual.tsx` — calendario base reutilizable
- `src/app/components/disponibilidad/ReglaForm.tsx` — formulario alta/edición de regla
- `src/app/components/disponibilidad/PatronRecurrenteForm.tsx` — formulario patrón recurrente
- `src/app/components/disponibilidad/EquipoDisponibilidadPanel.tsx` — vista del líder
- `src/app/components/disponibilidad/DisponibilidadBadge.tsx` — badge inline

### Modificados
- `src/app/store/AppContext.tsx` — añadir `disponibilidadReglas`, acciones y mock data
- `src/app/components/ProfilePage.tsx` — añadir tab "Disponibilidad"
- `src/app/components/TasksPage.tsx` — añadir botón y panel de equipo
- `src/app/components/tareas/CrearTareaDialog.tsx` — integrar `DisponibilidadBadge`

---

## Fuera de Alcance

- Notificaciones automáticas cuando un líder asigna sobre un día no disponible
- Sincronización con calendarios externos (Google Calendar, etc.)
- Granularidad por horario (mañana/tarde)
- Aprobación/rechazo de disponibilidad por parte del líder
