# Estadísticas enfocadas por rol — Diseño

Fecha: 2026-06-04

## Problema

Hoy el módulo de Estadísticas ([StatisticsPage.tsx](../../../src/app/components/StatisticsPage.tsx))
muestra **las mismas 4 pestañas y métricas a todos los roles**; lo único que cambia es el
*alcance* de los datos (`scope` en [useStatistics.ts](../../../src/hooks/useStatistics.ts)).
El rol `servidor` está bloqueado por completo. No hay diferenciación real de *qué* ve cada rol.

## Objetivo

Cada rol ve **pestañas distintas + métricas pensadas para su nivel de responsabilidad**.

## Mapa por rol

| Rol | Enfoque | Pestañas | Alcance |
|-----|---------|----------|---------|
| **super_admin** | Salud global y comparación entre iglesias | **Global** (nueva), Iglesia, Ministerios, Eventos/Tareas, Aula | Global |
| **admin_iglesia** | Su iglesia completa | Iglesia, Ministerios, Eventos/Tareas, Aula | Su iglesia |
| **admin_sede** | Su sede | **Sede** (Iglesia recortada), Ministerios, Eventos/Tareas | Su sede |
| **lider** | Su(s) ministerio(s) | **Mi Ministerio** (Ministerios), Eventos/Tareas, Aula | Sus ministerios |
| **servidor** | Solo lo suyo | **Mi Actividad** (nueva, mínima) | Personal |

## Detalle de métricas

**Global (super_admin)** — pestaña nueva:
- KPIs: total iglesias, sedes, usuarios, ministerios del sistema.
- Gráfica barras: ministerios por iglesia.
- Gráfica barras: sedes por iglesia.
- Tabla: iglesias (ciudad, # sedes, estado).

**Iglesia (admin_iglesia)** — las 4 pestañas actuales, alcance iglesia (sin Global).

**Sede (admin_sede)** — variante de la pestaña Iglesia con KPIs de la sede (usuarios de
la sede, miembros activos, ministerios de la sede); se quita el KPI "Sedes activas". Sin Aula.

**Mi Ministerio (lider)** — el `scope` de lider cambia de `personal` a `ministerio`:
resuelve los ministerios donde el usuario es miembro/líder y filtra ministerios,
miembros, eventos, tareas y aula a ese conjunto. No ve Iglesia/Sede ni otros ministerios.

**Mi Actividad (servidor)** — pestaña nueva mínima:
- KPIs: mis tareas, pendientes, completadas, cursos inscritos.
- Donut: mis tareas por estado.
- Tabla: mis tareas (título, estado, fecha límite).

## Cambios técnicos

- `statistics.types.ts`: `StatisticsDomain` += `'global' | 'personal'`.
- `statistics.service.ts`: `computeGlobalTab`, `computePersonalTab`, variante `sede` de
  `computeIglesiaTab`; `computeStatistics` calcula también global y personal.
- `useStatistics.ts`: scope `lider` → `'ministerio'` con filtrado por ministerios del
  usuario; fetch de iglesias enriquecidas (gated a global) y de tareas asignadas +
  inscripciones del usuario (gated a personal).
- `StatisticsPage.tsx`: mapa `rol → pestañas visibles`, labels por rol, desbloquear
  `servidor` con vista personal. La pestaña activa inicial es la primera permitida del rol.

## No-objetivos (YAGNI)

- No se cambian las políticas RLS (el alcance de datos ya lo resuelven RLS + filtros del hook).
- No se añaden nuevos gráficos configurables ni rangos de fecha nuevos.
