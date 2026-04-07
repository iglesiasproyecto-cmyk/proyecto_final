# Phase 5: Usuarios, Roles y Edge Function invite-user

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete user management: update profile, assign/remove roles, and invite new users via Supabase Auth Edge Function (so auth accounts are created without exposing the service role key to the frontend).

**Architecture:** `usuarios.service.ts` already has `getUsuariosEnriquecidos` and `toggleUsuarioActivo`. Add `updateUsuario`, `assignRol` (insert `usuario_rol`), `removeRol` (set `fecha_fin`). Create Edge Function `invite-user` that calls `supabase.auth.admin.inviteUserByEmail()` using the service role key — the frontend never touches the service key. Wire in `UsersPage.tsx` and add a new `ProfilePage.tsx` edit form.

**Tech Stack:** React 18, Supabase JS v2, TanStack Query v5, shadcn/ui, Supabase Edge Functions (Deno)

---

## File Structure

| File | Change |
|------|--------|
| `src/services/usuarios.service.ts` | Modify — add `updateUsuario`, `assignRol`, `removeRol`, `inviteUser` |
| `src/hooks/useUsuarios.ts` | Modify — add hooks for new mutations |
| `supabase/functions/invite-user/index.ts` | Create — Edge Function |
| `src/app/components/UsersPage.tsx` | Modify — wire update/role management |
| `src/app/components/ProfilePage.tsx` | Modify — wire profile update + change password |

---

### Task 1: Add mutations to usuarios.service.ts

**Files:**
- Modify: `src/services/usuarios.service.ts`

- [ ] **Step 1: Read the file**

Read `src/services/usuarios.service.ts` to understand current structure.

- [ ] **Step 2: Add `updateUsuario`**

```typescript
export async function updateUsuario(
  id: number,
  data: {
    nombres?: string
    apellidos?: string
    telefono?: string | null
  }
): Promise<Usuario> {
  const patch: Record<string, unknown> = {}
  if (data.nombres !== undefined) patch.nombres = data.nombres
  if (data.apellidos !== undefined) patch.apellidos = data.apellidos
  if (data.telefono !== undefined) patch.telefono = data.telefono
  const { data: result, error } = await supabase
    .from('usuario')
    .update(patch)
    .eq('id_usuario', id)
    .select()
    .single()
  if (error) throw error
  return mapUsuario(result)
}
```

- [ ] **Step 3: Add `assignRol` and `removeRol`**

```typescript
export async function assignRol(data: {
  idUsuario: number
  idRol: number
  idIglesia: number
  idSede?: number | null
}): Promise<void> {
  const { error } = await supabase
    .from('usuario_rol')
    .insert({
      id_usuario: data.idUsuario,
      id_rol: data.idRol,
      id_iglesia: data.idIglesia,
      id_sede: data.idSede ?? null,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: null,
    })
  if (error) throw error
}

export async function removeRol(idUsuarioRol: number): Promise<void> {
  const { error } = await supabase
    .from('usuario_rol')
    .update({ fecha_fin: new Date().toISOString().split('T')[0] })
    .eq('id_usuario_rol', idUsuarioRol)
  if (error) throw error
}
```

- [ ] **Step 4: Add `inviteUser` (calls Edge Function)**

```typescript
export async function inviteUser(data: {
  correo: string
  nombres: string
  apellidos: string
  idIglesia: number
  idRol: number
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Error inviting user')
  }
}
```

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | head -30
```

Expected: No errors.

---

### Task 2: Add hooks in useUsuarios.ts

**Files:**
- Modify: `src/hooks/useUsuarios.ts`

- [ ] **Step 1: Read the file**

Read `src/hooks/useUsuarios.ts` to understand current exports.

- [ ] **Step 2: Update imports**

```typescript
import {
  getUsuariosEnriquecidos, toggleUsuarioActivo,
  updateUsuario, assignRol, removeRol, inviteUser,
} from '@/services/usuarios.service'
```

- [ ] **Step 3: Add mutation hooks** — add after existing hooks:

```typescript
export function useUpdateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateUsuario>[1] }) =>
      updateUsuario(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}

export function useAssignRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof assignRol>[0]) => assignRol(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}

export function useRemoveRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idUsuarioRol: number) => removeRol(idUsuarioRol),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof inviteUser>[0]) => inviteUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}
```

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | head -20
```

---

### Task 3: Create Edge Function invite-user

**Files:**
- Create: `supabase/functions/invite-user/index.ts`

- [ ] **Step 1: Create the Edge Function**

```typescript
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
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { correo, nombres, apellidos, idIglesia, idRol } = await req.json()

    if (!correo || !nombres || !apellidos || !idIglesia || !idRol) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Invite user via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      correo,
      {
        data: { nombres, apellidos },
        redirectTo: `${Deno.env.get('SITE_URL') ?? ''}/app`,
      }
    )
    if (inviteError) throw inviteError

    // Create usuario record linked to new auth user
    const { data: usuarioData, error: usuarioError } = await supabaseAdmin
      .from('usuario')
      .insert({
        nombres,
        apellidos,
        correo,
        auth_user_id: inviteData.user.id,
        activo: true,
      })
      .select('id_usuario')
      .single()
    if (usuarioError) throw usuarioError

    // Assign rol
    const { error: rolError } = await supabaseAdmin
      .from('usuario_rol')
      .insert({
        id_usuario: usuarioData.id_usuario,
        id_rol: idRol,
        id_iglesia: idIglesia,
        fecha_inicio: new Date().toISOString().split('T')[0],
      })
    if (rolError) throw rolError

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ message: error.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Deploy Edge Function via Supabase MCP**

Use `mcp__plugin_supabase_supabase__deploy_edge_function` with:
- `project_id`: `heibyjbvfiokmduwwawm`
- `name`: `invite-user`
- `files`: the `index.ts` above

- [ ] **Step 3: Set SITE_URL secret in Supabase dashboard**

Go to Supabase dashboard → Project Settings → Edge Functions → Secrets and add:
```
SITE_URL = https://your-vercel-domain.vercel.app
```

---

### Task 4: Add RLS policies for usuarios domain

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_phase5_rls_usuarios.sql`

- [ ] **Step 1: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with:
- `project_id`: `heibyjbvfiokmduwwawm`
- `name`: `phase5_rls_usuarios`
- `query`:

```sql
DO $$ BEGIN
  CREATE POLICY "Authenticated update usuario"
    ON public.usuario FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert usuario_rol"
    ON public.usuario_rol FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update usuario_rol"
    ON public.usuario_rol FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

- [ ] **Step 2: Create local file with assigned version name**

After MCP returns the version, create the file at `supabase/migrations/<version>_phase5_rls_usuarios.sql`.

---

### Task 5: Update UsersPage with role management and invite

**Files:**
- Modify: `src/app/components/UsersPage.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/components/UsersPage.tsx`.

- [ ] **Step 2: Replace mock with real data and wire mutations**

```typescript
import {
  useUsuariosEnriquecidos, useUpdateUsuario,
  useAssignRol, useRemoveRol, useInviteUser, useToggleUsuarioActivo,
} from '@/hooks/useUsuarios'
import { useApp } from '@/app/store/AppContext'

const { iglesiaActual } = useApp()
const { data: usuarios = [], isLoading } = useUsuariosEnriquecidos()
const inviteUserMutation = useInviteUser()
const toggleActivoMutation = useToggleUsuarioActivo()
const assignRolMutation = useAssignRol()
const removeRolMutation = useRemoveRol()
```

- [ ] **Step 3: Wire invite dialog**

```typescript
function handleInviteUser(data: {
  correo: string; nombres: string; apellidos: string; idRol: number
}) {
  if (!iglesiaActual) return
  inviteUserMutation.mutate({ ...data, idIglesia: iglesiaActual.id })
}
```

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | head -20
```

---

### Task 6: Update ProfilePage with update + change password

**Files:**
- Modify: `src/app/components/ProfilePage.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/components/ProfilePage.tsx`.

- [ ] **Step 2: Wire profile update**

```typescript
import { useUpdateUsuario } from '@/hooks/useUsuarios'
import { useApp } from '@/app/store/AppContext'

const { usuarioActual } = useApp()
const updateUsuarioMutation = useUpdateUsuario()

function handleUpdateProfile(data: { nombres: string; apellidos: string; telefono?: string }) {
  if (!usuarioActual) return
  updateUsuarioMutation.mutate({ id: usuarioActual.idUsuario, data })
}
```

- [ ] **Step 3: Wire change password**

Use Supabase Auth client directly (no service role needed):

```typescript
import { supabase } from '@/lib/supabase'

async function handleChangePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
```

- [ ] **Step 4: Build and commit**

```bash
npm run build 2>&1 | head -20
git add src/services/usuarios.service.ts src/hooks/useUsuarios.ts \
        src/app/components/UsersPage.tsx src/app/components/ProfilePage.tsx \
        supabase/functions/invite-user/index.ts \
        supabase/migrations/
git commit -m "feat: usuarios/roles CRUD + Edge Function invite-user (phase 5)"
git push origin main
```
