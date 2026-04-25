-- Fix: Add SELECT policy for iglesia table to allow Super Admin and Admin Iglesia to view churches

CREATE POLICY "Admin select iglesia"
  ON public.iglesia FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_admin_of_iglesia(id_iglesia)
  );