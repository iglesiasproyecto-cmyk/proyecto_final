-- Migration: Add auth_user_id column and handle_new_user trigger
-- Date: 2026-03-31
-- Purpose: Link usuario table to auth.users and auto-create usuario records on signup

-- Add auth_user_id column to usuario
ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_auth_user_id
  ON public.usuario(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Trigger: auto-create public.usuario row when auth.users gets a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuario (auth_user_id, nombres, apellidos, correo, contrasena_hash)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombres', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    NEW.email,
    ''
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
