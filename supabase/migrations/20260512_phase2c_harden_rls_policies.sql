-- ============================================================
-- PHASE 2C: Harden RLS Policies
-- ============================================================
-- Replace permissive "true" policies with role-based access control

-- HARDENING 1: departamento - Restrict to super_admin for mutations
DROP POLICY IF EXISTS "authenticated insert departamento" ON departamento;
DROP POLICY IF EXISTS "authenticated update departamento" ON departamento;
DROP POLICY IF EXISTS "authenticated delete departamento" ON departamento;

CREATE POLICY "super_admin insert departamento"
  ON departamento FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin update departamento"
  ON departamento FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin delete departamento"
  ON departamento FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- SELECT remains as is (already restrictive)

-- HARDENING 2: pais - Restrict to super_admin for mutations
DROP POLICY IF EXISTS "authenticated insert pais" ON pais;
DROP POLICY IF EXISTS "authenticated update pais" ON pais;
DROP POLICY IF EXISTS "authenticated delete pais" ON pais;

CREATE POLICY "super_admin insert pais"
  ON pais FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin update pais"
  ON pais FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin delete pais"
  ON pais FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- HARDENING 3: ciudad - Restrict to super_admin for mutations
DROP POLICY IF EXISTS "authenticated insert ciudad" ON ciudad;
DROP POLICY IF EXISTS "authenticated update ciudad" ON ciudad;
DROP POLICY IF EXISTS "authenticated delete ciudad" ON ciudad;

CREATE POLICY "super_admin insert ciudad"
  ON ciudad FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin update ciudad"
  ON ciudad FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin delete ciudad"
  ON ciudad FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- SELECT policies remain as is (already restrictive)
