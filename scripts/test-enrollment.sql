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
  INSERT INTO public.usuario (nombres, apellidos, correo, contrasena_hash, activo)
  VALUES
    ('U1','T','u1@test','hash_test', true),
    ('U2','T','u2@test','hash_test', true),
    ('U3','T','u3@test','hash_test', true)
  RETURNING id_usuario, correo
),
mm AS (
  INSERT INTO public.miembro_ministerio (id_usuario, id_ministerio, fecha_ingreso)
  SELECT u.id_usuario, (SELECT id_ministerio FROM mi), CURRENT_DATE
  FROM us u WHERE u.correo IN ('u1@test','u2@test')
  RETURNING id_miembro_ministerio
)
SELECT
  (SELECT id_proceso_asignado_curso FROM pac) AS ciclo,
  (SELECT array_agg(id_usuario) FROM us) AS user_ids,
  (SELECT id_iglesia FROM ig) AS iglesia_id
INTO TEMP TABLE _fixture;

DO $$
DECLARE
  v_auth_sub text;
  v_auth_user_id bigint;
  v_iglesia_id bigint;
BEGIN
  SELECT iglesia_id INTO v_iglesia_id FROM _fixture;

  SELECT u.auth_user_id::text, u.id_usuario
    INTO v_auth_sub, v_auth_user_id
  FROM public.usuario u
  WHERE u.auth_user_id IS NOT NULL
  LIMIT 1;

  IF v_auth_sub IS NULL OR v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'No existe usuario con auth_user_id para ejecutar asserts de enroll_users';
  END IF;

  INSERT INTO public.usuario_rol (id_usuario, id_rol, id_iglesia, fecha_inicio)
  SELECT v_auth_user_id, 1, v_iglesia_id, CURRENT_DATE
  ON CONFLICT DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', v_auth_sub, true);
END $$;

SELECT set_config('request.jwt.claim.role', 'authenticated', true);

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
-- -> skipped_duplicate para los 2 activos + 1 skipped_not_eligible (el 3ro sigue sin ser miembro).
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
INSERT INTO public.usuario_rol (id_usuario, id_rol, id_iglesia, fecha_inicio)
SELECT u.id_usuario, 1, (SELECT id_iglesia FROM public.iglesia WHERE nombre='TEST_IGLESIA')
  , CURRENT_DATE
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
-- Caso 4: retirar al u1 y reactivarlo -> resultado 'reactivado'.
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
-- Caso 5: ciclo finalizado -> RAISE EXCEPTION.
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
