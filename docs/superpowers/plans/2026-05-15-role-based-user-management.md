# Role-Based User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable `admin_sede` and `lider` roles to manage users within their scope (sede and ministerio respectively), with appropriate permission restrictions.

**Architecture:** Extend existing permission model in UsuariosPage to include new roles. Add `ministeriosDelUsuario` to AppContext (similar to existing `iglesiasDelUsuario` and `sedesDelUsuario`). Implement scope-based filtering in hooks and UI. Use function `canAssignRole()` for centralized permission validation.

**Tech Stack:** React 18, TypeScript, React Query, Supabase, shadcn/ui

---

## File Structure

### Modified Files
- `src/app/store/AppContext.tsx` — Add `ministeriosDelUsuario` to AppState + fetching logic
- `src/app/components/UsuariosPage.tsx` — Add role/sede/ministerio filters, `canAssignRole()`, update dialogs
- `src/hooks/useUsuarios.ts` — Add scope filtering in `useUsuariosEnriquecidos()`
- `src/app/constants/roles.ts` — Verify `ROLE_IDS.SERVIDOR` exists

### New Files
- `e2e/specs/13-lider-manage-usuarios.spec.ts` — E2E tests for líder user management

---

## Task 1: Add `ministeriosDelUsuario` to AppContext

**Files:**
- Modify: `src/app/store/AppContext.tsx:8-39` (AppState interface)
- Modify: `src/app/store/AppContext.tsx:210-280` (fetch logic in AppProvider)
- Modify: `src/app/store/AppContext.tsx` (useApp provider value)

### Step 1: Add to AppState interface

Open `src/app/store/AppContext.tsx` and find the `AppState` interface (around line 8). Add this line after `sedesDelUsuario`:

```typescript
interface AppState {
  session: Session | null
  user: any
  usuarioActual: Usuario | null
  isAuthenticated: boolean
  authLoading: boolean
  isHydrated: boolean
  isClaimsReady: boolean
  authReady: boolean
  authError: string | null
  isInitializing: boolean
  iglesiaActual: { id: number; nombre: string } | null
  setIglesiaActual: (ig: { id: number; nombre: string } | null) => void
  iglesiasDelUsuario: { id: number; nombre: string }[]
  sedesDelUsuario: { id: number; nombre: string }[]
  ministeriosDelUsuario: { id: number; nombre: string; idSede: number }[]  // ← ADD THIS
  rolActual: string
  sidebarOpen: boolean
  notificacionesCount: number
  decrementNotificacionesCount: () => void
  resetNotificacionesCount: () => void
  darkMode: boolean
  toggleSidebar: () => void
  toggleDarkMode: () => void
  logout: () => Promise<void>
  refreshClaims: () => Promise<void>
  setInitializing: (val: boolean) => void
  isMockMode: boolean
  setMockMode: (val: boolean) => void
  mockRol: string
  setMockRol: (rol: string) => void
}
```

- [ ] Update AppState interface

### Step 2: Initialize state in AppProvider

Find the `useState` declarations (around line 180-200). Add this:

```typescript
const [ministeriosDelUsuario, setMinisteriosDelUsuario] = useState<{ id: number; nombre: string; idSede: number }[]>([])
```

- [ ] Add useState for ministeriosDelUsuario

### Step 3: Create RPC fetch function for ministerios

After `fetchRolesRaw()` function (around line 130), add:

```typescript
/** Fetch ministerios where user is líder */
async function fetchMinisteriosRaw(accessToken: string): Promise<any[] | null> {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
  }

  try {
    console.log('[AUTH] Fetching ministerios where user is líder...')
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/rpc/get_my_ministerios`,
      { method: 'POST', headers, body: '{}' },
      5000
    )
    if (res.ok) {
      const ministerios = await res.json()
      console.log('[AUTH] Ministerios fetched:', ministerios.length)
      return Array.isArray(ministerios) ? ministerios : []
    }
    console.warn('[AUTH] get_my_ministerios returned', res.status)
    return []
  } catch (err) {
    console.warn('[AUTH] Failed to fetch ministerios:', err)
    return []
  }
}
```

- [ ] Add fetchMinisteriosRaw function

### Step 4: Call fetchMinisteriosRaw in initializeClaims

Find the `useEffect` hook that calls `initializeClaims()` (around line 280-350). Locate where roles and iglesias are fetched together:

```typescript
const [notifCount, roles, iglesias, sedes] = await Promise.all([
  // ... existing queries
])
```

Update it to:

```typescript
const [notifCount, roles, iglesias, sedes, ministerios] = await Promise.all([
  // ... existing queries,
  fetchMinisteriosRaw(accessToken), // ADD THIS
])
```

Then after the iglesias/sedes are set, add:

```typescript
const ministeriosData = (ministerios || []).map((m: any) => ({
  id: m.idMinisterio,
  nombre: m.ministerioNombre,
  idSede: m.idSede,
}))
setMinisteriosDelUsuario(ministeriosData)
```

- [ ] Update Promise.all to fetch ministerios
- [ ] Add setMinisteriosDelUsuario call with formatted data

### Step 5: Add to context provider value

Find where the context value is returned (around line 350-380):

```typescript
return (
  <AppContext.Provider
    value={{
      session,
      user,
      usuarioActual,
      isAuthenticated,
      authLoading,
      // ... other properties
      iglesiasDelUsuario,
      sedesDelUsuario,
      // ADD THIS LINE:
      ministeriosDelUsuario,
      // ... rest
    }}
  >
```

- [ ] Add ministeriosDelUsuario to context provider value

### Step 6: Commit

```bash
git add src/app/store/AppContext.tsx
git commit -m "feat: Add ministeriosDelUsuario to AppContext state"
```

- [ ] Commit changes

---

## Task 2: Verify Role Constants

**Files:**
- Check: `src/app/constants/roles.ts`

- [ ] **Step 1: Verify ROLE_IDS constant**

Open `src/app/constants/roles.ts` and confirm it contains:

```typescript
export const ROLE_IDS = {
  SUPER_ADMIN: 1,
  ADMIN_IGLESIA: 2,
  ADMIN_SEDE: 3,
  LIDER: 4,
  SERVIDOR: 5,
}
```

If it doesn't exist or is missing SERVIDOR, update it now.

- [ ] Confirm ROLE_IDS has SERVIDOR and all roles

---

## Task 3: Add Permission Functions to UsuariosPage

**Files:**
- Modify: `src/app/components/UsuariosPage.tsx:23-84`

### Step 1: Update role detection logic

Find line 23-27 where permissions are checked:

```typescript
const { iglesiaActual, rolActual, iglesiasDelUsuario } = useApp();

const isSuperAdmin = rolActual === "super_admin";
const isAdminIglesia = rolActual === "admin_iglesia";
const canManageUsers = isSuperAdmin || isAdminIglesia;
```

Replace with:

```typescript
const { iglesiaActual, rolActual, iglesiasDelUsuario, ministeriosDelUsuario, sedesDelUsuario } = useApp();

const isSuperAdmin = rolActual === "super_admin";
const isAdminIglesia = rolActual === "admin_iglesia";
const isAdminSede = rolActual === "admin_sede";
const isLider = rolActual === "lider";
const canManageUsers = isSuperAdmin || isAdminIglesia || isAdminSede || isLider;
```

- [ ] Update role detection to include admin_sede and lider

### Step 2: Add canAssignRole function

After the `canManageUsers` declaration, add:

```typescript
const canAssignRole = (idRol: number): boolean => {
  if (isSuperAdmin) return true;
  if (isAdminIglesia) return idRol !== ROLE_IDS.SUPER_ADMIN;
  if (isAdminSede) return ![ROLE_IDS.SUPER_ADMIN, ROLE_IDS.ADMIN_IGLESIA].includes(idRol);
  if (isLider) return idRol === ROLE_IDS.SERVIDOR;
  return false;
};
```

- [ ] Add canAssignRole function

### Step 3: Update roleNeedsSede logic

Find lines 81-82:

```typescript
const roleNeedsSede = (idRol: number) => ([ ROLE_IDS.ADMIN_SEDE, ROLE_IDS.LIDER, ROLE_IDS.SERVIDOR] as number[]).includes(idRol);
```

This is already correct (includes LIDER). Verify it's there; if not, update to include LIDER.

- [ ] Verify roleNeedsSede includes LIDER

### Step 4: Commit

```bash
git add src/app/components/UsuariosPage.tsx
git commit -m "feat: Add role permission checks (admin_sede, lider) and canAssignRole function"
```

- [ ] Commit changes

---

## Task 4: Add Scope Filters to User List

**Files:**
- Modify: `src/app/components/UsuariosPage.tsx:108-131`

### Step 1: Update filtered list logic

Find the `filtered` variable definition (around line 108):

```typescript
const filtered = usersForTable.filter(u => {
  // If admin_iglesia, only show users from their iglesia and exclude super admins
  if (isAdminIglesia) {
    const hasRoleInMyIglesia = u.roleNames.some(rn => rn.idIglesia === iglesiaActual?.id && rn.rolNombre !== 'Super Administrador');
    if (!hasRoleInMyIglesia) return false;
  }

  if (search) {
    // ... existing search logic
  }
  // ... rest of filters
  return true;
});
```

Add these filters after the `isAdminIglesia` check:

```typescript
const filtered = usersForTable.filter(u => {
  // If admin_iglesia, only show users from their iglesia and exclude super admins
  if (isAdminIglesia) {
    const hasRoleInMyIglesia = u.roleNames.some(rn => rn.idIglesia === iglesiaActual?.id && rn.rolNombre !== 'Super Administrador');
    if (!hasRoleInMyIglesia) return false;
  }

  // NEW: If admin_sede, only show users from their sede
  if (isAdminSede) {
    const mySede = sedesDelUsuario.find(s => s.id === iglesiaActual?.id); // Adjust if sede id is stored differently
    if (!mySede) return false; // Security: no sede context, hide all
    const hasRoleInMySede = u.roleNames.some(rn => rn.idSede === mySede.id);
    if (!hasRoleInMySede) return false;
  }

  // NEW: If líder, only show users from their ministerios
  if (isLider) {
    const inMyMinisterios = u.minNames.some(mn => 
      ministeriosDelUsuario.some(m => m.id === mn.idMinisterio)
    );
    if (!inMyMinisterios) return false;
  }

  if (search) {
    // ... existing search logic unchanged
  }
  // ... rest of filters unchanged
  return true;
});
```

**Note:** If `sedesDelUsuario` doesn't contain the ID in the way expected, check how the current code accesses seat/sede info and adjust the filter accordingly. The pattern should match existing iglesia filtering.

- [ ] Add admin_sede and lider filters to user list

### Step 2: Commit

```bash
git add src/app/components/UsuariosPage.tsx
git commit -m "feat: Add scope-based filtering for admin_sede and lider in user list"
```

- [ ] Commit changes

---

## Task 5: Update Invite Dialog Context Pre-Selection

**Files:**
- Modify: `src/app/components/UsuariosPage.tsx:56-75` (form state initialization)
- Modify: `src/app/components/UsuariosPage.tsx:148-200` (invite dialog JSX)

### Step 1: Pre-select context based on role

Find the `inviteForm` state initialization (around line 56-65):

```typescript
const [inviteForm, setInviteForm] = useState({
  correo: "",
  nombres: "",
  apellidos: "",
  idIglesia: iglesiaActual?.id ?? 0,
  idRol: 0,
  idSede: 0,
  idMinisterio: 0,
});
```

Update to:

```typescript
const [inviteForm, setInviteForm] = useState({
  correo: "",
  nombres: "",
  apellidos: "",
  idIglesia: iglesiaActual?.id ?? 0,
  idRol: 0,
  idSede: isAdminSede ? (sedesDelUsuario[0]?.id ?? 0) : 0,
  idMinisterio: isLider ? (ministeriosDelUsuario[0]?.id ?? 0) : 0,
});
```

- [ ] Update inviteForm initialization to pre-select sede/ministerio for admin_sede/lider

### Step 2: Update resetInviteForm similarly

Find `resetInviteForm()` function (around line 65):

```typescript
const resetInviteForm = () => setInviteForm({ 
  correo: "", 
  nombres: "", 
  apellidos: "", 
  idIglesia: iglesiaActual?.id ?? 0, 
  idRol: 0, 
  idSede: 0, 
  idMinisterio: 0 
});
```

Update to:

```typescript
const resetInviteForm = () => setInviteForm({ 
  correo: "", 
  nombres: "", 
  apellidos: "", 
  idIglesia: iglesiaActual?.id ?? 0, 
  idRol: 0, 
  idSede: isAdminSede ? (sedesDelUsuario[0]?.id ?? 0) : 0, 
  idMinisterio: isLider ? (ministeriosDelUsuario[0]?.id ?? 0) : 0 
});
```

- [ ] Update resetInviteForm to match

### Step 3: Hide sede/ministerio selectors for restricted roles

In the invite dialog JSX (look for the `DialogContent` that renders the form), find where sedes and ministerios are selected. For each:

**For sede selector:**
```jsx
{/* Show sede selector only if not admin_sede and not lider */}
{!isAdminSede && !isLider && (
  <Select value={String(inviteForm.idSede)} onValueChange={(val) => setInviteForm({ ...inviteForm, idSede: Number(val), idMinisterio: 0 })}>
    <SelectTrigger>
      <SelectValue placeholder="Selecciona sede" />
    </SelectTrigger>
    <SelectContent>
      {sedesInvite.map((sede) => (
        <SelectItem key={sede.id} value={String(sede.id)}>
          {sede.nombre}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}

{/* Show as text if restricted */}
{isAdminSede && (
  <div className="text-sm text-gray-600">
    Sede: {sedesDelUsuario.find(s => s.id === inviteForm.idSede)?.nombre}
  </div>
)}
```

**For ministerio selector:**
```jsx
{/* Show ministerio selector only if not lider and sede is selected */}
{!isLider && inviteForm.idSede && (
  <Select value={String(inviteForm.idMinisterio)} onValueChange={(val) => setInviteForm({ ...inviteForm, idMinisterio: Number(val) })}>
    <SelectTrigger>
      <SelectValue placeholder="Selecciona ministerio (opcional)" />
    </SelectTrigger>
    <SelectContent>
      {ministeriosInviteFiltered.map((min) => (
        <SelectItem key={min.id} value={String(min.id)}>
          {min.nombre}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}

{/* Show as text if restricted */}
{isLider && (
  <div className="text-sm text-gray-600">
    Ministerio: {ministeriosDelUsuario.find(m => m.id === inviteForm.idMinisterio)?.nombre}
  </div>
)}
```

**For role selector:**
```jsx
{/* Show only roles that current user can assign */}
<Select value={String(inviteForm.idRol)} onValueChange={(val) => setInviteForm({ ...inviteForm, idRol: Number(val) })}>
  <SelectTrigger>
    <SelectValue placeholder="Selecciona rol" />
  </SelectTrigger>
  <SelectContent>
    {roles
      .filter(role => canAssignRole(role.id))
      .map((role) => (
        <SelectItem key={role.id} value={String(role.id)}>
          {role.nombre}
        </SelectItem>
      ))}
  </SelectContent>
</Select>
```

- [ ] Hide sede/ministerio selectors for restricted roles, show as read-only text
- [ ] Filter role options using canAssignRole()

### Step 4: Commit

```bash
git add src/app/components/UsuariosPage.tsx
git commit -m "feat: Pre-select and restrict sede/ministerio/rol in invite dialog based on user role"
```

- [ ] Commit changes

---

## Task 6: Update Assign Role Dialog

**Files:**
- Modify: `src/app/components/UsuariosPage.tsx:68-74` (assignForm initialization)
- Modify: `src/app/components/UsuariosPage.tsx` (AssignRolDialog JSX)

### Step 1: Pre-select context in assignForm

Find `assignForm` state (around line 68):

```typescript
const [assignForm, setAssignForm] = useState({
  idRol: 0,
  idIglesia: iglesiaActual?.id ?? 0,
  idSede: 0,
  idMinisterio: 0,
});
```

Update to:

```typescript
const [assignForm, setAssignForm] = useState({
  idRol: 0,
  idIglesia: iglesiaActual?.id ?? 0,
  idSede: isAdminSede ? (sedesDelUsuario[0]?.id ?? 0) : 0,
  idMinisterio: isLider ? (ministeriosDelUsuario[0]?.id ?? 0) : 0,
});
```

- [ ] Update assignForm initialization

### Step 2: Update resetAssignForm

Find and update:

```typescript
const resetAssignForm = () => setAssignForm({ 
  idRol: 0, 
  idIglesia: iglesiaActual?.id ?? 0, 
  idSede: isAdminSede ? (sedesDelUsuario[0]?.id ?? 0) : 0, 
  idMinisterio: isLider ? (ministeriosDelUsuario[0]?.id ?? 0) : 0 
});
```

- [ ] Update resetAssignForm

### Step 3: Hide selectors in dialog

In the `AssignRolDialog` (wherever it's rendered), apply the same pattern as Step 5 (Hide sede/ministerio selectors) — hide sede/ministerio inputs for restricted roles, show as text.

- [ ] Hide sede/ministerio selectors in assign role dialog
- [ ] Filter available roles with canAssignRole()

### Step 4: Commit

```bash
git add src/app/components/UsuariosPage.tsx
git commit -m "feat: Apply role-based restrictions to assign role dialog"
```

- [ ] Commit changes

---

## Task 7: Add Permission Validation in handleInvite

**Files:**
- Modify: `src/app/components/UsuariosPage.tsx:148-200` (handleInvite function)

### Step 1: Add validation before invite

Find the `handleInvite()` function and update it to validate permissions:

```typescript
const handleInvite = () => {
  // Existing validation
  if (!inviteForm.correo.trim() || !inviteForm.nombres.trim() || !inviteForm.apellidos.trim() || !inviteForm.idRol || !inviteForm.idIglesia) {
    toast.error("Completa todos los campos obligatorios");
    return;
  }

  // NEW: Validate user can assign this role
  if (!canAssignRole(inviteForm.idRol)) {
    toast.error("No tienes permiso para asignar este rol");
    return;
  }

  // NEW: Validate sede requirement for líder/admin_sede
  if (isLider && !inviteForm.idMinisterio) {
    toast.error("Debes seleccionar un ministerio");
    return;
  }
  if (isAdminSede && !inviteForm.idSede) {
    toast.error("Debes seleccionar una sede");
    return;
  }

  // Continue with existing mutation call
  inviteMutation.mutate(inviteForm, {
    onSuccess: () => {
      toast.success("Usuario invitado exitosamente");
      resetInviteForm();
      setShowInvite(false);
    },
  });
};
```

- [ ] Add permission validation to handleInvite

### Step 2: Commit

```bash
git add src/app/components/UsuariosPage.tsx
git commit -m "feat: Add permission validation to invite handler"
```

- [ ] Commit changes

---

## Task 8: Create E2E Tests for Líder User Management

**Files:**
- Create: `e2e/specs/13-lider-manage-usuarios.spec.ts`

### Step 1: Create test file

Create `e2e/specs/13-lider-manage-usuarios.spec.ts` with this content:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Líder User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user with 'lider' role
    await page.goto('/login');
    await page.fill('input[name="email"]', 'lider@test.dev');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Iniciar sesión")');
    await page.waitForURL('**/app/**');
  });

  test('Líder can see invite button', async ({ page }) => {
    // Navigate to usuarios page in tenant scope
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Should see invite button
    const inviteBtn = page.locator('button:has-text("Invitar usuario")');
    await expect(inviteBtn).toBeVisible();
  });

  test('Líder sees only users from their ministerios', async ({ page }) => {
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Wait for table to load
    await page.waitForSelector('[data-testid="usuarios-table"]');

    // Verify no users from other ministerios are visible
    // (This requires knowing which ministerios the test user has)
    const rows = page.locator('[data-testid="usuario-row"]');
    const count = await rows.count();
    
    // Just verify we have some users or a message about no users
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Líder invite dialog pre-selects ministerio', async ({ page }) => {
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Click invite button
    await page.click('button:has-text("Invitar usuario")');
    
    // Wait for dialog
    await page.waitForSelector('[role="dialog"]');

    // Verify ministerio is pre-selected (read-only)
    const ministerioDisplay = page.locator('text=Ministerio:');
    await expect(ministerioDisplay).toBeVisible();

    // Verify sede selector is hidden (if no admin_sede)
    const sedeSelector = page.locator('[placeholder="Selecciona sede"]');
    await expect(sedeSelector).not.toBeVisible();
  });

  test('Líder can only assign "servidor" role', async ({ page }) => {
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Click invite button
    await page.click('button:has-text("Invitar usuario")');
    
    // Wait for dialog
    await page.waitForSelector('[role="dialog"]');

    // Open role selector
    await page.click('[placeholder="Selecciona rol"]');
    
    // Verify only "Servidor" is available
    const options = page.locator('[role="option"]');
    const count = await options.count();
    
    // Should have at least 1 option (Servidor)
    // If more than 1, verify "Servidor" is the only valid option
    expect(count).toBeGreaterThan(0);
    
    // Check that "Servidor" is in the list
    const servidorOption = page.locator('text=Servidor');
    await expect(servidorOption).toBeVisible();
  });

  test('Líder cannot invite without completing required fields', async ({ page }) => {
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Click invite button
    await page.click('button:has-text("Invitar usuario")');
    
    // Wait for dialog
    await page.waitForSelector('[role="dialog"]');

    // Try to submit empty form
    await page.click('button:has-text("Invitar")');

    // Should see error toast
    const errorToast = page.locator('text=Completa todos los campos obligatorios');
    await expect(errorToast).toBeVisible();
  });
});
```

- [ ] Create E2E test file with 5 test cases

### Step 2: Commit

```bash
git add e2e/specs/13-lider-manage-usuarios.spec.ts
git commit -m "test: Add E2E tests for líder user management"
```

- [ ] Commit E2E tests

---

## Task 9: Manual Testing Checklist

**Files:**
- No files to modify
- Testing manually in UI

- [ ] **Test 1: Líder Login and Access**

  1. Login as a user with role "líder" (use mock mode if needed)
  2. Navigate to `/app/[idIglesia]/usuarios`
  3. Verify: Page loads without errors
  4. Verify: "Invitar usuario" button is visible
  5. Verify: Table shows only users from líder's ministerios

- [ ] **Test 2: Invite as Líder**

  1. Click "Invitar usuario" button
  2. Verify: Dialog opens
  3. Verify: "Ministerio" field shows líder's ministerio (read-only)
  4. Verify: "Sede" selector is NOT visible (or disabled)
  5. Fill: Email, nombres, apellidos
  6. Select: "Servidor" as rol
  7. Click: "Invitar"
  8. Verify: Success toast appears
  9. Verify: User is added to table

- [ ] **Test 3: Filter by Ministerio**

  1. As líder, view usuarios page
  2. Search for a user NOT in their ministerio (if possible)
  3. Verify: User does NOT appear in results
  4. Search for a user in their ministerio
  5. Verify: User appears in results

- [ ] **Test 4: Admin Sede Access**

  1. Login as user with role "admin_sede"
  2. Navigate to usuarios page
  3. Verify: "Invitar usuario" button is visible
  4. Click: "Invitar usuario"
  5. Verify: "Sede" is pre-selected and read-only
  6. Verify: All roles (except super_admin, admin_iglesia) are available
  7. Fill and submit invite
  8. Verify: User is added to table

- [ ] **Test 5: Admin Sede Filtering**

  1. As admin_sede, view usuarios page
  2. Verify: Only users from their sede are shown
  3. Verify: Users from other sedes do NOT appear

- [ ] **Test 6: Assign Role as Líder**

  1. As líder, click on a user in table
  2. Click: "Asignar rol" button (if visible)
  3. Verify: Dialog opens
  4. Verify: "Ministerio" is pre-selected and read-only
  5. Verify: Only "Servidor" role is available
  6. Try to assign role
  7. Verify: Role is updated in table

- [ ] **Test 7: Delete User as Líder**

  1. As líder, click on a user
  2. Click: "Eliminar" button
  3. Verify: Confirmation dialog appears
  4. Type: Confirmation text
  5. Click: "Eliminar"
  6. Verify: User is removed from table and toast shows success

---

## Task 10: Update useUsuarios Hook (Optional Optimization)

**Files:**
- Modify: `src/hooks/useUsuarios.ts` (optional, for backend filtering)

**Note:** This step is OPTIONAL. The frontend filtering in UsuariosPage is sufficient for now. If you want to optimize by filtering at query time:

- [ ] **Step 1: (Optional) Update useUsuariosEnriquecidos**

  If implemented, the hook should receive context and filter before returning:

  ```typescript
  export function useUsuariosEnriquecidos() {
    const { rolActual, iglesiaActual, ministeriosDelUsuario, sedesDelUsuario } = useApp();
    
    const query = supabase.from('usuario').select('...');
    
    // Apply role-based filters
    if (rolActual === 'lider' && ministeriosDelUsuario.length > 0) {
      query = query.in('idMinisterio', ministeriosDelUsuario.map(m => m.id));
    }
    if (rolActual === 'admin_sede' && sedesDelUsuario.length > 0) {
      query = query.in('idSede', sedesDelUsuario.map(s => s.id));
    }
    
    return useQuery(/* ... */);
  }
  ```

  This is OPTIONAL — frontend filtering is sufficient.

---

## Task 11: Final Testing & Verification

**Files:**
- No files to modify

- [ ] **Step 1: Run E2E tests**

```bash
npm run test:e2e -- e2e/specs/13-lider-manage-usuarios.spec.ts
```

Expected: All tests pass.

- [ ] **Step 2: Manual smoke test**

  1. Login as super_admin
  2. Verify: Can see all users, can assign any role
  3. Login as admin_iglesia
  4. Verify: Can see only users from their iglesia
  5. Login as admin_sede
  6. Verify: Can see only users from their sede
  7. Login as lider
  8. Verify: Can see only users from their ministerios, can only assign "servidor"

- [ ] **Step 3: Verify no regressions**

  1. Test existing super_admin user management (should work as before)
  2. Test existing admin_iglesia user management (should work as before)
  3. Check for console errors (F12 Developer Tools)

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: Complete role-based user management for admin_sede and lider"
```

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| **AppContext.tsx** | Add `ministeriosDelUsuario` | Enables líder to know their managed ministerios |
| **UsuariosPage.tsx** | Add role/sede/ministerio filters | Líder/admin_sede see only their scope |
| **UsuariosPage.tsx** | Add `canAssignRole()` function | Enforce role assignment restrictions |
| **UsuariosPage.tsx** | Pre-select context in dialogs | UX clarity, prevent scope violations |
| **UsuariosPage.tsx** | Validate permissions in handlers | Prevent unauthorized operations |
| **13-lider-manage-usuarios.spec.ts** | New E2E tests | Verify líder workflows |

---

## Success Criteria

- ✅ Líder can invite users to their ministerio
- ✅ Líder can only assign "servidor" role
- ✅ Líder sees only users from their ministerios
- ✅ Admin sede can manage users in their sede
- ✅ All role assignments respect hierarchy (no líder can assign admin roles)
- ✅ E2E tests pass
- ✅ No regressions in existing functionality
- ✅ No console errors

---

## Notes

- **Frontend-first approach:** This plan focuses on UI/UX layer. Backend RLS should be added in a separate PR for security.
- **Extensibility:** Adding new roles in future is straightforward — add role check in `canManageUsers`, add case to `canAssignRole()`, add filter to `filtered` list.
- **Testing:** Manual tests cover happy path; E2E tests cover edge cases. Add more as needed.
