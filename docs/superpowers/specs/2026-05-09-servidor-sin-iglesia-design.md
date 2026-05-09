# Servidor Sin Iglesia - Redirect Loop Fix

## Context
Logging in as a non-super_admin user with no iglesia assigned causes a loop between `/login` and `/app`. This happens because:
- `IndexRedirect` sends non-super_admin without `iglesiaActual` to `/login`.
- `LoginPage` forces navigation to `/app` after session hydration.

## Goals
- Stop the `/login` <-> `/app` redirect loop for users without iglesias.
- Provide a stable in-app state that explains the situation and offers a safe exit.
- Keep super_admin flow unchanged.

## Non-Goals
- Changing role/permissions logic in Supabase.
- Auto-assigning iglesias to users.
- Refactoring auth hydration logic.

## Recommended Approach (A)
Add a dedicated route `/app/sin-iglesia` that is reachable for authenticated users without iglesias.

### Routing
- Add a new child route under `/app`:
  - Path: `sin-iglesia`
  - Component: `NoChurchAssignedPage` (new)

### Redirect Logic Changes
1) `IndexRedirect`:
   - If user is authenticated, role is NOT `super_admin`, and `iglesiaActual` is null, navigate to `/app/sin-iglesia`.
   - Keep existing behavior for `super_admin` and users with `iglesiaActual`.

2) `LoginPage`:
   - When login succeeds, if `iglesiaActual` is null and role is not `super_admin`, navigate to `/app/sin-iglesia` instead of `/app`.
   - Avoid forcing `/app` if already on `/app/sin-iglesia`.

### UI Component: NoChurchAssignedPage
Purpose: explain that the user has no iglesia assigned and provide safe actions.

Content:
- Title: "No tienes una iglesia asignada"
- Description: short guidance to contact admin.
- Actions:
  - "Cerrar sesion" (calls logout)
  - Optional: "Volver al login" (navigate to `/login`)

### Data Flow
- Uses `useApp()` to read `rolActual`, `iglesiaActual`, `usuarioActual`.
- Does not attempt to refresh claims or modify state.

### Error Handling
- If `authError` is present, existing `AuthRecovery` remains the source of truth.
- If the user later gets an iglesia assigned and state updates, `IndexRedirect` will send them to the correct tenant dashboard.

## Testing Plan (TDD)
Add a minimal route guard test or component test:
- Scenario: user role = `servidor`, `iglesiaActual = null`.
- Expect: navigation to `/app/sin-iglesia` and no redirect to `/login`.

## Acceptance Criteria
- Logging in as servidor with no iglesia lands on `/app/sin-iglesia`.
- No flicker or loop between `/login` and `/app`.
- Super_admin flow unchanged.
