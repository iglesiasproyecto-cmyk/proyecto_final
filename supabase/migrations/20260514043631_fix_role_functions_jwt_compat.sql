-- ============================================================
-- Migration: fix role helper functions for JWT short-code compatibility
--
-- Root cause: JWT app_metadata.role stores short codes ('admin_iglesia',
-- 'super_admin', 'lider', 'admin_sede') but the functions were checking
-- for the legacy Spanish DB names ('Administrador de Iglesia', etc.).
-- This caused is_admin_iglesia() to always return false for JWT-auth users,
-- blocking all ministerio/evento/tarea INSERT operations for admin_iglesia.
--
-- Fix: each function now checks JWT short codes first (fast path), then
-- falls back to DB queries with legacy names for backward compatibility.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_iglesia()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF get_my_role() IN ('admin_iglesia', 'super_admin', 'Administrador de Iglesia', 'Super Administrador') THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF get_my_role() IN ('super_admin', 'Super Administrador') THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_rol ur
    JOIN public.rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = (
      SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1
    )
    AND r.nombre = 'Super Administrador'
    AND ur.fecha_fin IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_sede()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF get_my_role() IN ('admin_sede', 'admin_iglesia', 'super_admin') THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_rol_sede urs
    JOIN public.rol r ON r.id_rol = urs.id_rol
    WHERE urs.id_usuario = public.get_my_usuario_id()
      AND (r.nombre ILIKE '%administrador de sede%' OR r.nombre ILIKE '%admin%sede%')
      AND urs.fecha_fin IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_lider()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF get_my_role() IN ('lider', 'admin_sede', 'admin_iglesia', 'super_admin') THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_rol ur
    JOIN public.rol r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = public.get_my_usuario_id()
      AND r.nombre ILIKE '%lider%'
      AND ur.fecha_fin IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.usuario_rol_sede urs
    JOIN public.rol r ON r.id_rol = urs.id_rol
    WHERE urs.id_usuario = public.get_my_usuario_id()
      AND r.nombre ILIKE '%lider%'
      AND urs.fecha_fin IS NULL
  );
END;
$$;
