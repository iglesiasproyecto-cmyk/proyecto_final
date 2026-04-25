-- Script para aplicar la migración faltante de política SELECT para iglesia
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- Agregar política SELECT para iglesia que permite a Super Admin ver todas las iglesias
CREATE POLICY "Admin select iglesia"
  ON public.iglesia FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_admin_of_iglesia(id_iglesia)
  );

-- Verificar que la política se creó correctamente
SELECT '✅ Política SELECT creada para iglesia' as status;