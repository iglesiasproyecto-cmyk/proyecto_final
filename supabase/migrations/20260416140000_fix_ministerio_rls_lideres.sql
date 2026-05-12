-- Fix: RLS policies for ministerio - Líderes solo ver/editar sus propios ministerios
-- Best practices applied: Role-based access with ministry membership validation

-- ── Función para verificar si usuario es Líder ──

CREATE OR REPLACE FUNCTION public.is_lider()
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
    AND r.nombre = 'Líder'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Función para obtener ministerios del líder ──

-- SKIP (defined in 20260415000000): CREATE OR REPLACE FUNCTION public.get_user_ministerios()
-- SKIP (defined in 20260415000000): RETURNS TABLE(id_ministerio bigint) AS $$
-- SKIP (defined in 20260415000000): BEGIN
-- SKIP (defined in 20260415000000):   RETURN QUERY
-- SKIP (defined in 20260415000000):   SELECT DISTINCT mm.id_ministerio
-- SKIP (defined in 20260415000000):   FROM public.miembro_ministerio mm
-- SKIP (defined in 20260415000000):   WHERE mm.id_usuario = (
-- SKIP (defined in 20260415000000):     SELECT id_usuario FROM public.usuario
-- SKIP (defined in 20260415000000):     WHERE auth_user_id = auth.uid()
-- SKIP (defined in 20260415000000):     LIMIT 1
-- SKIP (defined in 20260415000000):   )
-- SKIP (defined in 20260415000000):   AND mm.fecha_salida IS NULL
-- SKIP (defined in 20260415000000):   AND mm.rol_ministerio = 'Líder';
-- SKIP (defined in 20260415000000): END;
-- SKIP (defined in 20260415000000): $$ LANGUAGE plpgsql SECURITY DEFINER;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): -- ── Actualizar políticas de ministerio ──
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): DROP POLICY IF EXISTS "Lectura ministerios por sede asignada" ON public.ministerio;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): CREATE POLICY "Lectura ministerios Líderes"
-- SKIP (defined in 20260415000000):   ON public.ministerio FOR SELECT
-- SKIP (defined in 20260415000000):   TO authenticated
-- SKIP (defined in 20260415000000):   USING (
-- SKIP (defined in 20260415000000):     is_super_admin() 
-- SKIP (defined in 20260415000000):     OR (id_ministerio IN (SELECT get_user_ministerios()))
-- SKIP (defined in 20260415000000):     OR EXISTS (
-- SKIP (defined in 20260415000000):       SELECT 1 FROM public.sede s
-- SKIP (defined in 20260415000000):       WHERE s.id_sede = ministerio.id_sede
-- SKIP (defined in 20260415000000):       AND s.id_iglesia IN (SELECT get_user_iglesias())
-- SKIP (defined in 20260415000000):     )
-- SKIP (defined in 20260415000000):   );
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): DROP POLICY IF EXISTS "Authenticated insert ministerio" ON public.ministerio;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): CREATE POLICY "Líderes insert ministerio"
-- SKIP (defined in 20260415000000):   ON public.ministerio FOR INSERT
-- SKIP (defined in 20260415000000):   TO authenticated
-- SKIP (defined in 20260415000000):   WITH CHECK (
-- SKIP (defined in 20260415000000):     is_admin_iglesia() 
-- SKIP (defined in 20260415000000):     OR EXISTS (
-- SKIP (defined in 20260415000000):       SELECT 1 FROM public.sede s
-- SKIP (defined in 20260415000000):       WHERE s.id_sede = ministerio.id_sede
-- SKIP (defined in 20260415000000):       AND s.id_iglesia IN (SELECT get_user_iglesias())
-- SKIP (defined in 20260415000000):     )
-- SKIP (defined in 20260415000000):   );
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): DROP POLICY IF EXISTS "Authenticated update ministerio" ON public.ministerio;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): CREATE POLICY "Líderes update ministerio"
-- SKIP (defined in 20260415000000):   ON public.ministerio FOR UPDATE
-- SKIP (defined in 20260415000000):   TO authenticated
-- SKIP (defined in 20260415000000):   USING (
-- SKIP (defined in 20260415000000):     is_admin_iglesia() 
-- SKIP (defined in 20260415000000):     OR (id_ministerio IN (SELECT get_user_ministerios()))
-- SKIP (defined in 20260415000000):   )
-- SKIP (defined in 20260415000000):   WITH CHECK (
-- SKIP (defined in 20260415000000):     is_admin_iglesia() 
-- SKIP (defined in 20260415000000):     OR (id_ministerio IN (SELECT get_user_ministerios()))
-- SKIP (defined in 20260415000000):   );
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): DROP POLICY IF EXISTS "Authenticated delete ministerio" ON public.ministerio;
-- SKIP (defined in 20260415000000): 
-- SKIP (defined in 20260415000000): CREATE POLICY "Líderes delete ministerio"
-- SKIP (defined in 20260415000000):   ON public.ministerio FOR DELETE
-- SKIP (defined in 20260415000000):   TO authenticated
-- SKIP (defined in 20260415000000):   USING (
-- SKIP (defined in 20260415000000):     is_admin_iglesia() 
-- SKIP (defined in 20260415000000):     OR (id_ministerio IN (SELECT get_user_ministerios()))
-- SKIP (defined in 20260415000000):   );
