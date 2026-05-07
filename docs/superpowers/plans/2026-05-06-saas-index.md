# IGLESIABD SaaS — Índice de Planes de Implementación

> **Spec:** `docs/superpowers/specs/2026-05-06-saas-multitenant-design.md`

## Orden de ejecución (respeta dependencias)

| # | Plan | Archivo | Deps | Estado |
|---|---|---|---|---|
| SP-1 | Corrección de bugs críticos | `2026-05-06-sp1-bug-fixes.md` | — | ⏳ |
| SP-2 | Multi-tenancy + RLS estricta | `2026-05-06-sp2-multitenant-rls.md` | SP-1 | ⏳ |
| SP-3 | Migración de esquema | `2026-05-06-sp3-schema-migrations.md` | SP-1 | ⏳ |
| SP-4 | Rutas multi-tenant + CRUDs | `2026-05-06-sp4-tenant-routes.md` | SP-2, SP-3 | ⏳ |
| SP-5 | Aula multi-nivel | `2026-05-06-sp5-aula-multinivel.md` | SP-3, SP-4 | ⏳ |

## Regla de dependencias

- SP-2 y SP-3 pueden ejecutarse **en paralelo** después de SP-1.
- SP-4 requiere SP-2 (claims JWT) y SP-3 (schema) completos.
- SP-5 requiere SP-3 (schema `aula_curso`) y SP-4 (rutas tenant) completos.
