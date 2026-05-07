-- SP-1: Fix RLS for geography tables and tipo_evento catalog
-- Remove permissive USING(true) mutation policies that allow any authenticated user
-- to mutate these tables. Only super_admin should be able to INSERT/UPDATE/DELETE.
-- SELECT (read) policies remain open to all authenticated users.
--
-- Context:
-- - 20260416120000_phase6_rls_geografia.sql created permissive mutation policies
-- - 20260506021606_fix_rls_super_admin_all_tables.sql added "X super admin" FOR ALL
-- - Because Postgres ORs permissive policies, the USING(true) ones override the intent
-- - This migration drops the permissive mutation policies and consolidates super_admin
--   into a clean named policy per table.

-- ── pais ──

DROP POLICY IF EXISTS "Authenticated insert pais" ON public.pais;
DROP POLICY IF EXISTS "Authenticated update pais" ON public.pais;
DROP POLICY IF EXISTS "Authenticated delete pais" ON public.pais;
-- Drop the old super admin ALL policy (covered SELECT + mutations together)
-- We recreate it as a mutations-only policy to avoid conflict with the SELECT policy
DROP POLICY IF EXISTS "pais super admin" ON public.pais;

-- Super admin: full mutation access (INSERT/UPDATE/DELETE)
CREATE POLICY "pais_super_admin_mutations" ON public.pais
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ── departamento ──

DROP POLICY IF EXISTS "Authenticated insert departamento" ON public.departamento;
DROP POLICY IF EXISTS "Authenticated update departamento" ON public.departamento;
DROP POLICY IF EXISTS "Authenticated delete departamento" ON public.departamento;
DROP POLICY IF EXISTS "departamento super admin" ON public.departamento;

CREATE POLICY "departamento_super_admin_mutations" ON public.departamento
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ── ciudad ──

DROP POLICY IF EXISTS "Authenticated insert ciudad" ON public.ciudad;
DROP POLICY IF EXISTS "Authenticated update ciudad" ON public.ciudad;
DROP POLICY IF EXISTS "Authenticated delete ciudad" ON public.ciudad;
DROP POLICY IF EXISTS "ciudad super admin" ON public.ciudad;

CREATE POLICY "ciudad_super_admin_mutations" ON public.ciudad
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ── tipo_evento (global catalog: only super_admin may mutate) ──

DROP POLICY IF EXISTS "Authenticated insert tipo_evento" ON public.tipo_evento;
DROP POLICY IF EXISTS "Authenticated update tipo_evento" ON public.tipo_evento;
DROP POLICY IF EXISTS "Authenticated delete tipo_evento" ON public.tipo_evento;
DROP POLICY IF EXISTS "tipo_evento super admin" ON public.tipo_evento;

CREATE POLICY "tipo_evento_super_admin_mutations" ON public.tipo_evento
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Note: SELECT policies ("Lectura autenticada pais/departamento/ciudad/tipo_evento")
-- from 20260416120000_phase6_rls_geografia.sql are intentionally preserved —
-- all authenticated users need read access to geography and catalog data.
