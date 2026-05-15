-- Migración: soporte de ministerio en flujo de invitación y asignación de roles
-- Fecha: 2026-05-15

-- 1. Añadir id_ministerio a invite_tokens (nullable, solo para roles Lider/Servidor)
ALTER TABLE public.invite_tokens
  ADD COLUMN IF NOT EXISTS id_ministerio BIGINT
  REFERENCES public.ministerio(id_ministerio) ON DELETE SET NULL;

-- 2. RPC assign_role_with_ministerio
CREATE OR REPLACE FUNCTION public.assign_role_with_ministerio(
  p_id_usuario    BIGINT,
  p_id_rol        BIGINT,
  p_id_iglesia    BIGINT,
  p_id_sede       BIGINT DEFAULT NULL,
  p_id_ministerio BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sede_roles  BIGINT[] := ARRAY[3, 4, 9];
  v_min_roles   BIGINT[] := ARRAY[3, 4];
  v_is_sede_role BOOLEAN;
  v_needs_min    BOOLEAN;
  v_id_asignado  BIGINT;
  v_rol_label    TEXT;
BEGIN
  v_is_sede_role := p_id_rol = ANY(v_sede_roles);
  v_needs_min    := p_id_rol = ANY(v_min_roles);

  IF v_is_sede_role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol     = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND (id_sede = p_id_sede OR (id_sede IS NULL AND p_id_sede IS NULL))
        AND fecha_fin IS NULL
    ) THEN
      INSERT INTO public.usuario_rol_sede(id_usuario, id_rol, id_iglesia, id_sede, fecha_inicio)
      VALUES (p_id_usuario, p_id_rol, p_id_iglesia, p_id_sede, CURRENT_DATE)
      RETURNING id_usuario_rol_sede INTO v_id_asignado;
    ELSE
      SELECT id_usuario_rol_sede INTO v_id_asignado
      FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol     = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND (id_sede = p_id_sede OR (id_sede IS NULL AND p_id_sede IS NULL))
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol     = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
    ) THEN
      INSERT INTO public.usuario_rol(id_usuario, id_rol, id_iglesia, fecha_inicio)
      VALUES (p_id_usuario, p_id_rol, p_id_iglesia, CURRENT_DATE)
      RETURNING id_usuario_rol INTO v_id_asignado;
    ELSE
      SELECT id_usuario_rol INTO v_id_asignado
      FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol     = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  END IF;

  IF v_needs_min AND p_id_ministerio IS NOT NULL THEN
    v_rol_label := CASE p_id_rol WHEN 3 THEN 'Líder' ELSE 'Servidor' END;
    INSERT INTO public.miembro_ministerio(id_usuario, id_ministerio, rol_en_ministerio, fecha_ingreso)
    VALUES (p_id_usuario, p_id_ministerio, v_rol_label, CURRENT_DATE)
    ON CONFLICT ON CONSTRAINT miembro_ministerio_unq_activo_usuario_ministerio DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'id_asignacion', v_id_asignado);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_role_with_ministerio TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_role_with_ministerio TO service_role;
