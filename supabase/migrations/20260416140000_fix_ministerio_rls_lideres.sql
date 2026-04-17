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

CREATE OR REPLACE FUNCTION public.get_user_ministerios()
RETURNS TABLE(id_ministerio bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT mm.id_ministerio
  FROM public.miembro_ministerio mm
  WHERE mm.id_usuario = (
    SELECT id_usuario FROM public.usuario
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  )
  AND mm.fecha_salida IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Actualizar políticas de ministerio ──

DROP POLICY IF EXISTS "Lectura ministerios por sede asignada" ON public.ministerio;

CREATE POLICY "Lectura ministerios Líderes"
  ON public.ministerio FOR SELECT
  TO authenticated
  USING (
    is_super_admin() 
    OR (id_ministerio IN (SELECT get_user_ministerios()))
    OR EXISTS (
      SELECT 1 FROM public.sede s
      WHERE s.id_sede = ministerio.id_sede
      AND s.id_iglesia IN (SELECT get_user_iglesias())
    )
  );

DROP POLICY IF EXISTS "Authenticated insert ministerio" ON public.ministerio;

CREATE POLICY "Líderes insert ministerio"
  ON public.ministerio FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_iglesia() 
    OR EXISTS (
      SELECT 1 FROM public.sede s
      WHERE s.id_sede = ministerio.id_sede
      AND s.id_iglesia IN (SELECT get_user_iglesias())
    )
  );

DROP POLICY IF EXISTS "Authenticated update ministerio" ON public.ministerio;

CREATE POLICY "Líderes update ministerio"
  ON public.ministerio FOR UPDATE
  TO authenticated
  USING (
    is_admin_iglesia() 
    OR (id_ministerio IN (SELECT get_user_ministerios()))
  )
  WITH CHECK (
    is_admin_iglesia() 
    OR (id_ministerio IN (SELECT get_user_ministerios()))
  );

DROP POLICY IF EXISTS "Authenticated delete ministerio" ON public.ministerio;

CREATE POLICY "Líderes delete ministerio"
  ON public.ministerio FOR DELETE
  TO authenticated
  USING (
    is_admin_iglesia() 
    OR (id_ministerio IN (SELECT get_user_ministerios()))
  );
