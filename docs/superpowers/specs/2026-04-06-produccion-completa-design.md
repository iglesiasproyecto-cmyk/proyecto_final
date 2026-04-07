# IGLESIABD — Diseño: Producción Completa

> **For agentic workers:** This spec produces a multi-phase implementation plan. Use `superpowers:writing-plans` to generate the plan, then `superpowers:subagent-driven-development` to execute phase by phase.

**Fecha:** 2026-04-06
**Proyecto:** IGLESIABD — Church Management SPA
**Supabase Project ID:** `heibyjbvfiokmduwwawm`
**Objetivo:** Dejar la aplicación completamente funcional en todos los dominios y desplegada en Vercel, con los 4 roles operativos.

---

## Estado actual

| Área | Estado |
|------|--------|
| Auth & sesión | ✅ Funcional |
| Geografía CRUD | ✅ Completo |
| Notificaciones | ✅ Completo |
| Toast errors global | ✅ Completo |
| Route guards | ✅ Completo |
| CI/CD migraciones | ✅ Completo |
| Iglesias/Sedes CRUD | ~50% (faltan delete/update en sedes y pastores) |
| Ministerios CRUD | ~40% (faltan update/delete ministerio y miembro) |
| Eventos/Tareas CRUD | ~20% (faltan update/delete evento, todo de tareas) |
| Cursos/Evaluaciones | ~30% (faltan módulo, recurso, evaluacion create/update) |
| Usuarios/Roles | ~20% (sin invite, sin assignRol) |
| Dashboard | ~30% (hardcoded roleDistribution, sin scoping) |
| Perfil | ~10% (sin mutaciones) |
| Vercel deploy | ❌ No configurado |
| Contexto multi-iglesia | ❌ No implementado |

---

## Arquitectura general

**Stack:** React 18 + Vite + Tailwind CSS v4 + React Router v7 + TanStack Query v5 + Supabase JS v2

**Estrategia:** Opción B — deploy incremental. Vercel se configura en Fase 0 y cada fase subsiguiente hace deploy automático al hacer push a `main`.

**Patrón técnico consistente:**
- Enrichment: PostgREST joins `select('*, tabla(*)')` con tipo `XxxEnriquecido` en `.service.ts`
- Mutaciones: `onSuccess` cierra dialog + invalida query key correspondiente
- Scoping: queries con `idIglesia` reciben el parámetro del hook; `enabled: idIglesiaActual !== undefined`
- Tipos: interfaces `EnriquecidoXxx extends Xxx` definidas en el archivo de servicio

**Documentación externa (usar context7 MCP durante implementación):**
- Vercel deploy config para Vite SPAs: rewrites para React Router
- Supabase Edge Functions: para `invite-user` (requiere service role)
- TanStack Query v5: `enabled` flag, `invalidateQueries`
- React Router v7: rutas y loaders

---

## Fase 0 — Vercel Deploy + Contexto Multi-iglesia

### Vercel

**Archivos a crear/modificar:**
- Crear: `vercel.json`
- Verificar: `.env.example` con las variables necesarias

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Variables de entorno en Vercel (dashboard):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Contexto multi-iglesia

**Archivos a modificar:**
- `src/app/store/AppContext.tsx`
- `src/app/components/AppLayout.tsx`

**Cambios en `AppContext`:**

```typescript
// Nuevos campos en la interfaz AppState
iglesiaActual: { id: number; nombre: string } | null
setIglesiaActual: (ig: { id: number; nombre: string } | null) => void
iglesiasDelUsuario: { id: number; nombre: string }[]
```

Lógica post-login en `onAuthStateChange`:
1. Leer `usuario_rol` del usuario con join `iglesia(id_iglesia, nombre)` y `fecha_fin IS NULL`
2. Extraer lista única de iglesias → `iglesiasDelUsuario`
3. Si `iglesiasDelUsuario.length === 1` → `setIglesiaActual(iglesiasDelUsuario[0])` automáticamente
4. Si `length > 1` → `iglesiaActual = null`, usuario selecciona en el selector
5. Super Admin (rol sin iglesia scoped): puede ver todas las iglesias desde `getIglesias()`

**Selector en AppLayout:**
- Aparece en el navbar si `iglesiasDelUsuario.length > 1`
- `<Select>` de shadcn/ui con las iglesias disponibles
- Al cambiar, llama `setIglesiaActual()` e invalida todas las queries

**Fix EventsPage:**
```typescript
// Antes:
idIglesia: 1,
// Después:
idIglesia: iglesiaActual!.id,
```

---

## Fase 1 — Iglesias, Sedes, Pastores

**Archivos a modificar:**
- `src/services/iglesias.service.ts`
- `src/hooks/useIglesias.ts`
- `src/app/components/ChurchesPage.tsx`
- `src/app/components/SedesPage.tsx`
- `src/app/components/PastoresPage.tsx`

### Enrichment

`getIglesias()`:
```typescript
select('*, sede(count), ciudad(nombre, departamento(nombre))')
// Nuevos campos: cantidadSedes: number, ciudadNombre: string, departamentoNombre: string
```

`getPastores()`:
```typescript
select('*, iglesia_pastor(fecha_inicio, fecha_fin, iglesia(nombre))')
// Nuevo campo: iglesiasActivas: string[]
```

`getSedes()`:
```typescript
select('*, ministerio(count), ciudad(nombre)')
// Nuevos campos: cantidadMinisterios: number, ciudadNombre: string
```

### Mutaciones faltantes

| Hook | Mutación | Descripción |
|------|----------|-------------|
| `useIglesias` | `useUpdateIglesia` | Actualiza nombre, estado, fecha_fundacion, id_ciudad |
| `useIglesias` | `useDeleteIglesia` | Elimina iglesia (RLS: solo Super Admin) |
| `useIglesias` | `useCreateIglesiaPastor` | Asigna pastor a iglesia con fecha_inicio |
| `useIglesias` | `useDeleteIglesiaPastor` | Desasigna pastor (setea fecha_fin = now()) |
| `useIglesias` | `useCreatePastor` | Crea nuevo pastor |
| `useIglesias` | `useUpdatePastor` | Actualiza datos del pastor |
| `useIglesias` | `useDeletePastor` | Elimina pastor |
| `useIglesias` | `useUpdateSede` | Actualiza nombre, dirección, estado, id_ciudad |
| `useIglesias` | `useDeleteSede` | Elimina sede |
| `useIglesias` | `useCreateSedePastor` | Asigna pastor a sede |
| `useIglesias` | `useDeleteSedePastor` | Desasigna pastor de sede |

---

## Fase 2 — Ministerios, Miembros

**Archivos a modificar:**
- `src/services/ministerios.service.ts`
- `src/hooks/useMinisterios.ts`
- `src/app/components/DepartmentsPage.tsx`
- `src/app/components/MyDepartmentPage.tsx`
- `src/app/components/MembersPage.tsx`

### Enrichment

`getMinisterios(idSede?)`:
```typescript
select('*, miembro_ministerio(count)')
// Nuevo campo: cantidadMiembros: number
```

`getMiembrosMinisterio(idMinisterio)`:
```typescript
select('*, usuario(nombres, apellidos, correo, telefono)')
// Nuevos campos: nombreCompleto: string, correo: string, telefono: string
```

### Mutaciones faltantes

| Hook | Mutación | Descripción |
|------|----------|-------------|
| `useMinisterios` | `useUpdateMinisterio` | Actualiza nombre, descripcion, estado, id_sede |
| `useMinisterios` | `useDeleteMinisterio` | Elimina ministerio |
| `useMinisterios` | `useUpdateMiembroMinisterio` | Actualiza rol_en_ministerio, activo |
| `useMinisterios` | `useDeleteMiembroMinisterio` | Elimina miembro del ministerio |

---

## Fase 3 — Eventos, Tareas

**Archivos a modificar:**
- `src/services/eventos.service.ts`
- `src/hooks/useEventos.ts`
- `src/app/components/EventsPage.tsx`
- `src/app/components/TasksPage.tsx`

### Enrichment

`getEventos(idIglesia)`:
```typescript
select('*, tipo_evento(nombre), sede(nombre), ministerio(nombre)')
// Nuevos campos: tipoEventoNombre: string, sedeNombre: string, ministerioNombre: string
```

`getTareas(idEvento?)`:
```typescript
select('*, tarea_asignada(id_tarea_asignada, usuario(nombres, apellidos))')
// Nuevo campo: asignados: { id: number; nombre: string }[]
```

### Mutaciones faltantes

| Hook | Mutación | Descripción |
|------|----------|-------------|
| `useEventos` | `useUpdateEvento` | Actualiza nombre, descripcion, fechas, estado, sede, ministerio |
| `useEventos` | `useDeleteEvento` | Elimina evento |
| `useEventos` | `useCreateTarea` | Crea tarea vinculada a evento |
| `useEventos` | `useUpdateTarea` | Actualiza titulo, descripcion, estado, prioridad, fecha_limite |
| `useEventos` | `useDeleteTarea` | Elimina tarea |
| `useEventos` | `useCreateTareaAsignada` | Asigna tarea a usuario (`id_tarea`, `id_usuario`) |
| `useEventos` | `useUpdateTareaAsignada` | Cambia estado de la asignación |
| `useEventos` | `useDeleteTareaAsignada` | Desasigna usuario de tarea |

---

## Fase 4 — Cursos, Módulos, Evaluaciones, Recursos

**Archivos a modificar:**
- `src/services/cursos.service.ts`
- `src/hooks/useCursos.ts`
- `src/app/components/ClassroomPage.tsx`
- `src/app/components/EvaluationsPage.tsx`
- `src/app/components/CiclosLectivosPage.tsx`

### Enrichment

`getEvaluaciones(idUsuario?)`:
```typescript
select('*, modulo(titulo, curso(nombre))')
// Nuevos campos: tituloModulo: string, nombreCurso: string
```

`getDetallesProcesoCurso(idProceso)`:
```typescript
select('*, usuario(nombres, apellidos, correo)')
// Nuevos campos: nombreCompleto: string, correo: string
```

### Mutaciones faltantes

| Hook | Mutación | Descripción |
|------|----------|-------------|
| `useCursos` | `useCreateModulo` | Crea módulo con titulo, descripcion, orden, id_curso |
| `useCursos` | `useUpdateModulo` | Actualiza módulo |
| `useCursos` | `useDeleteModulo` | Elimina módulo |
| `useCursos` | `useCreateEvaluacion` | Crea evaluación para un módulo |
| `useCursos` | `useUpdateEvaluacion` | Actualiza calificacion, estado, retroalimentacion |
| `useCursos` | `useCreateRecurso` | Crea recurso (url, tipo, titulo) vinculado a módulo |
| `useCursos` | `useUpdateRecurso` | Actualiza recurso |
| `useCursos` | `useDeleteRecurso` | Elimina recurso |
| `useCursos` | `useUpdateProcesoAsignadoCurso` | Cambia estado del ciclo lectivo |

---

## Fase 5 — Usuarios, Roles

**Archivos a modificar:**
- `src/services/usuarios.service.ts`
- `src/hooks/useUsuarios.ts`
- `src/app/components/UsuariosPage.tsx`

**Archivo a crear:**
- `supabase/functions/invite-user/index.ts` — Edge Function

### Edge Function `invite-user`

Recibe: `{ email, nombres, apellidos, idIglesia, idRol }`

Flujo:
1. `supabase.auth.admin.inviteUserByEmail(email, { data: { nombres, apellidos } })`
2. Espera el webhook `user.created` o consulta polling hasta que aparezca en `auth.users`
3. Inserta en `usuario_rol` con `id_usuario`, `id_iglesia`, `id_rol`, `fecha_inicio = now()`

Nota: El `SUPABASE_SERVICE_ROLE_KEY` solo vive en la Edge Function — nunca en el frontend.

### Mutaciones

| Hook | Mutación | Descripción |
|------|----------|-------------|
| `useUsuarios` | `useInviteUsuario` | Llama a Edge Function `invite-user` |
| `useUsuarios` | `useUpdateUsuario` | Actualiza nombres, apellidos, telefono, activo |
| `useUsuarios` | `useAssignRol` | Inserta en `usuario_rol` con iglesia/sede/rol/fecha_inicio |
| `useUsuarios` | `useRemoveRol` | Setea `fecha_fin = now()` en `usuario_rol` |

---

## Fase 6 — Dashboard real, Perfil

**Archivos a modificar:**
- `src/app/components/DashboardPage.tsx`
- `src/app/components/ProfilePage.tsx`

### Dashboard

Reemplazar datos hardcodeados:

| Dato actual | Fuente real |
|-------------|-------------|
| `roleDistribution` hardcodeado | Agrupar `useUsuariosEnriquecidos()` por rol |
| `useMiembrosMinisterio(0)` | `useMiembrosMinisterio()` filtrado por ministerios del `iglesiaActual` |
| Stats de Super Admin | `useIglesias()`, `useSedes()`, `usePastores()` sin filtro de iglesia |
| Stats de Admin Iglesia | Todos los hooks con `iglesiaActual.id` |
| Stats de Líder | Filtrado por ministerio del usuario actual |

### Perfil

Mutaciones:
- `useUpdateProfile`: llama `updateUsuario({ nombres, apellidos, telefono })`
- `useChangePassword`: llama `supabase.auth.updateUser({ password: newPassword })` — no necesita servicio, va directo desde el componente

---

## Notas transversales

**RLS:** Las políticas de Supabase ya están configuradas para service_role=ALL y authenticated=SELECT. Las mutaciones (INSERT/UPDATE/DELETE) desde el cliente autenticado solo funcionarán si se añaden políticas `FOR INSERT/UPDATE/DELETE TO authenticated`. Cada fase debe verificar y añadir las políticas necesarias como migración nueva.

**Query invalidation:** Al cambiar `iglesiaActual`, invalidar `queryClient.invalidateQueries()` (sin filtro) para refrescar todos los datos al nuevo contexto.

**Vercel environment:** Las variables `VITE_*` son públicas en el bundle. La `SUPABASE_ANON_KEY` es segura por diseño (RLS la controla). El `SERVICE_ROLE_KEY` nunca debe estar en el frontend.

**Orden de implementación recomendado dentro de cada fase:**
1. Enrichment en el servicio
2. Hooks de lectura actualizados
3. Hooks de mutación nuevos
4. Componente actualizado
5. Migración SQL si se necesita política RLS nueva
6. Deploy (push a main)
