# Rechazo de asignación de tarea — Diseño

**Fecha:** 2026-06-13
**Estado:** Aprobado (pendiente de plan de implementación)

## Problema

Cuando un líder asigna una tarea a un usuario, hoy el asignado solo puede
iniciarla y avanzarla (`pendiente → en_progreso → en_revision → completada`).
No existe forma de que el asignado **rechace** una tarea que no puede atender
(p. ej. emergencia familiar, conflicto de agenda) ni de dejar constancia del
motivo. Se necesita una vía para rechazar la asignación dentro de una ventana
de tiempo y notificar al líder para que reasigne.

## Decisiones de producto (cerradas)

1. **Por asignación, no por tarea.** Cada asignado decide sobre *su propia*
   asignación. Si una tarea tiene varios asignados y uno rechaza, las demás
   asignaciones siguen activas.
2. **Aceptación implícita.** No hay botón "Aceptar" ni estado
   `pendiente_aceptacion`. La asignación nace activa (aceptada). Iniciar la
   tarea equivale a aceptarla. El único acto explícito es **rechazar**.
3. **Ventana configurable por tarea.** Se puede rechazar mientras falten **más
   de N horas** para la fecha límite. N (`horas_margen_rechazo`) lo define el
   líder al crear la tarea, con **default 12h**.
4. **Nota obligatoria.** Rechazar exige un motivo de texto no vacío.
5. **Al rechazar:** la asignación queda `rechazada` con el motivo y la fecha; se
   **notifica al líder/creador** para que reasigne manualmente. **No** se cambia
   automáticamente el estado de la `tarea`.

## Enfoque elegido

**Estado en `tarea_asignada` + bitácora en `tarea_aprobacion`.** El estado de
rechazo vive como columnas consultables en `tarea_asignada` (badges y filtros
triviales), y el evento se audita en la tabla `tarea_aprobacion` existente. La
mutación corre por un RPC `SECURITY DEFINER` para poder notificar a otro
usuario respetando RLS (mismo patrón que `rpc_notificar_contenido_curso`).

Descartados: solo-bitácora (estado no consultable, badges frágiles) y máquina
de estados con `pendiente_aceptacion` (contradice la aceptación implícita).

## 1. Esquema de base de datos

Migración aplicada vía Supabase MCP `apply_migration` (no CLI).

### Nuevo enum

```sql
create type estado_asignacion_tarea as enum ('activa', 'rechazada');
```

### Tabla `tarea`

```sql
alter table tarea
  add column horas_margen_rechazo int not null default 12;
```

Margen mínimo (horas) antes de `fecha_limite` hasta el cual se permite rechazar.

### Tabla `tarea_asignada`

```sql
alter table tarea_asignada
  add column estado_asignacion estado_asignacion_tarea not null default 'activa',
  add column motivo_rechazo text,
  add column fecha_rechazo timestamptz;
```

### Tabla `tarea_aprobacion` (reutilizada)

Sin cambios de esquema. El rechazo inserta una fila:
`accion = 'rechazo_asignacion'`, `observaciones = motivo`,
`id_usuario = quien rechaza`, `id_tarea = tarea afectada`.

## 2. Lógica de la ventana (regla única)

Un asignado puede rechazar **su** asignación si y solo si **las tres**
condiciones se cumplen:

1. `tarea_asignada.estado_asignacion = 'activa'` (no rechazada previamente), y
2. `tarea.estado = 'pendiente'` (nadie la ha iniciado; coherente con
   "iniciar = aceptar implícitamente"), y
3. `tarea.fecha_limite IS NULL` **o**
   `now() <= fecha_limite - (horas_margen_rechazo * interval '1 hour')`.

Sin fecha límite ⇒ se puede rechazar mientras la tarea siga `pendiente`. Pasada
la ventana o iniciada la tarea, el botón de rechazo desaparece.

Esta misma regla se valida en dos lugares: en el cliente (para mostrar/ocultar
el botón) y en el RPC (autoridad final). El cliente nunca es la fuente de
verdad.

## 3. Backend — RPC `SECURITY DEFINER`

```
rpc_rechazar_asignacion_tarea(p_id_tarea_asignada bigint, p_motivo text) returns void
```

Pasos (transacción atómica):

1. Resolver `id_usuario` del caller desde `auth.uid()`.
2. Cargar la asignación + su tarea. Verificar que el caller **es** el dueño de
   la asignación (`tarea_asignada.id_usuario = caller`); si no, excepción
   `'no_autorizado'`.
3. Validar `p_motivo` no vacío (tras `trim`); si vacío, excepción
   `'motivo_requerido'`.
4. Validar la regla de ventana (sección 2); si falla, excepción
   `'fuera_de_ventana'` o `'ya_rechazada'` según el caso.
5. `UPDATE tarea_asignada SET estado_asignacion='rechazada',
   motivo_rechazo=p_motivo, fecha_rechazo=now()`.
6. `INSERT INTO tarea_aprobacion (id_tarea, id_usuario, accion, observaciones)`
   con `accion='rechazo_asignacion'`.
7. `INSERT INTO notificacion` para `tarea.id_usuario_creador`: `tipo='tarea'`,
   `titulo` corto (p. ej. "Tarea rechazada"), `mensaje` con el nombre de quien
   rechaza, el título de la tarea, el motivo, y el marcador `[TASK_ID:<idTarea>]`
   para enlazar (convención existente, ver
   `extractTaskIdFromNotificationMessage`).

Las excepciones se mapean a mensajes amistosos en el cliente.

## 4. Capa de servicio / hooks / tipos

### `src/types/app.types.ts`

- `Tarea`: añadir `horasMargenRechazo: number`.
- `TareaAsignada`: añadir
  `estadoAsignacion: 'activa' | 'rechazada'`,
  `motivoRechazo: string | null`,
  `fechaRechazo: string | null`.

### `src/services/eventos.service.ts`

- `getTareasEnriquecidas`: ya selecciona `tarea_asignada(*)`; mapear los 3
  campos nuevos de cada asignado y `horas_margen_rechazo` de la tarea.
- `createTarea` / `updateTarea`: incluir `horas_margen_rechazo` (con default 12
  si no se provee).
- Nueva función `rechazarAsignacionTarea(idTareaAsignada: number, motivo: string)`
  que invoca `supabase.rpc('rpc_rechazar_asignacion_tarea', {...})`.

### `src/hooks/useEventos.ts`

- `useRechazarAsignacion()`: mutation que invalida la query
  `tareasEnriquecidas` (y notificaciones si aplica).

## 5. UI — Servidor (`ServidorTareasView.tsx`)

- Helper `puedeRechazar(task, myAssignment)` que implementa la regla de la
  sección 2 en el cliente.
- En el diálogo de detalle: botón **"Rechazar tarea"** (estilo destructivo)
  visible solo cuando `puedeRechazar`. Abre un sub-diálogo con `textarea` de
  motivo **obligatorio**; confirmar dispara `useRechazarAsignacion`. Toast de
  éxito/error (mapear excepciones del RPC).
- Si `myAssignment.estadoAsignacion === 'rechazada'`: mostrar badge "Rechazada"
  + el motivo, sin botones de acción ni subida de evidencia.
- Nueva pestaña/filtro **"Rechazadas"** en `STATUS_TABS` que filtra por
  `myAssignment.estadoAsignacion === 'rechazada'` (es estado de asignación, no
  de tarea, así que el filtro vive aparte de `t.estado`).

## 6. UI — Líder (`LiderTareasView.tsx`)

- Por cada asignado de una tarea, mostrar su `estadoAsignacion`; si
  `rechazada`, badge rojo + línea con el motivo y `fechaRechazo`.
- La reasignación reutiliza el mecanismo de asignación existente (agregar otro
  asignado). **No** se construye un flujo de reasignación nuevo.
- El líder ve la notificación en la campana, que enlaza a la tarea vía
  `[TASK_ID]`.

## 7. Formulario de crear tarea (`CrearTareaDialog.tsx`)

- Añadir campo numérico **"Margen para rechazar (horas)"** con default 12,
  mapeado a `horas_margen_rechazo`. Opcional para el líder; si lo deja vacío,
  se usa 12.

## 8. Fuera de alcance (YAGNI)

- Sin botón "Aceptar" ni estado `pendiente_aceptacion`.
- Sin cambio automático del estado de `tarea` al rechazar.
- Sin "des-rechazar" ni reapertura de ventana.
- Sin reasignación automática (el líder reasigna a mano).

## 9. Pruebas / verificación

- Migración aplica sin error; enum y columnas existen.
- RPC rechaza correctamente dentro de ventana; lanza excepción fuera de
  ventana, con tarea ya iniciada, con asignación ajena, y con motivo vacío.
- Notificación llega al creador con el `[TASK_ID]` correcto.
- Servidor: el botón aparece/desaparece según la regla; el badge "Rechazada"
  y el filtro funcionan.
- Líder: ve el badge de rechazo y el motivo.
