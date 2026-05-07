-- supabase/migrations/20260506200100_sp2_permissions_updated_at.sql

-- Columna para detectar claims JWT stale
ALTER TABLE public.usuario_rol
  ADD COLUMN IF NOT EXISTS permissions_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Trigger que actualiza permissions_updated_at en cualquier cambio de rol
CREATE OR REPLACE FUNCTION public.trigger_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.permissions_updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_permissions_updated_at ON public.usuario_rol;
CREATE TRIGGER set_permissions_updated_at
  BEFORE UPDATE ON public.usuario_rol
  FOR EACH ROW EXECUTE FUNCTION public.trigger_permissions_updated_at();

-- RPC que el frontend usa para verificar si sus claims están stale
CREATE OR REPLACE FUNCTION public.get_my_permissions_updated_at()
RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MAX(permissions_updated_at)
  FROM public.usuario_rol
  WHERE id_usuario = get_my_usuario_id()
    AND fecha_fin IS NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_permissions_updated_at() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_permissions_updated_at() TO authenticated;
