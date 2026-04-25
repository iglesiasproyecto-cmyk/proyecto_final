-- ============================================================================
-- Script Consolidado: Aplicar Todas las Migraciones Pendientes
-- Ejecutar en: Supabase Dashboard > SQL Editor (en orden)
-- ============================================================================

-- 1. Fix Super Admin church assignment (20260424200000)
DO $$
DECLARE
  v_super_admin_role_id bigint;
BEGIN
  SELECT id_rol INTO v_super_admin_role_id
  FROM public.rol
  WHERE nombre = 'Super Administrador'
  LIMIT 1;

  IF v_super_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Super Administrador role not found';
  END IF;

  UPDATE public.usuario_rol
  SET id_iglesia = NULL
  WHERE id_rol = v_super_admin_role_id;

  RAISE NOTICE '✅ Updated % Super Admin role assignments to use NULL iglesia_id', FOUND;
END $$;

-- 2. Add SELECT policy for iglesia table (20260425000000)
CREATE POLICY "Admin select iglesia"
  ON public.iglesia FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_admin_of_iglesia(id_iglesia)
  );

-- ============================================================================
-- Verificación Final
-- ============================================================================

SELECT '✅ Migraciones aplicadas correctamente' as status;

-- Verificar que las políticas existen
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'iglesia'
ORDER BY policyname;

-- Verificar Super Admin assignments
SELECT
  u.nombres || ' ' || u.apellidos as super_admin,
  ur.id_iglesia,
  CASE WHEN ur.id_iglesia IS NULL THEN '✅ Correcto' ELSE '❌ Incorrecto' END as estado
FROM usuario_rol ur
JOIN usuario u ON u.id_usuario = ur.id_usuario
JOIN rol r ON r.id_rol = ur.id_rol
WHERE r.nombre = 'Super Administrador'
AND ur.fecha_fin IS NULL;