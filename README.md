
# IGLESIABD

Aplicacion web para gestion integral de iglesias, sedes, ministerios, usuarios, eventos, tareas y aula academica.

## Estado del proyecto

- Frontend: estable y funcional en React 18 + Vite.
- Datos: coexistencia de servicios conectados a Supabase y estado mock en piezas legacy.
- Objetivo actual: consolidar integracion backend y cerrar deuda tecnica de documentacion/operacion.

## Stack tecnico

- `react` + `vite` + `typescript`
- `react-router` (estructura global + tenant)
- `tailwindcss` v4 + componentes basados en Radix/shadcn
- `@supabase/supabase-js`
- `@tanstack/react-query`
- `recharts`, `react-hook-form`, `react-dnd`, `framer-motion`

## Requisitos

- Node.js 20+
- npm 10+

## Inicio rapido

```bash
npm install
npm run dev
```

La app se levanta en `http://localhost:5173` por defecto.

## Scripts disponibles

- `npm run dev`: servidor de desarrollo con hot reload.
- `npm run build`: build de produccion.
- `npm run typecheck`: verificacion de tipos TypeScript.
- `npm run lint`: alias actual de typecheck.
- `npm run test:e2e`: ejecucion E2E con Playwright.
- `npm run test:e2e:setup`: proyecto de setup E2E.
- `npm run test:e2e:ui`: runner visual de Playwright.
- `npm run test:e2e:report`: abrir reporte de Playwright.

## Estructura principal

```text
src/
  app/
    App.tsx
    routes.ts
    store/AppContext.tsx
    components/
  hooks/
  services/
  lib/
  styles/
docs/
  developer/
  superpowers/
  audit/
guidelines/
```

## Arquitectura resumida

- Entrada: `src/main.tsx` -> `src/app/App.tsx`.
- Router principal en `src/app/routes.ts`.
- Layouts principales:
  - `RootLayout` (base de aplicacion)
  - `AppLayout` (contenedor privado)
  - `GlobalLayout` (alcance super admin)
  - `TenantLayout` (alcance por iglesia)
- Estado historico centralizado en `src/app/store/AppContext.tsx`.
- Integracion moderna por dominio via `src/services/*` + hooks `src/hooks/*`.

## Documentacion para desarrolladores

- Onboarding: `docs/developer/GETTING_STARTED.md`
- Arquitectura: `docs/developer/ARCHITECTURE.md`
- Flujos de trabajo: `docs/developer/WORKFLOWS.md`
- Estado Supabase: `docs/developer/SUPABASE_STATUS.md`
- Plan backend por fases: `guidelines/Backend_Implementation_Plan.md`

## Documentacion historica y auditorias

- Auditoria y recuperacion: `docs/audit/README.md`
- Planes y specs previos: `docs/superpowers/`

## Convenciones recomendadas

- Mantener naming consistente por capa (UI en espanol de dominio, codigo en ingles tecnico cuando aplique).
- Preferir nuevos modulos en `services` + `hooks` antes que crecer `AppContext`.
- Evitar logica de negocio compleja en componentes de presentacion.
- Documentar decisiones tecnicas relevantes en `docs/developer/`.

## Problemas comunes

- Si falla el build por tipos: ejecutar `npm run typecheck` y corregir primero errores en `src/types` y contratos de `services`.
- Si falla E2E: revisar variables de entorno, estado de Supabase y datos semilla del entorno.

## Roadmap tecnico corto

- Reducir dependencia del estado mock en `AppContext`.
- Completar migracion de modulos restantes a fetch real con Supabase.
- Endurecer RLS y observabilidad segun plan backend.
  
