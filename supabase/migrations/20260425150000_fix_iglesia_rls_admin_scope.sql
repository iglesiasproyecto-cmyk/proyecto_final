-- Fix: Correct iglesia RLS policies to properly scope Admin Iglesia permissions
-- Admin Iglesia should only be able to UPDATE their assigned iglesia, not INSERT or DELETE

-- Drop incorrect policies
DROP POLICY IF EXISTS "Admin insert iglesia" ON public.iglesia;
DROP POLICY IF EXISTS "Admin update iglesia" ON public.iglesia;
DROP POLICY IF EXISTS "Admin delete iglesia" ON public.iglesia;

-- Correct policies:
-- INSERT: Only Super Admin can create new iglesias
CREATE POLICY "SuperAdmin insert iglesia"
  ON public.iglesia FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- UPDATE: Super Admin can update any iglesia, Admin Iglesia can only update their assigned iglesia
CREATE POLICY "Scoped update iglesia"
  ON public.iglesia FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_admin_of_iglesia(id_iglesia)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_admin_of_iglesia(id_iglesia)
  );

-- DELETE: Only Super Admin can delete iglesias (too dangerous for Admin Iglesia)
CREATE POLICY "SuperAdmin delete iglesia"
  ON public.iglesia FOR DELETE
  TO authenticated
  USING (public.is_super_admin());