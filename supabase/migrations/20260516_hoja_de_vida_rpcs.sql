-- RPC 1: get_hoja_de_vida_completa_v2
CREATE OR REPLACE FUNCTION public.get_hoja_de_vida_completa_v2(
  p_id_usuario bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_id bigint;
  v_target_id  bigint;
  v_result     jsonb;
BEGIN
  SELECT id_usuario INTO v_current_id
  FROM public.usuario WHERE auth_user_id = auth.uid();

  IF p_id_usuario IS NULL THEN
    v_target_id := v_current_id;
  ELSE
    -- Non-self lookup requires a management role
    IF p_id_usuario != v_current_id AND NOT public._is_manager() THEN
      RAISE EXCEPTION 'insufficient_scope';
    END IF;
    v_target_id := p_id_usuario;
  END IF;

  SELECT jsonb_build_object(
    'id_hoja_de_vida',    hdv.id_hoja_de_vida,
    'id_usuario',         hdv.id_usuario,
    'titulo_profesional', hdv.titulo_profesional,
    'resumen_profesional',hdv.resumen_profesional,
    'experiencia_laboral',hdv.experiencia_laboral,
    'habilidades',        hdv.habilidades,
    'formacion_academica',hdv.formacion_academica,
    'otros_datos',        hdv.otros_datos,
    'foto_perfil_url',    hdv.foto_perfil_url,
    'completa',           hdv.completa,
    'completada_en',      hdv.completada_en,
    'creado_en',          hdv.creado_en,
    'actualizado_en',     hdv.actualizado_en,
    'usuario', jsonb_build_object(
      'nombres',  u.nombres,
      'apellidos', u.apellidos,
      'correo',   u.correo
    ),
    'certificados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_aula_certificado', ac.id_aula_certificado,
        'id_aula_curso',       ac.id_aula_curso,
        'titulo_curso',        curso.titulo,
        'fecha_emision',       ac.fecha_emision,
        'numero_certificado',  ac.codigo_unico
      ) ORDER BY ac.fecha_emision DESC)
      FROM public.aula_certificado ac
      JOIN public.aula_curso curso ON ac.id_aula_curso = curso.id_aula_curso
      WHERE ac.id_usuario = v_target_id
    ), '[]'::jsonb),
    'etiquetas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_etiqueta', e.id_etiqueta,
        'nombre',      e.nombre,
        'categoria',   e.categoria
      ))
      FROM public.hoja_de_vida_etiqueta_usuario heu
      JOIN public.hoja_de_vida_etiqueta e ON heu.id_etiqueta = e.id_etiqueta
      WHERE heu.id_hoja_de_vida = hdv.id_hoja_de_vida
    ), '[]'::jsonb),
    'disponibilidad', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_disponibilidad', d.id_disponibilidad,
        'id_sede',           d.id_sede,
        'id_ministerio',     d.id_ministerio,
        'dias_semana',       d.dias_semana,
        'franja_horaria',    d.franja_horaria,
        'modalidad',         d.modalidad,
        'activo',            d.activo
      ))
      FROM public.hoja_de_vida_disponibilidad d
      WHERE d.id_hoja_de_vida = hdv.id_hoja_de_vida AND d.activo = true
    ), '[]'::jsonb),
    'ultima_revision', (
      SELECT jsonb_build_object(
        'id_revision',     rev.id_revision,
        'estado_revision', rev.estado_revision,
        'observaciones',   rev.observaciones,
        'revisado_en',     rev.revisado_en,
        'rol_revisor',     rev.rol_revisor
      )
      FROM public.hoja_de_vida_revision rev
      WHERE rev.id_hoja_de_vida = hdv.id_hoja_de_vida
      ORDER BY rev.revisado_en DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM public.hoja_de_vida hdv
  JOIN public.usuario u ON hdv.id_usuario = u.id_usuario
  WHERE hdv.id_usuario = v_target_id;

  RETURN COALESCE(v_result, 'null'::jsonb);
END;
$$;

-- RPC 2: listar_hojas_de_vida_scoped
CREATE OR REPLACE FUNCTION public.listar_hojas_de_vida_scoped(
  p_id_iglesia    bigint  DEFAULT NULL,
  p_id_sede       bigint  DEFAULT NULL,
  p_id_ministerio bigint  DEFAULT NULL,
  p_solo_completas boolean DEFAULT NULL,
  p_estado_revision text  DEFAULT NULL,
  p_etiqueta_ids  bigint[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_id bigint;
  v_result     jsonb;
BEGIN
  SELECT id_usuario INTO v_current_id
  FROM public.usuario WHERE auth_user_id = auth.uid();

  IF NOT public._is_manager() THEN
    RAISE EXCEPTION 'insufficient_scope';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'apellidos')), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT DISTINCT ON (hdv.id_hoja_de_vida) jsonb_build_object(
      'id_hoja_de_vida',     hdv.id_hoja_de_vida,
      'id_usuario',          u.id_usuario,
      'nombres',             u.nombres,
      'apellidos',           u.apellidos,
      'correo',              u.correo,
      'titulo_profesional',  hdv.titulo_profesional,
      'completa',            hdv.completa,
      'completada_en',       hdv.completada_en,
      'actualizado_en',      hdv.actualizado_en,
      'cantidad_certificados', (
        SELECT COUNT(*) FROM public.aula_certificado ac WHERE ac.id_usuario = u.id_usuario
      ),
      'ultima_revision', (
        SELECT jsonb_build_object(
          'estado_revision', rev.estado_revision,
          'revisado_en',     rev.revisado_en
        )
        FROM public.hoja_de_vida_revision rev
        WHERE rev.id_hoja_de_vida = hdv.id_hoja_de_vida
        ORDER BY rev.revisado_en DESC LIMIT 1
      ),
      'etiquetas', COALESCE((
        SELECT jsonb_agg(e.nombre)
        FROM public.hoja_de_vida_etiqueta_usuario heu
        JOIN public.hoja_de_vida_etiqueta e ON heu.id_etiqueta = e.id_etiqueta
        WHERE heu.id_hoja_de_vida = hdv.id_hoja_de_vida
      ), '[]'::jsonb)
    ) AS row_data
    FROM public.hoja_de_vida hdv
    JOIN public.usuario u ON hdv.id_usuario = u.id_usuario
    LEFT JOIN public.miembro_ministerio mm ON mm.id_usuario = u.id_usuario AND mm.fecha_salida IS NULL
    LEFT JOIN public.ministerio min ON mm.id_ministerio = min.id_ministerio
    LEFT JOIN public.sede s ON min.id_sede = s.id_sede
    WHERE
      (p_id_iglesia    IS NULL OR s.id_iglesia    = p_id_iglesia)
      AND (p_id_sede   IS NULL OR min.id_sede     = p_id_sede)
      AND (p_id_ministerio IS NULL OR mm.id_ministerio = p_id_ministerio)
      AND (p_solo_completas IS NULL OR hdv.completa = p_solo_completas)
      AND (p_etiqueta_ids IS NULL OR EXISTS (
        SELECT 1 FROM public.hoja_de_vida_etiqueta_usuario heu
        WHERE heu.id_hoja_de_vida = hdv.id_hoja_de_vida
          AND heu.id_etiqueta = ANY(p_etiqueta_ids)
      ))
      AND (p_estado_revision IS NULL OR (
        SELECT rev.estado_revision FROM public.hoja_de_vida_revision rev
        WHERE rev.id_hoja_de_vida = hdv.id_hoja_de_vida
        ORDER BY rev.revisado_en DESC LIMIT 1
      ) = p_estado_revision)
  ) sub;

  RETURN v_result;
END;
$$;
