CREATE OR REPLACE FUNCTION public.get_hoja_de_vida_completa_v2(p_id_usuario bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target bigint;
  v_payload jsonb;
BEGIN
  v_target := COALESCE(p_id_usuario, public._current_app_user_id());

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'usuario autenticado no encontrado';
  END IF;

  IF NOT public.hdv_can_view_usuario(v_target) THEN
    RAISE EXCEPTION 'acceso denegado';
  END IF;

  SELECT jsonb_build_object(
    'id_hoja_de_vida', h.id_hoja_de_vida,
    'id_usuario', u.id_usuario,
    'resumen_profesional', COALESCE(h.resumen_profesional, h.perfil_profesional),
    'experiencia_laboral', h.experiencia_laboral,
    'foto_perfil_url', h.foto_perfil_url,
    'habilidades', COALESCE(h.habilidades, '[]'::jsonb),
    'formacion_academica', COALESCE(h.formacion_academica, '[]'::jsonb),
    'completa', COALESCE(h.completa, FALSE),
    'completada_en', h.completada_en,
    'creado_en', h.creado_en,
    'actualizado_en', COALESCE(h.actualizado_en, h.updated_at),
    'usuario_nombres', u.nombres,
    'usuario_apellidos', u.apellidos,
    'usuario_correo', u.correo,
    'etiquetas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_etiqueta', e.id_etiqueta,
        'nombre', e.nombre,
        'categoria', e.categoria
      ) ORDER BY e.nombre)
      FROM public.hoja_de_vida_etiqueta_usuario heu
      JOIN public.hoja_de_vida_etiqueta e ON e.id_etiqueta = heu.id_etiqueta
      WHERE heu.id_hoja_de_vida = h.id_hoja_de_vida
    ), '[]'::jsonb),
    'disponibilidad', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_disponibilidad', d.id_disponibilidad,
        'id_sede', d.id_sede,
        'id_ministerio', d.id_ministerio,
        'dias_semana', d.dias_semana,
        'franja_horaria', d.franja_horaria,
        'modalidad', d.modalidad,
        'activo', d.activo,
        'creado_en', d.creado_en,
        'actualizado_en', d.actualizado_en
      ) ORDER BY d.id_disponibilidad)
      FROM public.hoja_de_vida_disponibilidad d
      WHERE d.id_hoja_de_vida = h.id_hoja_de_vida
    ), '[]'::jsonb),
    'revisiones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_revision', r.id_revision,
        'id_revisor', r.id_revisor,
        'rol_revisor', r.rol_revisor,
        'estado_revision', r.estado_revision,
        'observaciones', r.observaciones,
        'revisado_en', r.revisado_en,
        'creado_en', r.creado_en,
        'actualizado_en', r.actualizado_en
      ) ORDER BY r.creado_en DESC)
      FROM public.hoja_de_vida_revision r
      WHERE r.id_hoja_de_vida = h.id_hoja_de_vida
    ), '[]'::jsonb),
    'certificados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_aula_certificado', c.id_aula_certificado,
        'id_aula_curso', c.id_aula_curso,
        'titulo_curso', ac.titulo,
        'fecha_emision', COALESCE(c.emitido_en, c.creado_en),
        'fecha_certificacion', c.fecha_certificacion,
        'numero_certificado', c.numero_certificado
      ) ORDER BY COALESCE(c.emitido_en, c.creado_en) DESC)
      FROM public.aula_certificado c
      LEFT JOIN public.aula_curso ac ON ac.id_aula_curso = c.id_aula_curso
      WHERE c.id_usuario = u.id_usuario
    ), '[]'::jsonb)
  )
  INTO v_payload
  FROM public.usuario u
  LEFT JOIN public.hoja_de_vida h ON h.id_usuario = u.id_usuario
  WHERE u.id_usuario = v_target
  LIMIT 1;

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_hojas_de_vida_scoped(filtros jsonb DEFAULT '{}'::jsonb)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scope AS (
    SELECT h.id_usuario, h.id_hoja_de_vida
    FROM public.hoja_de_vida h
    WHERE public.hdv_can_view_usuario(h.id_usuario)
      AND (
        NOT (filtros ? 'completa')
        OR COALESCE(h.completa, FALSE) = (filtros ->> 'completa')::boolean
      )
      AND (
        NOT (filtros ? 'id_sede')
        OR EXISTS (
          SELECT 1
          FROM public.hoja_de_vida_disponibilidad d
          WHERE d.id_hoja_de_vida = h.id_hoja_de_vida
            AND d.id_sede = (filtros ->> 'id_sede')::bigint
            AND d.activo = TRUE
        )
      )
      AND (
        NOT (filtros ? 'id_ministerio')
        OR EXISTS (
          SELECT 1
          FROM public.hoja_de_vida_disponibilidad d
          WHERE d.id_hoja_de_vida = h.id_hoja_de_vida
            AND d.id_ministerio = (filtros ->> 'id_ministerio')::bigint
            AND d.activo = TRUE
        )
      )
      AND (
        NOT (filtros ? 'estado_revision')
        OR EXISTS (
          SELECT 1
          FROM public.hoja_de_vida_revision r
          WHERE r.id_hoja_de_vida = h.id_hoja_de_vida
            AND r.estado_revision = (filtros ->> 'estado_revision')
        )
      )
      AND (
        NOT (filtros ? 'id_etiqueta')
        OR EXISTS (
          SELECT 1
          FROM public.hoja_de_vida_etiqueta_usuario heu
          WHERE heu.id_hoja_de_vida = h.id_hoja_de_vida
            AND heu.id_etiqueta = (filtros ->> 'id_etiqueta')::bigint
        )
      )
  )
  SELECT public.get_hoja_de_vida_completa_v2(s.id_usuario)
  FROM scope s
  ORDER BY s.id_hoja_de_vida DESC
  LIMIT COALESCE(NULLIF((filtros ->> 'limit')::int, 0), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_hoja_de_vida_completa_v2(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_hojas_de_vida_scoped(jsonb) TO authenticated;
