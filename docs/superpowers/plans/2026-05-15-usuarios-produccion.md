# Usuarios Producción Ready — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar todos los gaps del módulo de usuarios para producción: flujo de invitación y asignación de roles con integración atómica de `miembro_ministerio`, permisos correctos por rol de administrador.

**Architecture:** Un RPC Postgres `assign_role_with_ministerio` actúa como punto central para asignar rol + membresía de ministerio en una sola transacción. El edge function `invite-user` lo usa para usuarios existentes; `complete-invite` lo usa al crear usuarios nuevos; el service `assignRol` del frontend lo llama directamente vía supabase-js.

**Tech Stack:** PostgreSQL (Supabase), Deno (edge functions), React + TypeScript (frontend), supabase-js, TanStack Query.

---

## Contexto crítico antes de implementar

- `usuario_rol` y `usuario_rol_sede` NO tienen UNIQUE constraint en `(id_usuario, id_rol)` — el RPC debe usar `WHERE NOT EXISTS` para idempotencia.
- `miembro_ministerio` SÍ tiene `miembro_ministerio_unq_activo_usuario_ministerio` UNIQUE INDEX parcial en `(id_usuario, id_ministerio) WHERE fecha_salida IS NULL` — se puede usar `ON CONFLICT ON CONSTRAINT ... DO NOTHING`.
- ROLE IDs: `SUPER_ADMIN=1, ADMIN_IGLESIA=2, LIDER=3, SERVIDOR=4, ADMIN_SEDE=9`.
- Roles que requieren sede: `[3, 4, 9]`. Roles que además requieren ministerio: `[3, 4]`.
- No hay suite de tests configurada — verificación manual por checklist.
- El spec vive en `docs/superpowers/specs/2026-05-15-usuarios-produccion-design.md`.

## Archivos a modificar / crear

| Archivo | Acción |
|---|---|
| `supabase/migrations/20260515000000_users_ministerio_assign.sql` | Crear |
| `supabase/functions/invite-user/index.ts` | Modificar |
| `supabase/functions/complete-invite/index.ts` | Modificar |
| `src/services/usuarios.service.ts` | Modificar |
| `src/app/components/UsuariosPage.tsx` | Modificar (+ commit cambios en progreso) |

---

## Task 1: Migración — columna `id_ministerio` en `invite_tokens` + RPC `assign_role_with_ministerio`

**Files:**
- Create: `supabase/migrations/20260515000000_users_ministerio_assign.sql`

- [ ] **Step 1.1: Verificar constraints actuales en la DB**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('usuario_rol_sede','usuario_rol','miembro_ministerio')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

Usar la herramienta MCP `mcp__supabase__execute_sql`. Confirmar que:
- `miembro_ministerio_unq_activo_usuario_ministerio` existe en `miembro_ministerio`
- No hay UNIQUE constraint en `(id_usuario, id_rol)` en `usuario_rol_sede`

- [ ] **Step 1.2: Crear archivo de migración**

Crear `supabase/migrations/20260515000000_users_ministerio_assign.sql` con este contenido exacto:

```sql
-- Migración: soporte de ministerio en flujo de invitación y asignación de roles
-- Fecha: 2026-05-15

-- 1. Añadir id_ministerio a invite_tokens (nullable, solo para roles Lider/Servidor)
ALTER TABLE public.invite_tokens
  ADD COLUMN IF NOT EXISTS id_ministerio BIGINT
  REFERENCES public.ministerio(id_ministerio) ON DELETE SET NULL;

-- 2. RPC assign_role_with_ministerio
-- Asigna rol e inserta en miembro_ministerio en una sola transacción.
-- Usa WHERE NOT EXISTS para idempotencia en usuario_rol/usuario_rol_sede
-- (esas tablas no tienen UNIQUE constraint en id_usuario+id_rol).
-- Usa ON CONFLICT para miembro_ministerio (sí tiene unique index parcial).

CREATE OR REPLACE FUNCTION public.assign_role_with_ministerio(
  p_id_usuario    BIGINT,
  p_id_rol        BIGINT,
  p_id_iglesia    BIGINT,
  p_id_sede       BIGINT DEFAULT NULL,
  p_id_ministerio BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sede_roles  BIGINT[] := ARRAY[3, 4, 9];  -- lider, servidor, admin_sede
  v_min_roles   BIGINT[] := ARRAY[3, 4];      -- lider, servidor
  v_is_sede_role BOOLEAN;
  v_needs_min    BOOLEAN;
  v_id_asignado  BIGINT;
  v_rol_label    TEXT;
BEGIN
  v_is_sede_role := p_id_rol = ANY(v_sede_roles);
  v_needs_min    := p_id_rol = ANY(v_min_roles);

  -- Asignar rol (idempotente con WHERE NOT EXISTS)
  IF v_is_sede_role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol     = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND (id_sede = p_id_sede OR (id_sede IS NULL AND p_id_sede IS NULL))
        AND fecha_fin IS NULL
    ) THEN
      INSERT INTO public.usuario_rol_sede(id_usuario, id_rol, id_iglesia, id_sede, fecha_inicio)
      VALUES (p_id_usuario, p_id_rol, p_id_iglesia, p_id_sede, CURRENT_DATE)
      RETURNING id_usuario_rol_sede INTO v_id_asignado;
    ELSE
      SELECT id_usuario_rol_sede INTO v_id_asignado
      FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol     = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND (id_sede = p_id_sede OR (id_sede IS NULL AND p_id_sede IS NULL))
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol     = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
    ) THEN
      INSERT INTO public.usuario_rol(id_usuario, id_rol, id_iglesia, fecha_inicio)
      VALUES (p_id_usuario, p_id_rol, p_id_iglesia, CURRENT_DATE)
      RETURNING id_usuario_rol INTO v_id_asignado;
    ELSE
      SELECT id_usuario_rol INTO v_id_asignado
      FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol     = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  END IF;

  -- Insertar en miembro_ministerio si aplica
  -- miembro_ministerio_unq_activo_usuario_ministerio es UNIQUE en (id_usuario, id_ministerio) WHERE fecha_salida IS NULL
  IF v_needs_min AND p_id_ministerio IS NOT NULL THEN
    v_rol_label := CASE p_id_rol WHEN 3 THEN 'Líder' ELSE 'Servidor' END;
    INSERT INTO public.miembro_ministerio(id_usuario, id_ministerio, rol_en_ministerio, fecha_ingreso)
    VALUES (p_id_usuario, p_id_ministerio, v_rol_label, CURRENT_DATE)
    ON CONFLICT ON CONSTRAINT miembro_ministerio_unq_activo_usuario_ministerio DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'id_asignacion', v_id_asignado);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_role_with_ministerio TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_role_with_ministerio TO service_role;
```

- [ ] **Step 1.3: Aplicar migración vía MCP**

Usar `mcp__supabase__apply_migration` con:
- `name`: `users_ministerio_assign`
- `query`: contenido completo del archivo de arriba

- [ ] **Step 1.4: Verificar migración aplicada**

```sql
-- Confirmar columna existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invite_tokens' AND column_name = 'id_ministerio';

-- Confirmar función existe
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'assign_role_with_ministerio';
```

Usar `mcp__supabase__execute_sql`. Debe retornar 1 fila en cada query.

- [ ] **Step 1.5: Commit**

```bash
git add supabase/migrations/20260515000000_users_ministerio_assign.sql
git commit -m "feat(db): add invite_tokens.id_ministerio + assign_role_with_ministerio RPC"
```

---

## Task 2: Edge function `invite-user`

**Files:**
- Modify: `supabase/functions/invite-user/index.ts`

La función actual (línea ~130) deserializa `{ correo, nombres, apellidos, idIglesia, idRol, idSede }`. Necesita aceptar `idMinisterio`, validarlo, y usarlo.

- [ ] **Step 2.1: Actualizar deserialización del body**

Localizar la línea:
```typescript
const { correo, nombres, apellidos, idIglesia, idRol, idSede } = await req.json()
```

Reemplazarla por:
```typescript
const { correo, nombres, apellidos, idIglesia, idRol, idSede, idMinisterio } = await req.json()
```

- [ ] **Step 2.2: Actualizar derivación de `requiresMinisterio` y validación**

Localizar el bloque donde se define `isSedeRole`:
```typescript
const sedeRequiredRoles = new Set(['Administrador de Sede', 'Líder', 'Servidor'])
const isSedeRole = sedeRequiredRoles.has(targetRole.nombre)
const requiresMinisterio = targetRole.nombre === 'Líder' || targetRole.nombre === 'Servidor'
const sedeId = Number(idSede)

if (isSedeRole && (!sedeId || Number.isNaN(sedeId))) {
  return jsonResponse(origin, { message: 'Debes seleccionar una sede para este rol' }, 400)
}
```

Reemplazarlo por:
```typescript
const sedeRequiredRoles = new Set(['Administrador de Sede', 'Líder', 'Servidor'])
const isSedeRole = sedeRequiredRoles.has(targetRole.nombre)
const requiresMinisterio = targetRole.nombre === 'Líder' || targetRole.nombre === 'Servidor'
const sedeId = Number(idSede)
const ministerioId = idMinisterio ? Number(idMinisterio) : null

if (isSedeRole && (!sedeId || Number.isNaN(sedeId))) {
  return jsonResponse(origin, { message: 'Debes seleccionar una sede para este rol' }, 400)
}

if (requiresMinisterio && (!ministerioId || Number.isNaN(ministerioId))) {
  return jsonResponse(origin, { message: 'Debes seleccionar un ministerio para este rol' }, 400)
}
```

- [ ] **Step 2.3: Incluir `id_ministerio` en el insert de `invite_tokens`**

Localizar el bloque que inserta en `invite_tokens`:
```typescript
const { data: inviteToken, error: tokenError } = await supabaseAdmin
  .from('invite_tokens')
  .insert({
    token: tokenString,
    email: normalizedEmail,
    nombres: nombres,
    apellidos: apellidos,
    id_iglesia: idIglesia,
    id_rol: idRol,
    id_sede: isSedeRole ? sedeId : null,
    expires_at: expiresAt.toISOString(),
  })
```

Reemplazarlo por:
```typescript
const { data: inviteToken, error: tokenError } = await supabaseAdmin
  .from('invite_tokens')
  .insert({
    token: tokenString,
    email: normalizedEmail,
    nombres: nombres,
    apellidos: apellidos,
    id_iglesia: idIglesia,
    id_rol: idRol,
    id_sede: isSedeRole ? sedeId : null,
    id_ministerio: requiresMinisterio ? ministerioId : null,
    expires_at: expiresAt.toISOString(),
  })
```

- [ ] **Step 2.4: Eliminar bloque de verificación de membresía previa y reemplazar asignación de rol por RPC**

Localizar y **eliminar** este bloque completo (que bloqueaba erróneamente a usuarios sin membresía previa):
```typescript
if (requiresMinisterio) {
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('miembro_ministerio')
    .select('id_miembro_ministerio, ministerio!inner(id_sede)')
    .eq('id_usuario', usuarioId)
    .is('fecha_salida', null)
    .eq('ministerio.id_sede', sedeId)
    .limit(1)

  if (membershipError) throw membershipError
  if (!membership || membership.length === 0) {
    return jsonResponse(origin, { message: 'El usuario debe pertenecer a un ministerio de la sede para este rol' }, 400)
  }
}
```

Luego localizar el bloque que asigna rol a usuarios existentes:
```typescript
const assignmentTable = isSedeRole ? 'usuario_rol_sede' : 'usuario_rol'
const assignmentIdColumn = isSedeRole ? 'id_usuario_rol_sede' : 'id_usuario_rol'

const { data: existingAssignment, error: assignmentCheckError } = await supabaseAdmin
  .from(assignmentTable)
  .select(assignmentIdColumn)
  .eq('id_usuario', usuarioId)
  .eq('id_rol', idRol)
  .eq('id_iglesia', idIglesia)
  .is('fecha_fin', null)
  .maybeSingle()

if (assignmentCheckError) throw assignmentCheckError

let roleAssigned = false
if (!existingAssignment) {
  const { error: rolError } = await supabaseAdmin
    .from(assignmentTable)
    .insert({
      id_usuario: usuarioId,
      id_rol: idRol,
      id_iglesia: idIglesia,
      id_sede: isSedeRole ? sedeId : null,
      fecha_inicio: new Date().toISOString().split('T')[0],
    })
  if (rolError) throw rolError
  roleAssigned = true
}
```

Reemplazarlo por:
```typescript
const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
  'assign_role_with_ministerio',
  {
    p_id_usuario:    usuarioId,
    p_id_rol:        idRol,
    p_id_iglesia:    idIglesia,
    p_id_sede:       isSedeRole ? sedeId : null,
    p_id_ministerio: requiresMinisterio ? ministerioId : null,
  }
)
if (rpcError) throw rpcError
const roleAssigned = true
```

- [ ] **Step 2.5: Verificar que el return final sigue igual**

El bloque final debe quedar:
```typescript
return jsonResponse(origin, {
  success: true,
  inviteSent,
  profileReconciled,
  roleAssigned,
  userAlreadyExisted: !inviteSent,
})
```

Sin cambios en esa sección.

- [ ] **Step 2.6: Commit**

```bash
git add supabase/functions/invite-user/index.ts
git commit -m "feat(edge): invite-user accepts idMinisterio and uses assign_role_with_ministerio RPC"
```

---

## Task 3: Edge function `complete-invite`

**Files:**
- Modify: `supabase/functions/complete-invite/index.ts`

- [ ] **Step 3.1: Reemplazar insert manual de rol por RPC**

Localizar el bloque que asigna rol (líneas ~92-113):
```typescript
// Asignar rol
const targetTable = inviteToken.id_sede ? 'usuario_rol_sede' : 'usuario_rol'
const { error: rolError } = await supabaseAdmin
  .from(targetTable)
  .insert({
    id_usuario: usuario.id_usuario,
    id_rol: inviteToken.id_rol,
    id_iglesia: inviteToken.id_iglesia,
    id_sede: inviteToken.id_sede || null,
    fecha_inicio: new Date().toISOString().split('T')[0],
  })

if (rolError) {
  console.error('Error assigning role:', rolError)
  // Limpiar si falló
  await supabaseAdmin.from('usuario').delete().eq('id_usuario', usuario.id_usuario)
  await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
  return new Response(JSON.stringify({ error: 'Error asignando rol' }), {
    status: 500,
    headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
  })
}
```

Reemplazarlo por:
```typescript
// Asignar rol e insertar en miembro_ministerio si aplica (atómico via RPC)
const { error: rolError } = await supabaseAdmin.rpc('assign_role_with_ministerio', {
  p_id_usuario:    usuario.id_usuario,
  p_id_rol:        inviteToken.id_rol,
  p_id_iglesia:    inviteToken.id_iglesia,
  p_id_sede:       inviteToken.id_sede ?? null,
  p_id_ministerio: inviteToken.id_ministerio ?? null,
})

if (rolError) {
  console.error('Error assigning role:', rolError)
  // Limpiar si falló
  await supabaseAdmin.from('usuario').delete().eq('id_usuario', usuario.id_usuario)
  await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
  return new Response(JSON.stringify({ error: 'Error asignando rol' }), {
    status: 500,
    headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
  })
}
```

- [ ] **Step 3.2: Commit**

```bash
git add supabase/functions/complete-invite/index.ts
git commit -m "feat(edge): complete-invite uses assign_role_with_ministerio RPC"
```

---

## Task 4: Service `usuarios.service.ts`

**Files:**
- Modify: `src/services/usuarios.service.ts`

- [ ] **Step 4.1: Actualizar `inviteUser` para pasar `idMinisterio`**

Localizar el tipo del parámetro de `inviteUser`:
```typescript
export async function inviteUser(data: {
  correo: string
  nombres: string
  apellidos: string
  idIglesia: number
  idRol: number
  idSede?: number | null
}): Promise<{ success: boolean; message: string }> {
```

Reemplazarlo por:
```typescript
export async function inviteUser(data: {
  correo: string
  nombres: string
  apellidos: string
  idIglesia: number
  idRol: number
  idSede?: number | null
  idMinisterio?: number | null
}): Promise<{ success: boolean; message: string }> {
```

Localizar la línea donde se invoca la edge function y se pasa `data`:
```typescript
const { data: result, error } = await supabase.functions.invoke('invite-user', {
  body: data,
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
```

Sin cambios — `data` ya incluirá `idMinisterio` al ser el objeto completo.

- [ ] **Step 4.2: Reemplazar `assignRol` completo por llamada al RPC**

Localizar la función `assignRol` completa (desde `export async function assignRol` hasta su cierre `}`). Reemplazarla por:

```typescript
export async function assignRol(data: {
  idUsuario: number
  idRol: number
  idIglesia: number
  idSede?: number | null
  idMinisterio?: number | null
}): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.rpc('assign_role_with_ministerio', {
    p_id_usuario:    data.idUsuario,
    p_id_rol:        data.idRol,
    p_id_iglesia:    data.idIglesia,
    p_id_sede:       data.idSede ?? null,
    p_id_ministerio: data.idMinisterio ?? null,
  })
  if (error) throw new Error(error.message || 'Error al asignar el rol')
  return { success: true, message: 'Rol asignado correctamente' }
}
```

- [ ] **Step 4.3: Commit**

```bash
git add src/services/usuarios.service.ts
git commit -m "feat(service): inviteUser and assignRol pass idMinisterio via RPC"
```

---

## Task 5: Componente `UsuariosPage.tsx` — completar y cerrar cambios en progreso

**Files:**
- Modify: `src/app/components/UsuariosPage.tsx`

Hay cambios ya en staging (diff en progreso) que cubren: ministerio selector en formularios, delete solo para super_admin, iglesia deshabilitada para admin_iglesia, error handling de removeRol. Este task completa lo que falta: pasar `idMinisterio` a las dos mutations.

- [ ] **Step 5.1: Pasar `idMinisterio` en `handleInvite`**

Localizar el bloque `inviteMutation.mutate(`:
```typescript
inviteMutation.mutate(
  {
    correo: inviteForm.correo.trim(),
    nombres: inviteForm.nombres.trim(),
    apellidos: inviteForm.apellidos.trim(),
    idIglesia: inviteForm.idIglesia,
    idRol: inviteForm.idRol,
    idSede: inviteForm.idSede || null,
  },
```

Reemplazarlo por:
```typescript
inviteMutation.mutate(
  {
    correo: inviteForm.correo.trim(),
    nombres: inviteForm.nombres.trim(),
    apellidos: inviteForm.apellidos.trim(),
    idIglesia: inviteForm.idIglesia,
    idRol: inviteForm.idRol,
    idSede: inviteForm.idSede || null,
    idMinisterio: inviteForm.idMinisterio || null,
  },
```

- [ ] **Step 5.2: Pasar `idMinisterio` en `handleAssignRol`**

Localizar el bloque `assignRolMutation.mutate(`:
```typescript
assignRolMutation.mutate(
  {
    idUsuario: showAssignRol,
    idRol: assignForm.idRol,
    idIglesia: assignForm.idIglesia,
    idSede: assignForm.idSede || null,
  },
```

Reemplazarlo por:
```typescript
assignRolMutation.mutate(
  {
    idUsuario: showAssignRol,
    idRol: assignForm.idRol,
    idIglesia: assignForm.idIglesia,
    idSede: assignForm.idSede || null,
    idMinisterio: assignForm.idMinisterio || null,
  },
```

- [ ] **Step 5.3: Commit todos los cambios pendientes de UsuariosPage**

```bash
git add src/app/components/UsuariosPage.tsx src/app/constants/roles.ts
git commit -m "feat(ui): complete usuarios module - ministerio selection, role permissions, error handling"
```

---

## Task 6: Deploy edge functions

- [ ] **Step 6.1: Deploy `invite-user`**

Usar `mcp__supabase__deploy_edge_function` con:
- `name`: `invite-user`
- `files`: leer el contenido actual de `supabase/functions/invite-user/index.ts`

- [ ] **Step 6.2: Deploy `complete-invite`**

Usar `mcp__supabase__deploy_edge_function` con:
- `name`: `complete-invite`
- `files`: leer el contenido actual de `supabase/functions/complete-invite/index.ts`

- [ ] **Step 6.3: Verificar deploy**

Usar `mcp__supabase__list_edge_functions` y confirmar que `invite-user` y `complete-invite` aparecen con estado activo.

---

## Task 7: Verificación end-to-end (checklist manual)

Con la app corriendo (`npm run dev`), verificar:

### 7.A — Super Admin invita usuario nuevo con rol Líder
- [ ] Loguearse como `super@test.dev`
- [ ] Ir a Usuarios → Invitar usuario
- [ ] Seleccionar cualquier iglesia → aparece dropdown de sede → al elegir sede aparece dropdown de ministerio
- [ ] Si no se elige ministerio → botón deshabilitado + toast de error al intentar submit
- [ ] Llenar todos los campos y enviar → toast de éxito
- [ ] En Supabase: verificar que `invite_tokens` tiene `id_ministerio` poblado

### 7.B — Super Admin asigna rol Servidor a usuario existente
- [ ] Abrir perfil de un usuario existente → Asignar rol
- [ ] Seleccionar rol Servidor → aparece sede → aparece ministerio
- [ ] Asignar → toast de éxito
- [ ] En Supabase ejecutar:
  ```sql
  SELECT urs.*, mm.id_ministerio, mm.rol_en_ministerio
  FROM usuario_rol_sede urs
  LEFT JOIN miembro_ministerio mm ON mm.id_usuario = urs.id_usuario
  WHERE urs.id_usuario = <ID_USUARIO>
    AND urs.fecha_fin IS NULL;
  ```
  Confirmar que hay fila en `usuario_rol_sede` Y fila en `miembro_ministerio`.

### 7.C — Admin Iglesia ve su iglesia pre-seleccionada
- [ ] Loguearse como `admin@test.dev`
- [ ] Ir a Usuarios → Invitar usuario
- [ ] Verificar que el campo Iglesia muestra "Tu iglesia" y está deshabilitado
- [ ] Verificar que solo ve las sedes de su iglesia

### 7.D — Idempotencia del RPC
- [ ] Asignar el mismo rol dos veces al mismo usuario → segunda vez no lanza error
- [ ] Verificar en Supabase que no hay duplicados en `usuario_rol_sede`

### 7.E — Usuario acepta invitación (rol Líder)
- [ ] Ir al email → link de invitación → completar registro
- [ ] En Supabase verificar:
  ```sql
  SELECT u.nombres, urs.id_rol, mm.id_ministerio
  FROM usuario u
  JOIN usuario_rol_sede urs ON urs.id_usuario = u.id_usuario
  JOIN miembro_ministerio mm ON mm.id_usuario = u.id_usuario
  WHERE u.correo = '<email_invitado>'
    AND urs.fecha_fin IS NULL
    AND mm.fecha_salida IS NULL;
  ```
  Debe retornar 1 fila con los tres campos poblados.

### 7.F — Botón eliminar usuario
- [ ] Como Super Admin: botón eliminar visible ✓
- [ ] Como Admin Iglesia: botón eliminar NO visible ✓

---

## Notas de implementación

- La migración usa `ADD COLUMN IF NOT EXISTS` — seguro de re-ejecutar.
- `assign_role_with_ministerio` tiene `SECURITY DEFINER SET search_path = public` — inmune a search_path injection.
- Al eliminar el bloque de verificación de membresía previa en `invite-user`, se elimina también el comportamiento que bloqueaba invitar a un usuario ya existente si no era miembro del ministerio. El RPC ahora crea la membresía si no existe.
- Si `miembro_ministerio` ya tiene una membresía activa en ese ministerio (`ON CONFLICT DO NOTHING`), la inserción se omite silenciosamente — el rol de ministerio existente se preserva.
