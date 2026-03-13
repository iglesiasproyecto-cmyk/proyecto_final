import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { AppLayout } from "./components/AppLayout";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { DashboardPage } from "./components/DashboardPage";
import { ChurchesPage } from "./components/ChurchesPage";
import { DepartmentsPage } from "./components/DepartmentsPage";
import { MyDepartmentPage } from "./components/MyDepartmentPage";
import { MembersPage } from "./components/MembersPage";
import { EventsPage } from "./components/EventsPage";
import { TasksPage } from "./components/TasksPage";
import { ClassroomPage } from "./components/ClassroomPage";
import { EvaluationsPage } from "./components/EvaluationsPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { ProfilePage } from "./components/ProfilePage";
import { GeographyPage } from "./components/GeographyPage";
import { SedesPage } from "./components/SedesPage";
import { PastoresPage } from "./components/PastoresPage";
import { UsuariosPage } from "./components/UsuariosPage";
import { CatalogosPage } from "./components/CatalogosPage";
import { CiclosLectivosPage } from "./components/CiclosLectivosPage";
import { RootErrorPage, ErrorPage } from "./components/ErrorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: RootErrorPage,
    children: [
      {
        index: true,
        Component: LandingPage,
      },
      {
        path: "login",
        Component: LoginPage,
        ErrorBoundary: ErrorPage,
      },
      {
        path: "app",
        Component: AppLayout,
        ErrorBoundary: ErrorPage,
        children: [
          { index: true, Component: DashboardPage, ErrorBoundary: ErrorPage },
          { path: "iglesias", Component: ChurchesPage, ErrorBoundary: ErrorPage },
          { path: "departamentos", Component: DepartmentsPage, ErrorBoundary: ErrorPage },
          { path: "mi-departamento", Component: MyDepartmentPage, ErrorBoundary: ErrorPage },
          { path: "miembros", Component: MembersPage, ErrorBoundary: ErrorPage },
          { path: "eventos", Component: EventsPage, ErrorBoundary: ErrorPage },
          { path: "tareas", Component: TasksPage, ErrorBoundary: ErrorPage },
          { path: "aula", Component: ClassroomPage, ErrorBoundary: ErrorPage },
          { path: "evaluaciones", Component: EvaluationsPage, ErrorBoundary: ErrorPage },
          { path: "ciclos-lectivos", Component: CiclosLectivosPage, ErrorBoundary: ErrorPage },
          { path: "notificaciones", Component: NotificationsPage, ErrorBoundary: ErrorPage },
          { path: "perfil", Component: ProfilePage, ErrorBoundary: ErrorPage },
          { path: "geografia", Component: GeographyPage, ErrorBoundary: ErrorPage },
          { path: "sedes", Component: SedesPage, ErrorBoundary: ErrorPage },
          { path: "pastores", Component: PastoresPage, ErrorBoundary: ErrorPage },
          { path: "usuarios", Component: UsuariosPage, ErrorBoundary: ErrorPage },
          { path: "catalogos", Component: CatalogosPage, ErrorBoundary: ErrorPage },
        ],
      },
    ],
  },
]);
