# SP-2: Multi-Tenancy + RLS Estricta

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar multi-tenancy completo con JWT Claims + funciones SQL SECURITY DEFINER + políticas RLS estrictas por rol, incluyendo invalidación de caché de claims.

**Architecture:** Trigger Postgres + Edge Function para poblar `app_metadata` en JWT. RLS usa `(auth.jwt() -> 'app_metadata' ->> 'role')` y helpers SQL para reglas complejas. AppContext detecta claims stale y fuerza refresh.

**Tech Stack:** PostgreSQL SECURITY DEFINER functions, Supabase Auth JWT, Supabase Edge Functions, React/TypeScript

**Dependencia:** SP-1 debe estar completo (especialmente `is_super_admin()` funcionando).

---

## Archivos

| Acción | Archivo |
|---|---|
| Crear | `supabase/migrations/20260506200000_sp2_jwt_helper_functions.sql` |
| Crear | `supabase/migrations/20260506200100_sp2_permissions_updated_at.sql` |
| Crear | `supabase/migrations/20260506200200_sp2_rls_tenant_scoped.sql` |
| Crear/Modificar | `supabase/functions/set-tenant-claims/index.ts` |
| Modificar | `src/app/store/AppContext.tsx` |
| Modificar | `src/lib/supabaseClient.ts` |

---

### Task 1: Funciones SQL helper para RLS

Estas funciones son la base de todas las políticas RLS del sistema. Deben existir antes de crear las políticas.

**Files:**
- Create: `supabase/migrations/20260506200000_sp2_jwt_helper_functions.sql`

- [ ] **Step 1: Crear migración con todas las funciones helper**

```sql
-- supabase/migrations/20260506200000_sp2_jwt_helper_functions.sql

-- ── Helpers de JWT ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::bigint;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- Reemplaza la función existente manteniendo retrocompatibilidad
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(get_my_role() = 'super_admin', false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_iglesia()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(get_my_role() = 'admin_iglesia', false);
$$;

-- ── Helper de usuario ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_usuario_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id_usuario
  FROM public.usuario
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- ── Helper de ministerios ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_ministerios()
RETURNS TABLE(id bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mm.id_ministerio
  FROM public.miembro_ministerio mm
  WHERE mm.id_usuario = get_my_usuario_id()
    AND mm.fecha_salida IS NULL;
$$;

-- Verificar si el usuario autenticado tiene acceso a una iglesia específica
CREATE OR REPLACE FUNCTION public.can_access_iglesia(p_id_iglesia bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
      OR (
        get_my_role() IN ('admin_iglesia', 'lider', 'servidor')
        AND get_my_tenant_id() = p_id_iglesia
      );
$$;

-- Grants
REVOKE EXECUTE ON FUNCTION public.get_my_tenant_id() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_usuario_id() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_ministerios() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_iglesia(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_iglesia() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_ministerios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_iglesia(bigint) TO authenticated;
```

- [ ] **Step 2: Aplicar migración**

```bash
supabase db push
```

- [ ] **Step 3: Verificar funciones en SQL Editor**

```sql
-- Como super_admin autenticado:
SELECT get_my_role(), is_super_admin(), get_my_tenant_id();
-- Esperado: 'super_admin', true, null

-- Como admin_iglesia autenticado:
SELECT get_my_role(), is_admin_iglesia(), get_my_tenant_id();
-- Esperado: 'admin_iglesia', true, <id_iglesia>
```

**Nota:** Si `get_my_role()` devuelve NULL, los claims JWT aún no están configurados. Eso es normal — se configuran en Task 3. Para verificar ahora, puedes testear `is_super_admin()` que tiene fallback con la lógica antigua via `usuario_rol`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260506200000_sp2_jwt_helper_functions.sql
git commit -m "feat: add JWT helper functions for RLS (get_my_tenant_id, get_my_role, get_my_ministerios)"
```

---

### Task 2: Columna `permissions_updated_at` para cache invalidation

**Files:**
- Create: `supabase/migrations/20260506200100_sp2_permissions_updated_at.sql`

- [ ] **Step 1: Crear migración**

```sql
-- supabase/migrations/20260506200100_sp2_permissions_updated_at.sql

-- Columna para detectar claims JWT stale
ALTER TABLE public.usuario_rol
  ADD COLUMN IF NOT EXISTS permissions_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Trigger que actualiza permissions_updated_at en cualquier cambio de rol
CREATE OR REPLACE FUNCTION public.trigger_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.permissions_updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_permissions_updated_at ON public.usuario_rol;
CREATE TRIGGER set_permissions_updated_at
  BEFORE UPDATE ON public.usuario_rol
  FOR EACH ROW EXECUTE FUNCTION public.trigger_permissions_updated_at();

-- RPC que el frontend usa para verificar si sus claims están stale
CREATE OR REPLACE FUNCTION public.get_my_permissions_updated_at()
RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MAX(permissions_updated_at)
  FROM public.usuario_rol
  WHERE id_usuario = get_my_usuario_id()
    AND fecha_fin IS NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_permissions_updated_at() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_permissions_updated_at() TO authenticated;
```

- [ ] **Step 2: Aplicar migración**

```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260506200100_sp2_permissions_updated_at.sql
git commit -m "feat: add permissions_updated_at to usuario_rol for JWT cache invalidation"
```

---

### Task 3: Edge Function para poblar JWT claims

Esta Edge Function se llama en el login y cuando cambian los permisos. Escribe `app_metadata` en `auth.users` usando el service role key.

**Files:**
- Create: `supabase/functions/set-tenant-claims/index.ts`

- [ ] **Step 1: Crear la Edge Function**

```typescript
// supabase/functions/set-tenant-claims/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que viene con JWT válido
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente con el JWT del usuario para leer sus datos
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Obtener el usuario autenticado
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Leer rol e iglesia del usuario desde la DB
    const { data: roles, error: rolesError } = await supabaseUser.rpc('get_my_roles')
    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
    }

    // Determinar rol y tenant
    const roleNames: string[] = (roles ?? []).map((r: any) =>
      String(r.rol_nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    )

    let role = 'servidor'
    let tenantId: number | null = null
    let ministerioIds: number[] = []

    if (roleNames.includes('super administrador')) {
      role = 'super_admin'
      tenantId = null
    } else if (roleNames.includes('administrador de iglesia')) {
      role = 'admin_iglesia'
      const iglesiaRole = (roles ?? []).find((r: any) =>
        String(r.rol_nombre ?? '').toLowerCase().includes('administrador') && r.iglesia_id
      )
      tenantId = iglesiaRole?.iglesia_id ?? null
    } else if (roleNames.some((n) => n.includes('lider'))) {
      role = 'lider'
      const liderRole = (roles ?? []).find((r: any) => r.iglesia_id)
      tenantId = liderRole?.iglesia_id ?? null
      // Obtener ministerios del líder
      const { data: mins } = await supabaseUser.rpc('get_my_ministerios')
      ministerioIds = (mins ?? []).map((m: any) => m.id)
    } else {
      role = 'servidor'
      const servidorRole = (roles ?? []).find((r: any) => r.iglesia_id)
      tenantId = servidorRole?.iglesia_id ?? null
      const { data: mins } = await supabaseUser.rpc('get_my_ministerios')
      ministerioIds = (mins ?? []).map((m: any) => m.id)
    }

    // Actualizar app_metadata con service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const claimsAt = Math.floor(Date.now() / 1000)
    const appMetadata: Record<string, any> = { role, claims_at: claimsAt }
    if (tenantId !== null) appMetadata.tenant_id = tenantId
    if (ministerioIds.length > 0) appMetadata.ministerio_ids = ministerioIds

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: appMetadata,
    })

    if (updateError) {
      console.error('Error updating app_metadata:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to update claims' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, role, tenant_id: tenantId, claims_at: claimsAt }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Crear directorio y desplegar**

```bash
mkdir -p supabase/functions/set-tenant-claims
# (el archivo ya fue creado arriba)
supabase functions deploy set-tenant-claims
```

- [ ] **Step 3: Verificar que la función está desplegada**

```bash
supabase functions list
```
Esperado: `set-tenant-claims` aparece en la lista.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/set-tenant-claims/index.ts
git commit -m "feat: add set-tenant-claims Edge Function for JWT app_metadata"
```

---

### Task 4: AppContext — llamar set-tenant-claims y detectar claims stale

**Files:**
- Modify: `src/app/store/AppContext.tsx`

- [ ] **Step 1: Agregar función `refreshTenantClaims` en AppContext.tsx**

Después de la función `fetchNotifCountRaw`, agregar:

```typescript
/** Llamar Edge Function para actualizar app_metadata JWT */
async function refreshTenantClaims(accessToken: string): Promise<void> {
  try {
    await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/set-tenant-claims`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: '{}',
      },
      8000
    )
  } catch (err: any) {
    console.warn('[AUTH] set-tenant-claims failed:', err.message)
  }
}

/** Verificar si los claims JWT están stale comparando con DB */
async function fetchPermissionsUpdatedAt(accessToken: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/rpc/get_my_permissions_updated_at`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: '{}',
      },
      3000
    )
    if (res.ok) {
      const val = await res.json()
      return val ? Math.floor(new Date(val).getTime() / 1000) : null
    }
  } catch { /* skip */ }
  return null
}
```

- [ ] **Step 2: En `handleAuthSession`, agregar verificación de claims stale**

Dentro del bloque `if (session)`, después de obtener el token, agregar antes de `fetchUsuarioRaw`:

```typescript
// Verificar si los claims JWT están stale
const jwtClaimsAt = session.user.app_metadata?.claims_at as number | undefined
if (jwtClaimsAt) {
  const dbPermissionsAt = await fetchPermissionsUpdatedAt(token)
  if (dbPermissionsAt && dbPermissionsAt > jwtClaimsAt) {
    console.warn('[AUTH] Claims stale — refreshing...')
    await refreshTenantClaims(token)
    // Forzar refresh de sesión para obtener nuevo JWT con claims actualizados
    const { data: refreshData } = await supabase.auth.refreshSession()
    if (refreshData.session) {
      // Continuar con la nueva sesión
      setSession(refreshData.session)
    }
  }
} else {
  // Primera vez que el usuario inicia sesión — poblar claims
  await refreshTenantClaims(token)
  const { data: refreshData } = await supabase.auth.refreshSession()
  if (refreshData.session) {
    setSession(refreshData.session)
  }
}
```

- [ ] **Step 3: Exponer `refreshTenantClaims` para uso externo (cuando admin cambia rol a un usuario)**

En el `AppState` interface, agregar:
```typescript
refreshClaims: () => Promise<void>
```

En el `AppProvider`, agregar la función:
```typescript
const refreshClaims = async () => {
  if (!session) return
  await refreshTenantClaims(session.access_token)
  await supabase.auth.refreshSession()
}
```

Y en el `value` del context:
```typescript
refreshClaims,
```

- [ ] **Step 4: Commit**

```bash
git add src/app/store/AppContext.tsx
git commit -m "feat: AppContext calls set-tenant-claims on login and detects stale JWT claims"
```

---

### Task 5: RLS tenant-scoped por tabla (reemplazar políticas permisivas)

**Files:**
- Create: `supabase/migrations/20260506200200_sp2_rls_tenant_scoped.sql`

- [ ] **Step 1: Crear migración con políticas estrictas**

```sql
-- supabase/migrations/20260506200200_sp2_rls_tenant_scoped.sql
-- Reemplaza políticas permisivas con scoping por tenant_id

-- ── IGLESIA ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.iglesia;

-- Todos los roles autenticados pueden ver iglesias a las que tienen acceso
CREATE POLICY "iglesia_select_tenant" ON public.iglesia
  FOR SELECT TO authenticated
  USING (is_super_admin() OR id_iglesia = get_my_tenant_id());

-- Solo super_admin puede crear/editar/eliminar iglesias
CREATE POLICY "iglesia_mutations_super_admin" ON public.iglesia
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ── SEDE ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.sede;

CREATE POLICY "sede_select_tenant" ON public.sede
  FOR SELECT TO authenticated
  USING (is_super_admin() OR id_iglesia = get_my_tenant_id());

CREATE POLICY "sede_mutations_admin" ON public.sede
  FOR ALL TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()))
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

-- ── MINISTERIO ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.ministerio;

CREATE POLICY "ministerio_select_tenant" ON public.ministerio
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (SELECT 1 FROM public.sede s WHERE s.id_sede = ministerio.id_sede AND s.id_iglesia = get_my_tenant_id())
  );

CREATE POLICY "ministerio_mutations_admin_lider" ON public.ministerio
  FOR ALL TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (SELECT 1 FROM public.sede s WHERE s.id_sede = ministerio.id_sede AND s.id_iglesia = get_my_tenant_id())
    )
    OR id_ministerio IN (SELECT id FROM get_my_ministerios())
  )
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (SELECT 1 FROM public.sede s WHERE s.id_sede = ministerio.id_sede AND s.id_iglesia = get_my_tenant_id())
    )
  );

-- ── PASTOR ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.pastor;

-- pastor aún no tiene id_iglesia directo (se agrega en SP-3)
-- por ahora, usar iglesia_pastor para scope
CREATE POLICY "pastor_select_tenant" ON public.pastor
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.iglesia_pastor ip
      WHERE ip.id_pastor = pastor.id_pastor
        AND ip.id_iglesia = get_my_tenant_id()
        AND ip.fecha_fin IS NULL
    )
  );

CREATE POLICY "pastor_mutations_admin" ON public.pastor
  FOR ALL TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.iglesia_pastor ip
        WHERE ip.id_pastor = pastor.id_pastor
          AND ip.id_iglesia = get_my_tenant_id()
          AND ip.fecha_fin IS NULL
      )
    )
  )
  WITH CHECK (is_super_admin() OR is_admin_iglesia());

-- ── USUARIO ──────────────────────────────────────────────────────
-- La política actual del super_admin ya existe. Agregar para admin_iglesia + propias.
DROP POLICY IF EXISTS "Acceso autenticado usuarios" ON public.usuario;
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.usuario;

-- Ver usuarios de tu iglesia (admin) o propio (lider/servidor)
CREATE POLICY "usuario_select_tenant" ON public.usuario
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR auth_user_id = auth.uid()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.usuario_rol ur
        WHERE ur.id_usuario = usuario.id_usuario
          AND ur.id_iglesia = get_my_tenant_id()
          AND ur.fecha_fin IS NULL
      )
    )
    OR (
      get_my_role() IN ('lider', 'servidor')
      AND EXISTS (
        SELECT 1 FROM public.miembro_ministerio mm
        JOIN public.miembro_ministerio mm2 ON mm2.id_ministerio = mm.id_ministerio
        WHERE mm2.id_usuario = get_my_usuario_id()
          AND mm.id_usuario = usuario.id_usuario
          AND mm.fecha_salida IS NULL
          AND mm2.fecha_salida IS NULL
      )
    )
  );

-- Mutaciones: admin puede gestionar usuarios de su iglesia
CREATE POLICY "usuario_mutations_admin" ON public.usuario
  FOR ALL TO authenticated
  USING (
    is_super_admin()
    OR auth_user_id = auth.uid()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.usuario_rol ur
        WHERE ur.id_usuario = usuario.id_usuario
          AND ur.id_iglesia = get_my_tenant_id()
          AND ur.fecha_fin IS NULL
      )
    )
  )
  WITH CHECK (is_super_admin() OR is_admin_iglesia() OR auth_user_id = auth.uid());

-- ── EVENTO ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.evento;

CREATE POLICY "evento_select_tenant" ON public.evento
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_iglesia = get_my_tenant_id()
  );

CREATE POLICY "evento_mutations_admin_lider" ON public.evento
  FOR ALL TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      get_my_role() = 'lider'
      AND id_iglesia = get_my_tenant_id()
      AND (id_ministerio IS NULL OR id_ministerio IN (SELECT id FROM get_my_ministerios()))
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (get_my_role() = 'lider' AND id_iglesia = get_my_tenant_id())
  );

-- ── TAREA ────────────────────────────────────────────────────────
-- tarea aún no tiene id_iglesia (se agrega en SP-3), usar id_ministerio como proxy
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.tarea;

CREATE POLICY "tarea_select_tenant" ON public.tarea
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND (
        id_ministerio IS NULL
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          JOIN public.sede s ON m.id_sede = s.id_sede
          WHERE s.id_iglesia = get_my_tenant_id()
        )
      )
    )
    OR id_ministerio IN (SELECT id FROM get_my_ministerios())
    OR id_tarea IN (
      SELECT ta.id_tarea FROM public.tarea_asignada ta
      WHERE ta.id_usuario = get_my_usuario_id()
    )
  );

CREATE POLICY "tarea_mutations_admin_lider" ON public.tarea
  FOR ALL TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.sede s ON m.id_sede = s.id_sede
      WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  )
  WITH CHECK (
    is_super_admin()
    OR is_admin_iglesia()
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

-- ── NOTIFICACION ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo propias notificaciones" ON public.notificacion;
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.notificacion;

CREATE POLICY "notificacion_own" ON public.notificacion
  FOR ALL TO authenticated
  USING (id_usuario = get_my_usuario_id())
  WITH CHECK (id_usuario = get_my_usuario_id());

-- ── MIEMBRO_MINISTERIO ───────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.miembro_ministerio;

CREATE POLICY "miembro_ministerio_select" ON public.miembro_ministerio
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.sede s ON m.id_sede = s.id_sede
      WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR id_ministerio IN (SELECT id FROM get_my_ministerios())
    OR id_usuario = get_my_usuario_id()
  );

CREATE POLICY "miembro_ministerio_mutations" ON public.miembro_ministerio
  FOR ALL TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.sede s ON m.id_sede = s.id_sede
      WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  )
  WITH CHECK (
    is_super_admin()
    OR is_admin_iglesia()
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

-- ── USUARIO_ROL ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.usuario_rol;

CREATE POLICY "usuario_rol_select_tenant" ON public.usuario_rol
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY "usuario_rol_mutations_admin" ON public.usuario_rol
  FOR ALL TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_iglesia = get_my_tenant_id()
      -- admin_iglesia no puede asignar super_admin
      AND id_rol NOT IN (SELECT id_rol FROM public.rol WHERE nombre ILIKE '%super%')
    )
  );
```

- [ ] **Step 2: Aplicar migración**

```bash
supabase db push
```

- [ ] **Step 3: Verificar acceso como cada rol**

Usar el SQL Editor con `SET LOCAL role = authenticated` y simular JWTs:
```sql
-- Verificar que admin_iglesia solo ve su sede
SET LOCAL "request.jwt.claims" TO '{"sub":"<uuid>","app_metadata":{"role":"admin_iglesia","tenant_id":1}}';
SELECT count(*) FROM sede; -- debe devolver solo sedes de iglesia 1
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260506200200_sp2_rls_tenant_scoped.sql
git commit -m "feat: replace permissive RLS policies with tenant-scoped policies per role"
```
