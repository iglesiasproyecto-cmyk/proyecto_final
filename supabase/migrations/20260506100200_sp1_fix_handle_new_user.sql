-- Migration: SP-1 Task 3 — Recreate handle_new_user trigger with conflict handling
-- Date: 2026-05-06
-- Purpose: Ensure a public.usuario record is always created when an auth.users row
--          is inserted. Uses ON CONFLICT (correo) to safely handle users who already
--          exist in public.usuario (e.g. seed data) but had no auth account yet.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuario (
    nombres,
    apellidos,
    correo,
    contrasena_hash,
    activo,
    auth_user_id
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'nombres', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    NEW.email,
    '',
    TRUE,
    NEW.id
  )
  ON CONFLICT (correo) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id,
        updated_at   = NOW()
  WHERE public.usuario.auth_user_id IS NULL;

  RETURN NEW;
END;
$$;

-- Recreate trigger (DROP IF EXISTS makes this idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
