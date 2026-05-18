// src/app/routes.ts
import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { AppLayout } from "./components/AppLayout";
import { TenantLayout } from "./components/TenantLayout";
import { GlobalLayout } from "./components/GlobalLayout";
import { IndexRedirect } from "./components/IndexRedirect";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { SetPasswordPage } from "./components/SetPasswordPage";
import { AuthCallbackPage } from "./components/AuthCallbackPage";
import { AcceptInvitePage } from "./components/AcceptInvitePage";
import { DashboardPage } from "./components/DashboardPage";
import { ChurchesPage } from "./components/ChurchesPage";
import { ChurchDetailPage } from "./components/ChurchDetailPage";
import { MinisteriosPage } from "./components/MinisteriosPage";
import { MiMinisterioPage } from "./components/MiMinisterioPage";
import { AdministradorPage } from "./components/AdministradorPage";
import { MembersPage } from "./components/MembersPage";
import { AulaPage } from "./components/AulaPage";
import { ProgresoIndividualPage } from "./components/ProgresoIndividualPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { ProfilePage } from "./components/ProfilePage";
import { GeographyPage } from "./components/GeographyPage";
import { SitemapPage } from "./components/SitemapPage";
import { CumpleanosPage } from "./components/CumpleanosPage";
import { NoChurchAssignedPage } from "./components/NoChurchAssignedPage";
import { GlobalMinisteriosPage } from "./components/GlobalMinisteriosPage";
import { GlobalEventosPage } from "./components/GlobalEventosPage";
import { GlobalTareasPage } from "./components/GlobalTareasPage";
import { GlobalAulaPage } from "./components/GlobalAulaPage";
import { RootErrorPage, ErrorPage } from "./components/ErrorPage";

// Lazy-loaded route components (code splitting for large pages)
const UsuariosPage = React.lazy(() =>
  import("./components/UsuariosPage").then(mod => ({ default: mod.UsuariosPage }))
);
const TasksPage = React.lazy(() =>
  import("./components/TasksPage").then(mod => ({ default: mod.TasksPage }))
);
const PastoresPage = React.lazy(() =>
  import("./components/PastoresPage").then(mod => ({ default: mod.PastoresPage }))
);
const SedesPage = React.lazy(() =>
  import("./components/SedesPage").then(mod => ({ default: mod.SedesPage }))
);
const CursoDetallePage = React.lazy(() =>
  import("./components/CursoDetallePage").then(mod => ({ default: mod.CursoDetallePage }))
);
const EventsPage = React.lazy(() =>
  import("./components/EventsPage").then(mod => ({ default: mod.EventsPage }))
);
const StatisticsPage = React.lazy(() =>
  import("./components/StatisticsPage").then(mod => ({ default: mod.StatisticsPage }))
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: RootErrorPage,
    children: [
      { index: true, Component: LandingPage },
      { path: "login", Component: LoginPage, ErrorBoundary: ErrorPage },
      { path: "forgot-password", Component: ForgotPasswordPage, ErrorBoundary: ErrorPage },
      { path: "auth/reset-password", Component: ResetPasswordPage, ErrorBoundary: ErrorPage },
      { path: "set-password", Component: SetPasswordPage, ErrorBoundary: ErrorPage },
      { path: "auth/callback", Component: AuthCallbackPage, ErrorBoundary: ErrorPage },
      { path: "auth/accept-invite", Component: AcceptInvitePage, ErrorBoundary: ErrorPage },
      {
        path: "app",
        Component: AppLayout,
        ErrorBoundary: ErrorPage,
        children: [
          { index: true, Component: IndexRedirect, ErrorBoundary: ErrorPage },
          { path: "sin-iglesia", Component: NoChurchAssignedPage, ErrorBoundary: ErrorPage },

          // ── Rutas globales (solo super_admin) ──
          {
            path: "global",
            Component: GlobalLayout,
            ErrorBoundary: ErrorPage,
            children: [
              { index: true, Component: DashboardPage, ErrorBoundary: ErrorPage },
              { path: "iglesias", Component: ChurchesPage, ErrorBoundary: ErrorPage },
              { path: "iglesias/:idIglesia", Component: ChurchDetailPage, ErrorBoundary: ErrorPage },
              { path: "sedes", Component: SedesPage, ErrorBoundary: ErrorPage },
              { path: "usuarios", Component: UsuariosPage, ErrorBoundary: ErrorPage },
              { path: "geografia", Component: GeographyPage, ErrorBoundary: ErrorPage },
              { path: "notificaciones", Component: NotificationsPage, ErrorBoundary: ErrorPage },
              { path: "perfil", Component: ProfilePage, ErrorBoundary: ErrorPage },
              { path: "cumpleanos", Component: CumpleanosPage, ErrorBoundary: ErrorPage },
              { path: "sitemap", Component: SitemapPage, ErrorBoundary: ErrorPage },
              { path: "administrador", Component: AdministradorPage, ErrorBoundary: ErrorPage },
              { path: "estadisticas", Component: StatisticsPage, ErrorBoundary: ErrorPage },
              { path: "ministerios", Component: GlobalMinisteriosPage, ErrorBoundary: ErrorPage },
              { path: "eventos", Component: GlobalEventosPage, ErrorBoundary: ErrorPage },
              { path: "tareas", Component: GlobalTareasPage, ErrorBoundary: ErrorPage },
              { path: "aula", Component: GlobalAulaPage, ErrorBoundary: ErrorPage },
            ],
          },

          // ── Rutas tenant-scoped ──
          {
            path: ":idIglesia",
            Component: TenantLayout,
            ErrorBoundary: ErrorPage,
            children: [
              { index: true, Component: DashboardPage, ErrorBoundary: ErrorPage },
              { path: "iglesia", Component: ChurchDetailPage, ErrorBoundary: ErrorPage },
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
              { path: "administrador", Component: AdministradorPage, ErrorBoundary: ErrorPage },
              { path: "mi-ministerio", Component: MiMinisterioPage, ErrorBoundary: ErrorPage },
              { path: "notificaciones", Component: NotificationsPage, ErrorBoundary: ErrorPage },
              { path: "perfil", Component: ProfilePage, ErrorBoundary: ErrorPage },
              { path: "cumpleanos", Component: CumpleanosPage, ErrorBoundary: ErrorPage },
              { path: "estadisticas", Component: StatisticsPage, ErrorBoundary: ErrorPage },
            ],
          },
        ],
      },
      // Redirecciones usando React.createElement para evitar JSX en archivo .ts
      { path: "index", element: React.createElement(Navigate, { to: "/", replace: true }) },
      { path: "*", element: React.createElement(Navigate, { to: "/", replace: true }) }
    ],
  },
]);
