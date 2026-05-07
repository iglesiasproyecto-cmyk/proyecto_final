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
--   into clean named policies per table (INSERT / UPDATE / DELETE only, not FOR ALL).

-- ── pais ──

DROP POLICY IF EXISTS "Authenticated insert pais" ON public.pais;
DROP POLICY IF EXISTS "Authenticated update pais" ON public.pais;
DROP POLICY IF EXISTS "Authenticated delete pais" ON public.pais;
-- Drop the old super admin ALL policy (covered SELECT + mutations together)
-- We recreate it as explicit mutation-only policies to avoid conflict with SELECT policy
DROP POLICY IF EXISTS "pais super admin" ON public.pais;
DROP POLICY IF EXISTS "pais_super_admin_mutations" ON public.pais;
DROP POLICY IF EXISTS "pais_super_admin_update" ON public.pais;
DROP POLICY IF EXISTS "pais_super_admin_delete" ON public.pais;

-- Super admin: explicit mutation access
CREATE POLICY "pais_super_admin_mutations" ON public.pais
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "pais_super_admin_update" ON public.pais
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "pais_super_admin_delete" ON public.pais
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- ── departamento ──

DROP POLICY IF EXISTS "Authenticated insert departamento" ON public.departamento;
DROP POLICY IF EXISTS "Authenticated update departamento" ON public.departamento;
DROP POLICY IF EXISTS "Authenticated delete departamento" ON public.departamento;
DROP POLICY IF EXISTS "departamento super admin" ON public.departamento;
DROP POLICY IF EXISTS "departamento_super_admin_mutations" ON public.departamento;
DROP POLICY IF EXISTS "departamento_super_admin_update" ON public.departamento;
DROP POLICY IF EXISTS "departamento_super_admin_delete" ON public.departamento;

-- Super admin: explicit mutation access
CREATE POLICY "departamento_super_admin_mutations" ON public.departamento
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "departamento_super_admin_update" ON public.departamento
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "departamento_super_admin_delete" ON public.departamento
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- ── ciudad ──

DROP POLICY IF EXISTS "Authenticated insert ciudad" ON public.ciudad;
DROP POLICY IF EXISTS "Authenticated update ciudad" ON public.ciudad;
DROP POLICY IF EXISTS "Authenticated delete ciudad" ON public.ciudad;
DROP POLICY IF EXISTS "ciudad super admin" ON public.ciudad;
DROP POLICY IF EXISTS "ciudad_super_admin_mutations" ON public.ciudad;
DROP POLICY IF EXISTS "ciudad_super_admin_update" ON public.ciudad;
DROP POLICY IF EXISTS "ciudad_super_admin_delete" ON public.ciudad;

-- Super admin: explicit mutation access
CREATE POLICY "ciudad_super_admin_mutations" ON public.ciudad
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "ciudad_super_admin_update" ON public.ciudad
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "ciudad_super_admin_delete" ON public.ciudad
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- ── tipo_evento (global catalog: only super_admin may mutate) ──

DROP POLICY IF EXISTS "Authenticated insert tipo_evento" ON public.tipo_evento;
DROP POLICY IF EXISTS "Authenticated update tipo_evento" ON public.tipo_evento;
DROP POLICY IF EXISTS "Authenticated delete tipo_evento" ON public.tipo_evento;
DROP POLICY IF EXISTS "tipo_evento super admin" ON public.tipo_evento;
DROP POLICY IF EXISTS "tipo_evento_super_admin_mutations" ON public.tipo_evento;
DROP POLICY IF EXISTS "tipo_evento_super_admin_update" ON public.tipo_evento;
DROP POLICY IF EXISTS "tipo_evento_super_admin_delete" ON public.tipo_evento;

-- Super admin: explicit mutation access
CREATE POLICY "tipo_evento_super_admin_mutations" ON public.tipo_evento
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "tipo_evento_super_admin_update" ON public.tipo_evento
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "tipo_evento_super_admin_delete" ON public.tipo_evento
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- Note: SELECT policies ("Lectura autenticada pais/departamento/ciudad/tipo_evento")
-- from 20260416120000_phase6_rls_geografia.sql are intentionally preserved —
-- all authenticated users need read access to geography and catalog data.
