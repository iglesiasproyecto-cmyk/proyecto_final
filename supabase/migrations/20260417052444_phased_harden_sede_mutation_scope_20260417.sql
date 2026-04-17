-- Harden sede mutation policies to enforce iglesia scope per row.
-- Keeps SELECT policy unchanged and scopes INSERT/UPDATE/DELETE to iglesia admin ownership.

DROP POLICY IF EXISTS "Admin puede insertar sede" ON public.sede;
DROP POLICY IF EXISTS "Admin puede actualizar sede" ON public.sede;
DROP POLICY IF EXISTS "Admin puede borrar sede" ON public.sede;
DROP POLICY IF EXISTS "Scoped insert sede" ON public.sede;
DROP POLICY IF EXISTS "Scoped update sede" ON public.sede;
DROP POLICY IF EXISTS "Scoped delete sede" ON public.sede;

CREATE POLICY "Scoped insert sede"
  ON public.sede FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_of_iglesia(id_iglesia)
  );

CREATE POLICY "Scoped update sede"
  ON public.sede FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_of_iglesia(id_iglesia)
  )
  WITH CHECK (
    public.is_admin_of_iglesia(id_iglesia)
  );

CREATE POLICY "Scoped delete sede"
  ON public.sede FOR DELETE
  TO authenticated
  USING (
    public.is_admin_of_iglesia(id_iglesia)
  );
