-- ============================================================================
-- Script para Aplicar Migraciones Críticas
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. CORRECCIÓN CRÍTICA: Agregar política SELECT para iglesia
-- Sin esto, los Super Admins no pueden ver las iglesias

CREATE POLICY "Admin select iglesia"
  ON public.iglesia FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_admin_of_iglesia(id_iglesia)
  );

-- 2. CORRECCIÓN: Super Admin debe tener id_iglesia = NULL
DO $$
DECLARE
  v_super_admin_role_id bigint;
BEGIN
  SELECT id_rol INTO v_super_admin_role_id
  FROM public.rol
  WHERE nombre = 'Super Administrador'
  LIMIT 1;

  IF v_super_admin_role_id IS NOT NULL THEN
    UPDATE public.usuario_rol
    SET id_iglesia = NULL
    WHERE id_rol = v_super_admin_role_id;

    RAISE NOTICE '✅ Super Admin assignments corregidos: % filas actualizadas', FOUND;
  ELSE
    RAISE NOTICE '⚠️ Rol Super Administrador no encontrado';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar políticas de iglesia
SELECT '📋 POLÍTICAS DE IGLESIA:' as info;
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'iglesia'
ORDER BY policyname;

-- Verificar Super Admin assignments
SELECT '👑 SUPER ADMINS:' as info;
SELECT
  u.correo,
  ur.id_iglesia,
  CASE WHEN ur.id_iglesia IS NULL THEN '✅ OK' ELSE '❌ ERROR' END as estado
FROM usuario_rol ur
JOIN usuario u ON u.id_usuario = ur.id_usuario
JOIN rol r ON r.id_rol = ur.id_rol
WHERE r.nombre = 'Super Administrador'
AND ur.fecha_fin IS NULL;

-- Verificar que las funciones existen
SELECT '🔧 FUNCIONES DE SEGURIDAD:' as info;
SELECT proname
FROM pg_proc
WHERE proname IN ('is_super_admin', 'is_admin_of_iglesia', 'get_my_roles')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

SELECT '✅ MIGRACIONES APLICADAS CORRECTAMENTE' as status;
SELECT '🔄 Ahora puedes probar acceder a /app/iglesias/[id] como Super Admin' as instruction;