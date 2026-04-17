-- Fix: RLS policies for iglesia - Admin only (Super Admin + Administrador de Iglesia)
-- Best practices from Supabase documentation applied

-- ── Función de autorización para admin de iglesia ──

CREATE OR REPLACE FUNCTION public.is_admin_iglesia()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
    AND r.nombre IN ('Super Administrador', 'Administrador de Iglesia')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Actualizar políticas de iglesia ──

DROP POLICY IF EXISTS "Authenticated insert iglesia" ON public.iglesia;

CREATE POLICY "Admin insert iglesia"
  ON public.iglesia FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_iglesia());

DROP POLICY IF EXISTS "Authenticated update iglesia" ON public.iglesia;

CREATE POLICY "Admin update iglesia"
  ON public.iglesia FOR UPDATE
  TO authenticated
  USING (is_admin_iglesia())
  WITH CHECK (is_admin_iglesia());

DROP POLICY IF EXISTS "Authenticated delete iglesia" ON public.iglesia;

CREATE POLICY "Admin delete iglesia"
  ON public.iglesia FOR DELETE
  TO authenticated
  USING (is_admin_iglesia());
