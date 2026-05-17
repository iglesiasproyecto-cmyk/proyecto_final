# Diseno MVP Backend Hoja de Vida para Toma de Decisiones

## Contexto

El proyecto ya tiene una base funcional de Hoja de Vida en frontend (`ProfilePage`, `HojaDeVidaForm`, `HojaDeVidaView`) y una base de backend parcial en Supabase. Sin embargo, hay desalineaciones entre esquema SQL, RPCs y tipos esperados por frontend.

Objetivo: cerrar un MVP backend que convierta la Hoja de Vida en una base de informacion confiable para toma de decisiones por roles: lider, admin sede, admin iglesia y superadmin.

## Objetivos del MVP

1. Alinear esquema de datos con el flujo real de frontend y negocio.
2. Implementar permisos RLS por alcance organizacional y rol.
3. Exponer lectura completa del perfil (incluyendo certificados/cursos) para consulta y decision.
4. Permitir revision administrativa de perfiles (aprobaciones/observaciones).
5. Habilitar filtros operativos minimos para identificar cobertura y brechas.

## Fuera de Alcance (Fase 2)

- Exportacion PDF de hoja de vida.
- Historial de cambios detallado por campo con diff completo.
- Tabla persistente de snapshots/KPIs agregados periodicos.
- Motor avanzado de scoring o matching automatico.

## Problemas Detectados

1. Desalineacion de esquema:
   - Variantes de columnas (`perfil_profesional` vs `resumen_profesional`, `updated_at` vs `actualizado_en`).
   - `habilidades` y `formacion_academica` en formatos no consistentes con consumo frontend.
2. RPC inconsistente entre versiones/migraciones y firma de parametros.
3. Falta de entidades para gobernanza de decision (revision, clasificacion, disponibilidad).
4. Riesgo de permisos ambiguos entre jerarquias (lider/ministro/sede/iglesia).

## Diseno de Datos MVP

### 1) Tabla principal `hoja_de_vida`

Mantener `hoja_de_vida` como tabla troncal, con columnas normalizadas y consistentes:

- `id_hoja_de_vida` (PK)
- `id_usuario` (FK unico a `usuario.id_usuario`)
- `resumen_profesional` (TEXT)
- `experiencia_laboral` (TEXT)
- `foto_perfil_url` (TEXT nullable)
- `habilidades` (JSONB default `[]`)
- `formacion_academica` (JSONB default `[]`)
- `completa` (BOOLEAN default false)
- `completada_en` (TIMESTAMPTZ nullable)
- `creado_en` (TIMESTAMPTZ)
- `actualizado_en` (TIMESTAMPTZ)

Nota: en migracion se mapearan y conservaran datos legados (`perfil_profesional`, `updated_at`) para evitar perdida.

### 2) Tabla `hoja_de_vida_revision`

Registro de revision administrativa por roles:

- `id_revision` (PK)
- `id_hoja_de_vida` (FK)
- `id_revisor` (FK a `usuario`)
- `rol_revisor` (TEXT o FK a `rol`)
- `estado_revision` (ENUM/TEXT: `pendiente`, `aprobada`, `observada`)
- `observaciones` (TEXT)
- `revisado_en` (TIMESTAMPTZ)
- `creado_en` / `actualizado_en`

### 3) Catalogo `hoja_de_vida_etiqueta` + relacion `hoja_de_vida_etiqueta_usuario`

Clasificacion para busqueda operativa:

- `hoja_de_vida_etiqueta`:
  - `id_etiqueta` (PK)
  - `nombre` (unico)
  - `categoria` (ej. ensenanza, musica, consejeria, administracion)
  - `activa` (BOOLEAN)
- `hoja_de_vida_etiqueta_usuario`:
  - `id_hoja_de_vida` (FK)
  - `id_etiqueta` (FK)
  - `asignada_por` (FK usuario)
  - `creado_en`

### 4) Tabla `hoja_de_vida_disponibilidad`

Disponibilidad para asignaciones:

- `id_disponibilidad` (PK)
- `id_hoja_de_vida` (FK)
- `id_sede` (FK)
- `id_ministerio` (FK nullable)
- `dias_semana` (TEXT[] o JSONB)
- `franja_horaria` (TEXT)
- `modalidad` (TEXT: presencial, virtual, mixta)
- `activo` (BOOLEAN)
- `creado_en` / `actualizado_en`

### 5) Certificados/Cursos

Se usara `aula_certificado` como fuente oficial de certificaciones, uniendola con curso (`aula_curso`) para mostrar:

- nombre del curso
- fecha certificacion/emision
- numero de certificado

## Seguridad y Acceso (RLS)

### Principios

1. Usuario base solo opera su propia hoja.
2. Lider solo ve/gestiona alcance de sus ministerios.
3. Admin sede solo dentro de su sede.
4. Admin iglesia solo dentro de su iglesia.
5. Superadmin con acceso global.

### Politicas por entidad

- `hoja_de_vida`:
  - SELECT: propio usuario + jerarquia autorizada por alcance.
  - UPDATE: propio usuario (datos personales) + admins/lideres solo para campos de gestion definidos si aplica.
  - INSERT: propio usuario o trigger de provisionamiento.
- `hoja_de_vida_revision`:
  - INSERT/UPDATE: lider/admin sede/admin iglesia/superadmin en su alcance.
  - SELECT: usuario propietario (lectura), revisores del alcance y superadmin.
- `hoja_de_vida_etiqueta_usuario`:
  - INSERT/DELETE: lider/admins en alcance.
  - SELECT: segun alcance y propietario.
- `hoja_de_vida_disponibilidad`:
  - UPDATE: propietario y admins con alcance.
  - SELECT: segun alcance.

Las RPC de lectura agregada usaran `SECURITY DEFINER` con validaciones explicitas de alcance, sin abrir mutaciones privilegiadas.

## Backend Operativo (RPC + Servicios + Hooks)

### RPC principal de detalle

`get_hoja_de_vida_completa_v2(p_id_usuario bigint)` retorna:

- campos base de hoja de vida
- etiquetas asignadas
- disponibilidad
- revisiones
- certificados/cursos asociados
- metadatos basicos de usuario

### RPC de listado para decision

`listar_hojas_de_vida_scoped(filtros jsonb)` con filtros por:

- iglesia/sede/ministerio
- estado de completitud (`completa`)
- estado de revision
- etiquetas
- disponibilidad
- cantidad de certificados

### Capa de aplicacion

- `src/services/hojaDeVida.service.ts`: migrar llamadas a RPC v2 y listado scoped.
- `src/hooks/useHojaDeVida.ts`: lectura/edicion de propio perfil con refresco realtime.
- `src/hooks/useHojaDeVidaPorUsuario`: lectura scoped para modal/consulta administrativa.
- Manejo de errores RLS con mensajes claros por contexto de rol.

### Realtime minimo

Suscripciones sobre:

- `hoja_de_vida`
- `hoja_de_vida_revision`
- `hoja_de_vida_etiqueta_usuario`
- `hoja_de_vida_disponibilidad`

## Flujos de Negocio MVP

1. Usuario completa su hoja de vida y disponibilidad.
2. Lider/admin revisa perfil, agrega observaciones o aprueba.
3. Lider/admin consulta listados filtrados para seleccionar personas segun:
   - etiquetas,
   - disponibilidad,
   - certificados,
   - estado de revision/completitud.

## Metricas Minimas para Toma de Decisiones

Calculadas via RPC (sin snapshot persistente en MVP):

- % hojas completas por iglesia/sede/ministerio
- % hojas revisadas y % observadas pendientes
- distribucion de etiquetas por sede/ministerio
- cobertura de disponibilidad por sede/ministerio
- usuarios sin certificados vs con 1+

Consultas clave:

- "Listos para servir" = completa + aprobada + etiqueta compatible + disponibilidad activa.
- "Brechas" = baja cobertura por perfil/etiqueta/certificacion en una sede o ministerio.

## Migracion y Compatibilidad

1. Crear tablas nuevas (`revision`, `etiquetas`, `disponibilidad`) e indices.
2. Normalizar columnas de `hoja_de_vida` con script de migracion de datos legado.
3. Publicar RPC v2 en paralelo (sin romper v1 inmediatamente).
4. Migrar servicios/hooks/frontend a v2.
5. Retirar artefactos legacy despues de validar adopcion.

## Manejo de Errores

- RLS denial: respuesta controlada con mensaje de alcance insuficiente.
- Usuario sin hoja: provisionamiento automatico o autocreacion controlada.
- Inconsistencia de datos legacy: fallback temporal y logging de migracion.
- Fallo de RPC: degradar a vista minima de perfil en UI administrativa.

## Verificacion de MVP

### Casos por rol

1. Usuario base: crea/edita su hoja y ve sus certificados.
2. Lider: ve y revisa perfiles de su ministerio, no fuera de alcance.
3. Admin sede: opera perfiles de su sede, no fuera de sede.
4. Admin iglesia: opera perfiles de toda su iglesia.
5. Superadmin: visibilidad total.

### Criterios de aceptacion

1. Esquema y tipos alineados con frontend.
2. RLS valida jerarquia sin filtraciones.
3. Certificados visibles en perfil completo y listados.
4. Filtros de decision operativos.
5. Migraciones aplicables y reversables.

## Riesgos y Mitigaciones

- Riesgo: choque entre migraciones historicas de `hoja_de_vida`.
  - Mitigacion: migracion incremental con deteccion de columnas existentes.
- Riesgo: recursion o costo alto en politicas RLS.
  - Mitigacion: helpers de alcance y auditoria de consultas.
- Riesgo: UI esperando forma antigua.
  - Mitigacion: contrato transitorio y adaptadores en service.

## Decision Final Aprobada

Se implementara MVP de backend orientado a toma de decisiones con alcance:

- normalizacion de `hoja_de_vida`,
- inclusion explicita de certificados/cursos,
- revision administrativa,
- etiquetas de perfil,
- disponibilidad operativa,
- filtros y metricas minimas por jerarquia.

`kpi_snapshot` persistente queda para fase 2.
