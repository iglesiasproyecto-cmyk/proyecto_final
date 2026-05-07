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
import { DepartmentsPage } from "./components/DepartmentsPage";
import { MyDepartmentPage } from "./components/MyDepartmentPage";
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
              { path: "ministerios", Component: DepartmentsPage, ErrorBoundary: ErrorPage },
              { path: "usuarios", Component: UsuariosPage, ErrorBoundary: ErrorPage },
              { path: "miembros", Component: MembersPage, ErrorBoundary: ErrorPage },
              { path: "eventos", Component: EventsPage, ErrorBoundary: ErrorPage },
              { path: "tareas", Component: TasksPage, ErrorBoundary: ErrorPage },
              { path: "aula", Component: AulaPage, ErrorBoundary: ErrorPage },
              { path: "aula/curso/:idCurso", Component: CursoDetallePage, ErrorBoundary: ErrorPage },
              { path: "aula/curso/:idCurso/servidor/:idUsuario", Component: ProgresoIndividualPage, ErrorBoundary: ErrorPage },
              { path: "mi-ministerio", Component: MyDepartmentPage, ErrorBoundary: ErrorPage },
              { path: "notificaciones", Component: NotificationsPage, ErrorBoundary: ErrorPage },
              { path: "perfil", Component: ProfilePage, ErrorBoundary: ErrorPage },
            ],
          },
        ],
      },
    ],
  },
]);
