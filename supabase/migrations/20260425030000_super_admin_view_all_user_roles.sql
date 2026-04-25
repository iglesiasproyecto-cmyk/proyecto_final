-- Allow Super Admin to see all user roles for management
CREATE POLICY "SuperAdmin view all usuario_rol"
  ON public.usuario_rol FOR SELECT
  TO authenticated
  USING (public.is_super_admin());