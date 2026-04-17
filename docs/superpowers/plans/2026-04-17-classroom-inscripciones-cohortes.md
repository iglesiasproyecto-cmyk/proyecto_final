# Classroom Sub-proyecto A — Inscripciones + Ciclos Lectivos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la "Formación" del IGLESIABD en un aula funcional con cohortes (ciclos lectivos), inscripciones administradas por admin/líder, y una vista "Mis Cursos" para estudiantes.

**Architecture:** Tres migraciones Supabase añaden helpers/RLS/RPCs (incluyendo el RPC atómico `enroll_users`). La capa frontend añade un service + hooks + un modal compartido `EnrollmentPickerModal` invocado desde `CiclosLectivosPage` y `ClassroomPage`; una nueva página `MisCursosPage` consume la vista `v_companeros_ciclo` respetando las SELECT policies. Los estados `en_progreso`/`completado` existen en DB pero se muestran como badges read-only — la automatización llega en Sub-proyecto B.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui, React Router v7, TanStack Query v5, framer-motion, Supabase JS v2 (con RLS + RPCs `SECURITY DEFINER`).

**Spec de referencia:** [2026-04-17-classroom-inscripciones-cohortes-design.md](../specs/2026-04-17-classroom-inscripciones-cohortes-design.md)

---

## Nota operativa sobre Supabase

El proyecto no tiene `supabase` CLI configurado como script de npm; las migraciones se aplican y los tipos se regeneran vía el servidor MCP de Supabase autenticado (mismo método usado en las migraciones anteriores `20260416*`, `20260417110000`). Cuando una tarea pida "aplicar migración", usar el tool MCP `mcp__claude_ai_Supabase__apply_migration` con el nombre + SQL de esa migración, y para regenerar tipos usar `mcp__claude_ai_Supabase__generate_typescript_types`.

Si ejecutas este plan sin acceso al MCP de Supabase, sustituye por:
- Aplicar migración: `supabase db push` (tras `supabase link --project-ref heibyjbvfiokmduwwawm`).
- Regenerar tipos: `supabase gen types typescript --project-id heibyjbvfiokmduwwawm > src/types/database.types.ts`.

## Nota sobre testing

El proyecto no tiene framework de tests (no hay `jest`/`vitest`/`playwright`). La verificación es:
- **SQL asserts**: el script `scripts/test-enrollment.sql` de la Tarea 4 valida el comportamiento del RPC con `DO ... ASSERT`.
- **Tipado**: `npm run build` (TypeScript + Vite). Un error de tipo aborta.
- **Manual**: checklist al final del plan (Tarea 18) ejecutada contra `npm run dev`.

No se escriben tests unitarios TS/TSX en este plan porque añadir el framework está fuera de alcance. El SQL asserts cubre la lógica crítica de servidor (elegibilidad, duplicados, override, permisos).

---

## File Structure

### Nuevos archivos

- `supabase/migrations/20260417120000_enrollment_helpers_and_constraints.sql` — helpers (`current_usuario_id`, `is_lider_of_ministerio`, `can_enroll_in_ciclo`), partial unique index, CHECK fechas, trigger de reactivación.
- `supabase/migrations/20260417120100_enrollment_rls_and_view.sql` — reemplazo de policies de `detalle_proceso_curso` + vista `v_companeros_ciclo` con `security_invoker`.
- `supabase/migrations/20260417120200_rpc_enrollment.sql` — `get_enrollment_candidates` y `enroll_users`.
- `scripts/test-enrollment.sql` — fixture + asserts.
- `src/services/inscripciones.service.ts` — wrappers sobre RPCs + retirar/reactivar.
- `src/hooks/useInscripciones.ts` — queries/mutations para inscripciones y companeros.
- `src/app/components/classroom/EstadoInscripcionBadge.tsx` — badge reusable para los cuatro estados.
- `src/app/components/classroom/EnrollmentPickerModal.tsx` — modal compartido multi-select + search.
- `src/app/components/classroom/CompanerosDrawer.tsx` — drawer lateral con la lista de companeros del ciclo.
- `src/app/components/MisCursosPage.tsx` — nueva página `/app/mis-cursos`.

### Archivos modificados

- `src/app/components/CiclosLectivosPage.tsx` — cablear form Nuevo Ciclo, añadir Inscribir/Retirar/Reactivar.
- `src/app/components/ClassroomPage.tsx` — bloque "Ciclos activos" en detalle de curso con botón Inscribir.
- `src/app/routes.ts` — ruta `/app/mis-cursos`.
- `src/app/components/AppLayout.tsx` — entrada en el sidebar.
- `src/types/database.types.ts` — regenerado automáticamente tras cada migración (no editar a mano).
- `src/hooks/useCursos.ts` — si resulta necesario, extender con hook de retirar/reactivar; en esta iteración las mutations de retiro/reactivar viven en `useInscripciones.ts`, así que este archivo solo se toca si un getter cambia.

---

## Task 1: Migración 1 — helpers, constraints y trigger

**Files:**
- Create: `supabase/migrations/20260417120000_enrollment_helpers_and_constraints.sql`

- [ ] **Step 1: Crear el archivo de migración con el contenido siguiente**

```sql
-- Sub-proyecto A: helpers de autorización, unicidad parcial y trigger de reactivación.
-- Depende de: is_super_admin, is_admin_of_iglesia (phaseA), get_user_ministerios (fix_ministerio_rls_lideres).

-- ---------------------------------------------------------------------------
-- Helper: id_usuario del llamante autenticado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_usuario_id()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_usuario_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- Helper: es líder del ministerio target?
-- Usa get_user_ministerios() que ya existe (migración 20260416140000).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_lider_of_ministerio(target_ministerio_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT target_ministerio_id IN (SELECT public.get_user_ministerios());
$$;

GRANT EXECUTE ON FUNCTION public.is_lider_of_ministerio(bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- Helper: caller puede inscribir/retirar en el ciclo dado?
-- super_admin, admin_iglesia de la iglesia del ciclo, o líder del ministerio del curso.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_enroll_in_ciclo(target_ciclo_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.proceso_asignado_curso pac
    JOIN public.curso c ON c.id_curso = pac.id_curso
    WHERE pac.id_proceso_asignado_curso = target_ciclo_id
      AND (
        public.is_super_admin()
        OR public.is_admin_of_iglesia(pac.id_iglesia)
        OR public.is_lider_of_ministerio(c.id_ministerio)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_enroll_in_ciclo(bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- Partial unique index: evita dos inscripciones activas del mismo (usuario, ciclo).
-- La unicidad por (usuario, curso) a través de ciclos distintos se valida en el RPC.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS detalle_proceso_curso_activo_por_ciclo
  ON public.detalle_proceso_curso (id_usuario, id_proceso_asignado_curso)
  WHERE estado IN ('inscrito','en_progreso');

-- ---------------------------------------------------------------------------
-- CHECK de fechas coherentes en el ciclo.
-- ---------------------------------------------------------------------------
ALTER TABLE public.proceso_asignado_curso
  DROP CONSTRAINT IF EXISTS proceso_asignado_curso_fechas_ok;

ALTER TABLE public.proceso_asignado_curso
  ADD CONSTRAINT proceso_asignado_curso_fechas_ok
  CHECK (fecha_inicio <= fecha_fin);

-- ---------------------------------------------------------------------------
-- Trigger: al reactivar (retirado → inscrito), bloquear si el usuario tiene
-- otra inscripción activa del mismo curso en otro ciclo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_detalle_block_reactivar_if_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_curso bigint;
  v_conflict_ciclo bigint;
BEGIN
  IF NEW.estado IN ('inscrito','en_progreso')
     AND COALESCE(OLD.estado, '') NOT IN ('inscrito','en_progreso') THEN
    SELECT pac.id_curso INTO v_id_curso
    FROM public.proceso_asignado_curso pac
    WHERE pac.id_proceso_asignado_curso = NEW.id_proceso_asignado_curso;

    SELECT pac.id_proceso_asignado_curso INTO v_conflict_ciclo
    FROM public.detalle_proceso_curso dpc
    JOIN public.proceso_asignado_curso pac
      ON pac.id_proceso_asignado_curso = dpc.id_proceso_asignado_curso
    WHERE dpc.id_usuario = NEW.id_usuario
      AND dpc.id_detalle_proceso_curso <> NEW.id_detalle_proceso_curso
      AND dpc.estado IN ('inscrito','en_progreso')
      AND pac.id_curso = v_id_curso
    LIMIT 1;

    IF v_conflict_ciclo IS NOT NULL THEN
      RAISE EXCEPTION
        'El usuario ya tiene una inscripción activa del mismo curso en el ciclo %',
        v_conflict_ciclo
        USING HINT = 'Retira al usuario de la inscripción activa antes de reactivar esta.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS detalle_block_reactivar_if_duplicate ON public.detalle_proceso_curso;
CREATE TRIGGER detalle_block_reactivar_if_duplicate
  BEFORE UPDATE ON public.detalle_proceso_curso
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_detalle_block_reactivar_if_duplicate();
```

- [ ] **Step 2: Aplicar la migración con Supabase MCP**

Usar `mcp__claude_ai_Supabase__apply_migration` con `name = "enrollment_helpers_and_constraints"` y el SQL completo de arriba.

Expected: la herramienta responde con éxito. Si reporta "constraint already exists" revisar que la migración use `DROP ... IF EXISTS` correctamente.

- [ ] **Step 3: Verificar helpers contra el catálogo**

Ejecutar con `mcp__claude_ai_Supabase__execute_sql`:

```sql
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('current_usuario_id','is_lider_of_ministerio','can_enroll_in_ciclo','tg_detalle_block_reactivar_if_duplicate');
```

Expected: las 4 filas vuelven.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260417120000_enrollment_helpers_and_constraints.sql
git commit -m "feat(db): enrollment helpers, partial unique index y trigger de reactivación"
```

---

## Task 2: Migración 2 — RLS de `detalle_proceso_curso` y vista `v_companeros_ciclo`

**Files:**
- Create: `supabase/migrations/20260417120100_enrollment_rls_and_view.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- Sub-proyecto A: reemplazo de policies de detalle_proceso_curso
-- + vista v_companeros_ciclo con security_invoker para respetar RLS del invocador.
-- Depende de la migración 20260417120000 (can_enroll_in_ciclo, current_usuario_id).

-- ---------------------------------------------------------------------------
-- Policies de detalle_proceso_curso
-- Se eliminan las policies "Scoped *" de la Fase B porque eran admin-only;
-- las nuevas usan can_enroll_in_ciclo (incluye al líder del ministerio).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Scoped insert detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Scoped update detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Scoped delete detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Enroll insert detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Enroll update detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Enroll delete detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Select own or manageable detalle_proceso_curso" ON public.detalle_proceso_curso;

CREATE POLICY "Enroll insert detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR INSERT
  TO authenticated
  WITH CHECK (public.can_enroll_in_ciclo(id_proceso_asignado_curso));

CREATE POLICY "Enroll update detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR UPDATE
  TO authenticated
  USING (public.can_enroll_in_ciclo(id_proceso_asignado_curso))
  WITH CHECK (public.can_enroll_in_ciclo(id_proceso_asignado_curso));

CREATE POLICY "Enroll delete detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR DELETE
  TO authenticated
  USING (public.can_enroll_in_ciclo(id_proceso_asignado_curso));

CREATE POLICY "Select own or manageable detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR SELECT
  TO authenticated
  USING (
    id_usuario = public.current_usuario_id()
    OR public.can_enroll_in_ciclo(id_proceso_asignado_curso)
    OR EXISTS (
      SELECT 1 FROM public.detalle_proceso_curso self
      WHERE self.id_proceso_asignado_curso = detalle_proceso_curso.id_proceso_asignado_curso
        AND self.id_usuario = public.current_usuario_id()
        AND self.estado IN ('inscrito','en_progreso','completado')
    )
  );

-- ---------------------------------------------------------------------------
-- Vista v_companeros_ciclo (solo nombres, sin correos).
-- security_invoker=true es crítico: sin él la vista corre como owner (postgres)
-- y bypassa la RLS de detalle_proceso_curso y usuario.
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.v_companeros_ciclo;

CREATE VIEW public.v_companeros_ciclo
WITH (security_invoker = true) AS
SELECT
  dpc.id_detalle_proceso_curso,
  dpc.id_proceso_asignado_curso,
  dpc.id_usuario,
  dpc.estado,
  u.nombres,
  u.apellidos
FROM public.detalle_proceso_curso dpc
JOIN public.usuario u ON u.id_usuario = dpc.id_usuario
WHERE dpc.estado IN ('inscrito','en_progreso','completado');

GRANT SELECT ON public.v_companeros_ciclo TO authenticated;
```

- [ ] **Step 2: Aplicar la migración**

Usar `mcp__claude_ai_Supabase__apply_migration` con `name = "enrollment_rls_and_view"` y el SQL de arriba.

- [ ] **Step 3: Verificar policies y vista**

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname='public' AND tablename='detalle_proceso_curso'
ORDER BY policyname;
```

Expected: 4 filas: `Enroll delete`, `Enroll insert`, `Enroll update`, `Select own or manageable detalle_proceso_curso`.

```sql
SELECT relname, reloptions FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relname = 'v_companeros_ciclo';
```

Expected: 1 fila, `reloptions` incluye `security_invoker=true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260417120100_enrollment_rls_and_view.sql
git commit -m "feat(db): RLS de detalle_proceso_curso para líderes + vista v_companeros_ciclo"
```

---

## Task 3: Migración 3 — RPCs `get_enrollment_candidates` y `enroll_users`

**Files:**
- Create: `supabase/migrations/20260417120200_rpc_enrollment.sql`

- [ ] **Step 1: Crear la migración**

```sql
-- Sub-proyecto A: RPCs atómicos para inscripción.
-- Depende de las migraciones 20260417120000 y 20260417120100.

-- ---------------------------------------------------------------------------
-- get_enrollment_candidates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_enrollment_candidates(
  p_ciclo_id bigint,
  p_override_ministerio boolean DEFAULT false
)
RETURNS TABLE (
  id_usuario bigint,
  nombres text,
  apellidos text,
  correo text,
  ministerio_principal text,
  ya_inscrito_activo_en_curso boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_id_curso bigint;
  v_id_iglesia bigint;
  v_id_ministerio bigint;
BEGIN
  IF NOT public.can_enroll_in_ciclo(p_ciclo_id) THEN
    RAISE EXCEPTION 'No autorizado para listar candidatos del ciclo %', p_ciclo_id
      USING ERRCODE = '42501';
  END IF;

  IF p_override_ministerio
     AND NOT (public.is_super_admin()
              OR public.is_admin_of_iglesia(
                   (SELECT id_iglesia FROM public.proceso_asignado_curso WHERE id_proceso_asignado_curso = p_ciclo_id)
              )) THEN
    RAISE EXCEPTION 'Override restringido a super_admin o admin_iglesia' USING ERRCODE = '42501';
  END IF;

  SELECT pac.id_curso, pac.id_iglesia, c.id_ministerio
    INTO v_id_curso, v_id_iglesia, v_id_ministerio
  FROM public.proceso_asignado_curso pac
  JOIN public.curso c ON c.id_curso = pac.id_curso
  WHERE pac.id_proceso_asignado_curso = p_ciclo_id;

  IF v_id_curso IS NULL THEN
    RAISE EXCEPTION 'Ciclo % no encontrado', p_ciclo_id USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  WITH candidatos AS (
    SELECT DISTINCT u.id_usuario, u.nombres, u.apellidos, u.correo
    FROM public.usuario u
    WHERE CASE
            WHEN p_override_ministerio THEN
              EXISTS (
                SELECT 1 FROM public.usuario_rol ur
                WHERE ur.id_usuario = u.id_usuario AND ur.id_iglesia = v_id_iglesia
              )
            ELSE
              EXISTS (
                SELECT 1 FROM public.miembro_ministerio mm
                WHERE mm.id_usuario = u.id_usuario
                  AND mm.id_ministerio = v_id_ministerio
                  AND mm.estado = 'activo'
              )
          END
  )
  SELECT
    c.id_usuario,
    c.nombres,
    c.apellidos,
    c.correo,
    COALESCE((
      SELECT m.nombre
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = c.id_usuario AND mm.estado = 'activo'
      ORDER BY mm.creado_en ASC
      LIMIT 1
    ), '') AS ministerio_principal,
    EXISTS (
      SELECT 1
      FROM public.detalle_proceso_curso dpc
      JOIN public.proceso_asignado_curso pac2 ON pac2.id_proceso_asignado_curso = dpc.id_proceso_asignado_curso
      WHERE dpc.id_usuario = c.id_usuario
        AND dpc.estado IN ('inscrito','en_progreso')
        AND pac2.id_curso = v_id_curso
    ) AS ya_inscrito_activo_en_curso
  FROM candidatos c
  ORDER BY c.apellidos, c.nombres;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_enrollment_candidates(bigint, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- enroll_users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enroll_users(
  p_ciclo_id bigint,
  p_user_ids bigint[],
  p_override_ministerio boolean DEFAULT false
)
RETURNS TABLE (
  id_usuario bigint,
  estado text,
  id_detalle bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ciclo_estado text;
  v_id_curso bigint;
  v_id_iglesia bigint;
  v_id_ministerio bigint;
  v_user_id bigint;
  v_is_eligible boolean;
  v_dup_exists boolean;
  v_retirado_id bigint;
  v_new_id bigint;
BEGIN
  IF NOT public.can_enroll_in_ciclo(p_ciclo_id) THEN
    RAISE EXCEPTION 'No autorizado para inscribir en el ciclo %', p_ciclo_id
      USING ERRCODE = '42501';
  END IF;

  SELECT pac.estado, pac.id_curso, pac.id_iglesia, c.id_ministerio
    INTO v_ciclo_estado, v_id_curso, v_id_iglesia, v_id_ministerio
  FROM public.proceso_asignado_curso pac
  JOIN public.curso c ON c.id_curso = pac.id_curso
  WHERE pac.id_proceso_asignado_curso = p_ciclo_id;

  IF v_id_curso IS NULL THEN
    RAISE EXCEPTION 'Ciclo % no encontrado', p_ciclo_id USING ERRCODE = 'P0002';
  END IF;

  IF v_ciclo_estado NOT IN ('programado','en_curso') THEN
    RAISE EXCEPTION 'Ciclo % está %, no admite inscripciones', p_ciclo_id, v_ciclo_estado
      USING ERRCODE = '22023';
  END IF;

  IF p_override_ministerio
     AND NOT (public.is_super_admin() OR public.is_admin_of_iglesia(v_id_iglesia)) THEN
    RAISE EXCEPTION 'Override restringido a super_admin o admin_iglesia'
      USING ERRCODE = '42501';
  END IF;

  FOREACH v_user_id IN ARRAY COALESCE(p_user_ids, ARRAY[]::bigint[])
  LOOP
    -- Elegibilidad
    IF p_override_ministerio THEN
      SELECT EXISTS (
        SELECT 1 FROM public.usuario_rol ur
        WHERE ur.id_usuario = v_user_id AND ur.id_iglesia = v_id_iglesia
      ) INTO v_is_eligible;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM public.miembro_ministerio mm
        WHERE mm.id_usuario = v_user_id
          AND mm.id_ministerio = v_id_ministerio
          AND mm.estado = 'activo'
      ) INTO v_is_eligible;
    END IF;

    IF NOT v_is_eligible THEN
      id_usuario := v_user_id;
      estado := 'skipped_not_eligible';
      id_detalle := NULL;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- Duplicado activo en cualquier ciclo del mismo curso
    SELECT EXISTS (
      SELECT 1
      FROM public.detalle_proceso_curso dpc
      JOIN public.proceso_asignado_curso pac2
        ON pac2.id_proceso_asignado_curso = dpc.id_proceso_asignado_curso
      WHERE dpc.id_usuario = v_user_id
        AND dpc.estado IN ('inscrito','en_progreso')
        AND pac2.id_curso = v_id_curso
    ) INTO v_dup_exists;

    IF v_dup_exists THEN
      id_usuario := v_user_id;
      estado := 'skipped_duplicate';
      id_detalle := NULL;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- ¿Existe fila retirada en este mismo ciclo? Reactivar.
    SELECT dpc.id_detalle_proceso_curso INTO v_retirado_id
    FROM public.detalle_proceso_curso dpc
    WHERE dpc.id_usuario = v_user_id
      AND dpc.id_proceso_asignado_curso = p_ciclo_id
      AND dpc.estado = 'retirado'
    LIMIT 1;

    IF v_retirado_id IS NOT NULL THEN
      UPDATE public.detalle_proceso_curso
         SET estado = 'inscrito', fecha_inscripcion = now()
       WHERE id_detalle_proceso_curso = v_retirado_id;

      id_usuario := v_user_id;
      estado := 'reactivado';
      id_detalle := v_retirado_id;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- Inserción nueva
    INSERT INTO public.detalle_proceso_curso (id_usuario, id_proceso_asignado_curso, estado, fecha_inscripcion)
    VALUES (v_user_id, p_ciclo_id, 'inscrito', now())
    RETURNING id_detalle_proceso_curso INTO v_new_id;

    id_usuario := v_user_id;
    estado := 'inscrito';
    id_detalle := v_new_id;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll_users(bigint, bigint[], boolean) TO authenticated;
```

- [ ] **Step 2: Aplicar con Supabase MCP**

Usar `mcp__claude_ai_Supabase__apply_migration` con `name = "rpc_enrollment"`.

- [ ] **Step 3: Verificar que las funciones existan y los grants**

```sql
SELECT p.proname, pg_catalog.array_to_string(ARRAY(
  SELECT r.rolname FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.roleid
  WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
), ', ') AS notes
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN ('get_enrollment_candidates','enroll_users');
```

Expected: 2 filas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260417120200_rpc_enrollment.sql
git commit -m "feat(db): RPCs get_enrollment_candidates y enroll_users"
```

---

## Task 4: Script de verificación SQL

**Files:**
- Create: `scripts/test-enrollment.sql`

Este script siembra datos aislados, ejecuta el RPC en 5 escenarios y usa `ASSERT` para validar. Rollback al final para no contaminar la DB.

- [ ] **Step 1: Crear el archivo**

```sql
-- Verificación manual de enroll_users. Idempotente: rollback al final.
-- Ejecutar contra un branch o entorno de staging (no contra prod).
-- Uso: mcp__claude_ai_Supabase__execute_sql con este bloque completo,
-- o psql -f scripts/test-enrollment.sql.

BEGIN;

-- ------------------------------------------------------------
-- Fixture mínimo
-- ------------------------------------------------------------
WITH p AS (
  INSERT INTO public.pais (nombre) VALUES ('TEST_PAIS') RETURNING id_pais
),
d AS (
  INSERT INTO public.departamento (nombre, id_pais) SELECT 'TEST_DEP', id_pais FROM p RETURNING id_departamento, id_pais
),
ci AS (
  INSERT INTO public.ciudad (nombre, id_departamento) SELECT 'TEST_CIU', id_departamento FROM d RETURNING id_ciudad
),
ig AS (
  INSERT INTO public.iglesia (nombre, id_ciudad, estado)
  SELECT 'TEST_IGLESIA', id_ciudad, 'activa' FROM ci
  RETURNING id_iglesia
),
se AS (
  INSERT INTO public.sede (nombre, id_iglesia, id_ciudad, estado)
  SELECT 'TEST_SEDE', (SELECT id_iglesia FROM ig), id_ciudad, 'activa' FROM ci
  RETURNING id_sede
),
mi AS (
  INSERT INTO public.ministerio (nombre, id_sede, estado)
  SELECT 'TEST_MIN', id_sede, 'activo' FROM se RETURNING id_ministerio
),
cu AS (
  INSERT INTO public.curso (nombre, id_ministerio, id_usuario_creador, estado)
  SELECT 'TEST_CURSO', id_ministerio, 1, 'activo' FROM mi RETURNING id_curso
),
pac AS (
  INSERT INTO public.proceso_asignado_curso (id_curso, id_iglesia, fecha_inicio, fecha_fin, estado)
  SELECT id_curso, (SELECT id_iglesia FROM ig), CURRENT_DATE, CURRENT_DATE + 30, 'programado' FROM cu
  RETURNING id_proceso_asignado_curso
),
us AS (
  INSERT INTO public.usuario (nombres, apellidos, correo, documento, estado)
  VALUES
    ('U1','T','u1@test','D1','activo'),
    ('U2','T','u2@test','D2','activo'),
    ('U3','T','u3@test','D3','activo')
  RETURNING id_usuario, correo
),
mm AS (
  INSERT INTO public.miembro_ministerio (id_usuario, id_ministerio, estado)
  SELECT u.id_usuario, (SELECT id_ministerio FROM mi), 'activo'
  FROM us u WHERE u.correo IN ('u1@test','u2@test')
  RETURNING id_miembro_ministerio
)
SELECT
  (SELECT id_proceso_asignado_curso FROM pac) AS ciclo,
  (SELECT array_agg(id_usuario) FROM us) AS user_ids
INTO TEMP TABLE _fixture;

-- ------------------------------------------------------------
-- Caso 1: inscribir 2 miembros del ministerio + 1 no miembro (sin override).
-- Esperado: 2 inscritos, 1 skipped_not_eligible.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_ciclo bigint;
  v_ids bigint[];
  v_inscritos int;
  v_skipped int;
BEGIN
  SELECT ciclo, user_ids INTO v_ciclo, v_ids FROM _fixture;

  SELECT count(*) FILTER (WHERE e.estado='inscrito'),
         count(*) FILTER (WHERE e.estado='skipped_not_eligible')
  INTO v_inscritos, v_skipped
  FROM public.enroll_users(v_ciclo, v_ids, false) e;

  ASSERT v_inscritos = 2, FORMAT('Caso 1: esperaba 2 inscritos, obtuve %s', v_inscritos);
  ASSERT v_skipped = 1,  FORMAT('Caso 1: esperaba 1 skipped_not_eligible, obtuve %s', v_skipped);
END$$;

-- ------------------------------------------------------------
-- Caso 2: segundo intento con los mismos usuarios ya inscritos
-- → skipped_duplicate para los 2 activos + 1 skipped_not_eligible (el 3ro sigue sin ser miembro).
-- ------------------------------------------------------------
DO $$
DECLARE
  v_ciclo bigint;
  v_ids bigint[];
  v_dup int;
BEGIN
  SELECT ciclo, user_ids INTO v_ciclo, v_ids FROM _fixture;

  SELECT count(*) FILTER (WHERE e.estado='skipped_duplicate')
  INTO v_dup
  FROM public.enroll_users(v_ciclo, v_ids, false) e;

  ASSERT v_dup = 2, FORMAT('Caso 2: esperaba 2 skipped_duplicate, obtuve %s', v_dup);
END$$;

-- ------------------------------------------------------------
-- Caso 3: override permite inscribir al 3er usuario (pertenece a la iglesia via usuario_rol).
-- Para este caso necesitamos insertar una fila usuario_rol del 3er usuario a la iglesia.
-- ------------------------------------------------------------
INSERT INTO public.usuario_rol (id_usuario, id_rol, id_iglesia)
SELECT u.id_usuario, 1, (SELECT id_iglesia FROM public.iglesia WHERE nombre='TEST_IGLESIA')
FROM public.usuario u WHERE u.correo = 'u3@test'
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_ciclo bigint;
  v_u3 bigint;
  v_inscritos int;
BEGIN
  SELECT ciclo INTO v_ciclo FROM _fixture;
  SELECT id_usuario INTO v_u3 FROM public.usuario WHERE correo='u3@test';

  SELECT count(*) FILTER (WHERE e.estado='inscrito')
  INTO v_inscritos
  FROM public.enroll_users(v_ciclo, ARRAY[v_u3], true) e;

  ASSERT v_inscritos = 1, FORMAT('Caso 3: esperaba 1 inscrito con override, obtuve %s', v_inscritos);
END$$;

-- ------------------------------------------------------------
-- Caso 4: retirar al u1 y reactivarlo → resultado 'reactivado'.
-- ------------------------------------------------------------
UPDATE public.detalle_proceso_curso
   SET estado = 'retirado'
 WHERE id_usuario = (SELECT id_usuario FROM public.usuario WHERE correo='u1@test')
   AND id_proceso_asignado_curso = (SELECT ciclo FROM _fixture);

DO $$
DECLARE
  v_ciclo bigint;
  v_u1 bigint;
  v_reactivados int;
BEGIN
  SELECT ciclo INTO v_ciclo FROM _fixture;
  SELECT id_usuario INTO v_u1 FROM public.usuario WHERE correo='u1@test';

  SELECT count(*) FILTER (WHERE e.estado='reactivado')
  INTO v_reactivados
  FROM public.enroll_users(v_ciclo, ARRAY[v_u1], false) e;

  ASSERT v_reactivados = 1, FORMAT('Caso 4: esperaba 1 reactivado, obtuve %s', v_reactivados);
END$$;

-- ------------------------------------------------------------
-- Caso 5: ciclo finalizado → RAISE EXCEPTION.
-- ------------------------------------------------------------
UPDATE public.proceso_asignado_curso
   SET estado = 'finalizado'
 WHERE id_proceso_asignado_curso = (SELECT ciclo FROM _fixture);

DO $$
DECLARE
  v_ciclo bigint;
  v_u1 bigint;
  v_threw boolean := false;
BEGIN
  SELECT ciclo INTO v_ciclo FROM _fixture;
  SELECT id_usuario INTO v_u1 FROM public.usuario WHERE correo='u1@test';

  BEGIN
    PERFORM public.enroll_users(v_ciclo, ARRAY[v_u1], false);
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
  END;

  ASSERT v_threw, 'Caso 5: esperaba EXCEPTION al inscribir en ciclo finalizado';
END$$;

ROLLBACK;
```

- [ ] **Step 2: Ejecutar el script**

Usar `mcp__claude_ai_Supabase__execute_sql` con el contenido completo del archivo.

Expected: la ejecución termina sin errores de `ASSERT`. La transacción revierte (no quedan filas `TEST_*` en la DB).

- [ ] **Step 3: Commit**

```bash
git add scripts/test-enrollment.sql
git commit -m "test(db): script SQL de verificación de enroll_users"
```

---

## Task 5: Regenerar tipos TypeScript

**Files:**
- Modify: `src/types/database.types.ts`

- [ ] **Step 1: Regenerar tipos con Supabase MCP**

Invocar `mcp__claude_ai_Supabase__generate_typescript_types` y escribir la salida completa a `src/types/database.types.ts` (sobrescribir el archivo).

- [ ] **Step 2: Verificar que las nuevas entidades existen en el archivo**

```bash
grep -n "enroll_users\|get_enrollment_candidates\|v_companeros_ciclo\|can_enroll_in_ciclo\|current_usuario_id\|is_lider_of_ministerio" src/types/database.types.ts
```

Expected: al menos una coincidencia para cada símbolo (las funciones aparecen bajo `Functions`, la vista bajo `Views`).

- [ ] **Step 3: Verificar que el proyecto compila**

```bash
npm run build
```

Expected: build termina sin errores de tipo. Si hay errores, NO son por los cambios de este plan (ningún código consumidor existe aún) — deben ser preexistentes.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regenerar tipos tras migraciones de enrollment"
```

---

## Task 6: Service `inscripciones.service.ts`

**Files:**
- Create: `src/services/inscripciones.service.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { DetalleProcesoCurso } from '@/types/app.types'

// ─────────────────────────────────────────────────────────────────────────
// Tipos del dominio de inscripciones
// ─────────────────────────────────────────────────────────────────────────

export interface EnrollmentCandidate {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  ministerioPrincipal: string
  yaInscritoActivoEnCurso: boolean
}

export type EnrollOutcome =
  | 'inscrito'
  | 'reactivado'
  | 'skipped_duplicate'
  | 'skipped_not_eligible'
  | 'skipped_ciclo_cerrado'

export interface EnrollRow {
  idUsuario: number
  estado: EnrollOutcome
  idDetalle: number | null
}

export interface CompaneroCiclo {
  idDetalleProcesoCurso: number
  idProcesoAsignadoCurso: number
  idUsuario: number
  estado: DetalleProcesoCurso['estado']
  nombres: string
  apellidos: string
}

// ─────────────────────────────────────────────────────────────────────────
// RPC wrappers
// ─────────────────────────────────────────────────────────────────────────

export async function getEnrollmentCandidates(
  idCiclo: number,
  overrideMinisterio: boolean
): Promise<EnrollmentCandidate[]> {
  const { data, error } = await supabase.rpc('get_enrollment_candidates', {
    p_ciclo_id: idCiclo,
    p_override_ministerio: overrideMinisterio,
  })
  if (error) throw error
  return (data ?? []).map((r: {
    id_usuario: number
    nombres: string
    apellidos: string
    correo: string
    ministerio_principal: string
    ya_inscrito_activo_en_curso: boolean
  }) => ({
    idUsuario: r.id_usuario,
    nombres: r.nombres,
    apellidos: r.apellidos,
    correo: r.correo,
    ministerioPrincipal: r.ministerio_principal,
    yaInscritoActivoEnCurso: r.ya_inscrito_activo_en_curso,
  }))
}

export async function enrollUsers(
  idCiclo: number,
  userIds: number[],
  overrideMinisterio: boolean
): Promise<EnrollRow[]> {
  const { data, error } = await supabase.rpc('enroll_users', {
    p_ciclo_id: idCiclo,
    p_user_ids: userIds,
    p_override_ministerio: overrideMinisterio,
  })
  if (error) throw error
  return (data ?? []).map((r: { id_usuario: number; estado: EnrollOutcome; id_detalle: number | null }) => ({
    idUsuario: r.id_usuario,
    estado: r.estado,
    idDetalle: r.id_detalle,
  }))
}

// ─────────────────────────────────────────────────────────────────────────
// Retirar / reactivar una fila de detalle_proceso_curso
// ─────────────────────────────────────────────────────────────────────────

export async function retirarInscripcion(idDetalle: number): Promise<void> {
  const { error } = await supabase
    .from('detalle_proceso_curso')
    .update({ estado: 'retirado' })
    .eq('id_detalle_proceso_curso', idDetalle)
  if (error) throw error
}

export async function reactivarInscripcion(idDetalle: number): Promise<void> {
  const { error } = await supabase
    .from('detalle_proceso_curso')
    .update({ estado: 'inscrito', fecha_inscripcion: new Date().toISOString() })
    .eq('id_detalle_proceso_curso', idDetalle)
  if (error) throw error
}

// ─────────────────────────────────────────────────────────────────────────
// Lecturas
// ─────────────────────────────────────────────────────────────────────────

export async function getCompanerosCiclo(idCiclo: number): Promise<CompaneroCiclo[]> {
  const { data, error } = await supabase
    .from('v_companeros_ciclo')
    .select('*')
    .eq('id_proceso_asignado_curso', idCiclo)
    .order('apellidos', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    idDetalleProcesoCurso: r.id_detalle_proceso_curso as number,
    idProcesoAsignadoCurso: r.id_proceso_asignado_curso as number,
    idUsuario: r.id_usuario as number,
    estado: r.estado as DetalleProcesoCurso['estado'],
    nombres: r.nombres as string,
    apellidos: r.apellidos as string,
  }))
}

export interface MiInscripcion extends DetalleProcesoCurso {
  nombreCurso: string
  descripcionCurso: string | null
  fechaInicioCiclo: string
  fechaFinCiclo: string
  estadoCiclo: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
  nombreMinisterio: string
  nombreIglesia: string
  idCurso: number
}

export async function getMisInscripciones(idUsuario: number): Promise<MiInscripcion[]> {
  const { data, error } = await supabase
    .from('detalle_proceso_curso')
    .select(`
      id_detalle_proceso_curso,
      id_proceso_asignado_curso,
      id_usuario,
      fecha_inscripcion,
      estado,
      creado_en,
      updated_at,
      proceso_asignado_curso:proceso_asignado_curso!inner (
        fecha_inicio, fecha_fin, estado, id_curso, id_iglesia,
        curso:curso!inner (
          id_curso, nombre, descripcion,
          ministerio:ministerio!inner ( nombre )
        ),
        iglesia:iglesia!inner ( nombre )
      )
    `)
    .eq('id_usuario', idUsuario)
    .order('fecha_inscripcion', { ascending: false })
  if (error) throw error

  return (data ?? []).map((r) => {
    const pac = (r as unknown as { proceso_asignado_curso: {
      fecha_inicio: string; fecha_fin: string;
      estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado';
      id_curso: number; id_iglesia: number;
      curso: { id_curso: number; nombre: string; descripcion: string | null; ministerio: { nombre: string } };
      iglesia: { nombre: string };
    } }).proceso_asignado_curso
    return {
      idDetalleProcesoCurso: r.id_detalle_proceso_curso as number,
      idProcesoAsignadoCurso: r.id_proceso_asignado_curso as number,
      idUsuario: r.id_usuario as number,
      fechaInscripcion: r.fecha_inscripcion as string,
      estado: r.estado as DetalleProcesoCurso['estado'],
      creadoEn: r.creado_en as string,
      actualizadoEn: r.updated_at as string,
      nombreCurso: pac.curso.nombre,
      descripcionCurso: pac.curso.descripcion,
      fechaInicioCiclo: pac.fecha_inicio,
      fechaFinCiclo: pac.fecha_fin,
      estadoCiclo: pac.estado,
      nombreMinisterio: pac.curso.ministerio.nombre,
      nombreIglesia: pac.iglesia.nombre,
      idCurso: pac.curso.id_curso,
    }
  })
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npm run build
```

Expected: sin errores de tipo.

- [ ] **Step 3: Commit**

```bash
git add src/services/inscripciones.service.ts
git commit -m "feat(services): inscripciones service con RPCs y lectura de mis inscripciones"
```

---

## Task 7: Hook `useInscripciones.ts`

**Files:**
- Create: `src/hooks/useInscripciones.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEnrollmentCandidates, enrollUsers,
  retirarInscripcion, reactivarInscripcion,
  getCompanerosCiclo, getMisInscripciones,
} from '@/services/inscripciones.service'

export function useEnrollmentCandidates(idCiclo: number | null, overrideMinisterio: boolean) {
  return useQuery({
    queryKey: ['enrollment-candidates', idCiclo, overrideMinisterio],
    queryFn: () => getEnrollmentCandidates(idCiclo as number, overrideMinisterio),
    enabled: !!idCiclo,
    staleTime: 60 * 1000,
  })
}

export function useEnrollUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { idCiclo: number; userIds: number[]; overrideMinisterio: boolean }) =>
      enrollUsers(vars.idCiclo, vars.userIds, vars.overrideMinisterio),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['detalles-proceso', vars.idCiclo] })
      qc.invalidateQueries({ queryKey: ['enrollment-candidates', vars.idCiclo] })
      qc.invalidateQueries({ queryKey: ['mis-inscripciones'] })
      qc.invalidateQueries({ queryKey: ['companeros-ciclo', vars.idCiclo] })
    },
  })
}

export function useRetirarInscripcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idDetalle: number) => retirarInscripcion(idDetalle),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['detalles-proceso'] })
      qc.invalidateQueries({ queryKey: ['mis-inscripciones'] })
      qc.invalidateQueries({ queryKey: ['companeros-ciclo'] })
    },
  })
}

export function useReactivarInscripcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idDetalle: number) => reactivarInscripcion(idDetalle),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['detalles-proceso'] })
      qc.invalidateQueries({ queryKey: ['mis-inscripciones'] })
      qc.invalidateQueries({ queryKey: ['companeros-ciclo'] })
    },
  })
}

export function useCompanerosCiclo(idCiclo: number | null) {
  return useQuery({
    queryKey: ['companeros-ciclo', idCiclo],
    queryFn: () => getCompanerosCiclo(idCiclo as number),
    enabled: !!idCiclo,
    staleTime: 2 * 60 * 1000,
  })
}

export function useMisInscripciones(idUsuario: number | null | undefined) {
  return useQuery({
    queryKey: ['mis-inscripciones', idUsuario],
    queryFn: () => getMisInscripciones(idUsuario as number),
    enabled: !!idUsuario,
    staleTime: 2 * 60 * 1000,
  })
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useInscripciones.ts
git commit -m "feat(hooks): useInscripciones con queries y mutations"
```

---

## Task 8: `EstadoInscripcionBadge` — componente shared

**Files:**
- Create: `src/app/components/classroom/EstadoInscripcionBadge.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
import { Badge } from '../ui/badge'
import type { DetalleProcesoCurso } from '@/types/app.types'

const CONFIG: Record<DetalleProcesoCurso['estado'], { label: string; color: string }> = {
  inscrito:    { label: 'Inscrito',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  en_progreso: { label: 'En Progreso', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completado:  { label: 'Completado',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  retirado:    { label: 'Retirado',    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
}

export function EstadoInscripcionBadge({ estado }: { estado: DetalleProcesoCurso['estado'] }) {
  const cfg = CONFIG[estado] ?? CONFIG.inscrito
  return (
    <Badge
      variant="outline"
      className={`${cfg.color} border text-[9px] uppercase font-bold tracking-wider px-2 py-0.5`}
    >
      {cfg.label}
    </Badge>
  )
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
mkdir -p src/app/components/classroom
git add src/app/components/classroom/EstadoInscripcionBadge.tsx
git commit -m "feat(ui): EstadoInscripcionBadge compartido"
```

---

## Task 9: `EnrollmentPickerModal`

**Files:**
- Create: `src/app/components/classroom/EnrollmentPickerModal.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { useEnrollmentCandidates, useEnrollUsers } from '@/hooks/useInscripciones'
import type { ProcesoAsignadoCurso } from '@/types/app.types'
import type { EnrollRow } from '@/services/inscripciones.service'
import { Search, Users } from 'lucide-react'
import { useApp } from '../../store/AppContext'

interface Props {
  ciclo: ProcesoAsignadoCurso
  cursoNombre: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onEnrolled?: (rows: EnrollRow[]) => void
}

export function EnrollmentPickerModal({ ciclo, cursoNombre, open, onOpenChange, onEnrolled }: Props) {
  const { rolActual } = useApp()
  const isAdmin = rolActual === 'super_admin' || rolActual === 'admin_iglesia'
  const [overrideMinisterio, setOverrideMinisterio] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const effectiveOverride = isAdmin ? overrideMinisterio : false

  const candidatesQuery = useEnrollmentCandidates(open ? ciclo.idProcesoAsignadoCurso : null, effectiveOverride)
  const enrollMutation = useEnrollUsers()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = candidatesQuery.data ?? []
    if (!q) return list
    return list.filter((c) =>
      `${c.nombres} ${c.apellidos} ${c.correo}`.toLowerCase().includes(q)
    )
  }, [candidatesQuery.data, query])

  const toggle = (idUsuario: number, disabled: boolean) => {
    if (disabled) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idUsuario)) next.delete(idUsuario); else next.add(idUsuario)
      return next
    })
  }

  const reset = () => {
    setSelected(new Set())
    setQuery('')
  }

  const confirm = () => {
    if (selected.size === 0) return
    enrollMutation.mutate(
      {
        idCiclo: ciclo.idProcesoAsignadoCurso,
        userIds: Array.from(selected),
        overrideMinisterio: effectiveOverride,
      },
      {
        onSuccess: (rows) => {
          onEnrolled?.(rows)
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-xl rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Inscribir a "{cursoNombre}"
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ciclo {new Date(ciclo.fechaInicio).toLocaleDateString('es')} — {new Date(ciclo.fechaFin).toLocaleDateString('es')}
          </p>
        </DialogHeader>

        {isAdmin && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 px-3 py-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Pool de candidatos</p>
              <p className="text-[11px] text-muted-foreground">
                {overrideMinisterio ? 'Cualquier usuario de la iglesia' : 'Solo miembros del ministerio'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs"
              onClick={() => { setOverrideMinisterio((v) => !v); setSelected(new Set()) }}
            >
              Cambiar
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="h-10 pl-9 bg-background/50 border-white/10 rounded-xl text-sm"
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded-xl border border-white/5 divide-y divide-border/30">
          {candidatesQuery.isLoading && (
            <div className="py-10 text-center text-xs text-muted-foreground">Cargando candidatos…</div>
          )}
          {candidatesQuery.isError && (
            <div className="py-6 px-4 text-xs text-rose-400">
              Error cargando candidatos: {String((candidatesQuery.error as Error).message)}
            </div>
          )}
          {!candidatesQuery.isLoading && filtered.length === 0 && (
            <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5 opacity-40" />
              <p className="text-xs">Sin candidatos disponibles.</p>
            </div>
          )}
          {filtered.map((c) => {
            const disabled = c.yaInscritoActivoEnCurso
            const isChecked = selected.has(c.idUsuario)
            return (
              <label
                key={c.idUsuario}
                title={disabled ? 'Ya inscrito activamente en este curso' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/30'}`}
              >
                <Checkbox
                  checked={isChecked}
                  disabled={disabled}
                  onCheckedChange={() => toggle(c.idUsuario, disabled)}
                />
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                  {(c.nombres[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.nombres} {c.apellidos}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {c.ministerioPrincipal || '—'} · {c.correo}
                  </p>
                </div>
              </label>
            )
          })}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 mt-2">
          <div className="flex-1 text-xs text-muted-foreground">
            {selected.size} seleccionados
          </div>
          <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="rounded-xl"
            disabled={selected.size === 0 || enrollMutation.isPending}
            onClick={confirm}
          >
            {enrollMutation.isPending ? 'Inscribiendo…' : `Inscribir a ${selected.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/classroom/EnrollmentPickerModal.tsx
git commit -m "feat(ui): EnrollmentPickerModal con multi-select y search"
```

---

## Task 10: `CiclosLectivosPage` — cablear form Nuevo Ciclo

Hoy el botón "Crear Ciclo" solo cierra el diálogo. Lo cableamos al hook existente `useCreateProcesoAsignadoCurso`.

**Files:**
- Modify: `src/app/components/CiclosLectivosPage.tsx`

- [ ] **Step 1: Importar el hook + añadir state local al form**

En la parte superior del componente `CiclosLectivosPage`, tras los imports existentes, añadir:

```typescript
import { useCreateProcesoAsignadoCurso } from '@/hooks/useCursos'
import { useApp } from '../store/AppContext'
```

Dentro de `CiclosLectivosPage` (justo tras `const deleteProcesaMutation = useDeleteProcesoAsignadoCurso()`), añadir state y mutation:

```typescript
  const createMutation = useCreateProcesoAsignadoCurso()
  const { iglesiaActual } = useApp()
  const [cicloForm, setCicloForm] = useState<{
    idCurso: string
    fechaInicio: string
    fechaFin: string
    estadoInicial: 'programado' | 'en_curso'
  }>({ idCurso: '', fechaInicio: '', fechaFin: '', estadoInicial: 'programado' })
  const [cicloError, setCicloError] = useState<string | null>(null)

  const resetCicloForm = () => {
    setCicloForm({ idCurso: '', fechaInicio: '', fechaFin: '', estadoInicial: 'programado' })
    setCicloError(null)
  }

  const handleCreateCiclo = () => {
    setCicloError(null)
    if (!cicloForm.idCurso) return setCicloError('Selecciona un curso.')
    if (!cicloForm.fechaInicio || !cicloForm.fechaFin) return setCicloError('Fechas requeridas.')
    if (cicloForm.fechaInicio > cicloForm.fechaFin) return setCicloError('La fecha de inicio no puede ser posterior a la de fin.')
    if (!iglesiaActual) return setCicloError('No hay iglesia seleccionada.')
    createMutation.mutate(
      {
        idCurso: Number(cicloForm.idCurso),
        idIglesia: iglesiaActual.id,
        fechaInicio: cicloForm.fechaInicio,
        fechaFin: cicloForm.fechaFin,
        estado: cicloForm.estadoInicial,
      },
      {
        onSuccess: () => { resetCicloForm(); setShowCreateCiclo(false) },
        onError: (err) => setCicloError(String((err as Error).message ?? err)),
      }
    )
  }
```

- [ ] **Step 2: Cablear los inputs del Dialog "Nuevo Ciclo"**

Localizar el `Dialog` existente con título "Nuevo Ciclo Lectivo" (alrededor de la línea 320 del archivo actual) y reemplazar el contenido por:

```tsx
      <Dialog
        open={showCreateCiclo}
        onOpenChange={(o) => { if (!o) resetCicloForm(); setShowCreateCiclo(o) }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Nuevo Ciclo Lectivo
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Asocia un curso con fechas de inicio y fin.</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <FieldLabel>Curso</FieldLabel>
              <select
                value={cicloForm.idCurso}
                onChange={(e) => setCicloForm((f) => ({ ...f, idCurso: e.target.value }))}
                className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">— Seleccionar curso —</option>
                {cursos.map(c => <option key={c.idCurso} value={c.idCurso}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Fecha de Inicio</FieldLabel>
                <Input
                  type="date"
                  value={cicloForm.fechaInicio}
                  onChange={(e) => setCicloForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                  className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
                />
              </div>
              <div>
                <FieldLabel>Fecha de Fin</FieldLabel>
                <Input
                  type="date"
                  value={cicloForm.fechaFin}
                  onChange={(e) => setCicloForm((f) => ({ ...f, fechaFin: e.target.value }))}
                  className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Estado Inicial</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {(['programado', 'en_curso'] as const).map((s) => {
                  const active = cicloForm.estadoInicial === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCicloForm((f) => ({ ...f, estadoInicial: s }))}
                      className={`h-10 rounded-xl border text-sm font-semibold transition-all capitalize ${
                        active
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'border-white/10 bg-background/50 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5'
                      }`}
                    >
                      {estadoCicloConfig[s].label}
                    </button>
                  )
                })}
              </div>
            </div>
            {cicloError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {cicloError}
              </p>
            )}
          </div>
          <DialogFooter className="border-t border-border/50 pt-4 mt-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setShowCreateCiclo(false)}>Cancelar</Button>
            <Button
              className="rounded-xl"
              disabled={createMutation.isPending}
              onClick={handleCreateCiclo}
            >
              {createMutation.isPending ? 'Creando…' : 'Crear Ciclo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 3: Validar en runtime**

```bash
npm run build
npm run dev
```

En el navegador (`http://localhost:5173/app/ciclos-lectivos`):
1. Abre el diálogo "Nuevo Ciclo".
2. Intenta crear sin curso → ve el mensaje de error.
3. Selecciona un curso, pon fechas invertidas (inicio > fin) → ve el error.
4. Corrige fechas → se crea el ciclo y aparece en la lista.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/CiclosLectivosPage.tsx
git commit -m "fix(ciclos): cablear form Nuevo Ciclo a useCreateProcesoAsignadoCurso"
```

---

## Task 11: `CiclosLectivosPage` — integrar Inscribir, Retirar y Reactivar

**Files:**
- Modify: `src/app/components/CiclosLectivosPage.tsx`

- [ ] **Step 1: Importar las nuevas piezas**

Añadir a los imports superiores:

```typescript
import { EnrollmentPickerModal } from './classroom/EnrollmentPickerModal'
import { useRetirarInscripcion, useReactivarInscripcion } from '@/hooks/useInscripciones'
import { useMinisterios } from '@/hooks/useMinisterios'
import { UserPlus, Undo2 } from 'lucide-react'
```

- [ ] **Step 2: Reemplazar `CicloDetail` por la versión con acciones**

Sustituir todo el componente `CicloDetail` (de la línea ~39 a la ~144 del archivo actual) por:

```tsx
function CicloDetail({
  ciclo, onBack, cursoNombre, cursoMinisterioId,
}: {
  ciclo: ProcesoAsignadoCurso
  onBack: () => void
  cursoNombre: string
  cursoMinisterioId: number | null
}) {
  const { data: detalles = [] } = useDetallesProcesoCurso(ciclo.idProcesoAsignadoCurso)
  const { rolActual, iglesiaActual } = useApp()
  const { data: ministerios = [] } = useMinisterios()
  const [showPicker, setShowPicker] = useState(false)
  const [pendingRetiro, setPendingRetiro] = useState<number | null>(null)
  const retirarMutation = useRetirarInscripcion()
  const reactivarMutation = useReactivarInscripcion()

  const misMinisterios = ministerios.map((m) => m.idMinisterio)
  const cicloCerrado = ciclo.estado === 'finalizado' || ciclo.estado === 'cancelado'
  const canEnroll =
    !cicloCerrado &&
    (
      rolActual === 'super_admin' ||
      (rolActual === 'admin_iglesia' && iglesiaActual?.id === ciclo.idIglesia) ||
      (rolActual === 'lider' && cursoMinisterioId != null && misMinisterios.includes(cursoMinisterioId))
    )

  const completados = detalles.filter(d => d.estado === 'completado').length
  const progressPct = detalles.length > 0 ? Math.round((completados / detalles.length) * 100) : 0
  const cfg = estadoCicloConfig[ciclo.estado] ?? estadoCicloConfig.programado

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header idéntico al existente */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center gap-4"
      >
        <div className="absolute top-0 right-0 w-64 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-background/50 border border-white/5 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all hover:-translate-x-0.5 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight leading-none mb-1 truncate">{cursoNombre}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {formatDate(ciclo.fechaInicio)} — {formatDate(ciclo.fechaFin)}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`${cfg.color} border flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shrink-0`}>
          {cfg.icon} {cfg.label}
        </Badge>
      </motion.div>

      {detalles.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold">Progreso del Ciclo</p>
              <p className="text-xs text-muted-foreground">{completados} de {detalles.length} participantes completaron el curso</p>
            </div>
            <span className="text-3xl font-black text-primary">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2 bg-background/50" />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-2xl p-0 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/40 bg-card/20 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Participantes inscritos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{detalles.length} personas en este ciclo lectivo</p>
            </div>
            {canEnroll && (
              <Button size="sm" className="h-9 rounded-xl" onClick={() => setShowPicker(true)}>
                <UserPlus className="w-4 h-4 mr-1.5" /> Inscribir
              </Button>
            )}
          </div>
          <div className="divide-y divide-border/30">
            {detalles.map((d, i) => {
              const inscConfig = estadoInscripcionConfig[d.estado] ?? estadoInscripcionConfig.inscrito
              const mutating = retirarMutation.isPending || reactivarMutation.isPending
              return (
                <motion.div
                  key={d.idDetalleProcesoCurso}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="group flex items-center gap-4 px-5 py-3.5 hover:bg-accent/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {(d.nombreCompleto || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{d.nombreCompleto || `Usuario ${d.idUsuario}`}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{d.correo}</p>
                  </div>
                  <Badge variant="outline" className={`${inscConfig.color} border text-[9px] uppercase font-bold tracking-wider px-2 py-0.5`}>
                    {inscConfig.label}
                  </Badge>
                  {canEnroll && d.estado !== 'retirado' && (
                    <button
                      title="Retirar"
                      disabled={mutating}
                      onClick={() => setPendingRetiro(d.idDetalleProcesoCurso)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canEnroll && d.estado === 'retirado' && (
                    <button
                      title="Reactivar"
                      disabled={mutating}
                      onClick={() => reactivarMutation.mutate(d.idDetalleProcesoCurso)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-40"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              )
            })}
            {detalles.length === 0 && (
              <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                <div className="w-12 h-12 rounded-2xl bg-accent/40 flex items-center justify-center">
                  <Users className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-sm font-medium">Sin participantes inscritos</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      <EnrollmentPickerModal
        ciclo={ciclo}
        cursoNombre={cursoNombre}
        open={showPicker}
        onOpenChange={setShowPicker}
      />

      <AlertDialog open={pendingRetiro !== null} onOpenChange={(o) => !o && setPendingRetiro(null)}>
        <AlertDialogContent className="rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Retirar inscripción</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              El participante quedará marcado como <strong>retirado</strong>. Podrás reactivarlo más tarde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRetiro) retirarMutation.mutate(pendingRetiro, { onSuccess: () => setPendingRetiro(null) })
              }}
              disabled={retirarMutation.isPending}
              className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white border-0"
            >
              {retirarMutation.isPending ? 'Retirando…' : 'Retirar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 3: Pasar `cursoMinisterioId` desde la página principal**

Localizar la invocación de `CicloDetail` (alrededor de línea 175 del archivo original) y cambiar:

```tsx
if (selectedCiclo) return <CicloDetail ciclo={selectedCiclo} onBack={() => setSelectedCicloId(null)} cursoNombre={getCursoNombre(selectedCiclo.idCurso)} />;
```

Por:

```tsx
if (selectedCiclo) {
  const curso = cursos.find(c => c.idCurso === selectedCiclo.idCurso)
  return (
    <CicloDetail
      ciclo={selectedCiclo}
      onBack={() => setSelectedCicloId(null)}
      cursoNombre={getCursoNombre(selectedCiclo.idCurso)}
      cursoMinisterioId={curso?.idMinisterio ?? null}
    />
  )
}
```

- [ ] **Step 4: Validar en runtime**

```bash
npm run build
npm run dev
```

Ir a un ciclo existente en `/app/ciclos-lectivos`:
1. Con rol admin_iglesia: ver botón "Inscribir" y botón "Retirar" por fila.
2. Inscribir a 2 usuarios → toast/no error; lista se actualiza.
3. Retirar a uno → badge cambia a Retirado, aparece botón "Reactivar".
4. Reactivar → vuelve a Inscrito.
5. Con rol servidor (ajusta `sei-mock-rol` en localStorage): los botones no aparecen.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/CiclosLectivosPage.tsx
git commit -m "feat(ciclos): inscribir, retirar y reactivar desde el detalle del ciclo"
```

---

## Task 12: `ClassroomPage` — bloque "Ciclos activos" en el detalle del curso

**Files:**
- Modify: `src/app/components/ClassroomPage.tsx`

- [ ] **Step 1: Añadir imports y hooks**

Al principio de `ClassroomPage.tsx` añadir junto a los imports existentes:

```typescript
import { useProcesosAsignadoCurso } from '@/hooks/useCursos'
import { EnrollmentPickerModal } from './classroom/EnrollmentPickerModal'
import { UserPlus } from 'lucide-react'
```

Dentro de `ClassroomPage` (tras `const { usuarioActual, rolActual } = useApp()`), añadir:

```typescript
  const { data: todosProcesos = [] } = useProcesosAsignadoCurso()
  const [pickerForCiclo, setPickerForCiclo] = useState<{ ciclo: ProcesoAsignadoCurso; cursoNombre: string } | null>(null)
```

Añadir el import del tipo si falta:

```typescript
import type { ProcesoAsignadoCurso } from '@/types/app.types'
```

- [ ] **Step 2: Insertar el bloque "Ciclos activos" en la vista de detalle del curso**

Ubica el render cuando `selectedCurso` está definido (la vista que hoy muestra los módulos del curso) y añade, antes del listado de módulos, un bloque con los ciclos activos:

```tsx
{selectedCurso && (() => {
  const ciclosDelCurso = todosProcesos.filter(p => p.idCurso === selectedCurso.idCurso)
  const activos = ciclosDelCurso.filter(p => p.estado === 'programado' || p.estado === 'en_curso')
  const historicos = ciclosDelCurso.filter(p => p.estado === 'finalizado' || p.estado === 'cancelado')
  if (activos.length === 0 && historicos.length === 0) return null
  return (
    <div className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-4">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" /> Ciclos activos
      </h3>
      {activos.length === 0 && <p className="text-xs text-muted-foreground">No hay ciclos activos.</p>}
      <div className="space-y-2">
        {activos.map((p) => (
          <div key={p.idProcesoAsignadoCurso}
               className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 px-3 py-2">
            <div className="text-xs">
              <p className="font-semibold">{new Date(p.fechaInicio).toLocaleDateString('es')} — {new Date(p.fechaFin).toLocaleDateString('es')}</p>
              <p className="text-muted-foreground capitalize">{p.estado.replace('_',' ')}</p>
            </div>
            {canManageAula && (
              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs"
                      onClick={() => setPickerForCiclo({ ciclo: p, cursoNombre: selectedCurso.nombre })}>
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Inscribir
              </Button>
            )}
          </div>
        ))}
      </div>
      {historicos.length > 0 && (
        <details className="mt-3">
          <summary className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none">Ver histórico ({historicos.length})</summary>
          <div className="mt-2 space-y-1">
            {historicos.map((p) => (
              <div key={p.idProcesoAsignadoCurso} className="text-[11px] text-muted-foreground/80 px-3">
                {new Date(p.fechaInicio).toLocaleDateString('es')} — {new Date(p.fechaFin).toLocaleDateString('es')} · {p.estado}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
})()}
```

Al final del JSX del componente (antes del último `</div>` de cierre) renderizar el modal:

```tsx
{pickerForCiclo && (
  <EnrollmentPickerModal
    ciclo={pickerForCiclo.ciclo}
    cursoNombre={pickerForCiclo.cursoNombre}
    open={true}
    onOpenChange={(o) => { if (!o) setPickerForCiclo(null) }}
  />
)}
```

Nota: `canManageAula` ya existe en el componente; úsalo tal cual. Si el archivo no importa `Users` desde `lucide-react`, añadirlo al bloque de imports existente.

- [ ] **Step 3: Validar**

```bash
npm run build
npm run dev
```

Ir a `/app/aula`, abrir un curso que tenga al menos un ciclo activo: aparece el bloque "Ciclos activos" con el botón Inscribir. Al hacer click, abre el mismo modal que CiclosLectivos.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/ClassroomPage.tsx
git commit -m "feat(aula): bloque Ciclos activos con entry point de inscripción"
```

---

## Task 13: `CompanerosDrawer`

**Files:**
- Create: `src/app/components/classroom/CompanerosDrawer.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
import { useCompanerosCiclo } from '@/hooks/useInscripciones'
import { EstadoInscripcionBadge } from './EstadoInscripcionBadge'
import { Users, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  idCiclo: number | null
  cursoNombre: string
  onClose: () => void
}

export function CompanerosDrawer({ idCiclo, cursoNombre, onClose }: Props) {
  const { data = [], isLoading } = useCompanerosCiclo(idCiclo)

  return (
    <AnimatePresence>
      {idCiclo !== null && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-card border-l border-white/10 z-50 shadow-2xl flex flex-col"
          >
            <header className="flex items-center justify-between p-4 border-b border-border/40">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compañeros</p>
                <h3 className="font-bold text-sm">{cursoNombre}</h3>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl hover:bg-accent/40 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto divide-y divide-border/30">
              {isLoading && <p className="p-4 text-xs text-muted-foreground">Cargando…</p>}
              {!isLoading && data.length === 0 && (
                <div className="p-8 flex flex-col items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5 opacity-40" />
                  <p className="text-xs">Sin compañeros visibles.</p>
                </div>
              )}
              {data.map((c) => (
                <div key={c.idDetalleProcesoCurso} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                    {(c.nombres[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.nombres} {c.apellidos}</p>
                  </div>
                  <EstadoInscripcionBadge estado={c.estado} />
                </div>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/classroom/CompanerosDrawer.tsx
git commit -m "feat(ui): CompanerosDrawer para la vista de estudiante"
```

---

## Task 14: `MisCursosPage`

**Files:**
- Create: `src/app/components/MisCursosPage.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
import { useState } from 'react'
import { motion } from 'motion/react'
import { useApp } from '../store/AppContext'
import { useMisInscripciones } from '@/hooks/useInscripciones'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { EstadoInscripcionBadge } from './classroom/EstadoInscripcionBadge'
import { CompanerosDrawer } from './classroom/CompanerosDrawer'
import { BookOpen, Calendar, GraduationCap, Users } from 'lucide-react'

const ACTIVOS = new Set(['inscrito', 'en_progreso'] as const)

export function MisCursosPage() {
  const { usuarioActual } = useApp()
  const { data: inscripciones = [], isLoading } = useMisInscripciones(usuarioActual?.idUsuario)
  const [tab, setTab] = useState<'activos' | 'finalizados'>('activos')
  const [drawerCiclo, setDrawerCiclo] = useState<{ id: number; curso: string } | null>(null)

  const activos = inscripciones.filter(i => ACTIVOS.has(i.estado as 'inscrito' | 'en_progreso'))
  const finalizados = inscripciones.filter(i => !ACTIVOS.has(i.estado as 'inscrito' | 'en_progreso'))
  const visibles = tab === 'activos' ? activos : finalizados

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Cargando tus cursos…
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center gap-4">
        <div className="absolute top-0 right-0 w-72 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="flex items-center gap-4 flex-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-none">Mis Cursos</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {activos.length} activos · {finalizados.length} finalizados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-background/50 border border-white/5 rounded-xl p-1">
          {(['activos', 'finalizados'] as const).map((t) => (
            <button key={t}
              className={`px-4 h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition-all capitalize ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </motion.div>

      {visibles.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/40 flex items-center justify-center">
            <BookOpen className="w-7 h-7 opacity-40" />
          </div>
          <p className="font-semibold text-sm">
            {tab === 'activos' ? 'Aún no estás inscrito en ningún curso.' : 'Todavía no tienes cursos finalizados.'}
          </p>
          {tab === 'activos' && (
            <p className="text-xs">Tu líder o admin te inscribirá cuando haya un ciclo disponible.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibles.map((i, idx) => (
            <motion.div key={i.idDetalleProcesoCurso}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
              <Card className="bg-card/40 backdrop-blur-xl border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm leading-tight truncate">{i.nombreCurso}</h3>
                    <p className="text-[11px] text-muted-foreground">{i.nombreMinisterio} · {i.nombreIglesia}</p>
                  </div>
                  <EstadoInscripcionBadge estado={i.estado} />
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(i.fechaInicioCiclo)} — {formatDate(i.fechaFinCiclo)}
                </p>
                <div>
                  <div className="flex items-center justify-between mb-1 text-[11px] text-muted-foreground">
                    <span>Progreso</span>
                    <span title="El progreso se activará cuando el instructor añada contenido de módulos.">0%</span>
                  </div>
                  <Progress value={0} className="h-1.5 bg-background/50" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl text-xs"
                    onClick={() => setDrawerCiclo({ id: i.idProcesoAsignadoCurso, curso: i.nombreCurso })}>
                    <Users className="w-3.5 h-3.5 mr-1" /> Compañeros
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CompanerosDrawer
        idCiclo={drawerCiclo?.id ?? null}
        cursoNombre={drawerCiclo?.curso ?? ''}
        onClose={() => setDrawerCiclo(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Compilar**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/MisCursosPage.tsx
git commit -m "feat(ui): MisCursosPage con tabs y drawer de compañeros"
```

---

## Task 15: Rutas + entrada en el sidebar

**Files:**
- Modify: `src/app/routes.ts`
- Modify: `src/app/components/AppLayout.tsx`

- [ ] **Step 1: Añadir la ruta en `routes.ts`**

Añadir el import al principio:

```typescript
import { MisCursosPage } from "./components/MisCursosPage";
```

Dentro del array `children` bajo `path: "app"`, añadir la ruta después de `ciclos-lectivos`:

```typescript
{ path: "mis-cursos", Component: MisCursosPage, ErrorBoundary: ErrorPage },
```

- [ ] **Step 2: Añadir el título al PAGE_TITLES de `AppLayout.tsx`**

En el objeto de títulos (alrededor de la línea 44), añadir:

```typescript
"/app/mis-cursos": "Mis Cursos",
```

- [ ] **Step 3: Añadir la entrada al sidebar según rol**

Localizar los tres bloques de menú (`super_admin` / `admin_iglesia` / resto). Añadir `Mis Cursos` solo al bloque que sirve a `lider` y `servidor` (el que ya tiene "Mi Ministerio" / "Mis Tareas" / "Mis Evaluaciones" / "Mis Ciclos"). Añadir inmediatamente antes de "Mis Evaluaciones":

```typescript
        { label: "Mis Cursos", path: "/app/mis-cursos", icon: <BookOpen className="w-5 h-5" />, section: "Formacion" },
```

Para los bloques de super_admin y admin_iglesia, añadir también (pueden verla para depurar o actuar como usuarios) inmediatamente antes de "Ciclos Lectivos":

```typescript
        { label: "Mis Cursos", path: "/app/mis-cursos", icon: <BookOpen className="w-5 h-5" />, section: "Formacion" },
```

Verificar que `BookOpen` ya está importado desde `lucide-react` (lo está hoy — lo usa el bloque servidor).

- [ ] **Step 4: Validar en runtime**

```bash
npm run build
npm run dev
```

Con los tres roles (cambiando `sei-mock-rol` en localStorage):
1. Ver que "Mis Cursos" aparece en el sidebar bajo "Formacion".
2. Navegar a `/app/mis-cursos`: si no tiene inscripciones, ver empty state correcto.
3. Con un usuario inscrito (del flujo de Task 11): verificar que la card aparece y el drawer muestra compañeros.

- [ ] **Step 5: Commit**

```bash
git add src/app/routes.ts src/app/components/AppLayout.tsx
git commit -m "feat(nav): ruta y entry point de Mis Cursos en el sidebar"
```

---

## Task 16: Ejecutar la verificación manual por rol

**Files:** ninguno — sólo navegador y DB.

- [ ] **Step 1: Preparar datos**

Asegúrate de tener en la DB (puedes usar `mcp__claude_ai_Supabase__execute_sql` para inspeccionar):
- 1 iglesia con al menos 1 ministerio
- 1 curso asociado al ministerio
- 1 ciclo en estado `programado` o `en_curso` asociado al curso
- 3 usuarios: (a) miembro del ministerio, (b) no miembro pero con `usuario_rol` en la iglesia, (c) no perteneciente

Si no los tienes, crea con `createCurso` desde `/app/aula`, un `ministerio` desde `/app/departamentos`, y un ciclo desde `/app/ciclos-lectivos` usando el form ya funcional de Task 10.

- [ ] **Step 2: Rol super_admin (marca `localStorage.setItem('sei-mock-rol','super_admin')` y recarga)**

- [ ] Puede crear un ciclo desde el form (Task 10).
- [ ] Ve el botón "Inscribir" en el detalle del ciclo.
- [ ] El toggle del picker alterna "Solo miembros" / "Cualquier usuario de la iglesia".
- [ ] En modo "solo miembros" solo aparece el usuario (a).
- [ ] En modo "cualquier usuario" aparecen (a) y (b). El usuario (c) sigue sin aparecer.
- [ ] Inscribir a 2 usuarios funciona y el resumen refleja 2 inscritos.
- [ ] Reinscribir al mismo usuario: resultado 0 inscritos / 2 skipped_duplicate.
- [ ] Retirar un participante → badge cambia a "Retirado", aparece botón Reactivar.
- [ ] Reactivar → vuelve a "Inscrito".
- [ ] En el detalle del curso de `/app/aula` aparece el bloque "Ciclos activos" con botón Inscribir (mismo modal).

- [ ] **Step 3: Rol admin_iglesia**

- [ ] Todo lo de super_admin pero restringido a la iglesia a la que pertenece (intenta con otro ciclo de otra iglesia: el botón no aparece).

- [ ] **Step 4: Rol lider**

- [ ] Ve el botón "Inscribir" solo si el ciclo pertenece al ministerio donde es líder.
- [ ] El toggle aparece deshabilitado en "solo miembros" (si no está — revisa que el condicional `isAdmin` oculte el toggle para líder).
- [ ] No puede inscribir a alguien fuera del ministerio.

- [ ] **Step 5: Rol servidor**

- [ ] `/app/ciclos-lectivos`: puede entrar al detalle pero no ve Inscribir / Retirar.
- [ ] `/app/mis-cursos`: ve sus inscripciones en tabs Activos / Finalizados. Si no tiene, empty state amable.
- [ ] El drawer "Compañeros" muestra nombres de los otros inscritos al mismo ciclo sin correos.

- [ ] **Step 6: Caso edge — ciclo finalizado**

- [ ] Cambia el estado de un ciclo a `finalizado` (desde SQL o desde el update del ciclo). Verifica que el botón "Inscribir" desaparece y que intentar inscribir desde devtools llamando directamente al RPC recibe EXCEPTION con código 22023.

- [ ] **Step 7: Documentar hallazgos**

Si alguna verificación falla, añadir una entrada en el commit message final. Si todo pasa, commit trivial para cerrar el ciclo:

```bash
git commit --allow-empty -m "chore: verificación manual de Sub-proyecto A aprobada"
```

---

## Plan Self-Review

**1. Spec coverage**

| Requisito del spec | Task |
|---|---|
| Helpers `current_usuario_id`, `is_lider_of_ministerio`, `can_enroll_in_ciclo` | Task 1 |
| Partial unique index | Task 1 |
| CHECK de fechas | Task 1 |
| Trigger de bloqueo de reactivación duplicada | Task 1 |
| Drop+recreate RLS policies de `detalle_proceso_curso` | Task 2 |
| Vista `v_companeros_ciclo` con `security_invoker` | Task 2 |
| RPC `get_enrollment_candidates` | Task 3 |
| RPC `enroll_users` (atómico, clasificaciones sin abortar lote) | Task 3 |
| Script de verificación SQL con asserts | Task 4 |
| Regeneración de tipos | Task 5 |
| Service de inscripciones (RPC wrappers + retirar/reactivar + mis + compañeros) | Task 6 |
| Hooks React Query | Task 7 |
| `EstadoInscripcionBadge` read-only compartido | Task 8 |
| `EnrollmentPickerModal` multi-select + search | Task 9 |
| Form "Nuevo Ciclo" funcional en CiclosLectivosPage | Task 10 |
| Inscribir + Retirar + Reactivar en CiclosLectivosPage | Task 11 |
| Bloque "Ciclos activos" en ClassroomPage detalle de curso | Task 12 |
| `CompanerosDrawer` | Task 13 |
| `MisCursosPage` con tabs Activos/Finalizados | Task 14 |
| Ruta + sidebar Mis Cursos | Task 15 |
| Verificación manual por rol | Task 16 |

Cobertura completa.

**2. Placeholder scan**

Sin TBD/TODO/fill-in. Cada task contiene o el código completo o un command concreto.

**3. Type consistency**

- `EnrollOutcome` (service) ↔ `estado` (RPC) — mismo set de valores.
- `EnrollmentCandidate.yaInscritoActivoEnCurso` se mapea a `ya_inscrito_activo_en_curso` del RPC.
- `useEnrollUsers` pasa `{ idCiclo, userIds, overrideMinisterio }`; el service acepta `(idCiclo, userIds, overrideMinisterio)`.
- `EnrollmentPickerModal` espera `ciclo: ProcesoAsignadoCurso` y `cursoNombre: string`; ambos pasados desde Task 11 y Task 12.
- `CicloDetail` nuevo prop `cursoMinisterioId: number | null` — lo provee el caller en Task 11 Step 3.
- `MiInscripcion.estado` = `DetalleProcesoCurso['estado']`; tabs filtran por ese literal.
