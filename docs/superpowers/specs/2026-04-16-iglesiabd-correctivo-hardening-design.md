# IGLESIABD — Correctivo + Completar CRUDs + Hardening DB

**Fecha:** 2026-04-16
**Estado:** Diseño aprobado
**Autor:** Brainstorming session
**Alcance:** 4 fases secuenciales ejecutables por un agente de código

---

## Motivación

Después de revisar los CRUD del rol `super_admin` se identificaron problemas concretos:

1. **403 Forbidden** en mutaciones sobre `pais`/`departamento`/`ciudad` — falta RLS de INSERT/UPDATE/DELETE.
2. **400 Bad Request** al cargar la lista enriquecida de usuarios (embed `usuario_rol` + `miembro_ministerio`) — bloqueado por la RLS de `usuario` que solo deja ver el propio perfil.
3. CRUDs incompletos: no se puede editar datos básicos de un usuario desde la UI, bug en `RoleRow`, faltan services/hooks para `miembro_ministerio` update y `proceso_asignado_curso` / `detalle_proceso_curso` create.
4. Advertencias del Supabase advisor:
   - **Seguridad:** funciones `is_admin_iglesia`, `is_lider`, `get_user_ministerios` con `search_path` mutable.
   - **Performance:** FKs sin índices (listado del advisor).

Este spec describe el plan completo. Se excluye deliberadamente la mejora de UX (optimistic updates + realtime) — merece su propio spec cuando las 4 fases acá estén estables.

---

## Alcance

**Incluido:**
- Fase 1 — Correctivo (RLS geografía + RPC para usuarios enriquecidos).
- Fase 2 — Completar CRUDs faltantes del super_admin.
- Fase 3 — Hardening DB (seguridad: `search_path`).
- Fase 4 — Hardening DB (performance: índices FK).

**Excluido:**
- Optimistic updates, realtime subscriptions (Fase 5 deferida).
- Refactors no relacionados.
- Cambios de UI fuera de `UsuariosPage`.

---

## Extensión solicitada — Gestión de usuarios por Administrador de Iglesia

### Diagnóstico actual (estado real)

1. El flujo de invitación permite enviar `idIglesia` e `idRol` desde cliente hasta Edge Function sin validación fuerte de alcance del actor.
2. Las políticas de mutación de `usuario` y `usuario_rol` siguen permisivas (`USING (true)` / `WITH CHECK (true)`), por lo que el control real depende de la UI y no de la BD.
3. No existe separación explícita entre:
  - Identidad (Auth)
  - Perfil de aplicación (`usuario`)
  - Pertenencia eclesial (tenant)
  - Membresía ministerial (`miembro_ministerio`)

### Principios de ingeniería aplicables

- Menor privilegio: toda autorización se valida en DB/API, nunca solo en frontend.
- Fuente única de verdad: la iglesia del actor se resuelve en backend, no por payload del cliente.
- Separación de responsabilidades: Auth para identidad; tablas de dominio para permisos y pertenencia.
- Auditabilidad: cada asignación/cambio de rol debe quedar trazable.

### Diseño recomendado (target)

1. Mantener `auth.users` como identidad.
2. Mantener `public.usuario` como perfil local (ya enlazado por `auth_user_id`).
3. Usar `usuario_rol` como asignación de rol por iglesia/sede, pero con reglas estrictas:
  - `Administrador de Iglesia` solo puede gestionar usuarios dentro de sus iglesias activas.
  - No puede asignar `Super Administrador`.
  - No puede gestionar usuarios fuera de su `id_iglesia`.
4. Mantener `miembro_ministerio` para pertenencia a ministerios, desacoplada del alta de usuario.

### Alternativas de modelado para relación con miembros

**Alternativa A (rápida, mínima migración):**
- El usuario existe en `usuario` y su pertenencia a iglesia se interpreta por `usuario_rol` activo (`id_iglesia`).
- La relación con ministerio se mantiene en `miembro_ministerio`.
- Ventaja: menor costo inmediato.
- Riesgo: cuesta modelar "miembro sin rol de plataforma" y cambios históricos de membresía general.

**Alternativa B (recomendada mediano plazo):**
- Crear tabla `miembro_iglesia` (o `membresia_iglesia`) para separar membresía general de roles operativos.
- `usuario_rol` queda solo para permisos, `miembro_iglesia` para ciclo de vida pastoral/administrativo.
- Ventaja: dominio más limpio, mejor trazabilidad y escalabilidad.
- Costo: migración y ajustes en servicios/UI.

### Plan por fases (antes de implementar)

#### Fase A — Cerradura de seguridad inmediata

1. Reemplazar políticas permisivas de `usuario` y `usuario_rol` por políticas por alcance (super admin global, admin iglesia solo su tenant).
2. Estandarizar helpers SQL `SECURITY DEFINER` con `SET search_path = public`:
  - `is_super_admin()`
  - `get_user_iglesias()`
  - `is_admin_of_iglesia(target_iglesia_id bigint)`
3. Ajustar Edge Function `invite-user`:
  - Validar JWT del caller.
  - Resolver roles/iglesias del caller en backend.
  - Ignorar o validar estrictamente `idIglesia` recibido.
  - Bloquear asignación de rol fuera de catálogo permitido por actor.

#### Fase B — Flujo funcional Admin Iglesia

1. Caso "crear/invitar usuario":
  - Admin iglesia invita correo.
  - Sistema crea perfil (`handle_new_user`) y asigna rol en su misma iglesia.
  - Estado inicial recomendado: activo en plataforma, sin membresía ministerial.
2. Caso "relacionar con miembro/ministerio":
  - Acción separada posterior (no en el mismo paso de invitación).
  - Asignación en `miembro_ministerio` validando que ministerio pertenezca a la iglesia del admin.
3. Caso "cambio de rol":
  - Cierre histórico vía `fecha_fin` y alta nueva fila en `usuario_rol`.

#### Fase C — Robustez de dominio (si se aprueba Alternativa B)

1. Crear `miembro_iglesia` con estado y vigencia.
2. Migrar reglas de negocio para que "miembro" no dependa de tener rol de plataforma.
3. Ajustar reportes/listados para usar membresía y no inferencias por `usuario_rol`.

### Reglas funcionales propuestas

1. `Super Administrador` puede crear/gestionar usuarios en cualquier iglesia.
2. `Administrador de Iglesia` solo en sus iglesias activas.
3. `Administrador de Iglesia` no puede elevar privilegios a `Super Administrador`.
4. Toda asignación requiere `id_iglesia` válido dentro del alcance del actor.
5. El frontend no decide permisos; solo muestra acciones que el backend ya autoriza.

### Entregables de planificación (siguiente paso)

1. Especificación de políticas RLS tabla por tabla (`usuario`, `usuario_rol`, `miembro_ministerio`).
2. Contrato de Edge Function `invite-user` v2 (payload permitido, validaciones, errores).
3. Decisión formal entre Alternativa A y B con impacto en migraciones y UI.

---

## Estrategia de ejecución

- Cada fase es **independiente y testeable** — el agente ejecuta, verifica, y solo pasa a la siguiente cuando la verificación pasa.
- Ningún commit intermedio. **Un único commit al final** agrupando las 4 fases, con mensaje estructurado.
- Las migraciones se aplican contra el proyecto remoto vía `supabase db push`.
- Si una fase falla verificación, el agente detiene la ejecución y reporta.

---

## Fase 1 — Correctivo

### 1.1 Aplicar migración RLS geografía

**Estado:** archivo ya creado en el working tree.

**Archivo:** [supabase/migrations/20260416120000_phase6_rls_geografia.sql](../../../supabase/migrations/20260416120000_phase6_rls_geografia.sql)

Políticas incluidas: SELECT/INSERT/UPDATE/DELETE autenticados sobre `pais`, `departamento`, `ciudad`, `tipo_evento`; SELECT autenticado sobre `rol`.

**Acción del agente:**
```bash
cd /home/juanda/Proyectofinal
supabase db push
```

**Verificación:**
- `supabase migration list` muestra `20260416120000_phase6_rls_geografia` como aplicada.
- Desde la UI del super_admin en `/app/geografia`: crear un país de prueba, editarlo, eliminarlo — ninguna operación devuelve 403.

### 1.2 RPC `get_all_usuarios_enriquecidos`

**Causa raíz:** La política RLS `Usuario ve su propio perfil` (en `20260407031130_rls_authenticated_reads.sql`) restringe `SELECT` en `usuario` a filas donde `auth_user_id = auth.uid()`. El super_admin solo recupera su propia fila, y el embed `usuario_rol(...)` con `rol(nombre)` e `iglesia(nombre)` falla con 400 por la política en cascada.

**Solución:** nueva función `SECURITY DEFINER` que retorna la lista enriquecida completa, siguiendo el patrón ya establecido en [supabase/migrations/20260410_fix_rls_auth_functions.sql](../../../supabase/migrations/20260410_fix_rls_auth_functions.sql) (`get_my_usuario`, `get_my_roles`).

**Nueva migración:** `supabase/migrations/20260416120100_rpc_usuarios_enriquecidos.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_all_usuarios_enriquecidos()
RETURNS TABLE (
  id_usuario bigint,
  nombres text,
  apellidos text,
  correo text,
  telefono text,
  activo boolean,
  ultimo_acceso timestamptz,
  auth_user_id uuid,
  creado_en timestamptz,
  updated_at timestamptz,
  roles jsonb,
  ministerios jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id_usuario, u.nombres, u.apellidos, u.correo, u.telefono,
    u.activo, u.ultimo_acceso, u.auth_user_id, u.creado_en, u.updated_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_usuario_rol', ur.id_usuario_rol,
        'id_rol', ur.id_rol,
        'id_iglesia', ur.id_iglesia,
        'fecha_fin', ur.fecha_fin,
        'rol_nombre', r.nombre,
        'iglesia_nombre', i.nombre
      ))
      FROM public.usuario_rol ur
      JOIN public.rol r ON r.id_rol = ur.id_rol
      JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia
      WHERE ur.id_usuario = u.id_usuario
    ), '[]'::jsonb) AS roles,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_miembro_ministerio', mm.id_miembro_ministerio,
        'activo', mm.activo,
        'rol_en_ministerio', mm.rol_en_ministerio,
        'ministerio_nombre', m.nombre
      ))
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = u.id_usuario
    ), '[]'::jsonb) AS ministerios
  FROM public.usuario u
  ORDER BY u.apellidos;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() TO authenticated;
```

**Refactor del servicio:** [src/services/usuarios.service.ts:76-101](../../../src/services/usuarios.service.ts#L76-L101)

Reemplazar la implementación que usa `.from('usuario').select('...')` con embed, por una que llame `supabase.rpc('get_all_usuarios_enriquecidos')`.

**Mapping responsabilidad del service:** la RPC devuelve JSON con keys snake_case (`id_usuario`, `rol_nombre`, `iglesia_nombre`, `id_rol`, `id_iglesia`, etc.). El service debe convertir a la shape camelCase de `UsuarioEnriquecido` que ya consumen los componentes. Extender explícitamente `roleNames` para incluir `idRol: number` e `idIglesia: number` (necesarios para la corrección de 2.2):

```ts
roleNames: Array<{
  idUsuarioRol: number
  idRol: number         // NUEVO
  idIglesia: number     // NUEVO
  rolNombre: string
  iglesiaNombre: string
  fechaFin: string | null
}>
```

El shape `minNames` se mantiene como está. No se rompen consumidores — solo se agregan campos.

**Verificación:**
- `/app/usuarios` carga la lista completa sin 400.
- Los roles y ministerios se muestran correctamente por usuario.

---

## Fase 2 — Completar CRUDs super_admin

### 2.1 Edición de Usuario en `UsuariosPage`

**Archivo:** [src/app/components/UsuariosPage.tsx](../../../src/app/components/UsuariosPage.tsx)

- Importar `useUpdateUsuario` desde `@/hooks/useUsuarios` (hook ya existe).
- Agregar estado `editUser: number | null` y `editForm: { nombres, apellidos, telefono }`.
- Agregar botón lápiz en la fila de acciones (junto a Ver / Asignar rol / Toggle activo).
- Diálogo de edición con los 3 inputs; submit llama `useUpdateUsuario` con `{ id, data }`.
- Toast de éxito/error usando `sonner`.

**Verificación:** Editar nombre de un usuario existente y ver el cambio reflejado tras el fetch.

### 2.2 Fix bug RoleRow

**Archivo:** [src/app/components/UsuariosPage.tsx:429-453](../../../src/app/components/UsuariosPage.tsx#L429-L453)

**Problema actual:** `matchingRol = userRoles.find(ur => ur.fechaFin === null)` siempre devuelve el primer rol activo, no el que se está renderizando.

**Solución:** pasar `idRol` y `idIglesia` como props al componente, y matchear ambos:
```tsx
const matchingRol = userRoles.find(ur =>
  ur.fechaFin === null &&
  ur.idRol === idRol &&
  ur.idIglesia === idIglesia
);
```

El consumidor en el loop de roles debe conocer `idRol`/`idIglesia`. Si la shape actual de `roleNames` no los incluye, ampliar `UsuarioEnriquecido.roleNames` en [src/services/usuarios.service.ts:71-74](../../../src/services/usuarios.service.ts#L71-L74) para agregar `idRol: number; idIglesia: number`. La nueva RPC de 1.2 ya los puede incluir.

**Verificación:** Si un usuario tiene 2 roles activos en iglesias distintas, al pulsar "X" en el segundo se elimina ese específicamente y no el primero.

### 2.3 `updateMiembroMinisterio` (service + hook, sin UI)

**Archivo service:** [src/services/ministerios.service.ts](../../../src/services/ministerios.service.ts)

Agregar:
```ts
export async function updateMiembroMinisterio(
  id: number,
  data: { rolEnMinisterio?: string; activo?: boolean; fechaSalida?: string | null }
): Promise<MiembroMinisterio> {
  const patch: Record<string, unknown> = {}
  if (data.rolEnMinisterio !== undefined) patch.rol_en_ministerio = data.rolEnMinisterio
  if (data.activo !== undefined) patch.activo = data.activo
  if (data.fechaSalida !== undefined) patch.fecha_salida = data.fechaSalida
  const { data: result, error } = await supabase
    .from('miembro_ministerio')
    .update(patch)
    .eq('id_miembro_ministerio', id)
    .select()
    .single()
  if (error) throw error
  return mapMiembroMinisterio(result)
}
```

**Archivo hook:** [src/hooks/useMinisterios.ts](../../../src/hooks/useMinisterios.ts)

Agregar `useUpdateMiembroMinisterio` siguiendo el patrón de los otros mutation hooks (invalidar `['miembros-ministerio']` y `['miembros-ministerio-enriquecidos']`).

**Verificación:** llamar el hook desde devtools/console actualiza la fila.

### 2.4 `createProcesoAsignadoCurso` + `createDetalleProcesoCurso`

**Archivo service:** [src/services/cursos.service.ts](../../../src/services/cursos.service.ts)

Agregar dos funciones siguiendo el patrón de los otros `create*` del mismo archivo:

```ts
export async function createProcesoAsignadoCurso(data: {
  idCurso: number
  idUsuario: number
  idCicloLectivo: number | null
  estado?: string
}): Promise<ProcesoAsignadoCurso> { /* insert + map */ }

export async function createDetalleProcesoCurso(data: {
  idProcesoAsignadoCurso: number
  idModulo: number
  estado?: string
  porcentajeAvance?: number
}): Promise<DetalleProcesoCurso> { /* insert + map */ }
```

Tipos y mappers: verificar que existan en [src/types/app.types.ts](../../../src/types/app.types.ts) y agregar lo que falte.

**Archivo hook:** [src/hooks/useCursos.ts](../../../src/hooks/useCursos.ts)

Agregar `useCreateProcesoAsignadoCurso` y `useCreateDetalleProcesoCurso` invalidando las query keys correspondientes.

**Verificación:** llamar cada hook con datos válidos persiste el insert (comprobable con `supabase.from(...).select()` manual).

---

## Fase 3 — Hardening DB seguridad

### 3.1 Fijar `search_path` en funciones SECURITY DEFINER

**Causa raíz:** las funciones `is_admin_iglesia`, `is_lider`, `get_user_ministerios` no fijan `search_path`, lo que permite que un atacante con permiso de schema pueda crear objetos con el mismo nombre en un schema anterior del `search_path` del caller y secuestrar la resolución de nombres (CVE-2018-1058 class).

**Nueva migración:** `supabase/migrations/20260416120200_fix_function_search_path.sql`

```sql
ALTER FUNCTION public.is_admin_iglesia(bigint) SET search_path = public;
ALTER FUNCTION public.is_lider(bigint) SET search_path = public;
ALTER FUNCTION public.get_user_ministerios() SET search_path = public;
-- + cualquier otra función que el security advisor señale
```

**Acción previa:** el agente debe correr el advisor para obtener la lista actualizada:
```
mcp__plugin_supabase_supabase__get_advisors type=security
```
Y ampliar la migración si aparece otra función.

**Verificación:** re-correr `get_advisors type=security` — las entradas "Function Search Path Mutable" deben desaparecer.

---

## Fase 4 — Hardening DB performance

### 4.1 Índices en FKs faltantes

**Causa raíz:** el performance advisor de Supabase marca FKs sin índice: cualquier JOIN o DELETE sobre la tabla padre fuerza table scan.

**Acción previa:** el agente corre:
```
mcp__plugin_supabase_supabase__get_advisors type=performance
```
Y extrae la lista exacta de FKs señaladas.

**Nueva migración:** `supabase/migrations/20260416120300_fk_indexes_missing.sql`

Por cada FK reportada:
```sql
CREATE INDEX IF NOT EXISTS idx_<tabla>_<columna>
  ON public.<tabla>(<columna>);
```

**Verificación:** re-correr `get_advisors type=performance` — las entradas "Unindexed foreign keys" deben desaparecer.

---

## Finalización

### Commit único

Una vez las 4 fases pasen verificación:

```bash
cd /home/juanda/Proyectofinal
git add -A  # (solo tras revisar git status que no hay archivos inesperados)
git commit -m "$(cat <<'EOF'
Fix super_admin CRUDs + RLS/hardening DB

- RLS INSERT/UPDATE/DELETE en pais/departamento/ciudad/tipo_evento
- RPC get_all_usuarios_enriquecidos (bypassa RLS de usuario vía SECURITY DEFINER)
- UsuariosPage: diálogo de edición + fix bug RoleRow (match por idRol+idIglesia)
- Services/hooks: updateMiembroMinisterio, createProcesoAsignadoCurso, createDetalleProcesoCurso
- search_path fijo en funciones SECURITY DEFINER (is_admin_iglesia, is_lider, get_user_ministerios)
- Índices en FKs faltantes reportadas por el performance advisor

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

**Sin push.** El usuario decide cuándo hacer `git push`.

---

## Criterios globales de éxito

1. `npm run build` corre sin errores de TypeScript.
2. `/app/geografia`, `/app/usuarios`, `/app/iglesias`, `/app/sedes`, `/app/pastores`, `/app/catalogos` operan sin 4xx/5xx en la consola del browser.
3. `supabase migration list` muestra las 4 nuevas migraciones aplicadas al remoto.
4. `get_advisors type=security` sin warnings sobre `search_path` en las funciones tratadas.
5. `get_advisors type=performance` sin warnings sobre FKs sin índice tratadas.
6. Un único commit nuevo en `main`, sin push automático.

---

## Riesgos y rollback

- **Migraciones aplicadas contra remoto:** si una migración falla a mitad de camino, el remoto puede quedar en estado inconsistente. El agente debe detenerse y reportar — no intentar "arreglar" con más migraciones.
- **RPC SECURITY DEFINER:** amplía visibilidad. Aceptable porque el super_admin ya tiene ese acceso por diseño. Si en el futuro se requiere granularidad por rol, se migra a RLS nativo con helper `is_super_admin()`.
- **Rollback de migración:** si se requiere revertir, crear nueva migración con `DROP POLICY` / `DROP FUNCTION` / `DROP INDEX`. No usar `supabase db reset` contra remoto.

---

## Fuera de alcance (explícito)

- Optimistic updates en React Query.
- Realtime subscriptions (`supabase.channel`).
- RLS granular por rol (`is_super_admin()` helper).
- Refactor de componentes no relacionados.
- Tests automatizados (el proyecto no tiene suite configurada).
