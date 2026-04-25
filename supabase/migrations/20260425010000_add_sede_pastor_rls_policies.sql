-- Fix: Add missing RLS policies for sede_pastor table
-- This allows Super Admin and Admin Iglesia to manage pastor assignments to sedes

-- INSERT policy for sede_pastor
CREATE POLICY "SuperAdmin insert sede_pastor"
  ON public.sede_pastor FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin() OR public.is_admin_of_iglesia(
    (SELECT s.id_iglesia FROM sede s WHERE s.id_sede = sede_pastor.id_sede)
  ));

-- SELECT policy for sede_pastor
CREATE POLICY "SuperAdmin select sede_pastor"
  ON public.sede_pastor FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_admin_of_iglesia(
    (SELECT s.id_iglesia FROM sede s WHERE s.id_sede = sede_pastor.id_sede)
  ));

-- UPDATE policy for sede_pastor
CREATE POLICY "SuperAdmin update sede_pastor"
  ON public.sede_pastor FOR UPDATE
  TO authenticated
  USING (public.is_super_admin() OR public.is_admin_of_iglesia(
    (SELECT s.id_iglesia FROM sede s WHERE s.id_sede = sede_pastor.id_sede)
  ));

-- DELETE policy for sede_pastor
CREATE POLICY "SuperAdmin delete sede_pastor"
  ON public.sede_pastor FOR DELETE
  TO authenticated
  USING (public.is_super_admin() OR public.is_admin_of_iglesia(
    (SELECT s.id_iglesia FROM sede s WHERE s.id_sede = sede_pastor.id_sede)
  ));