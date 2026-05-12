-- ============================================================
-- PHASE 2A: Restore Auth Linkage After Deletion Incident
-- ============================================================
-- After accidental deletion, usuario.auth_user_id was nullified
-- This migration restores the critical link between usuario and auth.users

-- STEP 1: Ensure auth_user_id column exists (should exist from migration 20260407031108)
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- STEP 2: Ensure handle_new_user trigger exists (auto-provisions usuarios on auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuario (
    nombres, apellidos, correo, contrasena_hash, auth_user_id, activo
  ) VALUES (
    COALESCE(new.raw_user_meta_data->>'nombre', ''),
    COALESCE(new.raw_user_meta_data->>'apellido', ''),
    new.email,
    '',
    new.id,
    true
  )
  ON CONFLICT (correo) DO UPDATE
  SET auth_user_id = new.id
  WHERE usuario.auth_user_id IS NULL;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 3: Ensure all required roles exist
INSERT INTO rol (nombre, descripcion)
VALUES
  ('Super Administrador', 'Full system access - can view/edit all churches, users, roles'),
  ('Administrador de Iglesia', 'Church administrator - can manage one church and its branches'),
  ('Administrador de Sede', 'Branch administrator - can manage one branch'),
  ('Lider', 'Ministry leader - can manage ministry members and events'),
  ('Servidor', 'Regular member - limited access')
ON CONFLICT (nombre) DO NOTHING;

-- STEP 4: Create helper function to check super admin status
-- (may already exist, this is defensive)
CREATE OR REPLACE FUNCTION public.is_super_admin()
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
    AND r.nombre = 'Super Administrador'
    AND ur.fecha_fin IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Create helper function to check admin iglesia status
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
    AND ur.fecha_fin IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Create helper function to check admin sede status
CREATE OR REPLACE FUNCTION public.is_admin_sede()
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
    AND r.nombre IN ('Super Administrador', 'Administrador de Sede')
    AND ur.fecha_fin IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 7: Log recovery completion
-- (informational - helps track when this was applied)
INSERT INTO notificacion (id_usuario, titulo, mensaje, tipo)
SELECT
  MIN(id_usuario),
  'Sistema Recuperado',
  'Recovery Phase 2A: Auth linkage restored',
  'informacion'::tipo_notificacion
FROM usuario
LIMIT 1;
