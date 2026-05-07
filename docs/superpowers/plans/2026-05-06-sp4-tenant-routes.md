# SP-4: Rutas Multi-Tenant + CRUDs Completos por Rol

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar las rutas para incluir `idIglesia` como tenant en la URL (`/app/:idIglesia/*`), crear los layouts de tenant y global, y completar la navegación por rol.

**Architecture:** Nueva estructura `/app/global/*` (super_admin) y `/app/:idIglesia/*` (tenant). `TenantLayout` valida acceso. Los servicios reciben `idIglesia` explícito. El sidebar se genera dinámicamente con el tenant activo.

**Tech Stack:** React Router v7, React 18, TypeScript, Tailwind CSS v4

**Dependencia:** SP-2 (JWT claims con tenant_id) y SP-3 (schema con id_iglesia) deben estar completos.

---

## Archivos

| Acción | Archivo |
|---|---|
| Modificar | `src/app/routes.ts` |
| Crear | `src/app/components/TenantLayout.tsx` |
| Crear | `src/app/components/GlobalLayout.tsx` |
| Modificar | `src/app/components/AppLayout.tsx` |
| Modificar | `src/app/components/IndexRedirect.tsx` |
| Crear | `src/app/components/AdministradoresPage.tsx` |
| Renombrar/Modificar | `src/app/components/DepartmentsPage.tsx` → `MinisteriosPage.tsx` |
| Renombrar/Modificar | `src/app/components/MyDepartmentPage.tsx` → `MiMinisterioPage.tsx` |
| Modificar | `src/app/store/AppContext.tsx` |

---

### Task 1: Actualizar `routes.ts` con nueva estructura multi-tenant

**Files:**
- Modify: `src/app/routes.ts`

- [ ] **Step 1: Reemplazar el contenido de `routes.ts`**

```typescript
// src/app/routes.ts
import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { AppLayout } from "./components/AppLayout";
import { TenantLayout } from "./components/TenantLayout";
import { GlobalLayout } from "./components/GlobalLayout";
import { IndexRedirect } from "./components/IndexRedirect";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import { SetPasswordPage } from "./components/SetPasswordPage";
import { AuthCallbackPage } from "./components/AuthCallbackPage";
import { DashboardPage } from "./components/DashboardPage";
import { ChurchesPage } from "./components/ChurchesPage";
import { ChurchDetailPage } from "./components/ChurchDetailPage";
import { SedesPage } from "./components/SedesPage";
import { PastoresPage } from "./components/PastoresPage";
import { MinisteriosPage } from "./components/MinisteriosPage";
import { MiMinisterioPage } from "./components/MiMinisterioPage";
import { MembersPage } from "./components/MembersPage";
import { EventsPage } from "./components/EventsPage";
import { TasksPage } from "./components/TasksPage";
import { AulaPage } from "./components/AulaPage";
import { CursoDetallePage } from "./components/CursoDetallePage";
import { ProgresoIndividualPage } from "./components/ProgresoIndividualPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { ProfilePage } from "./components/ProfilePage";
import { GeographyPage } from "./components/GeographyPage";
import { UsuariosPage } from "./components/UsuariosPage";
import { CatalogosPage } from "./components/CatalogosPage";
import { AdministradoresPage } from "./components/AdministradoresPage";
import { SitemapPage } from "./components/SitemapPage";
import { RootErrorPage, ErrorPage } from "./components/ErrorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: RootErrorPage,
    children: [
      { index: true, Component: LandingPage },
      { path: "login", Component: LoginPage, ErrorBoundary: ErrorPage },
      { path: "forgot-password", Component: ForgotPasswordPage, ErrorBoundary: ErrorPage },
      { path: "set-password", Component: SetPasswordPage, ErrorBoundary: ErrorPage },
      { path: "auth/callback", Component: AuthCallbackPage, ErrorBoundary: ErrorPage },
      {
        path: "app",
        Component: AppLayout,
        ErrorBoundary: ErrorPage,
        children: [
          { index: true, Component: IndexRedirect, ErrorBoundary: ErrorPage },

          // ── Rutas globales (solo super_admin) ──
          {
            path: "global",
            Component: GlobalLayout,
            ErrorBoundary: ErrorPage,
            children: [
              { index: true, Component: DashboardPage, ErrorBoundary: ErrorPage },
              { path: "iglesias", Component: ChurchesPage, ErrorBoundary: ErrorPage },
              { path: "iglesias/:idIglesia", Component: ChurchDetailPage, ErrorBoundary: ErrorPage },
              { path: "administradores", Component: AdministradoresPage, ErrorBoundary: ErrorPage },
              { path: "usuarios", Component: UsuariosPage, ErrorBoundary: ErrorPage },
              { path: "geografia", Component: GeographyPage, ErrorBoundary: ErrorPage },
              { path: "catalogos", Component: CatalogosPage, ErrorBoundary: ErrorPage },
              { path: "notificaciones", Component: NotificationsPage, ErrorBoundary: ErrorPage },
              { path: "perfil", Component: ProfilePage, ErrorBoundary: ErrorPage },
              { path: "sitemap", Component: SitemapPage, ErrorBoundary: ErrorPage },
            ],
          },

          // ── Rutas tenant-scoped ──
          {
            path: ":idIglesia",
            Component: TenantLayout,
            ErrorBoundary: ErrorPage,
            children: [
              { index: true, Component: DashboardPage, ErrorBoundary: ErrorPage },
              { path: "sedes", Component: SedesPage, ErrorBoundary: ErrorPage },
              { path: "pastores", Component: PastoresPage, ErrorBoundary: ErrorPage },
              { path: "ministerios", Component: MinisteriosPage, ErrorBoundary: ErrorPage },
              { path: "usuarios", Component: UsuariosPage, ErrorBoundary: ErrorPage },
              { path: "miembros", Component: MembersPage, ErrorBoundary: ErrorPage },
              { path: "eventos", Component: EventsPage, ErrorBoundary: ErrorPage },
              { path: "tareas", Component: TasksPage, ErrorBoundary: ErrorPage },
              { path: "aula", Component: AulaPage, ErrorBoundary: ErrorPage },
              { path: "aula/curso/:idCurso", Component: CursoDetallePage, ErrorBoundary: ErrorPage },
              { path: "aula/curso/:idCurso/servidor/:idUsuario", Component: ProgresoIndividualPage, ErrorBoundary: ErrorPage },
              { path: "mi-ministerio", Component: MiMinisterioPage, ErrorBoundary: ErrorPage },
              { path: "notificaciones", Component: NotificationsPage, ErrorBoundary: ErrorPage },
              { path: "perfil", Component: ProfilePage, ErrorBoundary: ErrorPage },
            ],
          },
        ],
      },
    ],
  },
]);
```

- [ ] **Step 2: Commit**

```bash
git add src/app/routes.ts
git commit -m "feat(routes): restructure to multi-tenant /app/:idIglesia/* + /app/global/*"
```

---

### Task 2: Crear `TenantLayout.tsx` — guard de tenant

**Files:**
- Create: `src/app/components/TenantLayout.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/app/components/TenantLayout.tsx
import { useEffect } from "react";
import { Outlet, useNavigate, useParams } from "react-router";
import { useApp } from "../store/AppContext";

export function TenantLayout() {
  const { idIglesia } = useParams<{ idIglesia: string }>();
  const { rolActual, iglesiaActual, authLoading, usuarioActual } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!usuarioActual) {
      navigate("/login");
      return;
    }

    const tenantId = Number(idIglesia);
    if (isNaN(tenantId)) {
      navigate("/app");
      return;
    }

    // super_admin puede acceder a cualquier tenant
    if (rolActual === "super_admin") return;

    // Todos los demás solo pueden acceder a su propia iglesia
    if (iglesiaActual?.id !== tenantId) {
      // Redirigir a su propio tenant
      if (iglesiaActual?.id) {
        navigate(`/app/${iglesiaActual.id}`, { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    }
  }, [authLoading, usuarioActual, rolActual, iglesiaActual, idIglesia, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <Outlet />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/TenantLayout.tsx
git commit -m "feat: add TenantLayout guard for tenant-scoped routes"
```

---

### Task 3: Crear `GlobalLayout.tsx` — guard super_admin

**Files:**
- Create: `src/app/components/GlobalLayout.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/app/components/GlobalLayout.tsx
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useApp } from "../store/AppContext";

export function GlobalLayout() {
  const { rolActual, authLoading, usuarioActual, iglesiaActual } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!usuarioActual) {
      navigate("/login");
      return;
    }
    // Solo super_admin puede acceder a rutas globales
    if (rolActual !== "super_admin") {
      const destino = iglesiaActual?.id ? `/app/${iglesiaActual.id}` : "/app";
      navigate(destino, { replace: true });
    }
  }, [authLoading, usuarioActual, rolActual, iglesiaActual, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <Outlet />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/GlobalLayout.tsx
git commit -m "feat: add GlobalLayout guard for super_admin-only routes"
```

---

### Task 4: Actualizar `IndexRedirect.tsx`

**Files:**
- Modify: `src/app/components/IndexRedirect.tsx`

- [ ] **Step 1: Actualizar la lógica de redirección**

```typescript
// src/app/components/IndexRedirect.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";

export function IndexRedirect() {
  const { rolActual, iglesiaActual, authLoading, usuarioActual } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!usuarioActual) {
      navigate("/login", { replace: true });
      return;
    }

    if (rolActual === "super_admin") {
      navigate("/app/global", { replace: true });
    } else if (iglesiaActual?.id) {
      navigate(`/app/${iglesiaActual.id}`, { replace: true });
    } else {
      // Usuario sin iglesia asignada — mostrar error
      navigate("/login", { replace: true });
    }
  }, [authLoading, usuarioActual, rolActual, iglesiaActual, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/IndexRedirect.tsx
git commit -m "feat: IndexRedirect routes super_admin to /app/global, others to /app/:idIglesia"
```

---

### Task 5: Actualizar `AppLayout.tsx` — navegación por rol con tenant en rutas

**Files:**
- Modify: `src/app/components/AppLayout.tsx`

- [ ] **Step 1: Actualizar `getNavItemsForRole` para incluir tenant en rutas**

Reemplazar la función `getNavItemsForRole` en `AppLayout.tsx`:

```typescript
function getNavItemsForRole(
  role: string,
  iglesiaActual?: { id: number; nombre: string } | null
): NavItem[] {
  const t = iglesiaActual?.id ? `/app/${iglesiaActual.id}` : "/app";

  switch (role) {
    case "super_admin":
      return [
        { label: "Dashboard", path: "/app/global", icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Iglesias", path: "/app/global/iglesias", icon: <Building2 className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Administradores", path: "/app/global/administradores", icon: <UserCheck className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Usuarios", path: "/app/global/usuarios", icon: <Users className="w-5 h-5" />, section: "Gestión Global" },
        { label: "Geografía", path: "/app/global/geografia", icon: <Globe className="w-5 h-5" />, section: "Configuración" },
        { label: "Catálogos", path: "/app/global/catalogos", icon: <Settings2 className="w-5 h-5" />, section: "Configuración" },
        { label: "Notificaciones", path: "/app/global/notificaciones", icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: "/app/global/perfil", icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "admin_iglesia":
      return [
        { label: "Dashboard", path: `${t}`, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Iglesia", path: `/app/global/iglesias/${iglesiaActual?.id}`, icon: <Church className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Sedes", path: `${t}/sedes`, icon: <Building2 className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Pastores", path: `${t}/pastores`, icon: <UserCheck className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Ministerios", path: `${t}/ministerios`, icon: <Settings className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Usuarios", path: `${t}/usuarios`, icon: <Users className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Miembros", path: `${t}/miembros`, icon: <Users className="w-5 h-5" />, section: "Mi Iglesia" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "lider":
      return [
        { label: "Dashboard", path: `${t}`, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Ministerio", path: `${t}/mi-ministerio`, icon: <FolderHeart className="w-5 h-5" />, section: "Ministerio" },
        { label: "Miembros", path: `${t}/miembros`, icon: <Users className="w-5 h-5" />, section: "Ministerio" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    case "servidor":
      return [
        { label: "Dashboard", path: `${t}`, icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
        { label: "Mi Ministerio", path: `${t}/mi-ministerio`, icon: <FolderHeart className="w-5 h-5" />, section: "Ministerio" },
        { label: "Eventos", path: `${t}/eventos`, icon: <CalendarDays className="w-5 h-5" />, section: "Operaciones" },
        { label: "Mis Tareas", path: `${t}/tareas`, icon: <ListTodo className="w-5 h-5" />, section: "Operaciones" },
        { label: "Aula de Formación", path: `${t}/aula`, icon: <BookOpen className="w-5 h-5" />, section: "Formación" },
        { label: "Notificaciones", path: `${t}/notificaciones`, icon: <Bell className="w-5 h-5" />, section: "Personal" },
        { label: "Mi Perfil", path: `${t}/perfil`, icon: <User className="w-5 h-5" />, section: "Personal" },
      ];

    default:
      return [
        { label: "Dashboard", path: "/app", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Notificaciones", path: "/app/notificaciones", icon: <Bell className="w-5 h-5" /> },
        { label: "Mi Perfil", path: "/app/perfil", icon: <User className="w-5 h-5" /> },
      ];
  }
}
```

También actualizar `pageTitles` para reflejar nuevas rutas:

```typescript
const pageTitles: Record<string, string> = {
  "/app/global": "Dashboard Global",
  "/app/global/iglesias": "Gestión de Iglesias",
  "/app/global/administradores": "Administradores de Iglesia",
  "/app/global/usuarios": "Usuarios",
  "/app/global/geografia": "Geografía",
  "/app/global/catalogos": "Catálogos",
  "/app/global/notificaciones": "Notificaciones",
  "/app/global/perfil": "Mi Perfil",
};

// Para rutas dinámicas /:idIglesia/*, usar el pathname actual
function getDynamicPageTitle(pathname: string): string {
  if (pathname.match(/\/app\/\d+\/sedes/)) return "Sedes";
  if (pathname.match(/\/app\/\d+\/pastores/)) return "Pastores";
  if (pathname.match(/\/app\/\d+\/ministerios/)) return "Ministerios";
  if (pathname.match(/\/app\/\d+\/usuarios/)) return "Usuarios";
  if (pathname.match(/\/app\/\d+\/miembros/)) return "Miembros";
  if (pathname.match(/\/app\/\d+\/eventos/)) return "Eventos";
  if (pathname.match(/\/app\/\d+\/tareas/)) return "Tareas";
  if (pathname.match(/\/app\/\d+\/aula\/curso\/\d+\/servidor/)) return "Progreso Individual";
  if (pathname.match(/\/app\/\d+\/aula\/curso/)) return "Detalle del Curso";
  if (pathname.match(/\/app\/\d+\/aula/)) return "Aula de Formación";
  if (pathname.match(/\/app\/\d+\/mi-ministerio/)) return "Mi Ministerio";
  if (pathname.match(/\/app\/\d+\/notificaciones/)) return "Notificaciones";
  if (pathname.match(/\/app\/\d+\/perfil/)) return "Mi Perfil";
  if (pathname.match(/\/app\/\d+$/)) return "Dashboard";
  return "Panel";
}
```

En el `useEffect` que actualiza el `document.title`, reemplazar:
```typescript
useEffect(() => {
  const title = pageTitles[location.pathname] ?? getDynamicPageTitle(location.pathname);
  document.title = `${title} | IGLESIABD`;
}, [location.pathname]);
```

- [ ] **Step 2: Actualizar badge del rol**

En `roleLabels`:
```typescript
const roleLabels: Record<string, string> = {
  super_admin: "Super Administrador",
  admin_iglesia: "Administrador de Iglesia",   // <-- cambiar de "Admin. de Iglesia"
  lider: "Líder de Ministerio",
  servidor: "Servidor",
};
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/AppLayout.tsx
git commit -m "feat(nav): update sidebar navigation with tenant-scoped routes per role"
```

---

### Task 6: Crear `MinisteriosPage.tsx` (renombrar desde DepartmentsPage)

**Files:**
- Create: `src/app/components/MinisteriosPage.tsx`

- [ ] **Step 1: Copiar y renombrar**

```bash
cp src/app/components/DepartmentsPage.tsx src/app/components/MinisteriosPage.tsx
```

- [ ] **Step 2: Actualizar en `MinisteriosPage.tsx`**

1. Cambiar el export: `export function MinisteriosPage()`
2. Reemplazar todos los textos "Departamento" → "Ministerio" en títulos y labels
3. Actualizar para leer `idIglesia` del parámetro de ruta:

```typescript
import { useParams } from "react-router";

export function MinisteriosPage() {
  const { idIglesia } = useParams<{ idIglesia: string }>();
  const idIglesiaNum = Number(idIglesia);
  // Pasar idIglesiaNum a los hooks de ministerios
  // ...
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/MinisteriosPage.tsx
git commit -m "feat: add MinisteriosPage (renamed from DepartmentsPage) with tenant scoping"
```

---

### Task 7: Crear `MiMinisterioPage.tsx` (renombrar desde MyDepartmentPage)

**Files:**
- Create: `src/app/components/MiMinisterioPage.tsx`

- [ ] **Step 1: Copiar y renombrar**

```bash
cp src/app/components/MyDepartmentPage.tsx src/app/components/MiMinisterioPage.tsx
```

- [ ] **Step 2: Actualizar export y textos**

1. `export function MiMinisterioPage()`
2. Textos "Mi Departamento" → "Mi Ministerio"
3. Agregar `useParams` para leer `idIglesia`

- [ ] **Step 3: Commit**

```bash
git add src/app/components/MiMinisterioPage.tsx
git commit -m "feat: add MiMinisterioPage (renamed from MyDepartmentPage)"
```

---

### Task 8: Crear `AdministradoresPage.tsx` — gestión de admin_iglesia

**Files:**
- Create: `src/app/components/AdministradoresPage.tsx`

- [ ] **Step 1: Crear página básica**

```typescript
// src/app/components/AdministradoresPage.tsx
import { useState } from "react";
import { useIglesias } from "@/hooks/useIglesias";
import { useUsuarios } from "@/hooks/useUsuarios";

export function AdministradoresPage() {
  const [selectedIglesia, setSelectedIglesia] = useState<number | null>(null);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administradores de Iglesia</h1>
        <p className="text-muted-foreground mt-1">
          Asigna y gestiona los administradores de cada iglesia.
        </p>
      </div>

      {/* Lista de iglesias con su administrador actual */}
      <AdminIglesiasTable />
    </div>
  );
}

function AdminIglesiasTable() {
  // Muestra tabla: Iglesia | Administrador actual | Acciones
  // Acciones: Asignar admin, Remover admin, Ver iglesia
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-muted-foreground text-sm">
        Tabla de administradores — implementar con datos reales de Supabase.
      </p>
    </div>
  );
}
```

**Nota:** Esta página se completa en iteraciones posteriores. El shell es suficiente para que la ruta funcione.

- [ ] **Step 2: Commit**

```bash
git add src/app/components/AdministradoresPage.tsx
git commit -m "feat: add AdministradoresPage shell for super_admin iglesia admin management"
```

---

### Task 9: Actualizar hooks para recibir `idIglesia` del param

Todos los hooks que hacen fetch de datos de iglesia deben aceptar el `idIglesia` explícitamente en lugar de leerlo del contexto global.

**Files:**
- Modify: `src/hooks/useMinisterios.ts`, `src/hooks/useEventos.ts`, `src/hooks/useUsuarios.ts`

- [ ] **Step 1: Patrón a seguir para cada hook**

Ejemplo con `useMinisterios.ts`:

```typescript
// ANTES
export function useMinisterios() {
  const { iglesiaActual } = useApp();
  // usaba iglesiaActual.id
}

// DESPUÉS
export function useMinisterios(idIglesia?: number) {
  const { iglesiaActual } = useApp();
  const tenantId = idIglesia ?? iglesiaActual?.id;
  // usa tenantId
}
```

- [ ] **Step 2: Actualizar las páginas que usan estos hooks**

En cada página bajo `/app/:idIglesia/*`:

```typescript
// En SedesPage, MinisteriosPage, EventsPage, TasksPage, etc.
import { useParams } from "react-router";

export function SedesPage() {
  const { idIglesia } = useParams<{ idIglesia: string }>();
  const { sedes, loading } = useSedes(Number(idIglesia));
  // ...
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/ src/app/components/SedesPage.tsx \
        src/app/components/EventsPage.tsx src/app/components/TasksPage.tsx \
        src/app/components/MembersPage.tsx
git commit -m "feat: pass idIglesia from route params to hooks for tenant scoping"
```

---

### Task 10: Verificación end-to-end de navegación

- [ ] **Step 1: Iniciar el servidor de desarrollo**

```bash
npm run dev
```

- [ ] **Step 2: Probar super_admin**
  - Login como super_admin
  - Verificar redirección a `/app/global`
  - Navegar a cada sección del sidebar global
  - Verificar que `/app/global/administradores` carga sin error

- [ ] **Step 3: Probar admin_iglesia**
  - Login como admin_iglesia (iglesia ID 1)
  - Verificar redirección a `/app/1`
  - Intentar navegar a `/app/2` → debe redirigir a `/app/1`
  - Navegar a `/app/1/ministerios`, `/app/1/pastores`, `/app/1/sedes` — deben cargar

- [ ] **Step 4: Probar lider**
  - Login como lider
  - Verificar redirección a `/app/:idIglesia`
  - Solo ve: Mi Ministerio, Eventos, Tareas, Aula en el sidebar

- [ ] **Step 5: Commit final**

```bash
git add .
git commit -m "feat(sp4): complete multi-tenant route structure and navigation by role"
```
