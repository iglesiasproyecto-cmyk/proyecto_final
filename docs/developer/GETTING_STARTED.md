# Getting Started (Desarrolladores)

## Objetivo

Esta guia te permite levantar IGLESIABD localmente y entender lo minimo necesario para empezar a contribuir codigo sin friccion.

## 1) Requisitos previos

- Node.js 20+
- npm 10+
- Git

## 2) Instalacion y ejecucion

```bash
npm install
npm run dev
```

URL local esperada: `http://localhost:5173`.

## 3) Verificaciones base

Antes de abrir PR o compartir cambios:

```bash
npm run typecheck
npm run build
```

Opcional si estas tocando flujos criticos de UI:

```bash
npm run test:e2e
```

## 4) Mapa rapido del codigo

- `src/main.tsx`: bootstrap de React.
- `src/app/App.tsx`: configuracion de app y router provider.
- `src/app/routes.ts`: rutas publicas, globales y tenant.
- `src/app/store/AppContext.tsx`: estado global legacy (grande).
- `src/services/`: acceso a datos por dominio.
- `src/hooks/`: hooks de consumo/estado por dominio.
- `src/styles/`: tema, tipografias y estilos globales.

## 5) Como correr un cambio de forma segura

1. Cambia una sola responsabilidad por commit (por modulo o bug).
2. Mantiene contratos de tipos al tocar `services` y `hooks`.
3. Valida rutas afectadas manualmente.
4. Ejecuta `typecheck` y `build`.
5. Actualiza documentacion si cambias flujo o arquitectura.

## 6) Errores comunes de onboarding

- Dependencias desactualizadas: borrar `node_modules` y reinstalar.
- Variables de entorno faltantes: revisar configuracion local de Supabase.
- Conflictos de rutas: validar redirects y layouts en `src/app/routes.ts`.

## 7) Lectura siguiente recomendada

1. `docs/developer/ARCHITECTURE.md`
2. `docs/developer/WORKFLOWS.md`
3. `docs/developer/SUPABASE_STATUS.md`
4. `guidelines/Backend_Implementation_Plan.md`
