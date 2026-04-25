-- Fix: Super Admin role should not be tied to specific church
-- This migration corrects existing Super Admin assignments to use NULL iglesia_id

DO $$
DECLARE
  v_super_admin_role_id bigint;
BEGIN
  -- Get Super Admin role ID
  SELECT id_rol INTO v_super_admin_role_id
  FROM public.rol
  WHERE nombre = 'Super Administrador'
  LIMIT 1;

  IF v_super_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Super Administrador role not found';
  END IF;

  -- Update all Super Admin role assignments to have NULL iglesia_id
  UPDATE public.usuario_rol
  SET id_iglesia = NULL
  WHERE id_rol = v_super_admin_role_id;

  RAISE NOTICE '✅ Updated % Super Admin role assignments to use NULL iglesia_id', FOUND;
END $$;