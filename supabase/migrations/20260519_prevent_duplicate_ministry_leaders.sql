CREATE OR REPLACE FUNCTION public.assign_role_with_ministerio(
  p_id_usuario bigint,
  p_id_rol bigint,
  p_id_iglesia bigint,
  p_id_sede bigint DEFAULT NULL::bigint,
  p_id_ministerio bigint DEFAULT NULL::bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sede_roles bigint[] := ARRAY[3, 4, 9];
  v_min_roles bigint[] := ARRAY[3, 4];
  v_is_sede_role boolean;
  v_needs_min boolean;
  v_id_asignado bigint;
  v_rol_label text;
  v_existing_leader text;
BEGIN
  IF NOT public.can_assign_role_scoped(p_id_rol, p_id_iglesia, p_id_sede, p_id_ministerio) THEN
    RAISE EXCEPTION 'No autorizado para asignar este rol en el alcance solicitado'
      USING ERRCODE = '42501';
  END IF;

  v_is_sede_role := p_id_rol = ANY(v_sede_roles);
  v_needs_min := p_id_rol = ANY(v_min_roles);

  IF p_id_rol = 3 AND p_id_ministerio IS NOT NULL THEN
    SELECT trim(u.nombres || ' ' || u.apellidos)
    INTO v_existing_leader
    FROM public.miembro_ministerio mm
    JOIN public.usuario u ON u.id_usuario = mm.id_usuario
    WHERE mm.id_ministerio = p_id_ministerio
      AND mm.id_usuario <> p_id_usuario
      AND mm.fecha_salida IS NULL
      AND (
        lower(mm.rol_en_ministerio) LIKE '%lider%'
        OR lower(mm.rol_en_ministerio) LIKE '%líder%'
      )
    LIMIT 1;

    IF v_existing_leader IS NOT NULL THEN
      RAISE EXCEPTION 'Ya existe un líder activo en este ministerio: %', v_existing_leader
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF v_is_sede_role THEN
    INSERT INTO public.usuario_rol_sede(id_usuario, id_rol, id_iglesia, id_sede, fecha_inicio)
    SELECT p_id_usuario, p_id_rol, p_id_iglesia, p_id_sede, CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND id_sede IS NOT DISTINCT FROM p_id_sede
        AND fecha_fin IS NULL
    )
    RETURNING id_usuario_rol_sede INTO v_id_asignado;

    IF v_id_asignado IS NULL THEN
      SELECT id_usuario_rol_sede INTO v_id_asignado
      FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND id_sede IS NOT DISTINCT FROM p_id_sede
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  ELSE
    INSERT INTO public.usuario_rol(id_usuario, id_rol, id_iglesia, fecha_inicio)
    SELECT p_id_usuario, p_id_rol, p_id_iglesia, CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
    )
    RETURNING id_usuario_rol INTO v_id_asignado;

    IF v_id_asignado IS NULL THEN
      SELECT id_usuario_rol INTO v_id_asignado
      FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  END IF;

  IF v_needs_min AND p_id_ministerio IS NOT NULL THEN
    v_rol_label := CASE p_id_rol WHEN 3 THEN 'Líder' ELSE 'Servidor' END;
    INSERT INTO public.miembro_ministerio(id_usuario, id_ministerio, rol_en_ministerio, fecha_ingreso)
    VALUES (p_id_usuario, p_id_ministerio, v_rol_label, CURRENT_DATE)
    ON CONFLICT (id_usuario, id_ministerio) WHERE fecha_salida IS NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'id_asignacion', v_id_asignado);
END;
$function$;
