-- Verificacion de B1: contenido_md + RLS de modulo.
-- Ejecutar dentro de una transaccion y finalizar con ROLLBACK: no deja estado.
-- Requiere que la DB tenga al menos 1 curso con 1 modulo publicado, 1 admin_iglesia,
-- 1 lider de otro ministerio, 1 servidor inscrito y 1 servidor no inscrito.
-- Reemplazar los IDs marcados con <<...>> con datos reales de la DB antes de correr.

BEGIN;

-- Variables de contexto
\set id_modulo <<ID_MODULO_PUBLICADO>>
\set id_modulo_otra_iglesia <<ID_MODULO_OTRA_IGLESIA>>
\set auth_admin_iglesia '<<UUID_ADMIN_IGLESIA>>'
\set auth_lider_otro_min '<<UUID_LIDER_OTRO_MIN>>'
\set auth_servidor_inscrito '<<UUID_SERVIDOR_INSCRITO>>'
\set auth_servidor_no_inscrito '<<UUID_SERVIDOR_NO_INSCRITO>>'

-- Caso 1: admin_iglesia UPDATE contenido_md en modulo de su scope (debe afectar 1)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = :'auth_admin_iglesia';
WITH upd AS (
  UPDATE public.modulo SET contenido_md = '# test admin' WHERE id_modulo = :id_modulo RETURNING 1
)
SELECT count(*) AS rows_afectadas_admin FROM upd \gset
DO $$ BEGIN ASSERT :'rows_afectadas_admin'::int = 1, 'admin_iglesia debio actualizar 1 fila'; END $$;

-- Caso 2: lider de otro ministerio intenta UPDATE (debe afectar 0)
SET LOCAL request.jwt.claim.sub = :'auth_lider_otro_min';
WITH upd AS (
  UPDATE public.modulo SET contenido_md = '# hack' WHERE id_modulo = :id_modulo RETURNING 1
)
SELECT count(*) AS rows_afectadas_lider_otro FROM upd \gset
DO $$ BEGIN ASSERT :'rows_afectadas_lider_otro'::int = 0, 'lider de otro ministerio no debio actualizar'; END $$;

-- Caso 3: servidor inscrito SELECT del modulo publicado (debe devolver 1)
SET LOCAL request.jwt.claim.sub = :'auth_servidor_inscrito';
SELECT count(*) AS rows_select_inscrito FROM public.modulo WHERE id_modulo = :id_modulo \gset
DO $$ BEGIN ASSERT :'rows_select_inscrito'::int = 1, 'servidor inscrito debio leer el modulo'; END $$;

-- Caso 4: servidor sin inscripcion SELECT del modulo (debe devolver 0)
SET LOCAL request.jwt.claim.sub = :'auth_servidor_no_inscrito';
SELECT count(*) AS rows_select_no_inscrito FROM public.modulo WHERE id_modulo = :id_modulo \gset
DO $$ BEGIN ASSERT :'rows_select_no_inscrito'::int = 0, 'servidor no inscrito no debio leer el modulo'; END $$;

-- Caso 5: servidor inscrito intenta UPDATE contenido_md (debe afectar 0)
SET LOCAL request.jwt.claim.sub = :'auth_servidor_inscrito';
WITH upd AS (
  UPDATE public.modulo SET contenido_md = 'servidor mete mano' WHERE id_modulo = :id_modulo RETURNING 1
)
SELECT count(*) AS rows_upd_servidor FROM upd \gset
DO $$ BEGIN ASSERT :'rows_upd_servidor'::int = 0, 'servidor no debio actualizar'; END $$;

-- Caso 6: admin_iglesia no ve modulo de otra iglesia (debe devolver 0)
SET LOCAL request.jwt.claim.sub = :'auth_admin_iglesia';
SELECT count(*) AS rows_cruzado FROM public.modulo WHERE id_modulo = :id_modulo_otra_iglesia \gset
DO $$ BEGIN ASSERT :'rows_cruzado'::int = 0, 'admin_iglesia no debio ver modulo de otra iglesia'; END $$;

ROLLBACK;
