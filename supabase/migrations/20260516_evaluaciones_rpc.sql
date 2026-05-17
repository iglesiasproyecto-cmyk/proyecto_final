-- Migration: Add RPC functions for evaluations
-- Date: 2026-05-16

-- RPC 1: Register evaluation attempt and calculate score
CREATE OR REPLACE FUNCTION registrar_intento_evaluacion(
  p_id_aula_evaluacion bigint,
  p_id_usuario bigint,
  p_respuestas jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_evaluacion_record record;
  v_modulo_record record;
  v_curso_record record;
  v_preguntas record;
  v_opcion_correcta record;
  v_respuesta_usuario text;
  v_puntaje_total integer := 0;
  v_puntaje_obtenido integer := 0;
  v_num_preguntas integer := 0;
  v_num_correctas integer := 0;
  v_existe_inscripcion boolean := false;
  v_intento_anterior record;
  v_nuevo_numero_intento integer;
BEGIN
  -- 1. Validate evaluation exists
  SELECT * INTO v_evaluacion_record
  FROM aula_evaluacion
  WHERE id_aula_evaluacion = p_id_aula_evaluacion;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Evaluación no encontrada');
  END IF;

  -- 2. Validate user is enrolled in course (via module -> course -> inscription)
  SELECT ac.id_aula_curso INTO v_curso_record
  FROM aula_modulo am
  JOIN aula_curso ac ON am.id_aula_curso = ac.id_aula_curso
  WHERE am.id_aula_modulo = v_evaluacion_record.id_aula_modulo;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Módulo o curso no encontrado');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM aula_inscripcion
    WHERE id_usuario = p_id_usuario
    AND id_aula_curso = v_curso_record.id_aula_curso
    AND activo = true
  ) INTO v_existe_inscripcion;

  IF NOT v_existe_inscripcion THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuario no está inscrito en este curso');
  END IF;

  -- 3. Check if already approved (can't retake if approved)
  SELECT * INTO v_intento_anterior
  FROM aula_intento_evaluacion
  WHERE id_aula_evaluacion = p_id_aula_evaluacion
  AND id_usuario = p_id_usuario
  AND aprobado = true
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ya aprobaste esta evaluación. No puedes reintentar.',
      'accion', 'bloqueado'
    );
  END IF;

  -- 4. Get next attempt number
  SELECT COALESCE(MAX(numero_intento), 0) + 1 INTO v_nuevo_numero_intento
  FROM aula_intento_evaluacion
  WHERE id_aula_evaluacion = p_id_aula_evaluacion
  AND id_usuario = p_id_usuario;

  -- Check max attempts limit
  IF v_evaluacion_record.max_intentos IS NOT NULL
    AND v_nuevo_numero_intento > v_evaluacion_record.max_intentos THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Has alcanzado el máximo de %s intentos', v_evaluacion_record.max_intentos)
    );
  END IF;

  -- 5. Calculate score from answers
  FOR v_preguntas IN
    SELECT ap.id_aula_pregunta, ap.id_aula_evaluacion
    FROM aula_pregunta ap
    WHERE ap.id_aula_evaluacion = p_id_aula_evaluacion
    ORDER BY ap.orden
  LOOP
    v_num_preguntas := v_num_preguntas + 1;

    -- Get user's answer for this question
    v_respuesta_usuario := p_respuestas ->> v_preguntas.id_aula_pregunta::text;

    -- Get correct option ID
    SELECT id_aula_opcion INTO v_opcion_correcta
    FROM aula_opcion
    WHERE id_aula_pregunta = v_preguntas.id_aula_pregunta
    AND es_correcta = true
    LIMIT 1;

    IF v_respuesta_usuario::bigint = (v_opcion_correcta).id_aula_opcion THEN
      v_num_correctas := v_num_correctas + 1;
    END IF;
  END LOOP;

  -- 6. Calculate percentage score
  IF v_num_preguntas > 0 THEN
    v_puntaje_obtenido := (v_num_correctas::numeric / v_num_preguntas::numeric * 100)::integer;
  ELSE
    v_puntaje_obtenido := 0;
  END IF;

  -- 7. Insert attempt record
  INSERT INTO aula_intento_evaluacion (
    id_aula_evaluacion,
    id_usuario,
    numero_intento,
    puntaje_obtenido,
    aprobado,
    iniciado_en,
    finalizado_en,
    fecha_intento
  ) VALUES (
    p_id_aula_evaluacion,
    p_id_usuario,
    v_nuevo_numero_intento,
    v_puntaje_obtenido,
    v_puntaje_obtenido >= v_evaluacion_record.puntaje_minimo,
    NOW() - INTERVAL '5 minutes',
    NOW(),
    CURRENT_DATE
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE
      WHEN v_puntaje_obtenido >= v_evaluacion_record.puntaje_minimo THEN '¡Aprobaste!'
      ELSE 'Necesitas intentar de nuevo'
    END,
    'puntaje_obtenido', v_puntaje_obtenido,
    'aprobado', v_puntaje_obtenido >= v_evaluacion_record.puntaje_minimo,
    'numero_intento', v_nuevo_numero_intento,
    'puntaje_minimo', v_evaluacion_record.puntaje_minimo
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_intento_evaluacion(bigint, bigint, jsonb) TO authenticated;

-- RPC 2: Emit certificate if all evaluations pass
CREATE OR REPLACE FUNCTION emitir_certificado_si_corresponde(
  p_id_usuario bigint,
  p_id_aula_curso bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_modulos_sin_aprobar integer;
  v_num_certificado text;
  v_certificado_id bigint;
BEGIN
  -- 1. Check if user is enrolled
  IF NOT EXISTS(
    SELECT 1 FROM aula_inscripcion
    WHERE id_usuario = p_id_usuario
    AND id_aula_curso = p_id_aula_curso
    AND activo = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuario no está inscrito en este curso'
    );
  END IF;

  -- 2. Count modules without approved evaluations
  SELECT COUNT(DISTINCT ae.id_aula_modulo) INTO v_modulos_sin_aprobar
  FROM aula_modulo am
  JOIN aula_evaluacion ae ON am.id_aula_modulo = ae.id_aula_modulo
  WHERE am.id_aula_curso = p_id_aula_curso
  AND NOT EXISTS(
    SELECT 1 FROM aula_intento_evaluacion aie
    WHERE aie.id_aula_evaluacion = ae.id_aula_evaluacion
    AND aie.id_usuario = p_id_usuario
    AND aie.aprobado = true
  );

  IF v_modulos_sin_aprobar > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Aún tienes %s módulos sin completar', v_modulos_sin_aprobar),
      'modulos_pendientes', v_modulos_sin_aprobar
    );
  END IF;

  -- 3. Check if certificate already exists
  IF EXISTS(
    SELECT 1 FROM aula_certificado
    WHERE id_usuario = p_id_usuario
    AND id_aula_curso = p_id_aula_curso
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ya tienes un certificado para este curso'
    );
  END IF;

  -- 4. Generate certificate number (UUID-like)
  v_num_certificado := 'CERT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                       SUBSTR(MD5(p_id_usuario::text || p_id_aula_curso::text || NOW()::text), 1, 8);

  -- 5. Insert certificate
  INSERT INTO aula_certificado (
    id_aula_curso,
    id_usuario,
    numero_certificado,
    emitido_en,
    fecha_certificacion,
    creado_en,
    updated_at
  ) VALUES (
    p_id_aula_curso,
    p_id_usuario,
    v_num_certificado,
    NOW(),
    CURRENT_DATE,
    NOW(),
    NOW()
  )
  RETURNING id_aula_certificado INTO v_certificado_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', '¡Certificado emitido! Felicidades por completar el curso.',
    'certificado_id', v_certificado_id,
    'numero_certificado', v_num_certificado,
    'emitido_en', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION emitir_certificado_si_corresponde(bigint, bigint) TO authenticated;
