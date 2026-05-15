# Diseño: Módulo Usuarios — Producción Ready

**Fecha:** 2026-05-15  
**Estado:** Aprobado  
**Scope:** Flujo completo de invitación y asignación de roles con integración `miembro_ministerio`, permisos por rol de administrador, y cierre de todos los gaps identificados.

---

## Contexto y problema

El módulo de usuarios tiene la UI parcialmente implementada (cambios en progreso en rama `main`) pero presenta gaps críticos que impiden su uso en producción:

1. `invite_tokens` no tiene columna `id_ministerio` → el flujo de aceptar invitación nunca crea membresía en ministerio
2. `invite-user` edge function no recibe ni valida `idMinisterio`, y para usuarios existentes asigna rol sin crear `miembro_ministerio`
3. `complete-invite` asigna rol pero nunca inserta en `miembro_ministerio`
4. `assignRol` (asignación directa a usuario ya registrado) solo toca `usuario_rol_sede`, nunca `miembro_ministerio`
5. Los formularios ya recolectan `idMinisterio` (diff en progreso) pero las llamadas a las mutations nunca lo pasan

**Roles que requieren sede:** `ADMIN_SEDE (9)`, `LIDER (3)`, `SERVIDOR (4)`  
**Roles que además requieren ministerio:** `LIDER (3)`, `SERVIDOR (4)`

---

## Enfoque elegido: RPC atómico (Opción B)

Un RPC Postgres `assign_role_with_ministerio` que en una sola transacción:
- Inserta en `usuario_rol` o `usuario_rol_sede` según el rol
- Inserta en `miembro_ministerio` si el rol es Líder o Servidor
- Es idempotente (`ON CONFLICT DO NOTHING`) — seguro de reintentar

Todos los paths (invitar usuario nuevo, invitar usuario existente, asignar rol directo) convergen en este RPC.

---

## Sección 1: Base de datos

### Migración única

**Archivo:** `supabase/migrations/20260515000000_users_ministerio_assign.sql`

#### 1.1 Columna `id_ministerio` en `invite_tokens`

```sql
ALTER TABLE invite_tokens
  ADD COLUMN id_ministerio BIGINT REFERENCES ministerio(id_ministerio);
```

Nullable. Solo se llena cuando el rol invitado es Líder (3) o Servidor (4).

#### 1.2 RPC `assign_role_with_ministerio`

```sql
CREATE OR REPLACE FUNCTION assign_role_with_ministerio(
  p_id_usuario    BIGINT,
  p_id_rol        BIGINT,
  p_id_iglesia    BIGINT,
  p_id_sede       BIGINT DEFAULT NULL,
  p_id_ministerio BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sede_roles BIGINT[] := ARRAY[3, 4, 9];
  v_min_roles  BIGINT[] := ARRAY[3, 4];
  v_is_sede_role BOOLEAN;
  v_needs_min    BOOLEAN;
  v_id_asignado  BIGINT;
  v_rol_label    TEXT;
BEGIN
  v_is_sede_role := p_id_rol = ANY(v_sede_roles);
  v_needs_min    := p_id_rol = ANY(v_min_roles);

  IF v_is_sede_role THEN
    INSERT INTO usuario_rol_sede(id_usuario, id_rol, id_iglesia, id_sede, fecha_inicio)
    VALUES (p_id_usuario, p_id_rol, p_id_iglesia, p_id_sede, CURRENT_DATE)
    ON CONFLICT DO NOTHING
    RETURNING id_usuario_rol_sede INTO v_id_asignado;
  ELSE
    INSERT INTO usuario_rol(id_usuario, id_rol, id_iglesia, fecha_inicio)
    VALUES (p_id_usuario, p_id_rol, p_id_iglesia, CURRENT_DATE)
    ON CONFLICT DO NOTHING
    RETURNING id_usuario_rol INTO v_id_asignado;
  END IF;

  IF v_needs_min AND p_id_ministerio IS NOT NULL THEN
    SELECT CASE p_id_rol WHEN 3 THEN 'Líder' ELSE 'Servidor' END INTO v_rol_label;
    INSERT INTO miembro_ministerio(id_usuario, id_ministerio, rol_en_ministerio, fecha_ingreso)
    VALUES (p_id_usuario, p_id_ministerio, v_rol_label, CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'id_asignacion', v_id_asignado);
END;
$$;

GRANT EXECUTE ON FUNCTION assign_role_with_ministerio TO authenticated;
```

**Invariantes:**
- Ambas inserciones van en la misma transacción Postgres
- Si el rol ya existe activo, no lanza error (idempotente)
- `SECURITY DEFINER` — bypasses RLS para estas escrituras específicas

---

## Sección 2: Edge functions

### 2.1 `invite-user/index.ts`

**Cambios:**
1. Deserializar `idMinisterio` del body JSON
2. Derivar `requiresMinisterio = targetRole.nombre === 'Líder' || targetRole.nombre === 'Servidor'`
3. Validar: si `requiresMinisterio && !idMinisterio` → 400 `'Debes seleccionar un ministerio para este rol'`
4. Para **usuario nuevo**: incluir `id_ministerio: requiresMinisterio ? idMinisterio : null` en el insert de `invite_tokens`
5. Para **usuario existente**: reemplazar el insert manual en `usuario_rol_sede` por llamada a RPC `assign_role_with_ministerio`
6. Eliminar el bloque de verificación de membresía previa (`requiresMinisterio` check que bloqueaba usuarios sin membresía) — el RPC crea la membresía si no existe

**Firma del body entrante:**
```typescript
{ correo, nombres, apellidos, idIglesia, idRol, idSede, idMinisterio }
```

### 2.2 `complete-invite/index.ts`

**Cambios:**
1. Leer `id_ministerio` del registro `invite_tokens` (ya disponible tras migración)
2. Reemplazar el insert manual en `usuario_rol_sede` (líneas 93-113) por llamada al RPC:
   ```typescript
   await supabaseAdmin.rpc('assign_role_with_ministerio', {
     p_id_usuario:    usuario.id_usuario,
     p_id_rol:        inviteToken.id_rol,
     p_id_iglesia:    inviteToken.id_iglesia,
     p_id_sede:       inviteToken.id_sede ?? null,
     p_id_ministerio: inviteToken.id_ministerio ?? null,
   })
   ```
3. Si el RPC falla → limpiar auth user + fila usuario (comportamiento actual, sin cambio)

---

## Sección 3: Frontend

### 3.1 `src/services/usuarios.service.ts`

**`inviteUser`** — añadir `idMinisterio?: number | null` al tipo de parámetro e incluirlo en el body:
```typescript
const { correo, nombres, apellidos, idIglesia, idRol, idSede, idMinisterio } = data
// body: { correo, nombres, apellidos, idIglesia, idRol, idSede, idMinisterio }
```

**`assignRol`** — reemplazar insert directo por llamada al RPC:
```typescript
export async function assignRol(data: {
  idUsuario: number
  idRol: number
  idIglesia: number
  idSede?: number | null
  idMinisterio?: number | null
}): Promise<{ success: boolean; message: string }> {
  const { data: result, error } = await supabase.rpc('assign_role_with_ministerio', {
    p_id_usuario:    data.idUsuario,
    p_id_rol:        data.idRol,
    p_id_iglesia:    data.idIglesia,
    p_id_sede:       data.idSede ?? null,
    p_id_ministerio: data.idMinisterio ?? null,
  })
  if (error) throw error
  return { success: true, message: 'Rol asignado correctamente' }
}
```

La validación de "sede requerida" y "ministerio requerido" se mueve a la UI (ya está) — el service solo llama el RPC.

### 3.2 `src/hooks/useUsuarios.ts`

Sin cambios estructurales — los tipos se infieren de los parámetros de los services.

### 3.3 `src/app/components/UsuariosPage.tsx`

Dos puntos de disparo de mutaciones:

**`handleInvite`** — añadir `idMinisterio`:
```typescript
inviteMutation.mutate({
  correo: inviteForm.correo.trim(),
  nombres: inviteForm.nombres.trim(),
  apellidos: inviteForm.apellidos.trim(),
  idIglesia: inviteForm.idIglesia,
  idRol: inviteForm.idRol,
  idSede: inviteForm.idSede || null,
  idMinisterio: inviteForm.idMinisterio || null,  // ← nuevo
})
```

**`handleAssignRol`** — añadir `idMinisterio`:
```typescript
assignRolMutation.mutate({
  idUsuario: showAssignRol,
  idRol: assignForm.idRol,
  idIglesia: assignForm.idIglesia,
  idSede: assignForm.idSede || null,
  idMinisterio: assignForm.idMinisterio || null,  // ← nuevo
})
```

Adicionalmente, hacer commit de los cambios ya en progreso en el diff (ministerio selector en formularios, delete solo para super_admin, iglesia deshabilitada para admin_iglesia, error handling de removeRol).

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `supabase/migrations/20260515000000_users_ministerio_assign.sql` | Nuevo — migración |
| `supabase/functions/invite-user/index.ts` | Modificado — aceptar/validar/pasar `idMinisterio` |
| `supabase/functions/complete-invite/index.ts` | Modificado — usar RPC |
| `src/services/usuarios.service.ts` | Modificado — `inviteUser` + `assignRol` |
| `src/app/components/UsuariosPage.tsx` | Modificado — pasar `idMinisterio` en mutations |

---

## Reglas de negocio consolidadas

| Rol | Requiere sede | Requiere ministerio | `rol_en_ministerio` insertado |
|---|---|---|---|
| Super Admin (1) | No | No | — |
| Admin Iglesia (2) | No | No | — |
| Admin Sede (9) | Sí | No | — |
| Líder (3) | Sí | Sí | `'Líder'` |
| Servidor (4) | Sí | Sí | `'Servidor'` |

**Visibilidad del selector de iglesia:**
- Super Admin: libre selección
- Admin Iglesia: pre-seleccionada y deshabilitada (solo su iglesia)

**Botón eliminar usuario:** solo visible para Super Admin.

---

## Lo que NO está en scope

- Flujo de "remover rol → remover de ministerio": si un Líder/Servidor pierde su rol, su membresía en `miembro_ministerio` queda activa. Esto es intencional — la pertenencia al ministerio es independiente del rol del sistema.
- Notificación por email al asignar rol directo (solo se notifica en invitación nueva).
- Paginación o búsqueda server-side en `UsuariosPage`.
