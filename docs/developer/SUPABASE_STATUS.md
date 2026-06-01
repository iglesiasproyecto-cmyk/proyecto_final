# Estado de Supabase

## Resumen ejecutivo

El proyecto se encuentra en una etapa de transicion: parte del frontend ya consume servicios orientados a Supabase, mientras otras areas mantienen dependencia de estado mock legacy.

## Estado actual

- Cliente Supabase presente en `src/lib/supabaseClient.ts`.
- Servicios por dominio activos en `src/services/`.
- Persisten zonas con acoplamiento a `AppContext` para datos historicos.
- Existe plan formal de backend por fases en `guidelines/Backend_Implementation_Plan.md`.

## Brechas identificadas

1. Unificacion de contratos de datos (snake_case -> camelCase).
2. Cierre progresivo de estado mock en modulos legacy.
3. Endurecimiento y validacion completa de politicas RLS.
4. Mayor cobertura de validaciones funcionales y de permisos.

## Prioridades recomendadas

### Corto plazo

- Inventariar vistas aun dependientes de `AppContext`.
- Definir orden de migracion por modulo de negocio.
- Homogeneizar manejo de errores en servicios.

### Mediano plazo

- Migrar mutaciones criticas faltantes a servicios tipados.
- Consolidar pruebas de permisos por rol (lectura/escritura).
- Alinear observabilidad de consultas y errores.

## Riesgos si no se atiende

- Inconsistencias de datos entre vistas.
- Aumento de deuda tecnica en onboarding y mantenimiento.
- Riesgos de seguridad por politicas permisivas no detectadas.

## Referencias

- Plan detallado: `guidelines/Backend_Implementation_Plan.md`
- Contexto de auditoria: `docs/audit/README.md`
