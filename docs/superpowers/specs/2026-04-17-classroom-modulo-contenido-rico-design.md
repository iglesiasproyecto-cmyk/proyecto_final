# Spec — Classroom Sub-proyecto B1: contenido enriquecido del módulo

> Sub-proyecto B1 de la iniciativa Classroom. Convierte la vista de módulo en una pantalla de aprendizaje con contenido en Markdown, renderizado seguro y navegación entre módulos del mismo curso. No incluye entregables (B2), ni evaluaciones inline (B3), ni tracking de progreso (sub-proyecto C).

**Fecha:** 2026-04-17
**Estado:** diseño aprobado, pendiente plan de implementación

---

## 1. Contexto y objetivo

Hoy `modulo` sólo tiene `descripcion` (texto plano corto) y una lista de `recurso` (enlaces/archivos externos). No existe una pantalla de detalle del módulo para el estudiante, y el líder no puede escribir contenido estructurado (títulos, listas, tablas, imágenes embebidas) dentro del propio módulo.

**Objetivo de B1:** permitir que admin y líder escriban contenido enriquecido en formato Markdown directamente en el módulo, y que el estudiante inscrito lo vea renderizado en una pantalla dedicada con breadcrumb y navegación anterior/siguiente entre módulos del curso.

**Fuera de alcance de B1:**
- Entregables / tareas del módulo (sub-proyecto B2).
- Quiz o evaluación inline (sub-proyecto B3).
- Tracking "marcar como leído" / progreso (sub-proyecto C: dashboard estudiante).
- Subida de imágenes a Supabase Storage (se montará en B2 cuando haya caso de uso real de archivos del alumno).
- Versionado / historial del contenido.

## 2. Decisiones clave

| # | Tema | Decisión |
|---|---|---|
| 1 | Formato de almacenamiento y editor | Markdown guardado como texto. Editor `@uiw/react-md-editor` (WYSIWYG sobre Markdown, toolbar + preview en vivo). |
| 2 | Ubicación del contenido | Nueva columna `contenido_md TEXT NULL` en `modulo`. Se conserva `descripcion` como resumen corto. Sin nuevas tablas. |
| 3 | Imágenes / media en el contenido | Sólo URL externa pegada por el líder (`![alt](https://...)`). Supabase Storage queda diferido a B2. |
| 4 | Navegación | Ruta nueva compartida `/app/aula/curso/:idCurso/modulo/:idModulo`. Una sola página detecta rol + permiso y muestra edición o lectura. |
| 5 | Alcance de funcionalidad | MVP + pulido de navegación: breadcrumb, botones Anterior/Siguiente respetando `orden`, redirección si el estudiante no tiene acceso. Sin progreso. |

## 3. Modelo de datos

### 3.1 Cambio en `modulo`

```sql
ALTER TABLE public.modulo
  ADD COLUMN IF NOT EXISTS contenido_md TEXT NULL;

COMMENT ON COLUMN public.modulo.contenido_md IS
  'Contenido de aprendizaje del módulo en formato Markdown (GFM). NULL si aún no se ha editado.';
```

Sin índices, sin defaults, sin backfill. Columna opcional puramente aditiva.

### 3.2 Tablas no afectadas

- `curso`, `recurso`, `evaluacion`, `proceso_asignado_curso`, `detalle_proceso_curso`: sin cambios.
- `descripcion` de `modulo`: se conserva, sigue siendo el resumen corto para cards y listados.

## 4. Permisos y RLS

### 4.1 Matriz de acceso

| Rol | Editar `contenido_md` | Leer `contenido_md` |
|---|---|---|
| `super_admin` | sí, en cualquier módulo | sí, en cualquier módulo |
| `admin_iglesia` | sí, si el curso pertenece a su iglesia | sí, igual |
| `lider` | sí, si el curso pertenece a un ministerio donde es líder | sí, igual |
| `servidor` | no | sí, **sólo si** el curso está `activo`, el módulo está `publicado`, y el usuario tiene `detalle_proceso_curso` con estado `inscrito` o `en_progreso` en algún ciclo del curso |

### 4.2 Trabajo en la DB

- Las policies de escritura sobre `modulo` (Fase B, `can_manage_curso_scope`) ya cubren el caso de admin/líder. Sin cambios.
- La policy de SELECT de `modulo` **debe verificarse** como primera tarea del plan. Si hoy no permite que un servidor con inscripción activa lea módulos `publicado` de un curso `activo`, se añade una policy adicional de SELECT usando un helper nuevo:

```sql
CREATE OR REPLACE FUNCTION public.can_read_modulo_as_student(p_id_modulo bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.modulo m
    JOIN public.curso c ON c.id_curso = m.id_curso
    JOIN public.proceso_asignado_curso p ON p.id_curso = c.id_curso
    JOIN public.detalle_proceso_curso d ON d.id_proceso_asignado_curso = p.id_proceso_asignado_curso
    WHERE m.id_modulo = p_id_modulo
      AND m.estado = 'publicado'
      AND c.estado = 'activo'
      AND d.id_usuario = public.current_usuario_id()
      AND d.estado IN ('inscrito', 'en_progreso')
  );
$$;
```

Y la policy añadida (sólo si no existía equivalente):

```sql
CREATE POLICY "Servidor inscrito puede leer módulos publicados"
  ON public.modulo FOR SELECT
  TO authenticated
  USING (public.can_read_modulo_as_student(id_modulo));
```

**Decisión:** la primera tarea del plan audita las policies vigentes. Si ya existe cobertura equivalente, la migración 2 se omite (no se crea el archivo). Si no existe, se crea la migración con el helper y la policy. Esta decisión es binaria y explícita, no "migración vacía".

### 4.3 Guardas de UI (no sustituyen RLS)

- `ModuloDetailPage` calcula dos banderas a partir del rol y del contexto cargado:
  - `canEdit = rolActual in {super_admin, admin_iglesia, lider}` cruzado con el scope del curso (iglesia del admin; ministerio del líder vía `get_user_ministerios()`).
  - `canRead` para `servidor` exige inscripción activa (se obtiene del hook `useMisInscripciones` ya existente en B) en algún ciclo del `idCurso`.
- Si `!canRead`: redirect a `/app/mis-cursos` con toast "No tienes acceso a este módulo".
- Si `canRead && !canEdit`: modo lectura (sin botón guardar, sin editor, sólo `ModuloContenidoView`).
- Toda violación no anticipada por el cliente es interceptada por RLS al UPDATE/SELECT y se muestra toast genérico "No se pudo guardar/cargar".

## 5. Rutas, componentes y hooks

### 5.1 Ruta nueva (en `src/app/routes.ts`)

Dentro del bloque `/app`:

```
{ path: "aula/curso/:idCurso/modulo/:idModulo", Component: ModuloDetailPage, ErrorBoundary: ErrorPage }
```

### 5.2 Estructura de la página

`src/app/components/classroom/ModuloDetailPage.tsx` orquesta:

```
ModuloDetailPage
├── ModuloBreadcrumb         · Aula → Curso (nombre) → Módulo N (título)
├── ModuloNavegacion         · botones "‹ Anterior" / "Siguiente ›" por orden dentro del curso
└── { canEdit
      ? ModuloContenidoEditor
      : ModuloContenidoView }
```

### 5.3 Sub-componentes (archivos separados, una responsabilidad cada uno)

- `src/app/components/classroom/ModuloBreadcrumb.tsx` — breadcrumb con enlaces al curso padre.
- `src/app/components/classroom/ModuloNavegacion.tsx` — calcula módulos hermanos del mismo `idCurso`, respeta `orden`, deshabilita extremos; para servidor saltea módulos no `publicado`.
- `src/app/components/classroom/ModuloContenidoEditor.tsx` — envuelve `@uiw/react-md-editor`, maneja dirty state, botón "Guardar", toast de éxito/error, soft-validation a 100.000 caracteres.
- `src/app/components/classroom/ModuloContenidoView.tsx` — renderiza markdown con `react-markdown` + `remark-gfm` + `rehype-sanitize`. Muestra placeholder si `contenido_md IS NULL`: "Este módulo aún no tiene contenido publicado".

### 5.4 Hooks nuevos (`src/hooks/useModulo.ts`)

- `useModulo(idModulo: number)` — query para un módulo por id. Clave `['modulo', idModulo]`.
- `useUpdateModuloContenido()` — mutación acotada a `contenido_md`. Invalida `['modulo', idModulo]` y `['modulos', idCurso]` en `onSuccess`. No reutiliza `useUpdateModulo` existente (que hace update genérico) para no arriesgar sobrescribir otros campos por un estado UI desfasado.

### 5.5 Entradas a la página (cambios puntuales en páginas existentes)

- `src/app/components/ClassroomPage.tsx` (admin): en cada card de módulo dentro del curso, añadir botón "Abrir" que navega a la ruta nueva.
- `src/app/components/MisCursosPage.tsx` (estudiante): ampliar la tarjeta de curso inscrito para mostrar lista de módulos `publicado` con enlace "Abrir" a la ruta nueva. Si el curso no tiene módulos publicados, se muestra hint "Aún no hay módulos publicados".

## 6. Librerías nuevas

Se añaden a `package.json`:

- `@uiw/react-md-editor` — editor WYSIWYG sobre Markdown con toolbar y preview.
- `react-markdown` — render de markdown a React (si no estuviera ya).
- `remark-gfm` — extensión GFM (tablas, task lists, strikethrough, autolinks).
- `rehype-sanitize` — sanitización como defensa en profundidad (aunque `react-markdown` por default ignora HTML crudo).

## 7. Edge cases

1. **Módulo sin contenido (`contenido_md IS NULL`).** Vista muestra placeholder; editor abre con textarea vacío.
2. **Líder cambia de ministerio.** Pierde `canEdit` vía `get_user_ministerios()`. Si tenía la página abierta, la UPDATE falla por RLS; toast + recarga.
3. **Estudiante se retira (`detalle.estado = 'retirado'`).** Pierde `canRead` en la próxima carga; redirect a `/app/mis-cursos`. Sin live-kick.
4. **Módulo en `estado = 'borrador'`.** Servidor no lo ve en lista y si llega por URL directa, redirect con toast. Admin/líder lo ve para editarlo antes de publicar.
5. **Curso en `inactivo` o `archivado`.** Mismo trato que borrador para servidor.
6. **Nav prev/next en extremos.** Se oculta o deshabilita el botón correspondiente. Servidor salta módulos no publicados al calcular siguiente/anterior.
7. **Markdown con contenido potencialmente inseguro** (imagen con `javascript:` URL, HTML crudo). `react-markdown` ignora HTML por default + `rehype-sanitize` como defensa. Protocolos no seguros se rinden como texto.
8. **Concurrencia de edición.** Último en guardar gana. Sin lock optimista en B1. Documentado como limitación aceptada; si el caso duele en producción se resuelve en tarea futura con `updated_at` check.
9. **Contenido muy grande.** Soft validation cliente a 100.000 caracteres con toast de advertencia antes del submit. DB sin límite.
10. **URL directa a módulo de curso sin inscripción.** Redirect a `/app/mis-cursos` con toast.

## 8. Estrategia de verificación

**El proyecto no tiene framework de tests.** Verificación via SQL + build + checklist manual.

### 8.1 Script SQL `scripts/test-modulo-contenido.sql`

Usa transacción con `ROLLBACK` final + `ASSERT` por caso. Cubre:

1. admin_iglesia puede `UPDATE` `contenido_md` en módulo de su iglesia.
2. líder puede `UPDATE` `contenido_md` en módulo de curso de su ministerio.
3. líder de otro ministerio recibe 0 rows afectadas (RLS bloquea).
4. servidor con inscripción activa puede `SELECT` módulo publicado de curso activo.
5. servidor sin inscripción recibe 0 rows.
6. servidor no puede `UPDATE` `contenido_md` (0 rows).

### 8.2 Build TypeScript

`npm run build` debe pasar sin errores tras regenerar `src/types/database.types.ts` (incluir la nueva columna `contenido_md`).

### 8.3 Checklist manual por rol

Se ejecuta al final del plan como tarea dedicada:

- `super_admin`: edita contenido en cualquier curso, navega prev/next, el markdown renderiza tablas, listas, links, imágenes externas.
- `admin_iglesia`: edita sólo cursos de su iglesia; no ve módulos de otras iglesias.
- `lider`: edita sólo cursos de sus ministerios; pierde edición al cambiar de ministerio.
- `servidor` inscrito: ve contenido de módulos `publicado`; no ve botón Editar; nav respeta estados de módulo.
- `servidor` no inscrito: redirect a `/app/mis-cursos` con toast.

## 9. Métricas de éxito

- Un líder escribe un módulo con título, lista numerada, tabla, enlace externo e imagen pegada por URL y al previsualizar lo ve formateado.
- El estudiante inscrito abre ese módulo desde `/app/mis-cursos`, ve el contenido renderizado sin salir de la app, y puede navegar a `Módulo siguiente` sin volver a la lista.
- `npm run build` pasa sin warnings nuevos.
- El script SQL pasa los 6 asserts.
- Ningún rol puede leer o editar contenido fuera de su scope (verificado tanto por UI como por RLS).

## 10. Plan de migraciones

1. `20260418100000_modulo_add_contenido_md.sql` — añade columna `contenido_md`.
2. `20260418100100_rls_modulo_student_read.sql` — se crea **sólo si la auditoría previa encuentra que la policy actual de SELECT de `modulo` no permite a un servidor inscrito leer módulos `publicado` de curso `activo`**. Contenido: helper `can_read_modulo_as_student` + policy `"Servidor inscrito puede leer módulos publicados"`. Si la cobertura ya existe, el archivo no se crea y esta migración no existe en el repo.

La primera tarea del plan hace la auditoría (query sobre `pg_policies`) y decide si se crea o no este archivo.

## 11. Dependencias con otros sub-proyectos

- **A (inscripciones + ciclos)** — YA ENTREGADO. Este sub-proyecto depende de que `detalle_proceso_curso` tenga el significado de "inscripción activa" y que `useMisInscripciones` exista en el hook. Ambos ya están en producción.
- **B2 (entregables)** — futuro. Se enganchará a la misma página `ModuloDetailPage` como sección nueva. El diseño de B1 deja espacio para ese crecimiento sin refactor mayor.
- **B3 (evaluación inline)** — futuro. Igual que B2, se engancha a la misma página.
- **C (dashboard estudiante + tracking)** — futuro. Ahí se resuelve "marcar como leído" y `en_progreso` automático.
