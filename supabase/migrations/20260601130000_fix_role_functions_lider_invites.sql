-- Fixes for lider invite/assign flow (applied via MCP, recorded here for repo sync).
--
-- Problems fixed:
--  1. is_lider() DB fallback used ILIKE '%lider%' which fails on accented 'Líder'
--     ('Líder' ILIKE '%lider%' = false). Switched to translate() to strip accents.
--  2. can_assign_role_scoped() had no branch for the lider role, falling through to
--     RETURN false — so liders could never invite/assign Servidor. Added a lider branch
--     that checks ministerio membership directly via get_my_ministerios_as_lider(),
--     with no JWT-claim dependency and no separate iglesia check (membership scopes it).

CREATE OR REPLACE FUNCTION public.is_lider()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- JWT fast-path
  IF get_my_role() IN ('lider', 'admin_sede', 'admin_iglesia', 'super_admin') THEN
    RETURN true;
  END IF;
  -- DB fallback: use translate() to handle accented role names like 'Líder'
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_rol ur
    JOIN public.rol r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = public.get_my_usuario_id()
      AND lower(translate(r.nombre, 'íÍáÁéÉóÓúÚüÜñÑ', 'iIaAeEoOuUuUnN')) LIKE '%lider%'
      AND ur.fecha_fin IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.usuario_rol_sede urs
    JOIN public.rol r ON r.id_rol = urs.id_rol
    WHERE urs.id_usuario = public.get_my_usuario_id()
      AND lower(translate(r.nombre, 'íÍáÁéÉóÓúÚüÜñÑ', 'iIaAeEoOuUuUnN')) LIKE '%lider%'
      AND urs.fecha_fin IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_assign_role_scoped(
  p_target_role_id bigint,
  p_id_iglesia     bigint,
  p_id_sede        bigint DEFAULT NULL,
  p_id_ministerio  bigint DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_name    text;
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
    SELECT id_iglesia INTO v_sede_iglesia FROM public.sede WHERE id_sede = p_id_sede;
    IF v_sede_iglesia IS DISTINCT FROM p_id_iglesia THEN
      RETURN false;
    END IF;
    IF v_role_name IN ('Líder', 'Servidor') THEN
      RETURN p_id_ministerio IS NOT NULL AND public.can_manage_ministerio(p_id_ministerio);
    END IF;
    RETURN true;
  END IF;

  -- Lider: can assign Servidor role to any ministerio they lead.
  -- Security is guaranteed by get_my_ministerios_as_lider() DB check.
  IF v_role_name = 'Servidor' AND p_id_ministerio IS NOT NULL THEN
    RETURN p_id_ministerio IN (SELECT public.get_my_ministerios_as_lider());
  END IF;

  RETURN false;
END;
$$;
