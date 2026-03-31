# Plan de Implementación por Fases — Backend IGLESIABD (Supabase)

## Objetivo
Alinear el frontend existente (React/Vite) con el backend en Supabase, migrando de datos mock a datos reales, endureciendo seguridad (RLS) y estableciendo un flujo de migraciones controlado.

## Principios y mejores prácticas (Supabase)
- Versionar el esquema con migraciones y desplegar vía `supabase db push`/CI (GitHub Actions recomendado).
- Usar RLS estricta; políticas mínimas por tabla, evitar políticas permisivas de desarrollo en producción.
- Separar ambientes (dev/preprod/prod); extraer esquema de prod con `supabase db pull` para mantener paridad.
- Vincular usuarios de negocio con `auth.users` mediante FK/UUID y triggers de perfil si aplica.
- Minimizar lógica en el cliente: validar en BD y en API; índices para consultas críticas; triggers para `updated_at` ya creados.
- Políticas de Storage alineadas con Auth (lectura pública sólo cuando sea necesario; insert/update restringido por owner o bucket). 
- Pipelines CI: workflow GitHub Actions con `supabase/setup-cli@v1`, `supabase link` y `supabase db push` a prod en main.

## Fases y tareas

### Fase 0 — Preparación
- Inventario: documentar diferencias mock ↔ esquema real (snake_case vs camelCase, bigint vs string).
- Accesos: asegurar URL y keys (`anon`, `service_role`) en `.env`; configurar `supabase` CLI link al proyecto.
- Tooling: añadir `@supabase/supabase-js`, elegir fetcher (React Query/SWR), y definir cliente compartido.
- Paridad de esquema: ejecutar `supabase db pull` contra prod antes de nuevas migraciones para sincronizar baseline.

### Fase 1 — Governanza de esquema
- Congelar SQL actual como migración base (usando `mcp_mcpsupabase_apply_migration` para nuevos cambios).
- Revisar la “tabla 24” pendiente y ajustar si falta algo en el esquema.
- Endurecer RLS: reemplazar políticas "Acceso desarrollo" por reglas por rol; políticas de lectura limitada en catálogos si aplica.
- Agregar política de perfil/auth: decidir enlace `usuario.id_usuario` ↔ `auth.users.id` y crear trigger/políticas.
- Storage: definir buckets requeridos (ej. `avatars`, documentos) y añadir RLS de storage (select/insert/update) según roles/auth.
- Añadida tabla `recurso` (FK a `modulo`) y enum `tipo_recurso` para alinear con el modelo frontend; total tablas = 24, enums propios = 13. 

### Fase 2 — Integración de datos (lecturas)
- Crear capa de acceso: DTOs/mappers snake_case→camelCase; normalizar IDs numéricos.
- Reemplazar mocks con fetchers por dominio (catálogos geo, iglesias/sedes, usuarios/roles, ministerios, eventos, tareas, cursos).
- Añadir estados de carga/error/empty; paginado o límites en listas grandes.
- Indexado: revisar consultas más usadas y crear índices adicionales si falta.

### Fase 3 — Mutaciones seguras
- Implementar create/update/delete por dominio con validación cliente+BD.
- Usar transacciones para operaciones compuestas (ej. asignar pastor a sede + historial).
- Optimistic updates donde tenga sentido; manejo de rollback ante errores.
- Auditar permisos: cada mutación debe pasar por RLS adecuada.

### Fase 4 — Autenticación y sesiones
- Integrar Supabase Auth; propagar `session` al cliente y mapear a `usuario`.
- Políticas: auto-provisión de perfil (trigger) y políticas de "solo mi registro"; restringir notificaciones y tareas por usuario/rol.
- Manejo de roles de app (`rol` + `usuario_rol`) en claims/JWT si se necesita filtrado en RLS.

### Fase 5 — Observabilidad y calidad
- Logs: habilitar logs SQL/funciones; alertas en errores 5xx y bloqueos.
- Métricas: monitorear sesiones, tiempo de respuesta, índices bloat.
- Tests: scripts de smoke contra Supabase (lectura/mutación) y pruebas de RLS (usuario vs service_role).

### Fase 6 — CI/CD
- Workflow GitHub Actions: `supabase/setup-cli@v1` + `supabase link` + `supabase db push` a prod en main; jobs separados para dev/preprod.
- Validar migraciones en un branch DB temporal antes de prod.
- Exportar esquema prod periódico (`supabase db pull`) para detectar drift y validar que las migraciones coinciden.

### Riesgos y mitigaciones
- RLS permisiva: cerrar políticas de desarrollo antes de exponer prod.
- Desfase modelo: sin mappers habrá errores de tipos; priorizar DTOs.
- Auth sin enlace a `usuario`: definir pronto el vínculo UUID/PK para evitar migraciones posteriores costosas.
- Performance: sin índices extra, listados grandes degradarán; revisar tras primeros usos reales.

### Checklist de salida a producción
- [ ] Migraciones versionadas y aplicadas con `mcp_mcpsupabase_apply_migration`.
- [ ] RLS específica por tabla/rol; sin políticas globales permisivas.
- [ ] Frontend sin mocks; datos reales y manejo de errores/estado vacío.
- [ ] Auth integrada y enlazada a `usuario`; pruebas de RLS por rol.
- [ ] CI/CD activo para migraciones; rollback plan documentado.
- [ ] Métricas y logs revisados; índices críticos creados.
