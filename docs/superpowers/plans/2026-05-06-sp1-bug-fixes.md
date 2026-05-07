# SP-1: Corrección de Bugs Críticos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver los 4 bugs críticos que bloquean el uso normal del sistema antes de iniciar la conversión SaaS.

**Architecture:** Combinación de migraciones SQL (RLS + RPCs) y cambios en `AppContext.tsx`. No toca rutas ni UI.

**Tech Stack:** PostgreSQL/Supabase RLS, React 18, TypeScript

---

## Archivos

| Acción | Archivo |
|---|---|
| Crear | `supabase/migrations/20260506100000_sp1_fix_rls_geo_super_admin.sql` |
| Crear | `supabase/migrations/20260506100100_sp1_fix_rpc_usuarios_iglesia.sql` |
| Crear | `supabase/migrations/20260506100200_sp1_fix_handle_new_user.sql` |
| Modificar | `src/app/store/AppContext.tsx` |

---

### Task 1: Verificar y corregir RLS de geografía para super_admin

Las políticas `USING (true)` para usuarios autenticados en `pais/departamento/ciudad` ya existen pero pueden estar en conflicto o no aplicadas. La política específica de super_admin también existe. Verificar que ambas coexisten sin conflicto y que el `is_super_admin()` funciona.

**Files:**
- Create: `supabase/migrations/20260506100000_sp1_fix_rls_geo_super_admin.sql`

- [ ] **Step 1: Verificar `is_super_admin()` en Supabase SQL Editor**

Ejecutar en el SQL Editor de Supabase:
```sql
-- Verificar que la función existe y tiene search_path fijo
SELECT proname, prosrc, proconfig
FROM pg_proc
WHERE proname = 'is_super_admin'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```
Esperado: 1 fila con `proconfig` que incluya `search_path=public`.

- [ ] **Step 2: Verificar políticas activas en tablas de geografía**

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('pais', 'departamento', 'ciudad')
ORDER BY tablename, cmd;
```
Esperado: cada tabla tiene políticas para SELECT, INSERT, UPDATE, DELETE.

- [ ] **Step 3: Crear migración de corrección si hay políticas duplicadas o faltantes**

```sql
-- supabase/migrations/20260506100000_sp1_fix_rls_geo_super_admin.sql
-- Eliminar políticas permisivas antiguas y dejar solo las de super_admin + lectura autenticada

-- pais: eliminar política permisiva de mutaciones si existe
DROP POLICY IF EXISTS "Authenticated insert pais" ON public.pais;
DROP POLICY IF EXISTS "Authenticated update pais" ON public.pais;
DROP POLICY IF EXISTS "Authenticated delete pais" ON public.pais;
DROP POLICY IF EXISTS "pais super admin" ON public.pais;

-- Recrear con nombre único
CREATE POLICY "pais_super_admin_all" ON public.pais
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- departamento
DROP POLICY IF EXISTS "Authenticated insert departamento" ON public.departamento;
DROP POLICY IF EXISTS "Authenticated update departamento" ON public.departamento;
DROP POLICY IF EXISTS "Authenticated delete departamento" ON public.departamento;
DROP POLICY IF EXISTS "departamento super admin" ON public.departamento;

CREATE POLICY "departamento_super_admin_all" ON public.departamento
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ciudad
DROP POLICY IF EXISTS "Authenticated insert ciudad" ON public.ciudad;
DROP POLICY IF EXISTS "Authenticated update ciudad" ON public.ciudad;
DROP POLICY IF EXISTS "Authenticated delete ciudad" ON public.ciudad;
DROP POLICY IF EXISTS "ciudad super admin" ON public.ciudad;

CREATE POLICY "ciudad_super_admin_all" ON public.ciudad
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- tipo_evento (catálogos: solo super_admin puede mutar)
DROP POLICY IF EXISTS "Authenticated insert tipo_evento" ON public.tipo_evento;
DROP POLICY IF EXISTS "Authenticated update tipo_evento" ON public.tipo_evento;
DROP POLICY IF EXISTS "Authenticated delete tipo_evento" ON public.tipo_evento;

CREATE POLICY "tipo_evento_super_admin_mutations" ON public.tipo_evento
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
```

- [ ] **Step 4: Aplicar migración en Supabase**

```bash
supabase db push
```
O ejecutar el SQL directamente en el SQL Editor de Supabase.

- [ ] **Step 5: Probar en la UI**

Iniciar sesión como super_admin. Ir a `/app/geografia`. Intentar crear un país de prueba. Esperado: sin error 403.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260506100000_sp1_fix_rls_geo_super_admin.sql
git commit -m "fix: scope geo/catalog RLS mutations to super_admin only"
```

---

### Task 2: Corregir RPC de usuarios enriquecidos para admin_iglesia

La función `get_all_usuarios_enriquecidos()` devuelve todos los usuarios sin filtrar por iglesia. El JOIN a `iglesia` falla con NULL para super_admin. Necesitamos: (a) arreglar el LEFT JOIN, (b) agregar variante filtrada por iglesia para admin_iglesia.

**Files:**
- Create: `supabase/migrations/20260506100100_sp1_fix_rpc_usuarios_iglesia.sql`

- [ ] **Step 1: Crear migración con funciones corregidas**

```sql
-- supabase/migrations/20260506100100_sp1_fix_rpc_usuarios_iglesia.sql

-- Arreglar función existente: cambiar JOIN por LEFT JOIN
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
    u.id_usuario,
    u.nombres::text,
    u.apellidos::text,
    u.correo::text,
    u.telefono::text,
    u.activo,
    u.ultimo_acceso,
    u.auth_user_id,
    u.creado_en,
    u.updated_at,
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
      LEFT JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia  -- LEFT JOIN para super_admin
      WHERE ur.id_usuario = u.id_usuario
        AND ur.fecha_fin IS NULL
    ), '[]'::jsonb) AS roles,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_miembro_ministerio', mm.id_miembro_ministerio,
        'activo', mm.fecha_salida IS NULL,
        'rol_en_ministerio', mm.rol_en_ministerio,
        'ministerio_nombre', m.nombre
      ))
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = u.id_usuario
        AND mm.fecha_salida IS NULL
    ), '[]'::jsonb) AS ministerios
  FROM public.usuario u
  WHERE u.deleted_at IS NULL
  ORDER BY u.apellidos, u.nombres;
$$;

-- Nueva función filtrada por iglesia (para admin_iglesia)
CREATE OR REPLACE FUNCTION public.get_usuarios_by_iglesia(p_id_iglesia bigint)
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
    u.id_usuario,
    u.nombres::text,
    u.apellidos::text,
    u.correo::text,
    u.telefono::text,
    u.activo,
    u.ultimo_acceso,
    u.auth_user_id,
    u.creado_en,
    u.updated_at,
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
      LEFT JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia
      WHERE ur.id_usuario = u.id_usuario
        AND ur.fecha_fin IS NULL
    ), '[]'::jsonb) AS roles,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_miembro_ministerio', mm.id_miembro_ministerio,
        'activo', mm.fecha_salida IS NULL,
        'rol_en_ministerio', mm.rol_en_ministerio,
        'ministerio_nombre', m.nombre
      ))
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = u.id_usuario
        AND mm.fecha_salida IS NULL
    ), '[]'::jsonb) AS ministerios
  FROM public.usuario u
  WHERE u.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.usuario_rol ur
      WHERE ur.id_usuario = u.id_usuario
        AND ur.id_iglesia = p_id_iglesia
        AND ur.fecha_fin IS NULL
    )
  ORDER BY u.apellidos, u.nombres;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_usuarios_by_iglesia(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_usuarios_by_iglesia(bigint) TO authenticated;
```

- [ ] **Step 2: Aplicar migración**

```bash
supabase db push
```

- [ ] **Step 3: Verificar en SQL Editor**

```sql
-- Probar con un id_iglesia real
SELECT * FROM get_usuarios_by_iglesia(1) LIMIT 5;
```
Esperado: Devuelve filas sin error.

- [ ] **Step 4: Actualizar `usuarios.service.ts` para usar la nueva función**

En `src/services/usuarios.service.ts`, agregar:

```typescript
export async function getUsuariosByIglesia(idIglesia: number): Promise<UsuarioEnriquecido[]> {
  const { data, error } = await supabase.rpc('get_usuarios_by_iglesia', {
    p_id_iglesia: idIglesia,
  })
  if (error) throw error
  return (data ?? []).map(mapUsuarioEnriquecido)
}
```

Y verificar que `getUsuariosEnriquecidos()` existente llama a `get_all_usuarios_enriquecidos`:

```typescript
export async function getUsuariosEnriquecidos(): Promise<UsuarioEnriquecido[]> {
  const { data, error } = await supabase.rpc('get_all_usuarios_enriquecidos')
  if (error) throw error
  return (data ?? []).map(mapUsuarioEnriquecido)
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260506100100_sp1_fix_rpc_usuarios_iglesia.sql \
        src/services/usuarios.service.ts
git commit -m "fix: LEFT JOIN in usuarios RPC + add get_usuarios_by_iglesia()"
```

---

### Task 3: Verificar trigger handle_new_user y seed data

El trigger `handle_new_user` debe crear automáticamente un registro en `public.usuario` cuando se crea un usuario en `auth.users`.

**Files:**
- Create: `supabase/migrations/20260506100200_sp1_fix_handle_new_user.sql`

- [ ] **Step 1: Verificar que el trigger existe**

```sql
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  OR event_object_table = 'users';
```
Esperado: existe un trigger `on_auth_user_created` en `auth.users`.

- [ ] **Step 2: Si no existe o está roto, crear/recrear**

```sql
-- supabase/migrations/20260506100200_sp1_fix_handle_new_user.sql

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuario (
    nombres,
    apellidos,
    correo,
    activo,
    auth_user_id
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'nombres', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    NEW.email,
    TRUE,
    NEW.id
  )
  ON CONFLICT (correo) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id,
        updated_at = NOW()
  WHERE public.usuario.auth_user_id IS NULL;
  RETURN NEW;
END;
$$;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- [ ] **Step 3: Verificar usuarios auth sin registro en public.usuario**

```sql
-- Detectar usuarios auth sin perfil en public.usuario
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN public.usuario u ON u.auth_user_id = au.id
WHERE u.id_usuario IS NULL
ORDER BY au.created_at DESC;
```
Si hay filas, ejecutar backfill:

```sql
INSERT INTO public.usuario (nombres, apellidos, correo, activo, auth_user_id)
SELECT
  COALESCE(au.raw_user_meta_data->>'nombres', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'apellidos', ''),
  au.email,
  TRUE,
  au.id
FROM auth.users au
LEFT JOIN public.usuario u ON u.auth_user_id = au.id
WHERE u.id_usuario IS NULL
ON CONFLICT (correo) DO UPDATE
  SET auth_user_id = EXCLUDED.auth_user_id
  WHERE public.usuario.auth_user_id IS NULL;
```

- [ ] **Step 4: Aplicar migración**

```bash
supabase db push
```

- [ ] **Step 5: Probar creación de tarea como usuario autenticado**

Iniciar sesión con una cuenta real. Ir a `/app/tareas`. Intentar crear una tarea. Esperado: tarea creada sin error.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260506100200_sp1_fix_handle_new_user.sql
git commit -m "fix: ensure handle_new_user trigger creates public.usuario on signup"
```

---

### Task 4: Limpiar AppContext — debug logs y mock mode

Remover los `console.log('[DEBUG]')` de producción y asegurar el comportamiento correcto del mock mode con sesión expirada.

**Files:**
- Modify: `src/app/store/AppContext.tsx`

- [ ] **Step 1: Eliminar todos los console.log de debug**

En `src/app/store/AppContext.tsx`, eliminar todas las líneas que contengan `[DEBUG]`:

```typescript
// Eliminar estas líneas:
// console.log('[DEBUG] normalizeAppRole - rawRoles:', rawRoles)
// console.log('[DEBUG] normalizeAppRole - normalized:', normalized)
// console.log('[DEBUG] normalizeAppRole - returning super_admin')
// console.log('[DEBUG] normalizeAppRole - returning admin_iglesia')
// console.log('[DEBUG] normalizeAppRole - returning lider')
// console.log('[DEBUG] normalizeAppRole - returning servidor (fallback)')
// console.log('[DEBUG] Mock mode effect - isMockMode:', ...)
```

Mantener solo los `console.log('[AUTH]')` que son informativos para producción, convirtiéndolos a `console.warn` o eliminando los más verbosos.

- [ ] **Step 2: Asegurar que mock mode no interfiere con sesión real inválida**

Verificar que en `AppContext.tsx` el `isAuthenticated` sea:

```typescript
isAuthenticated: !!session || isMockMode,
```

Si la línea dice solo `!!session`, cambiarla a lo anterior.

- [ ] **Step 3: Verificar que `UNAUTHORIZED` fuerza logout correctamente**

Confirmar que el bloque que maneja `data === 'UNAUTHORIZED'` hace:
```typescript
if (data === 'UNAUTHORIZED') {
  await supabase.auth.signOut()
  setUsuarioActual(null)
  setSession(null)
  resolveLoading()
  return
}
```
Si está correcto, no cambiar.

- [ ] **Step 4: Commit**

```bash
git add src/app/store/AppContext.tsx
git commit -m "fix: remove debug console.logs, verify mock mode auth handling"
```
