-- Fix can_assign_role_scoped to verify iglesia-sede consistency.
-- An admin_sede must not be able to assign roles where id_iglesia and id_sede
-- refer to different churches.
--
-- NOTE: Role IDs 3=Líder, 4=Servidor, 9=Administrador de Sede are hardcoded.
-- These come from the rol table seed data and must be kept in sync.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_assign_role_scoped(
  p_target_role_id bigint,
  p_id_iglesia bigint,
  p_id_sede bigint DEFAULT NULL,
  p_id_ministerio bigint DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_name text;
  v_sede_iglesia bigint;
BEGIN
  SELECT nombre INTO v_role_name
  FROM public.rol
  WHERE id_rol = p_target_role_id;

  IF v_role_name IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  IF v_role_name = 'Super Administrador' THEN
    RETURN false;
  END IF;

  IF public.is_admin_iglesia() THEN
    RETURN p_id_iglesia = public.get_my_tenant_id();
  END IF;

  IF public.is_admin_sede() AND NOT public.is_admin_iglesia() THEN
    IF v_role_name NOT IN ('Administrador de Sede', 'Líder', 'Servidor') THEN
      RETURN false;
    END IF;

    IF p_id_sede IS NULL THEN
      RETURN false;
    END IF;

    IF p_id_sede NOT IN (SELECT id FROM public.get_my_sedes()) THEN
      RETURN false;
    END IF;

    SELECT id_iglesia INTO v_sede_iglesia
    FROM public.sede
    WHERE id_sede = p_id_sede;

    IF v_sede_iglesia IS DISTINCT FROM p_id_iglesia THEN
      RETURN false;
    END IF;

    IF v_role_name IN ('Líder', 'Servidor') THEN
      RETURN p_id_ministerio IS NOT NULL AND public.can_manage_ministerio(p_id_ministerio);
    END IF;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMIT;
