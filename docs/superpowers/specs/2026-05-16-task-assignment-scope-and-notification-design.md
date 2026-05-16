# Diseno: flujo de asignacion de tareas por alcance y notificacion con redireccion

Fecha: 2026-05-16
Proyecto: IGLESIABD
Estado: Propuesto y validado con usuario (listo para plan de implementacion)

## 1) Objetivo

Corregir y estandarizar el flujo de asignacion de tareas para que respete alcance por rol:

- `admin_iglesia`: iglesia preseleccionada, elige sede, luego ministerio, luego usuario(s) del ministerio.
- `admin_sede`: iglesia y sede preseleccionadas, elige ministerio de su sede, luego usuario(s) del ministerio.
- `lider`: ministerio preseleccionado (si lidera uno) o selector de ministerio (si lidera varios), luego usuario(s) del ministerio.

Ademas, al asignar, el usuario asignado debe recibir notificacion in-app y al abrirla debe ir directo al detalle de la tarea.

## 2) Alcance funcional

### 2.1 Flujo UI de asignacion

En el detalle de tarea (zona "Asignar usuario"):

1. Mostrar jerarquia segun rol:
   - Admin iglesia: `Iglesia (bloqueada) -> Sede (selector) -> Ministerio (selector) -> Usuarios (multi-select)`.
   - Admin sede: `Iglesia (bloqueada) -> Sede (bloqueada) -> Ministerio (selector) -> Usuarios (multi-select)`.
   - Lider: `Ministerio (bloqueado o selector si aplica) -> Usuarios (multi-select)`.
2. Permitir seleccion de:
   - un usuario,
   - varios usuarios,
   - todos los usuarios visibles del ministerio seleccionado.
3. El listado de usuarios solo muestra usuarios activos del ministerio seleccionado.
4. Si cambia sede o ministerio, limpiar seleccion de usuarios para evitar asignaciones inconsistentes.

### 2.2 Notificacion

Por cada usuario efectivamente asignado:

- crear notificacion tipo `tarea` en tabla `notificacion`.
- al hacer click en notificacion, navegar a pantalla de tareas y abrir automaticamente el detalle de la tarea.

## 3) Estado actual auditado (brechas)

1. `src/app/components/TasksPage.tsx`
   - Hoy el selector usa `usuariosDeIglesia` completo para asignar.
   - No existe flujo jerarquico por rol (sede -> ministerio -> usuario).
   - No hay seleccion multiple ni "todos" en el flujo principal de asignacion desde detalle.

2. `src/services/ministerios.service.ts`
   - Existen fetchers por iglesia y por ministerio, pero el uso actual en UI no fuerza jerarquia por rol en asignacion.

3. `src/services/eventos.service.ts` (`createTareaAsignada`)
   - Inserta/asigna y envia correo, pero no garantiza notificacion in-app para redireccion.
   - Falta validacion robusta de alcance del asignador en backend antes de asignar.

4. `src/app/components/NotificationsPage.tsx`
   - Muestra y marca leidas, pero no resuelve deep-link directo a tarea desde la notificacion.

## 4) Requisitos tecnicos

### 4.1 Restriccion por alcance (seguridad)

No confiar en frontend como unica barrera. Antes de confirmar asignacion, validar alcance del asignador:

- `admin_iglesia`: solo usuarios cuyo ministerio pertenezca a sedes de su iglesia activa.
- `admin_sede`: solo usuarios de ministerios de su sede activa.
- `lider`: solo usuarios miembros de su(s) ministerio(s) liderado(s).

Si algun usuario no cumple alcance, retornar error de permisos (`403`) y no asignar ese usuario.

### 4.2 Seleccion multiple

Definir payload de asignacion por lote en cliente:

- `idTarea`
- `idMinisterioContexto`
- `idsUsuarios: number[]`
- `assignAll: boolean` (opcional, resuelto a ids en cliente antes de enviar)

En backend/procedimiento de asignacion:

- procesar usuario por usuario,
- evitar duplicados de `tarea_asignada`,
- retornar resumen: `asignados`, `duplicados`, `rechazados`.

### 4.3 Notificacion y deep-link

Dado que `notificacion` no expone campo de metadata de enlace en el esquema auditado, se define:

- fase 1 (sin migracion): incluir token parseable en `mensaje` para identificar `idTarea`.
- fase 2 (recomendada): agregar campo `meta jsonb` en `notificacion` con `{ "taskId": <id> }` para eliminar parsing de texto.

En UI de notificaciones:

- detectar notificacion tipo `tarea`,
- extraer `idTarea` (fase 1 por token, fase 2 por `meta`),
- navegar a tareas y abrir detalle automaticamente.

## 5) Modelo de datos relevante (confirmado)

- `tarea`: referencia `id_ministerio`, `id_iglesia`, `id_usuario_creador`.
- `tarea_asignada`: relacion tarea-usuario (`id_tarea`, `id_usuario`).
- `notificacion`: `id_usuario`, `titulo`, `mensaje`, `tipo`, `leida`.
- cadena de alcance: `ministerio.id_sede -> sede.id_iglesia`.

Observacion:

- En salida auditada no se verifico unique constraint explicito de `(id_tarea, id_usuario)` en `tarea_asignada`. Debe confirmarse y crearse si no existe.

## 6) UX y estados de error

Mensajes esperados:

- "Selecciona una sede" cuando aplique.
- "Selecciona un ministerio" cuando aplique.
- "Selecciona al menos un usuario" si no hay seleccion.
- "No tienes permisos para asignar a uno o mas usuarios" en rechazo por alcance.
- Resumen post-asignacion: "X asignados, Y ya estaban asignados, Z rechazados".

Estados vacios:

- Sin ministerios en sede: mostrar aviso y bloquear asignacion.
- Sin usuarios en ministerio: mostrar aviso y bloquear asignacion.

## 7) Criterios de aceptacion

1. `admin_iglesia` no puede asignar fuera de su iglesia ni fuera de la sede/ministerio seleccionados.
2. `admin_sede` no puede asignar fuera de su sede.
3. `lider` no puede asignar fuera de su(s) ministerio(s).
4. Funciona asignacion de 1, varios y todos.
5. Se crea notificacion in-app por asignacion efectiva.
6. Click en notificacion de tarea abre detalle de la tarea destino.
7. No se crean duplicados en `tarea_asignada`.

## 8) Riesgos y mitigaciones

- Riesgo: control solo en frontend.
  - Mitigacion: validar alcance tambien en capa de servicio/RPC.

- Riesgo: deep-link frágil por parsing de mensaje.
  - Mitigacion: migrar a `meta jsonb` en notificacion (fase 2).

- Riesgo: roles compuestos (usuario con varios roles).
  - Mitigacion: aplicar regla de menor privilegio efectivo en asignacion.

## 9) Fuera de alcance de esta iteracion

- Rediseno completo visual del modulo de tareas.
- Reingenieria total de permisos globales del sistema.
- Cambios de analytics/telemetria avanzada.

## 10) Definicion de listo para implementar

Se considera listo cuando:

- usuario valida este documento,
- se confirma estrategia de deep-link (fase 1 inmediata + fase 2 opcional),
- se pasa a plan detallado de implementacion por pasos.
