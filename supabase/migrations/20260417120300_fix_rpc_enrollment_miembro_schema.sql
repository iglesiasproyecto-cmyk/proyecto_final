-- Fix: adaptar RPCs de enrollment al esquema actual de miembro_ministerio
-- (sin columna estado; membresia activa se modela con fecha_salida IS NULL).

CREATE OR REPLACE FUNCTION public.get_enrollment_candidates(
  p_ciclo_id bigint,
  p_override_ministerio boolean DEFAULT false
)
RETURNS TABLE (
  id_usuario bigint,
  nombres text,
  apellidos text,
  correo text,
  ministerio_principal text,
  ya_inscrito_activo_en_curso boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_id_curso bigint;
  v_id_iglesia bigint;
  v_id_ministerio bigint;
BEGIN
  IF NOT public.can_enroll_in_ciclo(p_ciclo_id) THEN
    RAISE EXCEPTION 'No autorizado para listar candidatos del ciclo %', p_ciclo_id
      USING ERRCODE = '42501';
  END IF;

  IF p_override_ministerio
     AND NOT (
       public.is_super_admin()
       OR public.is_admin_of_iglesia(
         (SELECT id_iglesia FROM public.proceso_asignado_curso WHERE id_proceso_asignado_curso = p_ciclo_id)
       )
     ) THEN
    RAISE EXCEPTION 'Override restringido a super_admin o admin_iglesia' USING ERRCODE = '42501';
  END IF;

  SELECT pac.id_curso, pac.id_iglesia, c.id_ministerio
    INTO v_id_curso, v_id_iglesia, v_id_ministerio
  FROM public.proceso_asignado_curso pac
  JOIN public.curso c ON c.id_curso = pac.id_curso
  WHERE pac.id_proceso_asignado_curso = p_ciclo_id;

  IF v_id_curso IS NULL THEN
    RAISE EXCEPTION 'Ciclo % no encontrado', p_ciclo_id USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  WITH candidatos AS (
    SELECT DISTINCT u.id_usuario, u.nombres, u.apellidos, u.correo
    FROM public.usuario u
    WHERE CASE
      WHEN p_override_ministerio THEN
        EXISTS (
          SELECT 1
          FROM public.usuario_rol ur
          WHERE ur.id_usuario = u.id_usuario
            AND ur.id_iglesia = v_id_iglesia
            AND (ur.fecha_fin IS NULL OR ur.fecha_fin >= CURRENT_DATE)
        )
      ELSE
        EXISTS (
          SELECT 1
          FROM public.miembro_ministerio mm
          WHERE mm.id_usuario = u.id_usuario
            AND mm.id_ministerio = v_id_ministerio
            AND mm.fecha_salida IS NULL
        )
    END
  )
  SELECT
    c.id_usuario,
    c.nombres,
    c.apellidos,
    c.correo,
    COALESCE((
      SELECT m.nombre
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = c.id_usuario
        AND mm.fecha_salida IS NULL
      ORDER BY mm.creado_en ASC
      LIMIT 1
    ), '') AS ministerio_principal,
    EXISTS (
      SELECT 1
      FROM public.detalle_proceso_curso dpc
      JOIN public.proceso_asignado_curso pac2 ON pac2.id_proceso_asignado_curso = dpc.id_proceso_asignado_curso
      WHERE dpc.id_usuario = c.id_usuario
        AND dpc.estado IN ('inscrito', 'en_progreso')
        AND pac2.id_curso = v_id_curso
    ) AS ya_inscrito_activo_en_curso
  FROM candidatos c
  ORDER BY c.apellidos, c.nombres;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_enrollment_candidates(bigint, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.enroll_users(
  p_ciclo_id bigint,
  p_user_ids bigint[],
  p_override_ministerio boolean DEFAULT false
)
RETURNS TABLE (
  id_usuario bigint,
  estado text,
  id_detalle bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ciclo_estado text;
  v_id_curso bigint;
  v_id_iglesia bigint;
  v_id_ministerio bigint;
  v_user_id bigint;
  v_is_eligible boolean;
  v_dup_exists boolean;
  v_retirado_id bigint;
  v_new_id bigint;
BEGIN
  IF NOT public.can_enroll_in_ciclo(p_ciclo_id) THEN
    RAISE EXCEPTION 'No autorizado para inscribir en el ciclo %', p_ciclo_id
      USING ERRCODE = '42501';
  END IF;

  SELECT pac.estado, pac.id_curso, pac.id_iglesia, c.id_ministerio
    INTO v_ciclo_estado, v_id_curso, v_id_iglesia, v_id_ministerio
  FROM public.proceso_asignado_curso pac
  JOIN public.curso c ON c.id_curso = pac.id_curso
  WHERE pac.id_proceso_asignado_curso = p_ciclo_id;

  IF v_id_curso IS NULL THEN
    RAISE EXCEPTION 'Ciclo % no encontrado', p_ciclo_id USING ERRCODE = 'P0002';
  END IF;

  IF v_ciclo_estado NOT IN ('programado', 'en_curso') THEN
    RAISE EXCEPTION 'Ciclo % está %, no admite inscripciones', p_ciclo_id, v_ciclo_estado
      USING ERRCODE = '22023';
  END IF;

  IF p_override_ministerio
     AND NOT (public.is_super_admin() OR public.is_admin_of_iglesia(v_id_iglesia)) THEN
    RAISE EXCEPTION 'Override restringido a super_admin o admin_iglesia'
      USING ERRCODE = '42501';
  END IF;

  FOREACH v_user_id IN ARRAY COALESCE(p_user_ids, ARRAY[]::bigint[])
  LOOP
    IF p_override_ministerio THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.usuario_rol ur
        WHERE ur.id_usuario = v_user_id
          AND ur.id_iglesia = v_id_iglesia
          AND (ur.fecha_fin IS NULL OR ur.fecha_fin >= CURRENT_DATE)
      ) INTO v_is_eligible;
    ELSE
      SELECT EXISTS (
        SELECT 1
        FROM public.miembro_ministerio mm
        WHERE mm.id_usuario = v_user_id
          AND mm.id_ministerio = v_id_ministerio
          AND mm.fecha_salida IS NULL
      ) INTO v_is_eligible;
    END IF;

    IF NOT v_is_eligible THEN
      id_usuario := v_user_id;
      estado := 'skipped_not_eligible';
      id_detalle := NULL;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.detalle_proceso_curso dpc
      JOIN public.proceso_asignado_curso pac2
        ON pac2.id_proceso_asignado_curso = dpc.id_proceso_asignado_curso
      WHERE dpc.id_usuario = v_user_id
        AND dpc.estado IN ('inscrito', 'en_progreso')
        AND pac2.id_curso = v_id_curso
    ) INTO v_dup_exists;

    IF v_dup_exists THEN
      id_usuario := v_user_id;
      estado := 'skipped_duplicate';
      id_detalle := NULL;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT dpc.id_detalle_proceso_curso INTO v_retirado_id
    FROM public.detalle_proceso_curso dpc
    WHERE dpc.id_usuario = v_user_id
      AND dpc.id_proceso_asignado_curso = p_ciclo_id
      AND dpc.estado = 'retirado'
    LIMIT 1;

    IF v_retirado_id IS NOT NULL THEN
      UPDATE public.detalle_proceso_curso
      SET estado = 'inscrito', fecha_inscripcion = now()
      WHERE id_detalle_proceso_curso = v_retirado_id;

      id_usuario := v_user_id;
      estado := 'reactivado';
      id_detalle := v_retirado_id;
      RETURN NEXT;
      CONTINUE;
    END IF;

    INSERT INTO public.detalle_proceso_curso (id_usuario, id_proceso_asignado_curso, estado, fecha_inscripcion)
    VALUES (v_user_id, p_ciclo_id, 'inscrito', now())
    RETURNING id_detalle_proceso_curso INTO v_new_id;

    id_usuario := v_user_id;
    estado := 'inscrito';
    id_detalle := v_new_id;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll_users(bigint, bigint[], boolean) TO authenticated;
