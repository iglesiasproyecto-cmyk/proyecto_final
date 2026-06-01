# Arquitectura de IGLESIABD

## Vision general

IGLESIABD es una SPA React con enrutamiento por contexto de acceso:

- Publico (landing/login)
- Global (super admin)
- Tenant (por iglesia)

La app combina componentes de UI modernos con una capa de datos en transicion desde estado mock legado hacia servicios conectados a Supabase.

## Flujo de arranque

`src/main.tsx` -> `src/app/App.tsx` -> `RouterProvider` -> layouts y paginas.

## Ruteo y layouts

Archivo clave: `src/app/routes.ts`.

- `RootLayout`: marco base, provider principal y manejo de errores.
- `AppLayout`: shell autenticado.
- `GlobalLayout`: modulo administrativo global.
- `TenantLayout`: alcance operativo de una iglesia especifica.

Este patron permite separar autorizacion, navegacion y experiencia segun rol/contexto.

## Capa de estado y datos

### Estado legacy

- `src/app/store/AppContext.tsx`
- Archivo grande con mock data e interfaces historicas.

### Estado orientado a dominio (direccion objetivo)

- `src/services/*`: acceso a Supabase por dominio.
- `src/hooks/*`: composicion de estados de carga/error/datos para UI.

Objetivo: reducir gradualmente dependencias directas al contexto legacy.

## Dominios funcionales

- Geografia
- Iglesias/sedes/pastores
- Ministerios y miembros
- Usuarios/roles/notificaciones
- Eventos/tareas/presupuestos
- Aula/cursos/evaluaciones/progreso

## Estilos y sistema visual

- Tailwind CSS v4
- Variables de tema en `src/styles/theme.css`
- Componentes base con primitives de Radix/shadcn

## Decisiones tecnicas vigentes

- TypeScript estricto en frontera de servicios.
- Code splitting en rutas pesadas con `React.lazy`.
- React Query para sincronizacion remota donde aplica.

## Riesgos tecnicos actuales

- Coexistencia de patrones de datos (mock y remoto) puede duplicar logica.
- `AppContext` monolitico incrementa acoplamiento.
- Cobertura E2E parcial para algunos flujos de alta criticidad.

## Direccion de evolucion

1. Encapsular mas logica de negocio en `services`.
2. Mover consumo de pantallas hacia hooks de dominio.
3. Reducir responsabilidades del contexto legacy por iteraciones.
